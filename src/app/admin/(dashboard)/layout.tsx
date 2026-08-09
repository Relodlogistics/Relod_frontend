'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { useAdminSession } from '@/lib/admin-session-context';

export default function AdminDashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { adminSession, loaded } = useAdminSession();

  useEffect(() => {
    if (loaded && !adminSession) router.replace('/admin/login');
  }, [loaded, adminSession, router]);

  if (!adminSession) return null;

  return <AdminShell>{children}</AdminShell>;
}
