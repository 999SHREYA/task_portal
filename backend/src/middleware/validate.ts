import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';
import { AppError } from '../utils/AppError';

// Validates req.body and/or req.query against Zod schemas.
// On success the cleaned data replaces the raw input
// (req.query is read-only in Express 5, so it goes to req.validatedQuery).
export function validate(schemas: { body?: ZodType; query?: ZodType }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      next();
    } catch (err) {
      if (!(err instanceof ZodError)) return next(err);
      const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      next(new AppError(400, 'Validation failed', details));
    }
  };
}
