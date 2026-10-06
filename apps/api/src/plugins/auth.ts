import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { UserRole } from '@pharmacy/shared';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (allowedRoles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      username: string;
      role: UserRole;
      fullName: string;
    };
  }
}

async function authPluginAsync(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET || 'fallback-secret-pharma-2026';

  await fastify.register(fastifyJwt, {
    secret,
    sign: {
      expiresIn: '8h',
    },
  });

  // Authenticate hook
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        success: false,
        error: 'Unauthorized. Invalid or expired token.',
      });
    }
  });

  // Role authorization guard
  fastify.decorate('requireRole', (allowedRoles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        const user = request.user;
        if (!user || !allowedRoles.includes(user.role)) {
          return reply.status(403).send({
            success: false,
            error: `Forbidden. Role '${user?.role}' does not have permission for this resource.`,
          });
        }
      } catch (err) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized. Please login again.',
        });
      }
    };
  });
}

export const authPlugin = fp(authPluginAsync);
