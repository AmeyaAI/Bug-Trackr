import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { activityLogApi } from '../utils/apiClient';
import { ActivityLog } from '../utils/types';
import { 
  X, 
  Ticket, 
  UserPlus, 
  RefreshCw, 
  MessageSquare, 
  Clock 
} from 'lucide-react';
import { LoadingState } from './LoadingState';

interface BugActivityLogProps {
  bugId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedLogs {
  [key: string]: ActivityLog[];
}

export const BugActivityLog: React.FC<BugActivityLogProps> = ({ bugId, isOpen, onClose }) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use the existing API with bugId filter
        const logs = await activityLogApi.getByBugId(bugId);
        setActivityLogs(logs);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
        setError('Failed to load activity logs.');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && bugId) {
      fetchActivityLogs();
    }
  }, [isOpen, bugId]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    // Sort logs by timestamp descending first to ensure correct order within groups
    const sortedLogs = [...activityLogs].sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    const groups: GroupedLogs = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    sortedLogs.forEach((log) => {
      const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
      
      let groupKey: string;
      if (logDay.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (logDay.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (now.getTime() - logDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        groupKey = logDate.toLocaleDateString('en-US', { weekday: 'long' });
      } else {
        groupKey = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(log);
    });
    
    return groups;
  }, [activityLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'reported':
        return <Ticket className="w-4 h-4" />;
      case 'assigned':
        return <UserPlus className="w-4 h-4" />;
      case 'status_changed':
        return <RefreshCw className="w-4 h-4" />;
      case 'validated':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Ticket className="w-4 h-4" />;
    }
  };

  const getActionText = (log: ActivityLog): JSX.Element => {
    switch (log.action) {
      case 'reported':
        return <span className="text-sm text-gray-600 dark:text-gray-400">created this ticket</span>;
      case 'assigned':
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            assigned to <span className="font-semibold text-gray-900 dark:text-gray-100">{log.assignedToName || 'a user'}</span>
          </span>
        );
      case 'status_changed':
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            changed status to <StatusBadge status={log.newStatus || ''} />
          </span>
        );
      case 'validated':
        return <span className="text-sm text-gray-600 dark:text-gray-400">validated this ticket</span>;
      default:
        return <span className="text-sm text-gray-600 dark:text-gray-400">performed an action</span>;
    }
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-white dark:bg-[#0B1020] shadow-2xl z-[9999] overflow-hidden flex flex-col border-l border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#02040A]">
            {loading ? (
              <LoadingState message="Loading activities..." />
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : Object.keys(groupedLogs).length === 0 ? (
              <div className="text-center py-10 text-gray-500">No activity recorded yet.</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedLogs).map(([dateGroup, logs]) => (
                  <div key={dateGroup}>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
                      {dateGroup}
                    </div>
                    <div className="relative space-y-3">
                      {/* Vertical Line */}
                      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-800" />
                      
                      {logs.map((log) => (
                        <div key={log.id} className="relative">
                          {/* Icon Node */}
                          <div className="absolute left-0 top-3 w-8 h-8 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-center text-blue-500 z-10">
                            {getActionIcon(log.action)}
                          </div>
                          
                          {/* Card Content */}
                          <div className="ml-12 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#151B2C] rounded-lg border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all cursor-pointer group">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-gray-100 dark:border-gray-800">
                                {getInitials(log.performedByName || 'Unknown')}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-[#F9FAFB]">
                                      {log.performedByName || 'Unknown User'}
                                    </span>
                                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTimestamp(log.timestamp)}
                                    </span>
                                  </div>
                                  
                                  <div className="text-sm">
                                    {getActionText(log)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('progress') || normalized.includes('open')) {
      return 'bg-amber-500/15 text-amber-400';
    } else if (normalized.includes('review')) {
      return 'bg-purple-500/20 text-purple-400';
    } else if (normalized.includes('resolved') || normalized.includes('closed')) {
      return 'bg-green-500/15 text-green-500';
    }
    return 'bg-blue-500/15 text-blue-500';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  );
};
