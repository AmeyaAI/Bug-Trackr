/**
 * BugCard Component
 *
 * Displays bug summary information with status and priority indicators.
 * Provides quick action buttons for status updates and shows comment counts
 * and assignment information.
 *
 * Requirements: 2.1, 2.5
 */

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bug, BugStatus, BugTag, User } from "@/utils/types";
import { getInitials } from "@/lib/utils";
import { usePermission } from "@/contexts/UserContext";
import { PriorityIcon } from "@/components/PriorityIcon";
import { SeverityIcon } from "@/components/SeverityIcon";
import { TagBadge } from "@/components/TagBadge";
import { getBugTypeBorderClass } from "@/utils/badgeHelpers";
import { User as UserIcon, MoreHorizontal, CheckCircle2, UserPlus, Tag, ArrowRightCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ALL_BUG_TAGS } from "@/lib/models/bug";

interface BugCardProps {
  bug: Bug;
  assignedUserName?: string;
  users?: User[];
  onStatusUpdate?: (bugId: string, newStatus: BugStatus) => void;
  onAssign?: (bugId: string, userId: string) => void;
  onUpdateTags?: (bugId: string, tags: BugTag[]) => void;
  onValidate?: (bugId: string) => void;
  onViewDetails?: (bugId: string) => void;
}

export const BugCard: React.FC<BugCardProps> = ({
  bug,
  assignedUserName,
  users = [],
  onStatusUpdate,
  onAssign,
  onUpdateTags,
  onValidate,
  onViewDetails,
}) => {
  const canUpdateStatus = usePermission('canUpdateStatus');
  const canValidateBug = usePermission('canValidateBug');
  const canAssignBug = usePermission('canAssignBug');

  const handleStatusChange = (newStatus: BugStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(bug.id, newStatus);
    }
  };

  const handleAssignUser = (userId: string) => {
    if (onAssign) {
      onAssign(bug.id, userId);
    }
  };

  const handleAddTag = (tag: BugTag) => {
    if (onUpdateTags) {
      const currentTags = bug.tags || [];
      if (!currentTags.includes(tag)) {
        onUpdateTags(bug.id, [...currentTags, tag]);
      }
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(bug.id);
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow overflow-hidden ${getBugTypeBorderClass(bug.type)} group`}>
      <CardHeader className="pb-2 relative pr-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <CardTitle 
              className="text-base font-semibold break-words line-clamp-2 leading-tight mb-1 cursor-pointer hover:text-primary" 
              onClick={handleViewDetails}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {bug.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 break-words text-xs">
              {bug.description}
            </CardDescription>
          </div>
        </div>
        
        {/* Three-dot menu */}
        <div 
          className="absolute top-4 right-3"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Change Status */}
                {canUpdateStatus && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      <span>Change Status</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {Object.values(BugStatus).map((status) => (
                        <DropdownMenuItem 
                          key={status} 
                          onClick={() => handleStatusChange(status)}
                          disabled={bug.status === status}
                        >
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {/* Assign Bug */}
                {canAssignBug && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Assign To</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
                      <DropdownMenuItem onClick={() => handleAssignUser('unassigned')}>
                        Unassigned
                      </DropdownMenuItem>
                      {users.map((user) => (
                        <DropdownMenuItem key={user.id} onClick={() => handleAssignUser(user.id)}>
                          {user.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {/* Update Tags */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Tag className="mr-2 h-4 w-4" />
                    <span>Add Label</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
                    {ALL_BUG_TAGS.map((tag) => (
                      <DropdownMenuItem 
                        key={tag} 
                        onClick={() => handleAddTag(tag)}
                        disabled={bug.tags?.includes(tag)}
                      >
                        {tag}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewDetails}>
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3 pt-0">
        {/* Tags */}
        {bug.tags && bug.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mb-2">
            {bug.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} className="text-[10px] px-1.5 py-0 h-5" />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-3 flex flex-col gap-2">
        {/* Validate Button (Tester/Admin only, when Resolved) */}
        {canValidateBug && bug.status === BugStatus.RESOLVED && !bug.validated && (
          <Button 
            className="w-full h-7 text-xs" 
            size="sm" 
            variant="outline"
            onClick={(e) => {
               e.stopPropagation();
               if (onValidate) onValidate(bug.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Validate Fix
          </Button>
        )}

        {/* Info Row */}
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" title={`Priority: ${bug.priority}`}>
              <PriorityIcon priority={bug.priority} className="h-3 w-3" />
              <span className="font-medium">{bug.priority}</span>
            </div>
            <div className="flex items-center gap-1" title={`Severity: ${bug.severity}`}>
              <SeverityIcon severity={bug.severity} className="h-3 w-3" />
              <span className="font-medium">{bug.severity}</span>
            </div>
          </div>

          <div className="flex items-center gap-2" title={assignedUserName ? `Assigned to ${assignedUserName}` : "Unassigned"}>
             {bug.assignedTo && assignedUserName ? (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(assignedUserName)}
                  </AvatarFallback>
                </Avatar>
             ) : (
                <Avatar className="h-5 w-5 opacity-50">
                  <AvatarFallback className="bg-transparent">
                    <UserIcon className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
             )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
