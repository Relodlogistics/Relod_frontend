'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';

/** Renders nothing — pure side-effect client island, split out of LandingPage so the rest of that page can be a server component. */
export function RedirectIfLoggedIn() {
  const router = useRouter();
  const { session, loaded } = useSession();
  useEffect(() => {
    if (loaded && session) router.replace('/dashboard');
  }, [loaded, session, router]);
  return null;
}
