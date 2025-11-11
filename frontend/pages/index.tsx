import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';

export default function Home() {
  const router = useRouter();
  const { currentUser, permissions } = useUser();

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role.toLowerCase()) {
      case 'admin':
        return "destructive";
      case 'developer':
        return "default";
      case 'tester':
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to BugTrackr</h1>
          <p className="text-muted-foreground mt-2">
            Lightweight, developer-friendly bug tracking
          </p>
        </div>

        {currentUser ? (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm">
              Logged in as <span className="font-medium">{currentUser.name}</span>{' '}
              <Badge variant={getRoleBadgeVariant(currentUser.role)}>
                {currentUser.role}
              </Badge>
            </p>
            {permissions && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Your permissions:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {permissions.canCreateBug && <li>Create bugs</li>}
                  {permissions.canValidateBug && <li>Validate resolved bugs</li>}
                  {permissions.canCloseBug && <li>Close validated bugs</li>}
                  {permissions.canAssignBug && <li>Assign bugs to users</li>}
                  {permissions.canUpdateStatus && <li>Update bug status</li>}
                  {permissions.canComment && <li>Add comments</li>}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Please select a user from the navigation to get started
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/bugs')}>
            <CardHeader>
              <CardTitle>Bugs</CardTitle>
              <CardDescription>
                View and manage all reported bugs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View All Bugs
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/projects')}>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                Browse bugs organized by project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
