import { FastifyInstance } from 'fastify';
import { UserRole } from '@pharmacy/shared';
import { prisma } from '../prisma';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users - Only ADMIN can view all users
  fastify.get(
    '/',
    {
      preHandler: [fastify.requireRole([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send({
        success: true,
        data: users,
      });
    }
  );

  // GET /api/users/audit-logs - Only ADMIN can view system audit logs
  fastify.get(
    '/audit-logs',
    {
      preHandler: [fastify.requireRole([UserRole.ADMIN])],
    },
    async (request, reply) => {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: logs,
      });
    }
  );
}
