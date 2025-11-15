import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LoadingState } from '../components/LoadingState';
import { activityLogApi } from '../utils/apiClient';
import { ActivityLog } from '../utils/types';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

/**
 * Activity Logs Page
 * 
 * Displays all activity logs in the system, showing:
 * - User actions (reported, assigned, status_changed, validated)
 * - Clickable links to bugs and projects
 * - Timestamps for each activity
 */

const ActivityLogsPage: React.FC = () => {
  const router = useRouter();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const logs = await activityLogApi.getAll();
      setActivityLogs(logs);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      setError('Failed to load activity logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getActionText = (log: ActivityLog): JSX.Element => {
    switch (log.action) {
      case 'reported':
        return (
          <>
            reported a bug in{' '}
            <button
              onClick={() => router.push(`/projects/${log.projectId}`)}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              {log.projectName}
            </button>
          </>
        );
      case 'assigned':
        return (
          <>
            assigned{' '}
            <span className="font-semibold text-gray-900">{log.assignedToName || 'a user'}</span>
            {' '}to a bug in{' '}
            <button
              onClick={() => router.push(`/projects/${log.projectId}`)}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              {log.projectName}
            </button>
          </>
        );
      case 'status_changed':
        return (
          <>
            updated the bug status to{' '}
            <span className="font-semibold text-gray-900">{log.newStatus || 'a new status'}</span>
            {' '}in{' '}
            <button
              onClick={() => router.push(`/projects/${log.projectId}`)}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              {log.projectName}
            </button>
          </>
        );
      case 'validated':
        return (
          <>
            validated a bug in{' '}
            <button
              onClick={() => router.push(`/projects/${log.projectId}`)}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              {log.projectName}
            </button>
          </>
        );
      default:
        return (
          <>
            performed action &quot;{log.action}&quot; on bug in{' '}
            <button
              onClick={() => router.push(`/projects/${log.projectId}`)}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              {log.projectName}
            </button>
          </>
        );
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'reported':
        return 'bg-blue-500';
      case 'assigned':
        return 'bg-purple-500';
      case 'status_changed':
        return 'bg-yellow-500';
      case 'validated':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <LoadingState message="Loading activity logs..." />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchActivityLogs}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity Log</h1>
        <p className="text-gray-600">Track all bug-related activities in your projects</p>
      </div>

      {activityLogs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No activity logs found</p>
              <p className="text-gray-400 mt-2">Start reporting and managing bugs to see activity here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activityLogs.map((log) => (
            <Card key={log._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Action Badge */}
                  <div className={`flex-shrink-0 w-3 h-3 rounded-full ${getActionColor(log.action)} mt-2`} />
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{log.performedByName}</span>
                      <span className="text-gray-600">{getActionText(log)}</span>
                    </div>
                    
                    {/* Bug Details */}
                    <div className="mt-2">
                      <button
                        onClick={() => router.push(`/bugs/${log.bugId}`)}
                        className="text-gray-700 hover:text-gray-900 hover:underline inline-flex items-center gap-1"
                      >
                        <span className="text-sm text-gray-500">Bug:</span>
                        <span className="font-medium">{log.bugTitle}</span>
                      </button>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="mt-2 text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                  
                  {/* Action Type Badge */}
                  <div className="flex-shrink-0">
                    <Badge 
                      variant="secondary" 
                      className={`${getActionColor(log.action)} text-white`}
                    >
                      {log.action}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLogsPage;
