/**
 * Project Creation Page
 *
 * Form for creating new projects with name, description, and creator.
 * Implements form validation with error messages and handles submission to backend.
 */

import React, { useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { projectApi, handleApiError, ApiErrorResponse } from "@/utils/apiClient";
import { useUser } from "@/contexts/UserContext";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { useToast } from "@/contexts/ToastContext";
import { AxiosError } from "axios";

interface ProjectFormData {
  name: string;
  description: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    if (!currentUser) {
      toast.error("Please select a user first");
      return;
    }

    setIsSubmitting(true);

    try {
      const newProject = await projectApi.create({
        name: data.name,
        description: data.description,
        createdBy: currentUser.id,
      });

      toast.success("Project created successfully!");
      // Navigate to the newly created project
      router.push(`/projects/${newProject.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/projects");
  };

  if (!currentUser) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Please select a user to create a project
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
            <CardTitle className="text-2xl">Create New Project</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Project name"
                  {...register("name", {
                    required: "Project name is required",
                    minLength: {
                      value: 3,
                      message: "Project name must be at least 3 characters",
                    },
                    maxLength: {
                      value: 100,
                      message: "Project name must not exceed 100 characters",
                    },
                  })}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
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
                  placeholder="Detailed description of the project"
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

              {/* Created by (read-only) */}
              <div className="space-y-2">
                <Label>Created By</Label>
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
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
