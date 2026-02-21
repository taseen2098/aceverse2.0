
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student',
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Registration successful! Please verify your email and sign in.');
      router.push('/login');
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aceverse-ice px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-aceverse-blue/20 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-aceverse-navy">Create an account</CardTitle>
          <CardDescription className="text-center">
            Join AceVerse to start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-aceverse-navy font-semibold">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-aceverse-navy font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="At least 6 characters" className="text-aceverse-navy font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full bg-aceverse-blue hover:bg-aceverse-blue/90 text-white font-bold h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register as Student
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center text-sm">
          <div className="text-aceverse-navy/60">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-aceverse-blue hover:underline">
              Sign in
            </Link>
          </div>
          <div className="text-[10px] text-muted-foreground px-4">
            By creating an account, you agree to our terms of service and academic integrity policies.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

