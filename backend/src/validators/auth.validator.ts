import { z, paginationQuery } from './common';
import { ROLES } from '../models/User';

export const loginSchema = z.object({
  email: z.email('Enter a valid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES),
});

export const listUsersQuery = z.object({ ...paginationQuery, role: z.enum(ROLES).optional() });

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
