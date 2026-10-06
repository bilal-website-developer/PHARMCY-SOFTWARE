import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authPlugin } from './plugins/auth';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { settingsRoutes } from './routes/settings';
import { categoriesRoutes } from './routes/categories';
import { companiesRoutes } from './routes/companies';
import { suppliersRoutes } from './routes/suppliers';
import { productsRoutes } from './routes/products';
import { prisma } from './prisma';

dotenv.config();

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function main() {
  // CORS configuration
  await server.register(cors, {
    origin: true, // Allow frontend dev & preview URLs
    credentials: true,
  });

  // JWT & Auth guards plugin
  await server.register(authPlugin);

  // Health check
  server.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'Pharmacy Management API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register Routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(settingsRoutes, { prefix: '/api/settings' });
  await server.register(categoriesRoutes, { prefix: '/api/categories' });
  await server.register(companiesRoutes, { prefix: '/api/companies' });
  await server.register(suppliersRoutes, { prefix: '/api/suppliers' });
  await server.register(productsRoutes, { prefix: '/api/products' });

  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`🚀 Pharmacy API server running at http://${host}:${port}`);
    console.log(`🩺 Health check available at http://${host}:${port}/api/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

main();
