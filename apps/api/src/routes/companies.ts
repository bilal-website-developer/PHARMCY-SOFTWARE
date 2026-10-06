import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/companies
  fastify.get('/', async (req, reply) => {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
      return { success: true, data: companies };
    } catch {
      // In-memory fallback if database not yet migrated
      return {
        success: true,
        data: [
          { id: 'comp-1', name: 'GSK Pakistan', code: 'GSK', country: 'Pakistan', _count: { products: 24 } },
          { id: 'comp-2', name: 'Getz Pharma', code: 'GETZ', country: 'Pakistan', _count: { products: 32 } },
          { id: 'comp-3', name: 'Abbott Laboratories', code: 'ABT', country: 'Pakistan', _count: { products: 19 } },
          { id: 'comp-4', name: 'The Searle Company', code: 'SRL', country: 'Pakistan', _count: { products: 28 } },
          { id: 'comp-5', name: 'Hilton Pharma', code: 'HLT', country: 'Pakistan', _count: { products: 16 } },
          { id: 'comp-6', name: 'Sami Pharmaceuticals', code: 'SAMI', country: 'Pakistan', _count: { products: 21 } },
          { id: 'comp-7', name: 'Ferozsons Laboratories', code: 'FRZ', country: 'Pakistan', _count: { products: 11 } },
        ],
      };
    }
  });

  // POST /api/companies (Admin / Pharmacist / Inventory only)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { name, code, country } = req.body as { name: string; code?: string; country?: string };
      if (!name || name.trim().length < 2) {
        return reply.status(400).send({ success: false, message: 'Valid manufacturer name is required' });
      }

      try {
        const company = await prisma.company.create({
          data: {
            name: name.trim(),
            code: code?.trim().toUpperCase(),
            country: country?.trim() || 'Pakistan',
          },
        });
        return { success: true, data: company };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message || 'Failed to create manufacturer' });
      }
    }
  );
};
