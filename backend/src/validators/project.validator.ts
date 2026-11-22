import { z, objectId, paginationQuery } from './common';
import { PROJECT_STATUSES } from '../models/Project';

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(2000).optional(),
  client: objectId,
  manager: objectId.optional(), // defaults to the current user
  members: z.array(objectId).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const listProjectsQuery = z.object({
  ...paginationQuery,
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuery>;
