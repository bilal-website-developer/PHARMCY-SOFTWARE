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

    let user: any = null;
    let isMatch = false;

    // Try database lookup first
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username, mode: 'insensitive' } },
            { email: { equals: username, mode: 'insensitive' } },
          ],
        },
      });

      if (user) {
        if (!user.isActive) {
          return reply.status(403).send({
            success: false,
            error: 'Your account has been deactivated. Please contact the administrator.',
          });
        }
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } catch {
      // Database offline fallback: authenticate standard roles
      const DEMO_USERS: Record<string, { role: UserRole; fullName: string; pass: string }> = {
        admin: { role: UserRole.ADMIN, fullName: 'System Administrator', pass: 'Admin@123' },
        pharmacist: { role: UserRole.PHARMACIST, fullName: 'Dr. Tariq Khan (Pharmacist)', pass: 'Pharma@123' },
        cashier: { role: UserRole.CASHIER, fullName: 'Bilal Cashier (POS 1)', pass: 'Cashier@123' },
        inventory: { role: UserRole.INVENTORY, fullName: 'Kamran (Inventory Manager)', pass: 'Inventory@123' },
        accountant: { role: UserRole.ACCOUNTANT, fullName: 'Sajid (Head Accountant)', pass: 'Account@123' },
      };

      const found = DEMO_USERS[username.toLowerCase()];
      if (found && password === found.pass) {
        user = {
          id: `usr-${username.toLowerCase()}`,
          username: username.toLowerCase(),
          fullName: found.fullName,
          email: `${username.toLowerCase()}@pharmacare.pk`,
          role: found.role,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        isMatch = true;
      }
    }

    if (!user || !isMatch) {
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
    try {
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
    } catch {
      return reply.send({
        success: true,
        data: {
          id: jwtUser.id,
          username: jwtUser.username,
          fullName: jwtUser.fullName,
          role: jwtUser.role,
          isActive: true,
        },
      });
    }
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
