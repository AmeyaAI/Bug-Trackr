"""Repository for Comment entity data access."""

from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import json

from backend.models.bug_model import Comment
from backend.services.collection_db import CollectionDBService

logger = logging.getLogger(__name__)


class CommentRepository:
    """Repository for comment data access using AppFlyte Collection DB.
    
    Handles transformation between Comment models and collection items,
    including datetime serialization.
    """

    def __init__(self, collection_service: CollectionDBService):
        """Initialize comment repository.
        
        Args:
            collection_service: CollectionDBService instance for data operations
        """
        self._service = collection_service
        self._collection = "ameya_tests"  # Collection name (service converts to singular for item ops)
        self._entity_type = "comment"

    def _comment_to_collection_item(self, comment: Comment) -> Dict[str, Any]:
        """Transform Comment model to collection item format.
        
        Collection DB only supports name, description, and created_at fields.
        We store a display identifier in 'name' and all comment data as JSON in 'description'.
        
        Args:
            comment: Comment model instance
            
        Returns:
            Dictionary in collection item format
        """
        # Store structured data as JSON in description field
        data = {
            "type": self._entity_type,
            "bugId": comment.bugId,
            "authorId": comment.authorId,
            "message": comment.message
        }
        
        return {
            "name": f"Comment by {comment.authorId}",  # Display identifier
            "description": json.dumps(data),  # All comment data as JSON
            "created_at": comment.createdAt.isoformat()
        }

    def _collection_item_to_comment(self, item: Dict[str, Any]) -> Comment:
        """Transform collection item to Comment model.
        
        Parses the JSON-encoded description field to extract comment data.
        
        Args:
            item: Collection item dictionary
            
        Returns:
            Comment model instance
            
        Raises:
            ValueError: If description field is malformed or required fields are missing
        """
        from datetime import timezone
        
        # Check if response is wrapped in a payload structure
        if isinstance(item, dict) and "payload" in item:
            logger.debug("Extracting payload from item response")
            item = item["payload"]
        
        # Handle __auto_id__ from AppFlyte
        comment_id = item.get("__auto_id__")
        
        # Parse JSON from description field
        description_field = item.get("description", "{}")
        
        try:
            data = json.loads(description_field) if isinstance(description_field, str) else {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse description as JSON for comment {comment_id}: {e}")
            raise ValueError(
                f"Invalid comment data for comment_id '{comment_id}': "
                f"description field contains malformed JSON - {str(e)}"
            )
        
        # Extract fields from JSON data
        bug_id = data.get("bugId", "")
        author_id = data.get("authorId", "")
        message = data.get("message", "")
        
        # Parse created_at with robust type checking
        created_at = item.get("created_at")
        if created_at is None:
            created_at = datetime.now(timezone.utc)
        elif isinstance(created_at, datetime):
            pass  # Already a datetime
        elif isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
                # Ensure timezone-aware
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
            except ValueError:
                logger.warning(f"Invalid datetime format for comment {comment_id}, using current time")
                created_at = datetime.now(timezone.utc)
        else:
            logger.warning(
                f"Unexpected type for created_at in comment {comment_id}: {type(created_at).__name__}, "
                f"using current time"
            )
            created_at = datetime.now(timezone.utc)        
        return Comment(
            _id=comment_id,
            bugId=bug_id,
            authorId=author_id,
            message=message,
            createdAt=created_at
        )
    async def create(self, comment: Comment) -> Comment:
        """Create a new comment.
        
        Args:
            comment: Comment model instance (without ID)
            
        Returns:
            Comment model with generated ID
            
        Raises:
            ValueError: If comment creation fails
        """
        logger.info(f"Creating comment for bug: {comment.bugId}")
        
        # Transform to collection item format
        item_data = self._comment_to_collection_item(comment)
        
        # Create in collection DB
        created_item = await self._service.create_item(self._collection, item_data)
        
        # Transform back to Comment model
        return self._collection_item_to_comment(created_item)

    async def get_by_id(self, comment_id: str) -> Optional[Comment]:
        """Retrieve comment by ID.
        
        Args:
            comment_id: Comment ID (__auto_id__)
            
        Returns:
            Comment model or None if not found
        """
        logger.info(f"Retrieving comment by ID: {comment_id}")
        
        item = await self._service.get_item_by_id(self._collection, comment_id)
        
        if item is None:
            logger.warning(f"Comment not found: {comment_id}")
            return None
        
        return self._collection_item_to_comment(item)

    async def get_by_bug_id(self, bug_id: str) -> List[Comment]:
        """Retrieve all comments for a bug.
        
        Filters in-memory and sorts by createdAt.
        
        Args:
            bug_id: Bug ID to filter comments
            
        Returns:
            List of Comment models sorted by createdAt
        """
        logger.info(f"Retrieving comments for bug: {bug_id}")
        
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
                
                # Check if this is a comment (has type field)
                if data.get("type") != self._entity_type:
                    continue
                
                # Check if bugId matches
                if data.get("bugId") == bug_id:
                    filtered_items.append(item)
                        
            except json.JSONDecodeError as e:
                # Log parsing failures
                logger.warning(f"Failed to parse description as JSON: {e}")
                continue
        
        # Transform to Comment models
        comments = [self._collection_item_to_comment(item) for item in filtered_items]
        
        # Sort by createdAt
        comments.sort(key=lambda c: c.createdAt)
        
        logger.info(f"Retrieved {len(comments)} comments for bug {bug_id}")
        return comments

    async def delete(self, comment_id: str) -> bool:
        """Delete a comment by ID.
        
        Args:
            comment_id: Comment ID (__auto_id__)
            
        Returns:
            True if deleted successfully, False otherwise
        """
        logger.info(f"Deleting comment: {comment_id}")
        
        success = await self._service.delete_item(self._collection, comment_id)
        
        if success:
            logger.info(f"Comment deleted: {comment_id}")
        else:
            logger.warning(f"Failed to delete comment: {comment_id}")
        
        return success
