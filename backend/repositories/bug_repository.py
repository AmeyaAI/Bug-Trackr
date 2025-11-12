"""Repository for Bug entity data access."""

from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import json

from backend.models.bug_model import Bug, BugStatus, BugPriority, BugSeverity
from backend.services.collection_db import CollectionDBService

logger = logging.getLogger(__name__)


class BugRepository:
    """Repository for bug data access using AppFlyte Collection DB.
    
    Handles transformation between Bug models and collection items,
    including datetime serialization and enum conversions.
    """

    def __init__(self, collection_service: CollectionDBService):
        """Initialize bug repository.
        
        Args:
            collection_service: CollectionDBService instance for data operations
        """
        self._service = collection_service
        self._collection = "ameya_tests"  # Collection name (service converts to singular for item ops)
        self._entity_type = "bug"

    def _bug_to_collection_item(self, bug: Bug) -> Dict[str, Any]:
        """Transform Bug model to collection item format.
        
        Collection DB only supports name, description, and created_at fields.
        We store the bug title in 'name' and all other fields as JSON in 'description'.
        
        Args:
            bug: Bug model instance
            
        Returns:
            Dictionary in collection item format
        """
        # Store structured data as JSON in description field
        data = {
            "type": self._entity_type,
            "description": bug.description,
            "status": bug.status.value,
            "priority": bug.priority.value,
            "severity": bug.severity.value,
            "projectId": bug.projectId,
            "reportedBy": bug.reportedBy,
            "assignedTo": bug.assignedTo,
            "tags": bug.tags,
            "validated": bug.validated,
            "updatedAt": bug.updatedAt.isoformat()
        }
        
        return {
            "name": bug.title,  # Bug title goes in name field
            "description": json.dumps(data),  # All other fields as JSON
            "created_at": bug.createdAt.isoformat()
        }

    def _collection_item_to_bug(self, item: Dict[str, Any]) -> Bug:
        """Transform collection item to Bug model.
        
        Parses the JSON-encoded description field to extract bug data.
        
        Args:
            item: Collection item dictionary
            
        Returns:
            Bug model instance
            
        Raises:
            ValueError: If description field is malformed or required fields are missing
        """
        from datetime import timezone
        
        # Check if response is wrapped in a payload structure
        if isinstance(item, dict) and "payload" in item:
            logger.debug("Extracting payload from item response")
            item = item["payload"]
        
        # Handle __auto_id__ from AppFlyte
        bug_id = item.get("__auto_id__")
        
        # Parse JSON from description field (workaround for limited schema)
        description_field = item.get("description", "{}")
        
        try:
            data = json.loads(description_field) if isinstance(description_field, str) else {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse description as JSON for bug {bug_id}: {e}")
            raise ValueError(
                f"Invalid bug data for bug_id '{bug_id}': "
                f"description field contains malformed JSON - {str(e)}"
            )
        
        # Extract bug title from name field
        title = item.get("name", "")
        
        # Extract fields from JSON data
        description = data.get("description", "")
        status = data.get("status", "Open")
        priority = data.get("priority", "Medium")
        severity = data.get("severity", "Minor")
        project_id = data.get("projectId", "")
        reported_by = data.get("reportedBy", "")
        assigned_to = data.get("assignedTo")
        tags = data.get("tags", [])
        validated = data.get("validated", False)
        
        # Parse created_at with robust type checking
        created_at = item.get("created_at")
        if created_at is None:
            created_at = datetime.now(timezone.utc)
        elif isinstance(created_at, datetime):
            pass  # Already a datetime
        elif isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except ValueError:
                logger.warning(f"Invalid datetime format for bug {bug_id}, using current time")
                created_at = datetime.now(timezone.utc)
        else:
            logger.warning(
                f"Unexpected type for created_at in bug {bug_id}: {type(created_at).__name__}, "
                f"using current time"
            )
            created_at = datetime.now(timezone.utc)
        
        # Parse updatedAt from JSON data
        updated_at = data.get("updatedAt")
        if updated_at is None:
            updated_at = created_at  # Default to created_at
        elif isinstance(updated_at, datetime):
            pass  # Already a datetime
        elif isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at)
            except ValueError:
                logger.warning(f"Invalid datetime format for updatedAt in bug {bug_id}, using created_at")
                updated_at = created_at
        else:
            logger.warning(
                f"Unexpected type for updatedAt in bug {bug_id}: {type(updated_at).__name__}, "
                f"using created_at"
            )
            updated_at = created_at
        
        return Bug(
            _id=bug_id,
            title=title,
            description=description,
            projectId=project_id,
            reportedBy=reported_by,
            assignedTo=assigned_to,
            status=status,
            priority=priority,
            severity=severity,
            tags=tags,
            validated=validated,
            createdAt=created_at,
            updatedAt=updated_at
        )

    async def create(self, bug: Bug) -> Bug:
        """Create a new bug.
        
        Args:
            bug: Bug model instance (without ID)
            
        Returns:
            Bug model with generated ID
            
        Raises:
            ValueError: If bug creation fails
        """
        logger.info(f"Creating bug: {bug.title}")
        
        # Transform to collection item format
        item_data = self._bug_to_collection_item(bug)
        
        # Create in collection DB
        created_item = await self._service.create_item(self._collection, item_data)
        
        # Transform back to Bug model
        return self._collection_item_to_bug(created_item)

    async def get_by_id(self, bug_id: str) -> Optional[Bug]:
        """Retrieve bug by ID.
        
        Args:
            bug_id: Bug ID (__auto_id__)
            
        Returns:
            Bug model or None if not found
        """
        logger.info(f"Retrieving bug by ID: {bug_id}")
        
        item = await self._service.get_item_by_id(self._collection, bug_id)
        
        if item is None:
            logger.warning(f"Bug not found: {bug_id}")
            return None
        
        return self._collection_item_to_bug(item)

    async def get_all(
        self,
        project_id: Optional[str] = None,
        status: Optional[BugStatus] = None,
        assigned_to: Optional[str] = None
    ) -> List[Bug]:
        """Retrieve bugs with optional filtering.
        
        Note: Filtering is done in-memory after fetching all items.
        
        Args:
            project_id: Filter by project ID
            status: Filter by bug status
            assigned_to: Filter by assigned user
            
        Returns:
            List of Bug models
        """
        logger.info(f"Retrieving all bugs (filters: projectId={project_id}, status={status}, assignedTo={assigned_to})")
        
        # Fetch all items from collection (filtering not supported by service)
        items = await self._service.get_all_items(self._collection)
        
        # Filter items in-memory (data is in JSON description field)
        filtered_items = []
        for item in items:
            description = item.get("description", "")
            
            # Skip empty descriptions
            if not description:
                continue
            
            # Parse JSON and check type
            try:
                data = json.loads(description) if isinstance(description, str) else {}
                
                # Only process items with matching type
                if data.get("type") != self._entity_type:
                    continue
                
                # Apply filters
                if project_id is not None and data.get("projectId") != project_id:
                    continue
                if status is not None and data.get("status") != status.value:
                    continue
                if assigned_to is not None and data.get("assignedTo") != assigned_to:
                    continue
                
                filtered_items.append(item)
                
            except json.JSONDecodeError as e:
                # Log parsing failures
                logger.warning(f"Failed to parse description as JSON: {e}")
                continue

        # Transform to Bug models
        bugs = [self._collection_item_to_bug(item) for item in filtered_items]
        logger.info(f"Retrieved {len(bugs)} bugs after filtering")
        return bugs

    async def update_status(
        self,
        bug_id: str,
        status: BugStatus,
        updated_at: datetime
    ) -> Bug:
        """Update bug status.
        
        Args:
            bug_id: Bug ID
            status: New status
            updated_at: Update timestamp
            
        Returns:
            Updated Bug model
            
        Raises:
            ValueError: If bug not found
        """
        logger.info(f"Updating bug status: {bug_id} -> {status.value}")
        
        # Get current bug
        current_bug = await self.get_by_id(bug_id)
        if not current_bug:
            raise ValueError(f"Bug with ID {bug_id} not found")
        
        # Update fields
        current_bug.status = status
        current_bug.updatedAt = updated_at
        
        # Reconstruct collection item with updated JSON
        item_data = self._bug_to_collection_item(current_bug)
        
        # Update only the description field (which contains the JSON)
        updates = {
            "description": item_data["description"]
        }
        
        updated_item = await self._service.update_item(self._collection, bug_id, updates)
        return self._collection_item_to_bug(updated_item)

    async def update_assignment(
        self,
        bug_id: str,
        assigned_to: str,
        updated_at: datetime
    ) -> Bug:
        """Update bug assignment.
        
        Args:
            bug_id: Bug ID
            assigned_to: User ID to assign to
            updated_at: Update timestamp
            
        Returns:
            Updated Bug model
            
        Raises:
            ValueError: If bug not found
        """
        logger.info(f"Updating bug assignment: {bug_id} -> {assigned_to}")
        
        # Get current bug
        current_bug = await self.get_by_id(bug_id)
        if not current_bug:
            raise ValueError(f"Bug with ID {bug_id} not found")
        
        # Update fields
        current_bug.assignedTo = assigned_to
        current_bug.updatedAt = updated_at
        
        # Reconstruct collection item with updated JSON
        item_data = self._bug_to_collection_item(current_bug)
        
        # Update only the description field (which contains the JSON)
        updates = {
            "description": item_data["description"]
        }
        
        updated_item = await self._service.update_item(self._collection, bug_id, updates)
        return self._collection_item_to_bug(updated_item)

    async def update_validation(
        self,
        bug_id: str,
        validated: bool,
        updated_at: datetime
    ) -> Bug:
        """Update bug validation status.
        
        Args:
            bug_id: Bug ID
            validated: Validation status
            updated_at: Update timestamp
            
        Returns:
            Updated Bug model
            
        Raises:
            ValueError: If bug not found
        """
        logger.info(f"Updating bug validation: {bug_id} -> {validated}")
        
        # Get current bug
        current_bug = await self.get_by_id(bug_id)
        if not current_bug:
            raise ValueError(f"Bug with ID {bug_id} not found")
        
        # Update fields
        current_bug.validated = validated
        current_bug.updatedAt = updated_at
        
        # Reconstruct collection item with updated JSON
        item_data = self._bug_to_collection_item(current_bug)
        
        # Update only the description field (which contains the JSON)
        updates = {
            "description": item_data["description"]
        }
        
        updated_item = await self._service.update_item(self._collection, bug_id, updates)
        return self._collection_item_to_bug(updated_item)

    async def update_fields(
        self,
        bug_id: str,
        updates: Dict[str, Any]
    ) -> Bug:
        """Update multiple bug fields.
        
        Args:
            bug_id: Bug ID
            updates: Dictionary of field names to new values
            
        Returns:
            Updated Bug model
            
        Raises:
            ValueError: If bug not found or updates is empty
        """
        logger.info(f"Updating bug fields: {bug_id} with {len(updates)} field(s)")
        
        # Validate updates is not empty (fail-fast)
        if not updates:
            raise ValueError("updates cannot be empty")
        
        # Get current bug
        current_bug = await self.get_by_id(bug_id)
        if not current_bug:
            raise ValueError(f"Bug with ID {bug_id} not found")
        
        # Apply updates to bug model
        for key, value in updates.items():
            if hasattr(current_bug, key):
                setattr(current_bug, key, value)
            else:
                logger.warning(f"Ignoring unknown field: {key}")
        
        # Reconstruct collection item with updated JSON
        item_data = self._bug_to_collection_item(current_bug)
        
        # Update only the description field (which contains the JSON)
        collection_updates = {
            "description": item_data["description"]
        }
        
        updated_item = await self._service.update_item(self._collection, bug_id, collection_updates)
        return self._collection_item_to_bug(updated_item)

    async def delete(self, bug_id: str) -> bool:
        """Delete a bug by ID.
        
        Args:
            bug_id: Bug ID (__auto_id__)
            
        Returns:
            True if deleted successfully, False otherwise
        """
        logger.info(f"Deleting bug: {bug_id}")
        
        success = await self._service.delete_item(self._collection, bug_id)
        
        if success:
            logger.info(f"Bug deleted: {bug_id}")
        else:
            logger.warning(f"Failed to delete bug: {bug_id}")
        
        return success
