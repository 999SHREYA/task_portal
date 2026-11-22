import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <main className="content">
      <EmptyState title="Page not found" message="The page you are looking for does not exist." action={<Link href="/dashboard">Go to dashboard</Link>} />
    </main>
  );
}
