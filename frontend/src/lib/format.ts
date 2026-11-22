import type { ProjectStatus, TaskPriority, TaskStatus } from './types';
import type { BadgeTone } from '@/components/ui/Badge';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed'];

export const LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  done: 'Done',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  admin: 'Admin',
  manager: 'Manager',
  developer: 'Developer',
  client: 'Client',
};

export const label = (value: string) => LABELS[value] ?? value;

export const TONES: Record<string, BadgeTone> = {
  todo: 'neutral',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
  active: 'success',
  on_hold: 'warning',
  completed: 'neutral',
};

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
