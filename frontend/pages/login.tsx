import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { LogoIcon } from '@/components/AppSidebar';
import dpodLogo from '@/assets/dpod.png';
import { getServiceContainer } from '@/lib/services/serviceContainer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useUser();
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Client-side authentication using Repository pattern
      const services = getServiceContainer();
      const userRepo = services.getUserRepository();
      
      // 1. Find user by email
      const user = await userRepo.getByEmail(email);

      if (!user) {
        throw new Error('User not found. Please check your email.');
      }

      // 2. Validate phone number (simple check as per previous implementation)
      // Note: In a real app, we would hash this or use a proper auth provider.
      // Here we compare the raw strings as stored in the DB.
      if (user.phoneNumber !== phoneNumber) {
        throw new Error('Invalid phone number.');
      }

      // 3. Login successful
      // Generate a mock token for compatibility with existing code that expects it
      const token = `mock-jwt-token-${user.id}-${Date.now()}`;
      
      // Save token and user
      localStorage.setItem('bugtrackr_token', token);
      setCurrentUser(user);
      
      showToast('success', 'Logged in successfully');
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
      <div className="mb-8">
        <Image
          src={dpodLogo}
          alt="DPOD Logo"
          width={200}
          height={100}
          className="h-16 w-auto"
          priority
        />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="mb-4 scale-150 p-2">
            <LogoIcon />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and phone number to sign in
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
