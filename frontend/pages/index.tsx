import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';

export default function Home() {
  const router = useRouter();
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">BugTrackr</h1>
          <p className="text-muted-foreground mt-2">
            Lightweight, developer-friendly bug tracking
          </p>
        </div>

        {currentUser && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              Logged in as <span className="font-medium">{currentUser.name}</span> ({currentUser.role})
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
