import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post(
  '/login',
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    return next(err);
  }
});
