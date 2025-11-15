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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bug, BugStatus, BugPriority } from "@/utils/types";
import { getInitials } from "@/lib/utils";
import { useUser, usePermission } from "@/contexts/UserContext";
import { PriorityIcon } from "@/components/PriorityIcon";
import { SeverityIcon } from "@/components/SeverityIcon";

interface BugCardProps {
  bug: Bug;
  commentCount?: number;
  assignedUserName?: string;
  onStatusUpdate?: (bugId: string, newStatus: BugStatus) => void;
  onViewDetails?: (bugId: string) => void;
}

/**
 * Get badge variant based on bug status
 */
const getStatusVariant = (
  status: BugStatus
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case BugStatus.OPEN:
      return "destructive";
    case BugStatus.IN_PROGRESS:
      return "default";
    case BugStatus.RESOLVED:
      return "secondary";
    case BugStatus.CLOSED:
      return "outline";
    default:
      return "outline";
  }
};

/**
 * Get badge variant based on priority
 */
const getPriorityVariant = (
  priority: BugPriority
): "default" | "secondary" | "destructive" | "outline" => {
  switch (priority) {
    case BugPriority.HIGHEST:
      return "destructive";
    case BugPriority.HIGH:
      return "destructive";
    case BugPriority.MEDIUM:
      return "default";
    case BugPriority.LOW:
      return "default";
    case BugPriority.LOWEST:
      return "secondary";
    default:
      return "outline";
  }
};



export const BugCard: React.FC<BugCardProps> = ({
  bug,
  commentCount = 0,
  assignedUserName,
  onStatusUpdate,
  onViewDetails,
}) => {
  const { currentUser } = useUser();
  const canUpdateStatus = usePermission('canUpdateStatus');
  const canCloseBug = usePermission('canCloseBug');

  const handleStatusChange = (newStatus: BugStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(bug._id, newStatus);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(bug._id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <CardTitle className="text-lg break-words line-clamp-2 leading-tight mb-2">
              {bug.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 break-words">
              {bug.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <Badge variant={getStatusVariant(bug.status)} className="whitespace-nowrap">
              {bug.status}
            </Badge>
            <Badge variant={getPriorityVariant(bug.priority)} className="whitespace-nowrap flex items-center gap-1">
              <PriorityIcon priority={bug.priority} />
              {bug.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
          {/* Severity indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-medium">Severity:</span>
            <div className="flex items-center gap-1">
              <SeverityIcon severity={bug.severity} />
              <span>{bug.severity}</span>
            </div>
          </div>

          {/* Comment count */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{commentCount}</span>
          </div>

          {/* Validated indicator */}
          {bug.validated && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              ✓ Validated
            </Badge>
          )}
        </div>

        {/* Assignment info */}
        {bug.assignedTo && (
          <div className="flex items-center gap-2 mt-3 min-w-0">
            <Avatar className="size-6 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {assignedUserName ? getInitials(assignedUserName) : "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              Assigned to {assignedUserName || "User"}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 flex-wrap pt-3">
        {/* Role-based quick action buttons */}
        {currentUser && (
          <>
            {/* Developer-specific: Status update controls */}
            {canUpdateStatus && bug.status === BugStatus.OPEN && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(BugStatus.IN_PROGRESS)}
                className="flex-shrink-0"
              >
                Start Progress
              </Button>
            )}

            {canUpdateStatus && bug.status === BugStatus.IN_PROGRESS && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(BugStatus.RESOLVED)}
                className="flex-shrink-0"
              >
                Mark Resolved
              </Button>
            )}

            {/* Tester-specific: Validation and closure controls */}
            {canCloseBug && bug.status === BugStatus.RESOLVED && bug.validated && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(BugStatus.CLOSED)}
                className="flex-shrink-0"
              >
                Close Bug
              </Button>
            )}
          </>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={handleViewDetails}
          className="ml-auto flex-shrink-0"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};
