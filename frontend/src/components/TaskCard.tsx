'use client';

import Link from 'next/link';
import { formatDate, label, TASK_STATUSES, TONES } from '@/lib/format';
import type { Task, TaskStatus } from '@/lib/types';
import Badge from './ui/Badge';

interface TaskCardProps {
  task: Task;
  canChangeStatus: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export default function TaskCard({ task, canChangeStatus, onStatusChange }: TaskCardProps) {
  return (
    <article className="task-card">
      <Link href={`/tasks/${task._id}`} className="task-card-title">
        {task.title}
      </Link>
      <p className="muted small">{task.project.name}</p>
      <div className="task-card-meta">
        <Badge tone={TONES[task.priority]}>{label(task.priority)}</Badge>
        <span className="small">{task.assignee?.name ?? 'Unassigned'}</span>
        {task.dueDate && <span className="small muted">Due {formatDate(task.dueDate)}</span>}
      </div>
      {/* Only users allowed to change the status see the dropdown. */}
      {canChangeStatus && (
        <label className="task-card-status">
          <span className="sr-only">Status of {task.title}</span>
          <select value={task.status} onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}
