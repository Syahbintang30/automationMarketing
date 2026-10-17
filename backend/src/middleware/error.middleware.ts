import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(message: string, statusCode = 400, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ZodError) {
    logger.warn({ path: req.path, issues: err.issues }, 'Validation failed');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (err instanceof AppError) {
    logger.warn({ path: req.path, statusCode: err.statusCode, message: err.message }, 'Application error');
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  logger.error({ path: req.path, err: err.message, stack: err.stack }, 'Unhandled internal server error');
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}
