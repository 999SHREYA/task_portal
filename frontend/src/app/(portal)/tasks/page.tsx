'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';
import { label, TASK_STATUSES } from '@/lib/format';
import type { Paginated, Project, Task, TaskStatus } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import TaskCard from '@/components/TaskCard';
import Input, { Select } from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorMessage from '@/components/ui/ErrorMessage';

const BOARD_LIMIT = 100; // the board shows up to 100 tasks at once

// useSearchParams() must be inside a <Suspense> boundary in Next.js.
export default function TaskBoardPage() {
  return (
    <Suspense fallback={<Loader />}>
      <TaskBoard />
    </Suspense>
  );
}

function TaskBoard() {
  const user = useCurrentUser();
  const router = useRouter();
  const projectId = useSearchParams().get('project') ?? ''; // ?project=<id> filter lives in the URL
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const projects = useApi<Paginated<Project>>('/projects', { limit: 100 });
  const tasks = useApi<Paginated<Task>>('/tasks', {
    project: projectId,
    search,
    assignee: mineOnly ? 'me' : undefined,
    limit: BOARD_LIMIT,
  });

  async function changeStatus(task: Task, status: TaskStatus) {
    setUpdateError('');
    try {
      await api.patch(`/tasks/${task._id}`, { status });
      tasks.reload();
    } catch (err) {
      setUpdateError((err as Error).message);
    }
  }

  const allTasks = tasks.data?.data ?? [];

  return (
    <>
      <PageHeader title="Task board" subtitle="Tasks grouped by status." />

      <div className="filters">
        <Select
          label="Project"
          value={projectId}
          onChange={(e) => router.replace(e.target.value ? `/tasks?project=${e.target.value}` : '/tasks')}
          placeholder="All projects"
          options={(projects.data?.data ?? []).map((p) => ({ value: p._id, label: p.name }))}
        />
        <Input label="Search" type="search" placeholder="Search tasks…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        {user.role === 'developer' && (
          <label className="checkbox filter-checkbox">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Only my tasks
          </label>
        )}
      </div>

      {updateError && <ErrorMessage message={updateError} />}
      {tasks.error && <ErrorMessage message={tasks.error} onRetry={tasks.reload} />}
      {tasks.loading && !tasks.data && <Loader label="Loading tasks…" />}

      {tasks.data && allTasks.length === 0 && <EmptyState title="No tasks found" message="Try another project or search term." />}

      {allTasks.length > 0 && (
        <>
          {tasks.data!.pagination.total > BOARD_LIMIT && (
            <p className="muted">Showing the newest {BOARD_LIMIT} of {tasks.data!.pagination.total} tasks. Filter by project to narrow it down.</p>
          )}
          <div className="board">
            {TASK_STATUSES.map((status) => {
              const column = allTasks.filter((t) => t.status === status);
              return (
                <section key={status} className="board-column" aria-label={label(status)}>
                  <h2 className="board-column-title">
                    {label(status)} <span className="count">{column.length}</span>
                  </h2>
                  {column.length === 0 && <p className="muted small board-empty">No tasks</p>}
                  {column.map((task) => (
                    <TaskCard key={task._id} task={task} canChangeStatus={can.changeTaskStatus(user, task)} onStatusChange={changeStatus} />
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
