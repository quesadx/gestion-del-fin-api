import { prisma } from '../../lib/prisma.js';
import { logger } from '../../logger/logger.js';
import { $Enums, Prisma } from '../../generated/prisma/client.js';

interface AuditLogParams {
  userId: number;
  campId: number;
  action: $Enums.audit_log_action;
  targetType: $Enums.audit_log_target_type;
  targetId?: number;
  metadata?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
}

export function auditLog(params: AuditLogParams): void {
  prisma.audit_log
    .create({
      data: {
        user_id: params.userId,
        camp_id: params.campId,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId,
        metadata: params.metadata ?? undefined,
      },
    })
    .then(() => {})
    .catch((err: unknown) => {
      logger.error('Audit log write failed', { error: err, ...params });
    });
}
