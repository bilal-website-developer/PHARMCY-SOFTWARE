import { FastifyInstance } from 'fastify';
import { UserRole } from '@pharmacy/shared';
import { prisma } from '../prisma';

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET all settings (Authenticated users)
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (_request, reply) => {
      const settings = await prisma.systemSetting.findMany({
        orderBy: { key: 'asc' },
      });
      return reply.send({
        success: true,
        data: settings,
      });
    }
  );

  // PUT update a setting (Admin only, logged to audit)
  fastify.put(
    '/:key',
    {
      preHandler: [fastify.requireRole([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: string };

      if (value === undefined || value === null) {
        return reply.status(400).send({ success: false, error: 'Value is required' });
      }

      const existing = await prisma.systemSetting.findUnique({
        where: { key },
      });

      const updated = await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          userName: request.user.username,
          role: request.user.role,
          action: 'UPDATE_SETTING',
          entity: 'SystemSetting',
          entityId: key,
          oldValue: existing ? { value: existing.value } : undefined,
          newValue: { value: String(value) },
        },
      });

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );
}
