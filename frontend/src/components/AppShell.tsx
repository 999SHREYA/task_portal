'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { label } from '@/lib/format';
import type { User } from '@/lib/types';
import Badge from './ui/Badge';
import Button from './ui/Button';

const NAV = [
  { href: '/dashboard', text: 'Dashboard' },
  { href: '/projects', text: 'Projects' },
  { href: '/tasks', text: 'Task board' },
];

export default function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          Task Portal
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'nav-link active' : 'nav-link'}>
              {item.text}
            </Link>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-name">{user.name}</span>
          <Badge tone="info">{label(user.role)}</Badge>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
