/**
 * Bug Creation Page
 *
 * Form for creating new bugs with title, description, priority, severity, and project selection.
 * Implements form validation with error messages and handles submission to backend.
 *
 * Requirements: 1.1, 1.5
 */

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bugApi, sprintApi, handleApiError, ApiErrorResponse } from "@/utils/apiClient";
import { BugPriority, BugSeverity } from "@/utils/types";
import { Sprint } from "@/lib/models/sprint";
import { BugTag, BugType } from "@/lib/models/bug";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/lib/hooks/useData";
import { PriorityIcon } from "@/components/PriorityIcon";
import { SeverityIcon } from "@/components/SeverityIcon";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";

interface BugFormData {
  title: string;
  description: string;
  projectId: string;
  priority: BugPriority;
  severity: BugSeverity;
  type: BugTag; // Epic, Task, Suggestion, or Bug type
  tags: BugTag[]; // Additional bug tags (BUG_FRONTEND, BUG_BACKEND, etc.)
  sprintId?: string;
}

export default function NewBugPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const toast = useToast();

  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoadingSprints, setIsLoadingSprints] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBugTypeDialog, setShowBugTypeDialog] = useState(true);
  const [preSelectedTag, setPreSelectedTag] = useState<BugTag | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BugFormData>({
    defaultValues: {
      title: "",
      description: "",
      projectId: "",
      priority: BugPriority.MEDIUM,
      severity: BugSeverity.MAJOR,
      type: "" as BugTag, // Will be set from dialog
      tags: [],
      sprintId: "unassigned",
    },
  });

  const selectedProjectId = watch("projectId");
  const selectedSprintId = watch("sprintId");
  const selectedPriority = watch("priority");
  const selectedSeverity = watch("severity");
  const selectedType = watch("type");
  const selectedTags = watch("tags");

  // Helper to get allowed severities based on type
  const getSeveritiesForType = useCallback((type: BugTag): BugSeverity[] => {
    switch (type) {
      case BugTag.SUGGESTION:
        return [BugSeverity.NICE_TO_HAVE, BugSeverity.MUST_HAVE, BugSeverity.STRATEGIC];
      case BugTag.EPIC:
      case BugTag.TASK:
        return [BugSeverity.TRIVIAL, BugSeverity.MODERATE, BugSeverity.HEAVY, BugSeverity.MASSIVE];
      default:
        // For all bug types and default
        return [BugSeverity.MINOR, BugSeverity.MAJOR, BugSeverity.BLOCKER];
    }
  }, []);

  // Update severity when type changes to ensure validity
  useEffect(() => {
    if (!selectedType) return;
    
    const allowedSeverities = getSeveritiesForType(selectedType);
    // If current severity is not in the allowed list, reset to the first allowed value
    if (!allowedSeverities.includes(selectedSeverity)) {
      setValue("severity", allowedSeverities[0]);
    }
  }, [selectedType, getSeveritiesForType, selectedSeverity, setValue]);

  useEffect(() => {
    const loadSprints = async () => {
      if (!selectedProjectId) {
        setSprints([]);
        setValue("sprintId", "unassigned");
        return;
      }
      setIsLoadingSprints(true);
      try {
        const sprintsData = await sprintApi.getByProject(selectedProjectId);
        setSprints(sprintsData);
        setValue("sprintId", "unassigned");
      } catch (err) {
        console.error("Failed to load sprints:", err);
        toast.error("Failed to load sprints");
      } finally {
        setIsLoadingSprints(false);
      }
    };
    loadSprints();
  }, [selectedProjectId, toast, setValue]);

  // Pre-select project from query parameter
  useEffect(() => {
    if (router.query.projectId && typeof router.query.projectId === "string") {
      setValue("projectId", router.query.projectId, { shouldValidate: true });
    }
  }, [router.query.projectId, setValue]);

  const onSubmit = async (data: BugFormData) => {
    if (!currentUser) {
      toast.error("Please select a user first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Map BugTag to BugType
      let bugType: BugType = 'bug';
      if (data.type === BugTag.EPIC) bugType = 'epic';
      else if (data.type === BugTag.TASK) bugType = 'task';
      else if (data.type === BugTag.SUGGESTION) bugType = 'suggestion';
      
      const newBug = await bugApi.create({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        reportedBy: currentUser.id,
        priority: data.priority,
        severity: data.severity,
        type: bugType,
        tags: data.tags,
        sprintId: data.sprintId === 'unassigned' ? null : (data.sprintId || null),
      });

      toast.success("Bug created successfully!");
      // Navigate to the newly created bug
      router.push(`/bugs/${newBug.id}`);
    } catch (err) {
      console.error("Failed to create bug:", err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/bugs");
  };

  const handleBugTypeSelection = (type: BugTag) => {
    setPreSelectedTag(type);
    setValue("type", type, { shouldValidate: true });
    setShowBugTypeDialog(false);
  };

  // Map bug types to their display information
  const bugTypeOptions = [
    {
      tag: BugTag.EPIC,
      title: "Epic",
      description: "Large body of work that can be broken down into smaller tasks",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="32" viewBox="0 0 16 16" width="32">
          <path clipRule="evenodd" d="m10.271.050656c.2887.111871.479.38969.479.699344v4.63515l3.1471.62941c.2652.05303.4812.24469.5655.50161s.0238.53933-.1584.73914l-7.74997 8.49999c-.20863.2288-.53644.3059-.82517.194-.28874-.1118-.47905-.3896-.47905-.6993v-4.6351l-3.14708-.62947c-.26515-.05303-.48123-.24468-.56553-.5016-.08431-.25692-.02379-.53933.1584-.73915l7.75-8.499996c.20863-.2288201.53643-.305899.8252-.194028zm-6.57276 8.724134 3.05177.61036v3.92915l5.55179-6.08909-3.05179-.61036v-3.9291z" fill="#bf63f3" fillRule="evenodd" />
        </svg>
      ),
      color: "purple",
    },
    {
      tag: BugTag.TASK,
      title: "Task",
      description: "A specific piece of work that needs to be done",
      icon: (
        <svg width="32px" height="32px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4A9EFF" fillRule="evenodd" d="M4,4 L9,4 C9.55228,4 10,3.55228 10,3 C10,2.44772 9.55228,2 9,2 L4,2 C2.89543,2 2,2.89543 2,4 L2,12 C2,13.1046 2.89543,14 4,14 L12,14 C13.1046,14 14,13.1046 14,12 L14,10 C14,9.44771 13.5523,9 13,9 C12.4477,9 12,9.44771 12,10 L12,12 L4,12 L4,4 Z M15.2071,2.29289 C14.8166,1.90237 14.1834,1.90237 13.7929,2.29289 L8.5,7.58579 L7.70711,6.79289 C7.31658,6.40237 6.68342,6.40237 6.29289,6.79289 C5.90237,7.18342 5.90237,7.81658 6.29289,8.20711 L7.79289,9.70711 C7.98043,9.89464 8.23478,10 8.5,10 C8.76522,10 9.01957,9.89464 9.20711,9.70711 L15.2071,3.70711 C15.5976,3.31658 15.5976,2.68342 15.2071,2.29289 Z"/>
        </svg>
      ),
      color: "blue",
    },
    {
      tag: BugTag.SUGGESTION,
      title: "Suggestion",
      description: "An idea or proposal for improvement",
      icon: (
        <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6V17.4C21 17.7314 20.7314 18 20.4 18H16.2592C16.0938 18 15.9357 18.0683 15.8223 18.1888L12.4369 21.7858C12.2 22.0375 11.8 22.0375 11.5631 21.7858L8.17768 18.1888C8.06429 18.0683 7.90619 18 7.74076 18H3.6C3.26863 18 3 17.7314 3 17.4V3.6Z" stroke="#10B981" strokeWidth="1.5"/>
          <path d="M12 7L13.4254 9.57457L16 11L13.4254 12.4254L12 15L10.5746 12.4254L8 11L10.5746 9.57457L12 7Z" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "green",
    },
    {
      tag: BugTag.BUG_FRONTEND,
      title: "Bug",
      description: "An issue or defect that needs to be fixed",
      icon: (
        <svg 
          fill="currentColor" 
          height="32px" 
          width="32px" 
          className="text-red-500"
          version="1.1" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 314.009 314.009"
        >
          <path d="M310.008,242.584l-44.275-39.615c-3.384-3.029-8.188-3.889-12.41-2.221l-3.699,1.461c1.719-8.662,2.636-17.699,2.636-26.998
            c0-17.793-3.337-34.645-9.291-49.691l12.276-4.844L294,155.355c2.29,2.049,5.151,3.059,8.001,3.059c3.297,0,6.578-1.35,8.949-4
            c4.421-4.939,4-12.529-0.94-16.949l-44.275-39.619c-3.384-3.029-8.186-3.889-12.411-2.221l-21.385,8.439
            c-9.646-14.848-22.246-26.75-36.725-34.428l8.195-18.98l33.799,12.068c6.243,2.23,13.111-1.023,15.341-7.269
            c2.23-6.242-1.024-13.111-7.268-15.34l-44.395-15.851c-5.959-2.129-12.548,0.736-15.057,6.545l-13.262,30.713
            c-5.065-1.008-10.263-1.539-15.563-1.539s-10.499,0.531-15.564,1.539l-13.263-30.713c-2.508-5.811-9.099-8.674-15.058-6.545
            L68.73,40.115c-6.243,2.229-9.497,9.098-7.268,15.342c2.229,6.242,9.1,9.498,15.342,7.268l33.793-12.068l8.196,18.982
            c-14.477,7.678-27.076,19.58-36.723,34.424l-21.382-8.438c-4.223-1.666-9.026-0.809-12.41,2.221L4.001,137.465
            c-4.941,4.42-5.363,12.008-0.941,16.949c2.371,2.65,5.653,4,8.949,4c2.85,0,5.71-1.01,8-3.059l38.759-34.68l12.273,4.844
            c-5.955,15.047-9.292,31.897-9.292,49.691c0,9.299,0.917,18.336,2.636,26.996l-3.694-1.459c-4.225-1.666-9.026-0.807-12.41,2.221
            L4.001,242.584c-4.94,4.42-5.363,12.01-0.942,16.949c2.371,2.65,5.653,4,8.95,4c2.85,0,5.71-1.008,8-3.057l38.759-34.678
            l15.255,6.02c16.35,34.998,47.385,58.629,82.981,58.629c35.601,0,66.634-23.631,82.981-58.627l15.26-6.021l38.756,34.676
            c2.291,2.051,5.15,3.059,8,3.059c3.297,0,6.579-1.35,8.949-4C315.371,254.594,314.949,247.004,310.008,242.584z M119.239,138.14
            c0-8.586,6.967-15.553,15.563-15.553c8.593,0,15.559,6.967,15.559,15.553c0,8.588-6.966,15.551-15.559,15.551
            C126.206,153.691,119.239,146.728,119.239,138.14z M150.36,231.719c-8.595,0-15.559-6.973-15.559-15.557s6.964-15.547,15.559-15.547
            c8.585,0,15.552,6.963,15.552,15.547S158.945,231.719,150.36,231.719z M180.98,173.492c0-9.606,7.802-17.396,17.414-17.396
            c9.614,0,17.405,7.791,17.405,17.396c0,9.621-7.791,17.41-17.405,17.41C188.782,190.902,180.98,183.113,180.98,173.492z"/>
        </svg>
      ),
      color: "red",
    },
  ];

  if (!currentUser) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Please select a user to create a bug
                </p>
                <Button onClick={() => router.push("/")}>Go to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bug Type Selection Dialog */}
      <Dialog 
        open={showBugTypeDialog} 
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl">What are you creating?</DialogTitle>
            <DialogDescription>
              Select the type of item you want to create. This will help categorize your entry.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {bugTypeOptions.map((option) => {
              const getColorClasses = (color: string) => {
                switch (color) {
                  case "purple":
                    return "border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-600 dark:hover:bg-purple-900/20";
                  case "blue":
                    return "border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-800 dark:hover:border-blue-600 dark:hover:bg-blue-900/20";
                  case "green":
                    return "border-green-200 hover:border-green-400 hover:bg-green-50 dark:border-green-800 dark:hover:border-green-600 dark:hover:bg-green-900/20";
                  case "red":
                    return "border-red-200 hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-600 dark:hover:bg-red-900/20";
                  default:
                    return "border-gray-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-900/20";
                }
              };

              return (
                <button
                  key={option.tag}
                  onClick={() => handleBugTypeSelection(option.tag)}
                  className={`p-6 border-2 rounded-lg text-left transition-all duration-200 cursor-pointer ${getColorClasses(option.color)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">{option.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Form (only shown after type selection) */}
      <div className="p-8">
        <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel}>
            ← Back
          </Button>
        </div>

        {/* Form card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Bug</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief description of the bug"
                  {...register("title", {
                    required: "Title is required",
                    minLength: {
                      value: 5,
                      message: "Title must be at least 5 characters",
                    },
                    maxLength: {
                      value: 200,
                      message: "Title must not exceed 200 characters",
                    },
                  })}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <MarkdownEditor
                  value={watch("description")}
                  onChange={(value) => setValue("description", value, { shouldValidate: true })}
                  label="Description"
                  required={true}
                  placeholder="Detailed description of the bug, including steps to reproduce"
                  minHeight="250px"
                  error={!!errors.description}
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Project and Type row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project selection */}
                <div className="space-y-2">
                  <Label htmlFor="projectId">
                    Project <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={(value) =>
                      setValue("projectId", value, { shouldValidate: true })
                    }
                    disabled={isLoadingProjects}
                  >
                    <SelectTrigger
                      className={errors.projectId ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    {...register("projectId", {
                      required: "Project is required",
                    })}
                  />
                  {errors.projectId && (
                    <p className="text-sm text-destructive">
                      {errors.projectId.message}
                    </p>
                  )}
                </div>

                {/* Sprint selection */}
                <div className="space-y-2">
                  <Label htmlFor="sprintId">
                    Sprint (Optional)
                  </Label>
                  <Select
                    value={selectedSprintId}
                    onValueChange={(value) =>
                      setValue("sprintId", value)
                    }
                    disabled={!selectedProjectId || isLoadingSprints}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedProjectId ? "Select a project first" : "Select a sprint"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Backlog (No Sprint)</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name} ({sprint.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type selection */}
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedType}
                    onValueChange={(value) =>
                      setValue("type", value as BugTag, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger
                      className={errors.type ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {bugTypeOptions.map((option) => (
                        <SelectItem key={option.tag} value={option.tag}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 flex items-center justify-center">
                              {React.cloneElement(option.icon as React.ReactElement, {
                                width: "20",
                                height: "20",
                              })}
                            </div>
                            <span>{option.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    {...register("type", {
                      required: "Type is required",
                    })}
                  />
                  {errors.type && (
                    <p className="text-sm text-destructive">
                      {errors.type.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Priority and Severity row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedPriority}
                    onValueChange={(value) =>
                      setValue("priority", value as BugPriority)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BugPriority.LOWEST}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={BugPriority.LOWEST} />
                          {BugPriority.LOWEST}
                        </div>
                      </SelectItem>
                      <SelectItem value={BugPriority.LOW}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={BugPriority.LOW} />
                          {BugPriority.LOW}
                        </div>
                      </SelectItem>
                      <SelectItem value={BugPriority.MEDIUM}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={BugPriority.MEDIUM} />
                          {BugPriority.MEDIUM}
                        </div>
                      </SelectItem>
                      <SelectItem value={BugPriority.HIGH}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={BugPriority.HIGH} />
                          {BugPriority.HIGH}
                        </div>
                      </SelectItem>
                      <SelectItem value={BugPriority.HIGHEST}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={BugPriority.HIGHEST} />
                          {BugPriority.HIGHEST}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div className="space-y-2">
                  <Label htmlFor="severity">
                    Severity <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedSeverity}
                    onValueChange={(value) =>
                      setValue("severity", value as BugSeverity)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSeveritiesForType(selectedType).map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          <div className="flex items-center gap-2">
                            <SeverityIcon severity={severity} />
                            {severity}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags multi-select */}
              <div className="space-y-2">
                <Label htmlFor="tags">
                  Tags (Optional)
                </Label>
                <div className="border rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      BugTag.BUG_FRONTEND, 
                      BugTag.BUG_BACKEND, 
                      BugTag.BUG_TEST,
                      BugTag.UI,
                      BugTag.MOBILE,
                      BugTag.BACKEND,
                      BugTag.PAYMENT,
                      BugTag.BROWSER,
                      BugTag.PERFORMANCE,
                      BugTag.DATABASE,
                    ].map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      
                      // Get color scheme for each tag type
                      const getTagButtonStyles = (tagType: BugTag, selected: boolean) => {
                        const baseStyles = "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out border-2";
                        
                        if (selected) {
                          // Selected state - more prominent with solid border and checkmark
                          switch (tagType) {
                            case BugTag.BUG_FRONTEND:
                              return `${baseStyles} bg-amber-100 text-amber-800 border-amber-500 font-semibold dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-500`;
                            case BugTag.BUG_BACKEND:
                              return `${baseStyles} bg-red-100 text-red-800 border-red-500 font-semibold dark:bg-red-900/50 dark:text-red-200 dark:border-red-500`;
                            case BugTag.BUG_TEST:
                              return `${baseStyles} bg-indigo-100 text-indigo-800 border-indigo-500 font-semibold dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-500`;
                            case BugTag.UI:
                            case BugTag.MOBILE:
                            case BugTag.BACKEND:
                            case BugTag.PAYMENT:
                            case BugTag.BROWSER:
                            case BugTag.PERFORMANCE:
                            case BugTag.DATABASE:
                              return `${baseStyles} bg-blue-100 text-blue-800 border-blue-500 font-semibold dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-500`;
                            default:
                              return `${baseStyles} bg-gray-100 text-gray-800 border-gray-500 font-semibold dark:bg-gray-900/50 dark:text-gray-200 dark:border-gray-500`;
                          }
                        } else {
                          // Unselected state - subtle and muted
                          return `${baseStyles} bg-background text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground dark:hover:border-foreground/50`;
                        }
                      };
                      
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const newTags = isSelected
                              ? selectedTags.filter(t => t !== tag)
                              : [...selectedTags, tag];
                            setValue("tags", newTags);
                          }}
                          className={getTagButtonStyles(tag, isSelected)}
                        >
                          {isSelected && <span className="mr-1.5">✓</span>}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reported by (read-only) */}
              <div className="space-y-2">
                <Label>Reported By</Label>
                <Input
                  value={`${currentUser.name} (${currentUser.role})`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Bug"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        </div>
      </div>
    </>
  );
}
