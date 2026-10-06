import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { LoginSchema, UserRole } from '@pharmacy/shared';
import { prisma } from '../prisma';

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request, reply) => {
    const parseResult = LoginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Invalid input credentials',
      });
    }

    const { username, password } = parseResult.data;

    // Find active user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: username, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        error: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      fullName: user.fullName,
    });

    // Record Audit Log for login
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.username,
          role: user.role,
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: user.id,
          newValue: { username: user.username, role: user.role },
          ipAddress: request.ip,
        },
      });
    } catch (auditErr) {
      request.log.warn({ auditErr }, 'Failed to record login audit log');
    }

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  });

  // Current authenticated user
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const jwtUser = request.user;
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'User account no longer active or found.',
      });
    }

    return reply.send({
      success: true,
      data: user,
    });
  });

  // Seeded demo accounts preview (helpful for reviewer & quick switching in Phase 0)
  fastify.get('/demo-accounts', async (_request, reply) => {
    return reply.send({
      success: true,
      data: [
        { role: UserRole.ADMIN, username: 'admin', passwordHint: 'Admin@123', label: 'Admin (Full Access)' },
        { role: UserRole.PHARMACIST, username: 'pharmacist', passwordHint: 'Pharma@123', label: 'Pharmacist / Manager' },
        { role: UserRole.CASHIER, username: 'cashier', passwordHint: 'Cashier@123', label: 'Cashier (POS Only, No Costs)' },
        { role: UserRole.INVENTORY, username: 'inventory', passwordHint: 'Inventory@123', label: 'Inventory / Purchase' },
        { role: UserRole.ACCOUNTANT, username: 'accountant', passwordHint: 'Account@123', label: 'Accountant' },
      ],
    });
  });
}
