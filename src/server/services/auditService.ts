import { Request } from 'express';
import { prisma } from '../prisma.js';

interface AuditInput {
  req: Request;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'LOGIN' | 'LOGOUT' | 'UPLOAD' | 'ASSIGN';
  module: string;
  targetType?: string;
  targetId?: string | number;
  studyProgramId?: number | null;
  details?: unknown;
}

/**
 * Mencatat aktivitas penting ke audit log.
 *
 * Kegagalan pencatatan tidak boleh menggagalkan operasi utama, tetapi tetap
 * dilaporkan ke konsol agar tidak hilang tanpa jejak.
 */
export async function recordAudit({
  req,
  action,
  module,
  targetType,
  targetId,
  studyProgramId,
  details,
}: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        module,
        targetType: targetType ?? null,
        targetId: targetId !== undefined ? String(targetId) : null,
        details: details !== undefined ? JSON.stringify(details).slice(0, 20000) : null,
        studyProgramId: studyProgramId ?? req.scopedTenantId ?? req.tenant?.id ?? null,
        userId: req.authUser?.id ?? null,
        ipAddress: (req.ip ?? '').slice(0, 60) || null,
      },
    });
  } catch (error) {
    console.error('[AUDIT_WRITE_FAILED]', module, action, error);
  }
}
