import { z, objectId, paginationQuery } from './common';
import { TASK_STATUSES, TASK_PRIORITIES } from '../models/Task';

const taskFields = {
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(5000).optional(),
  assignee: objectId.nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.coerce.date().nullable().optional(),
};

export const createTaskSchema = z.object({ ...taskFields, project: objectId });

// A task can't be moved to another project, so "project" is not allowed here.
export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const listTasksQuery = z.object({
  ...paginationQuery,
  project: objectId.optional(),
  assignee: z.union([objectId, z.literal('me')]).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

export const listCommentsQuery = z.object({ page: paginationQuery.page, limit: paginationQuery.limit });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuery>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuery>;
