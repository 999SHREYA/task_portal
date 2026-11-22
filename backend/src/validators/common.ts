import { z } from 'zod';

export { z };

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

// Shared query params for every list endpoint.
export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
};
