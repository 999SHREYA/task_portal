'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { formatDate, label, TASK_STATUSES, TONES } from '@/lib/format';
import type { Paginated, Project, Task, TaskStats } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorMessage from '@/components/ui/ErrorMessage';

const SUBTITLES = {
  admin: 'Overview of every project in the portal.',
  manager: 'Overview of every project in the portal.',
  developer: 'Your projects and the tasks assigned to you.',
  client: 'Progress on your projects.',
};

export default function DashboardPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const stats = useApi<{ data: TaskStats }>('/tasks/stats');
  const projects = useApi<Paginated<Project>>('/projects', { limit: 5 });
  // Only developers have "my tasks"; for others skip the request (null path).
  const myTasks = useApi<Paginated<Task>>(user.role === 'developer' ? '/tasks' : null, { assignee: 'me', limit: 5 });

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle={SUBTITLES[user.role]} />

      <section aria-label="Task statistics" className="stats-grid">
        {stats.error && <ErrorMessage message={stats.error} onRetry={stats.reload} />}
        {stats.loading && !stats.data && <Loader />}
        {stats.data &&
          TASK_STATUSES.map((status) => (
            <div key={status} className="card stat-card">
              <span className="stat-value">{stats.data!.data.byStatus[status]}</span>
              <Badge tone={TONES[status]}>{label(status)}</Badge>
            </div>
          ))}
        {stats.data && user.role === 'developer' && (
          <div className="card stat-card stat-highlight">
            <span className="stat-value">{stats.data.data.myOpenTasks}</span>
            <span>My open tasks</span>
          </div>
        )}
      </section>

      {user.role === 'developer' && (
        <section className="section">
          <h2>My latest tasks</h2>
          {myTasks.error && <ErrorMessage message={myTasks.error} onRetry={myTasks.reload} />}
          {myTasks.loading && !myTasks.data && <Loader />}
          {myTasks.data?.data.length === 0 && <EmptyState title="Nothing assigned to you" message="New tasks will show up here." />}
          {!!myTasks.data?.data.length && (
            <Table
              caption="My tasks"
              rows={myTasks.data.data}
              rowKey={(t) => t._id}
              onRowClick={(t) => router.push(`/tasks/${t._id}`)}
              columns={[
                { header: 'Task', render: (t) => <Link href={`/tasks/${t._id}`}>{t.title}</Link> },
                { header: 'Project', render: (t) => t.project.name },
                { header: 'Status', render: (t) => <Badge tone={TONES[t.status]}>{label(t.status)}</Badge> },
                { header: 'Due', render: (t) => formatDate(t.dueDate) },
              ]}
            />
          )}
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2>Recent projects</h2>
          <Link href="/projects">View all →</Link>
        </div>
        {projects.error && <ErrorMessage message={projects.error} onRetry={projects.reload} />}
        {projects.loading && !projects.data && <Loader />}
        {projects.data?.data.length === 0 && <EmptyState title="No projects yet" message="Projects you have access to will appear here." />}
        {!!projects.data?.data.length && (
          <Table
            caption="Recent projects"
            rows={projects.data.data}
            rowKey={(p) => p._id}
            onRowClick={(p) => router.push(`/projects/${p._id}`)}
            columns={[
              { header: 'Project', render: (p) => <Link href={`/projects/${p._id}`}>{p.name}</Link> },
              { header: 'Client', render: (p) => p.client.name },
              { header: 'Status', render: (p) => <Badge tone={TONES[p.status]}>{label(p.status)}</Badge> },
            ]}
          />
        )}
      </section>
    </>
  );
}
