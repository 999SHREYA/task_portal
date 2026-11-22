// Adds our own fields to Express's Request type.
import type { Role } from '../models/User';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: AuthUser;
      /** Set by the `validate` middleware (req.query is read-only in Express 5). */
      validatedQuery?: unknown;
    }
  }
}
