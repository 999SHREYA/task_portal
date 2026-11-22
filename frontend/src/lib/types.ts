// Shapes of the data returned by the Express API.

export type Role = 'admin' | 'manager' | 'developer' | 'client';
export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export type UserRef = Pick<User, '_id' | 'name' | 'email'>;

export interface Project {
  _id: string;
  name: string;
  description: string;
  client: UserRef;
  manager: UserRef;
  members: UserRef[];
  status: ProjectStatus;
  createdAt: string;
}

export interface Attachment {
  _id: string;
  url: string;
  filename: string;
  uploadedBy?: { _id: string; name: string };
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  project: { _id: string; name: string };
  assignee: UserRef | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  attachments: Attachment[];
  createdBy: { _id: string; name: string };
  createdAt: string;
}

export interface Comment {
  _id: string;
  body: string;
  author: { _id: string; name: string; role: Role };
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface TaskStats {
  byStatus: Record<TaskStatus, number>;
  total: number;
  myOpenTasks: number;
}
