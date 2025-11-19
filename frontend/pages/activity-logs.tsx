import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { LoadingState } from '../components/LoadingState';
import { activityLogApi } from '../utils/apiClient';
import { ActivityLog } from '../utils/types';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  MessageSquare, 
  RefreshCw, 
  UserPlus, 
  Ticket,
  Clock
} from 'lucide-react';

/**
 * Activity Log Page - Redesigned
 * 
 * Following the Dark Activity Console design system
 * Features:
 * - Timeline-based layout with vertical rail
 * - Dark mode optimized with light mode support
 * - Grouped by date (Today, Yesterday, etc.)
 * - Avatar-based user identification
 * - Smooth hover states and interactions
 */

interface GroupedLogs {
  [key: string]: ActivityLog[];
}

const ActivityLogsPage: React.FC = () => {
  const router = useRouter();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: GroupedLogs = {};
    const now = new Date();
    
    activityLogs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      const diffDays = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey: string;
      if (diffDays === 0) {
        groupKey = 'Today';
      } else if (diffDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffDays < 7) {
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

  // Filter logs based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedLogs;
    
    const filtered: GroupedLogs = {};
    Object.entries(groupedLogs).forEach(([key, logs]) => {
      const matchedLogs = logs.filter(log => 
        log.performedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.bugTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchedLogs.length > 0) {
        filtered[key] = matchedLogs;
      }
    });
    
    return filtered;
  }, [groupedLogs, searchQuery]);

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
        return (
          <span className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            created ticket{' '}
            <button
              onClick={() => router.push(`/bugs/${log.bugId}`)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              {log.bugTitle}
            </button>
          </span>
        );
      case 'assigned':
        return (
          <span className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            assigned{' '}
            <button
              onClick={() => router.push(`/bugs/${log.bugId}`)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              {log.bugTitle}
            </button>
            {' '}to{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{log.assignedToName || 'a user'}</span>
          </span>
        );
      case 'status_changed':
        return (
          <span className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            changed the status of{' '}
            <button
              onClick={() => router.push(`/bugs/${log.bugId}`)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              {log.bugTitle}
            </button>
            {log.newStatus && (
              <>
                {' '}to{' '}
                <StatusBadge status={log.newStatus} />
              </>
            )}
          </span>
        );
      case 'validated':
        return (
          <span className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            commented on ticket{' '}
            <button
              onClick={() => router.push(`/bugs/${log.bugId}`)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              {log.bugTitle}
            </button>
          </span>
        );
      default:
        return (
          <span className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
            performed action on{' '}
            <button
              onClick={() => router.push(`/bugs/${log.bugId}`)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
            >
              {log.bugTitle}
            </button>
          </span>
        );
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
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

  if (loading) {
    return <LoadingState message="Loading activity logs..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md border border-gray-200 dark:border-gray-800">
          <p className="text-red-500 dark:text-red-400 mb-4 text-sm">{error}</p>
          <button
            onClick={fetchActivityLogs}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-all shadow-lg hover:shadow-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#02040A] transition-colors">
      <div className="max-w-[1200px] mx-auto px-8 py-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F9FAFB] tracking-tight">
            Activity Log
          </h1>
          <button className="flex items-center gap-2 px-4 h-9 bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-all shadow-lg hover:shadow-xl">
            <Plus className="w-3.5 h-3.5" />
            Create Ticket
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Filter by user, ticket ID, or activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white dark:bg-[#0B1020] border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-[#F9FAFB] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 h-9 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#151B2C] transition-all">
            <span>Date Range</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </button>
          <button className="flex items-center gap-2 px-3 h-9 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#151B2C] transition-all">
            <span>Activity Type</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Timeline */}
        {Object.keys(filteredGroups).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No activity logs found</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Start reporting and managing bugs to see activity here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredGroups).map(([dateGroup, logs]) => (
              <div key={dateGroup}>
                {/* Date Group Label */}
                <div className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {dateGroup}
                </div>

                {/* Timeline Items */}
                <div className="relative space-y-3">
                  {/* Timeline Rail */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-800" />

                  {logs.map((log) => (
                    <div key={log._id} className="relative">
                      {/* Timeline Node Icon */}
                      <div className="absolute left-0 top-3 w-8 h-8 bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-center text-blue-500 z-10">
                        {getActionIcon(log.action)}
                      </div>

                      {/* Activity Card */}
                      <div className="ml-12 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#151B2C] rounded-lg border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all cursor-pointer group">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-gray-100 dark:border-gray-800">
                            {getInitials(log.performedByName)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="flex-1">
                                <span className="font-semibold text-[14px] text-gray-900 dark:text-[#F9FAFB]">
                                  {log.performedByName}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400"> </span>
                                {getActionText(log)}
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(log.timestamp)}
                              </div>
                            </div>

                            {/* Project Info */}
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                              in{' '}
                              <button
                                onClick={() => router.push(`/projects/${log.projectId}`)}
                                className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors"
                              >
                                {log.projectName}
                              </button>
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
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('progress') || normalized.includes('open')) {
      return 'bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-[#FBBF24]';
    } else if (normalized.includes('review')) {
      return 'bg-purple-500/20 text-purple-400 dark:bg-purple-500/20 dark:text-[#C4B5FD]';
    } else if (normalized.includes('resolved') || normalized.includes('closed')) {
      return 'bg-green-500/15 text-green-500 dark:bg-green-500/15 dark:text-green-400';
    }
    return 'bg-blue-500/15 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  );
};

export default ActivityLogsPage;
