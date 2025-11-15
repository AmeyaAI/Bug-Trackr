"""Repository for ActivityLog entity data access."""

from typing import List, Dict, Any
from datetime import datetime
import logging
import json

from backend.models.bug_model import ActivityLog
from backend.services.collection_db import CollectionDBService

logger = logging.getLogger(__name__)


class ActivityLogRepository:
    """Repository for activity log data access using AppFlyte Collection DB.
    
    Handles transformation between ActivityLog models and collection items,
    including datetime serialization.
    """

    def __init__(self, collection_service: CollectionDBService):
        """Initialize activity log repository.
        
        Args:
            collection_service: CollectionDBService instance for data operations
        """
        self._service = collection_service
        self._collection = "ameya_tests"  # Collection name (service converts to singular for item ops)
        self._entity_type = "activity_log"

    def _activity_log_to_collection_item(self, activity_log: ActivityLog) -> Dict[str, Any]:
        """Transform ActivityLog model to collection item format.
        
        Collection DB only supports name, description, and created_at fields.
        We store a display identifier in 'name' and all log data as JSON in 'description'.
        
        Args:
            activity_log: ActivityLog model instance
            
        Returns:
            Dictionary in collection item format
        """
        # Store structured data as JSON in description field
        data = {
            "type": self._entity_type,
            "bugId": activity_log.bugId,
            "bugTitle": activity_log.bugTitle,
            "projectId": activity_log.projectId,
            "projectName": activity_log.projectName,
            "action": activity_log.action,
            "performedBy": activity_log.performedBy,
            "performedByName": activity_log.performedByName,
            "assignedToName": activity_log.assignedToName,
            "newStatus": activity_log.newStatus
        }
        
        return {
            "name": f"{activity_log.performedByName} {activity_log.action}",  # Display identifier
            "description": json.dumps(data),  # All log data as JSON
            "created_at": activity_log.timestamp.isoformat()
        }

    def _collection_item_to_activity_log(self, item: Dict[str, Any]) -> ActivityLog:
        """Transform collection item to ActivityLog model.
        
        Parses the JSON-encoded description field to extract activity log data.
        
        Args:
            item: Collection item dictionary
            
        Returns:
            ActivityLog model instance
            
        Raises:
            ValueError: If description field is malformed or required fields are missing
        """
        from datetime import timezone
        
        # Check if response is wrapped in a payload structure
        if isinstance(item, dict) and "payload" in item:
            logger.debug("Extracting payload from item response")
            item = item["payload"]
        
        # Handle __auto_id__ from AppFlyte
        log_id = item.get("__auto_id__")
        
        # Parse JSON from description field
        description_field = item.get("description", "{}")
        
        try:
            data = json.loads(description_field) if isinstance(description_field, str) else {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse description as JSON for activity log {log_id}: {e}")
            raise ValueError(
                f"Invalid activity log data for log_id '{log_id}': "
                f"description field contains malformed JSON - {str(e)}"
            )
        
        # Extract fields from JSON data
        bug_id = data.get("bugId", "")
        bug_title = data.get("bugTitle", "")
        project_id = data.get("projectId", "")
        project_name = data.get("projectName", "")
        action = data.get("action", "")
        performed_by = data.get("performedBy", "")
        performed_by_name = data.get("performedByName", "")
        assigned_to_name = data.get("assignedToName")
        new_status = data.get("newStatus")
        
        # Parse created_at (timestamp) with robust type checking
        timestamp = item.get("created_at")
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)
        elif isinstance(timestamp, datetime):
            pass  # Already a datetime
        elif isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp)
            except ValueError:
                logger.warning(f"Invalid datetime format for activity log {log_id}, using current time")
                timestamp = datetime.now(timezone.utc)
        else:
            logger.warning(
                f"Unexpected type for created_at in activity log {log_id}: {type(timestamp).__name__}, "
                f"using current time"
            )
            timestamp = datetime.now(timezone.utc)
        
        return ActivityLog(
            _id=log_id,
            bugId=bug_id,
            bugTitle=bug_title,
            projectId=project_id,
            projectName=project_name,
            action=action,
            performedBy=performed_by,
            performedByName=performed_by_name,
            assignedToName=assigned_to_name,
            newStatus=new_status,
            timestamp=timestamp
        )

    async def create(self, activity_log: ActivityLog) -> ActivityLog:
        """Create a new activity log entry.
        
        Args:
            activity_log: ActivityLog model instance (without ID)
            
        Returns:
            ActivityLog model with generated ID
            
        Raises:
            ValueError: If activity log creation fails
        """
        logger.info(f"Creating activity log for bug: {activity_log.bugId} - {activity_log.action}")
        
        # Transform to collection item format
        item_data = self._activity_log_to_collection_item(activity_log)
        
        # Create in collection DB
        created_item = await self._service.create_item(self._collection, item_data)
        
        # Transform back to ActivityLog model
        return self._collection_item_to_activity_log(created_item)

    async def get_by_bug_id(self, bug_id: str) -> List[ActivityLog]:
        """Retrieve activity logs for a bug.
        
        Filters in-memory and sorts by timestamp (descending).
        
        Args:
            bug_id: Bug ID to filter activity logs
            
        Returns:
            List of ActivityLog models sorted by timestamp (newest first)
        """
        logger.info(f"Retrieving activity logs for bug: {bug_id}")
        
        # Fetch all items from collection
        items = await self._service.get_all_items(self._collection)
        
        # Filter items in-memory (since data is in JSON description field)
        filtered_items = []
        for item in items:
            description = item.get("description", "")
            
            # Skip empty descriptions
            if not description:
                continue
            
            # Parse JSON and check type and bugId
            try:
                data = json.loads(description)
                
                # Only process items with matching type and bugId
                if data.get("type") == self._entity_type and data.get("bugId") == bug_id:
                    try:
                        filtered_items.append(item)
                    except ValueError as e:
                        # Skip malformed activity log data but log the error
                        logger.warning(f"Skipping malformed activity log data: {e}")
                        continue
                        
            except json.JSONDecodeError as e:
                # Log parsing failures
                logger.warning(f"Failed to parse description as JSON: {e}")
                continue
        
        # Transform to ActivityLog models
        logs = [self._collection_item_to_activity_log(item) for item in filtered_items]
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda l: l.timestamp, reverse=True)
        
        logger.info(f"Retrieved {len(logs)} activity logs for bug {bug_id}")
        return logs

    async def get_all(self) -> List[ActivityLog]:
        """Retrieve all activity logs.
        
        Sorts by timestamp (descending).
        
        Returns:
            List of ActivityLog models sorted by timestamp (newest first)
        """
        logger.info("Retrieving all activity logs")
        
        # Fetch all items from collection
        items = await self._service.get_all_items(self._collection)
        
        # Filter items in-memory (since data is in JSON description field)
        filtered_items = []
        for item in items:
            description = item.get("description", "")
            
            # Skip empty descriptions
            if not description:
                continue
            
            # Parse JSON and check type
            try:
                data = json.loads(description)
                
                # Only process items with matching type
                if data.get("type") == self._entity_type:
                    try:
                        filtered_items.append(item)
                    except ValueError as e:
                        # Skip malformed activity log data but log the error
                        logger.warning(f"Skipping malformed activity log data: {e}")
                        continue
                        
            except json.JSONDecodeError as e:
                # Log parsing failures
                logger.warning(f"Failed to parse description as JSON: {e}")
                continue
        
        # Transform to ActivityLog models
        logs = [self._collection_item_to_activity_log(item) for item in filtered_items]
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda l: l.timestamp, reverse=True)
        
        logger.info(f"Retrieved {len(logs)} activity logs")
        return logs
