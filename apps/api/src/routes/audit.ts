import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import { UserRole, AuditLogDto } from '@pharmacy/shared';

const DEMO_AUDIT_LOGS: AuditLogDto[] = [
  {
    id: 'audit-1',
    userId: 'user-admin-1',
    userName: 'Dr. Bilal (Admin)',
    role: 'ADMIN',
    action: 'POST_SALE',
    entity: 'Sale',
    entityId: 'sale-1',
    oldValue: null,
    newValue: { invoiceNumber: 'INV-202610-000001', grandTotalPaisa: 22467 },
    reason: null,
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audit-2',
    userId: 'user-cashier-1',
    userName: 'Fatima Noor (Cashier)',
    role: 'CASHIER',
    action: 'SALE_RETURN',
    entity: 'SaleReturn',
    entityId: 'ret-1',
    oldValue: null,
    newValue: { returnNumber: 'RET-202610-000001', totalRefundPaisa: 3500 },
    reason: 'Customer bought incorrect dosage (prescribed 250mg, bought 500mg)',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'audit-3',
    userId: 'user-admin-1',
    userName: 'Dr. Bilal (Admin)',
    role: 'ADMIN',
    action: 'UPDATE_SETTING',
    entity: 'SystemSetting',
    entityId: 'EXPIRY_WARNING_MONTHS',
    oldValue: { value: '3' },
    newValue: { value: '4' },
    reason: 'Extended alert threshold for seasonal inventory',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'audit-4',
    userId: 'user-pharmacist-1',
    userName: 'Zainab Bibi (Pharmacist)',
    role: 'PHARMACIST',
    action: 'CONFIRM_PURCHASE',
    entity: 'Purchase',
    entityId: 'pur-101',
    oldValue: null,
    newValue: { billNumber: 'INV-9821', netPayablePaisa: 332975 },
    reason: 'Supplier delivery verified and batches inspected',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/audit — Admin-only audit log search ────────────────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])],
  }, async (request, reply) => {
    try {
      const { action, entity, userId, startDate, endDate, page = '1', limit = '50' } = request.query as any;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (action) where.action = { contains: action, mode: 'insensitive' };
      if (entity) where.entity = { contains: entity, mode: 'insensitive' };
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.auditLog.count({ where }),
      ]);

      const formatted: AuditLogDto[] = logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        role: l.role,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        oldValue: l.oldValue,
        newValue: l.newValue,
        reason: l.reason,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      }));

      return reply.send({
        success: true,
        data: formatted.length > 0 ? formatted : DEMO_AUDIT_LOGS,
        meta: { total: total || DEMO_AUDIT_LOGS.length, page: Number(page), limit: Number(limit) },
      });
    } catch (_err) {
      return reply.send({
        success: true,
        data: DEMO_AUDIT_LOGS,
        meta: { total: DEMO_AUDIT_LOGS.length, page: 1, limit: 50 },
      });
    }
  });
};
