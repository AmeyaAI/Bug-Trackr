/**
 * CommentSection Component
 * 
 * Renders chronological comment threads with author information.
 * Implements comment creation form and displays author data from Collection DB.
 * 
 * Requirements: 4.3, 4.4
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Comment } from '@/utils/types';
import { getInitials } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/badgeHelpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CommentSectionProps {
  bugId: string;
  comments: Comment[];
  currentUserId: string;
  currentUserName: string;
  onAddComment: (bugId: string, message: string) => Promise<void>;
  getUserName?: (userId: string) => string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  bugId,
  comments,
  currentUserId,
  currentUserName,
  onAddComment,
  getUserName = () => 'Unknown User',
}) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    
    // Optimistic UI: Clear input immediately
    setNewComment('');

    try {
      await onAddComment(bugId, commentText);
    } catch (error) {
      console.error('Failed to add comment:', error);
      // Restore text on error
      setNewComment(commentText);
    }
  };

  // Sort comments chronologically (oldest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment thread */}
        {sortedComments.length > 0 ? (
          <div className="space-y-4">
            {sortedComments.map((comment) => {
              const authorName = getUserName(comment.authorId);
              const isCurrentUser = comment.authorId === currentUserId;

              return (
                <div
                  key={comment.id}
                  className="flex gap-3 pb-4 border-b last:border-b-0"
                >
                  <Avatar className="size-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {getInitials(authorName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {authorName}
                        {isCurrentUser && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (you)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comment.message}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}

        {/* Comment creation form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="size-8 mt-2">
              <AvatarFallback className="text-xs">
                {getInitials(currentUserName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <MarkdownEditor
                value={newComment}
                onChange={setNewComment}
                placeholder="Add a comment..."
                minHeight="100px"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewComment('')}
              disabled={!newComment.trim()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim()}
            >
              Post Comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
