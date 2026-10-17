import { prisma } from '../../db/prisma';
import { LeadsService } from '../leads/leads.service';
import { DraftsService } from '../ai/drafts.service';
import { AppError } from '../../middleware/error.middleware';
import { AuditService } from '../audit/audit.service';
import { OutreachStatus } from '@prisma/client';

export class SuppressionService {
  /**
   * Checks if an email is suppressed
   */
  static async isSuppressed(email: string): Promise<boolean> {
    const normalized = LeadsService.normalizeEmail(email);
    if (!normalized) return false;

    const entry = await prisma.suppressionEntry.findUnique({
      where: { normalizedEmail: normalized },
    });
    return !!entry;
  }

  /**
   * Process opt-out from public unsubscribe link
   */
  static async processOptOut(email: string, token: string) {
    const expectedToken = DraftsService.generateOptOutToken(email);
    if (token !== expectedToken) {
      throw new AppError('Invalid or expired opt-out token', 400, 'INVALID_TOKEN');
    }

    const normalized = LeadsService.normalizeEmail(email);
    if (!normalized) {
      throw new AppError('Invalid email address format', 400, 'INVALID_EMAIL');
    }

    // Add to suppression table
    await prisma.suppressionEntry.upsert({
      where: { normalizedEmail: normalized },
      update: {
        reason: 'USER_OPT_OUT',
        source: 'UNSUBSCRIBE_LINK',
      },
      create: {
        normalizedEmail: normalized,
        reason: 'USER_OPT_OUT',
        source: 'UNSUBSCRIBE_LINK',
      },
    });

    // Mark any matching lead record as OPTED_OUT
    await prisma.lead.updateMany({
      where: { normalizedEmail: normalized },
      data: { outreachStatus: OutreachStatus.OPTED_OUT },
    });

    await AuditService.record({
      action: 'USER_OPTED_OUT',
      entityType: 'SUPPRESSION',
      metadata: { normalizedEmail: normalized },
    });

    return { normalizedEmail: normalized };
  }

  /**
   * List suppressed entries with pagination
   */
  static async listSuppressionEntries(page = 1, limit = 25, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { normalizedEmail: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [total, entries] = await Promise.all([
      prisma.suppressionEntry.count({ where }),
      prisma.suppressionEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Manually add an email to suppression list
   */
  static async addManualSuppression(email: string, reason: string, actorId?: string) {
    const normalized = LeadsService.normalizeEmail(email);
    if (!normalized) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    const entry = await prisma.suppressionEntry.upsert({
      where: { normalizedEmail: normalized },
      update: { reason, source: 'ADMIN_MANUAL' },
      create: {
        normalizedEmail: normalized,
        reason,
        source: 'ADMIN_MANUAL',
      },
    });

    await prisma.lead.updateMany({
      where: { normalizedEmail: normalized },
      data: { outreachStatus: OutreachStatus.OPTED_OUT },
    });

    await AuditService.record({
      actorId,
      action: 'ADMIN_MANUAL_SUPPRESSION',
      entityType: 'SUPPRESSION',
      metadata: { normalizedEmail: normalized, reason },
    });

    return entry;
  }
}
