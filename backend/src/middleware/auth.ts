import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';
import type { Role } from '../models/User';

// 1) Who are you?  Reads "Authorization: Bearer <token>".
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

// 2) Are you allowed?  Role-based access control.
//    Usage: router.post('/', authorize('admin', 'manager'), handler)
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

// Used in controllers behind `authenticate`, so the user is always there.
export function currentUser(req: Request) {
  if (!req.user) throw new AppError(401, 'Authentication required');
  return req.user;
}
