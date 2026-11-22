import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import env from '../config/env';

// Runs when no route matched the request.
export function notFound(req: Request, res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Converts known library errors into a clean AppError.
function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  // Invalid Mongo ObjectId in a URL, e.g. /projects/abc
  if (err instanceof mongoose.Error.CastError) return new AppError(400, `Invalid ${err.path}: ${err.value}`);

  // Mongoose schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new AppError(400, 'Validation failed', details);
  }

  // Unique index violation (e.g. duplicate email)
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(409, `${field} already exists`);
  }

  if (err instanceof jwt.JsonWebTokenError) return new AppError(401, 'Invalid or expired token');

  // File upload errors (e.g. file too large)
  if (err instanceof multer.MulterError) return new AppError(400, err.message);

  // Malformed JSON body (thrown by express.json())
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    return new AppError(400, 'Malformed JSON body');
  }

  return new AppError(500, 'Something went wrong');
}

// Express recognises an error handler by its 4 arguments.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const error = normalizeError(err);

  if (error.statusCode >= 500 && !env.isTest) console.error(err);

  res.status(error.statusCode).json({
    error: { message: error.message, ...(error.details && { details: error.details }) },
  });
}
