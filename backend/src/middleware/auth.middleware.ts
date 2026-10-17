import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { Role } from '@wardell/shared';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    return next();
  } catch {
    return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
}
