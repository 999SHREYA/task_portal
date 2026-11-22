'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from './ui/Loader';
import AppShell from './AppShell';

// Wraps every logged-in page: shows a loader while the session is restored,
// sends anonymous visitors to /login, and renders the app layout.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && !user) router.replace('/login');
  }, [checking, user, router]);

  if (checking || !user) return <Loader label="Checking your session…" />;
  return <AppShell user={user}>{children}</AppShell>;
}
