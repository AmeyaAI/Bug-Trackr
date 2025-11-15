"""Activity log API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from ..models.bug_model import ActivityLog
from .dependencies import Services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/activity-logs", tags=["activity-logs"])


class ActivityLogResponse:
    """Response model for activity log display."""
    pass


@router.get("", response_model=List[dict])
async def get_all_activity_logs(services: Services) -> List[dict]:
    """Retrieve all activity logs.
    
    Returns logs sorted by timestamp (newest first).
    
    Args:
        services: Injected service container
        
    Returns:
        List of activity log data with formatted display strings
        
    Raises:
        HTTPException: If retrieval fails
    """
    try:
        # Retrieve all activity logs using repository
        logs = await services.activity_log_repository.get_all()
        
        # Transform to response format with display strings
        log_responses = []
        for log in logs:
            log_responses.append({
                "_id": log.id,
                "bugId": log.bugId,
                "bugTitle": log.bugTitle,
                "projectId": log.projectId,
                "projectName": log.projectName,
                "action": log.action,
                "performedBy": log.performedBy,
                "performedByName": log.performedByName,
                "assignedToName": log.assignedToName,
                "newStatus": log.newStatus,
                "timestamp": log.timestamp.isoformat(),
            })
        
        logger.info(f"Retrieved {len(log_responses)} activity logs")
        return log_responses
        
    except Exception as e:
        logger.error(f"Error retrieving activity logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve activity logs")


@router.get("/bug/{bug_id}", response_model=List[dict])
async def get_activity_logs_by_bug(bug_id: str, services: Services) -> List[dict]:
    """Retrieve activity logs for a specific bug.
    
    Args:
        bug_id: Bug identifier
        services: Injected service container
        
    Returns:
        List of activity log data for the bug
        
    Raises:
        HTTPException: If retrieval fails
    """
    try:
        # Retrieve activity logs for bug using repository
        logs = await services.activity_log_repository.get_by_bug_id(bug_id)
        
        # Transform to response format
        log_responses = []
        for log in logs:
            log_responses.append({
                "_id": log.id,
                "bugId": log.bugId,
                "bugTitle": log.bugTitle,
                "projectId": log.projectId,
                "projectName": log.projectName,
                "action": log.action,
                "performedBy": log.performedBy,
                "performedByName": log.performedByName,
                "assignedToName": log.assignedToName,
                "newStatus": log.newStatus,
                "timestamp": log.timestamp.isoformat(),
            })
        
        logger.info(f"Retrieved {len(log_responses)} activity logs for bug {bug_id}")
        return log_responses
        
    except Exception as e:
        logger.error(f"Error retrieving activity logs for bug {bug_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve activity logs")
