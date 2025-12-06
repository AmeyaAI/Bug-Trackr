import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PriorityIcon } from '@/components/PriorityIcon';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { useBugs, useProjects, useAllSprints } from '@/lib/hooks/useData';
import { BugStatus, BugPriority, Bug } from '@/utils/types';
import { getStatusBadgeVariant, getProjectName } from '@/utils/badgeHelpers';
import { AlertCircle, CheckCircle2, Clock, Plus, ArrowRight, Layout, Bug as BugIcon, Calendar } from 'lucide-react';
import WelcomeScreen from '@/components/WelcomeScreen';
import { bugApi } from '@/utils/apiClient';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BugStatistics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  highest: number;
  high: number;
}

export default function Home() {
  const router = useRouter();
  const { currentUser } = useUser();
  const { bugs, isLoading: isLoadingBugs } = useBugs();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { sprints } = useAllSprints();
  
  const [showWelcome, setShowWelcome] = useState(false);
  const [assignedBugs, setAssignedBugs] = useState<Bug[]>([]);
  const [assignedTab, setAssignedTab] = useState<'active' | 'backlog' | 'review'>('active');
  const dataLoaded = !isLoadingBugs && !isLoadingProjects;

  // Show welcome screen only on first load of the session
  useEffect(() => {
    const checkWelcome = () => {
      if (typeof window !== 'undefined') {
        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
          setShowWelcome(true);
          sessionStorage.setItem('hasSeenWelcome', 'true');
        }
      }
    };
    checkWelcome();
  }, []);

  // Fetch assigned bugs
  useEffect(() => {
    const fetchAssignedBugs = async () => {
      if (!currentUser) return;
      try {
        const assignedData = await bugApi.getPaginated(100, undefined, {
            assignedTo: currentUser.id
        });
        setAssignedBugs(assignedData.bugs);
      } catch (error) {
        console.error('Failed to fetch assigned bugs', error);
      }
    };
    fetchAssignedBugs();
  }, [currentUser]);

  // Calculate statistics
  const statistics: BugStatistics = {
    total: bugs.length,
    open: bugs.filter(b => b.status === BugStatus.OPEN).length,
    inProgress: bugs.filter(b => b.status === BugStatus.IN_PROGRESS).length,
    resolved: bugs.filter(b => b.status === BugStatus.RESOLVED).length,
    closed: bugs.filter(b => b.status === BugStatus.CLOSED).length,
    highest: bugs.filter(b => b.priority === BugPriority.HIGHEST).length,
    high: bugs.filter(b => b.priority === BugPriority.HIGH).length,
  };

  // Active Sprint Logic
  const activeSprint = sprints.find(s => s.status === 'active') || sprints[0];
  const sprintProgress = activeSprint ? (() => {
      const start = new Date(activeSprint.startDate).getTime();
      const end = new Date(activeSprint.endDate).getTime();
      const now = new Date().getTime();
      const total = end - start;
      const current = now - start;
      return Math.min(100, Math.max(0, (current / total) * 100));
  })() : 0;
  const daysRemaining = activeSprint ? Math.ceil((new Date(activeSprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;


  const filteredAssignedBugs = assignedBugs.filter(bug => {
      if (assignedTab === 'active') return bug.status === BugStatus.IN_PROGRESS;
      if (assignedTab === 'backlog') return bug.status === BugStatus.OPEN;
      if (assignedTab === 'review') return bug.status === BugStatus.RESOLVED;
      return false;
  });

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  return (
    <>
      {/* Always render the dashboard content */}
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="w-full space-y-8">

          {currentUser ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">Welcome Back, {currentUser.name}</h1>
                <p className="text-muted-foreground mt-2">
                  Here&apos;s the summary of the bug tracking activities so far.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-3">
                    <Button onClick={() => router.push('/bugs/new')} className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white">
                    <Plus className="w-4 h-4" /> Report Bug
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/projects/new')} className="gap-2">
                    <Layout className="w-4 h-4" /> New Project
                    </Button>
                </div>
                
                {/* Sprint Widget */}
                {activeSprint && (
                    <Link 
                        href={`/projects/${activeSprint.projectId}/sprints/${activeSprint.id}`}
                        target="_blank"
                        className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4 min-w-[280px] hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="p-2 bg-cyan-50 rounded-md">
                            <Calendar className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-gray-900">{activeSprint.name}</span>
                                <span className="text-xs font-medium text-cyan-600">{daysRemaining} Days Left</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-cyan-500 rounded-full" 
                                    style={{ width: `${sprintProgress}%` }}
                                />
                            </div>
                        </div>
                    </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Please select a user from the navigation to get started
              </p>
            </div>
          )}

        {/* Bug Statistics Dashboard */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Overview</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Bugs */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-cyan-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Bugs</CardTitle>
                <div className="p-2 bg-cyan-50 rounded-full">
                  <BugIcon className="h-4 w-4 text-cyan-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {projects.length} projects
                </p>
              </CardContent>
            </Card>

            {/* Open Bugs */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Open Bugs</CardTitle>
                <div className="p-2 bg-red-50 rounded-full">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-gray-900">{statistics.open}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.highest} highest, {statistics.high} high priority
                </p>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
                <div className="p-2 bg-blue-50 rounded-full">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{statistics.inProgress}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Being worked on
                </p>
              </CardContent>
            </Card>

            {/* Resolved */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
                <div className="p-2 bg-green-50 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{statistics.resolved + statistics.closed}</div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                        className="bg-green-500 h-full rounded-full" 
                        style={{ width: `${statistics.total > 0 ? ((statistics.resolved + statistics.closed) / statistics.total) * 100 : 0}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statistics.resolved} awaiting validation
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">Assigned to Me</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setAssignedTab('active')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-all",
                        assignedTab === 'active' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setAssignedTab('backlog')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-all",
                        assignedTab === 'backlog' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Backlog
                  </button>
                  <button 
                    onClick={() => setAssignedTab('review')}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-all",
                        assignedTab === 'review' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    Review
                  </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredAssignedBugs.length > 0 ? (
                filteredAssignedBugs.map((bug) => (
                  <Card key={bug.id} className="bg-white hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-cyan-500" onClick={() => router.push(`/bugs/${bug.id}`)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <PriorityIcon priority={bug.priority} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{bug.id}</span>
                          <h3 className="font-medium truncate text-gray-900">{bug.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant={getStatusBadgeVariant(bug.status)} className="text-[10px] px-1.5 py-0 h-5">
                            {bug.status.replace(/_/g, ' ')}
                          </Badge>
                          <span>{getProjectName(bug.projectId, projects)}</span>
                          <span>•</span>
                          <span>{new Date(bug.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Reporter Avatar */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground mb-0.5">Reporter</span>
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-cyan-100 text-cyan-700">
                                    {/* We don't have reporter name easily here without fetching user, but we can use ID or just a placeholder */}
                                    U
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
                  <p className="text-muted-foreground">No bugs found in {assignedTab} tab.</p>
                  {assignedTab === 'active' && (
                      <Button variant="link" onClick={() => setAssignedTab('backlog')} className="text-cyan-600">
                          Check your backlog
                      </Button>
                  )}
                </div>
              )}
            </div>
            
            <Button 
                variant="ghost" 
                onClick={() => router.push({ pathname: '/bugs', query: { assignedTo: currentUser?.id } })} 
                className="w-full text-muted-foreground hover:text-cyan-600"
            >
                View All Assigned Bugs <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
      </div>
    </div>

    {showWelcome && currentUser && (
      <WelcomeScreen 
        isDataLoaded={dataLoaded}
        onComplete={handleWelcomeComplete} 
      />
    )}
    </>
  );
}
