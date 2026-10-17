import { prisma } from '../../db/prisma';
import { logger } from '../../config/logger';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export class AuditService {
  static async record(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          metadata: (params.metadata || {}) as object,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      logger.error({ err, params }, 'Failed to record audit log');
      return null;
    }
  }
}
