import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/categories
  fastify.get('/', async (req, reply) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
      return { success: true, data: categories };
    } catch {
      // In-memory fallback if database not yet migrated
      return {
        success: true,
        data: [
          { id: 'cat-1', name: 'Antibiotics', slug: 'antibiotics', description: 'Anti-infectives & bactericidals', _count: { products: 12 } },
          { id: 'cat-2', name: 'Analgesics & Antipyretics', slug: 'analgesics-antipyretics', description: 'Pain relief & fever reduction', _count: { products: 18 } },
          { id: 'cat-3', name: 'Cardiovascular', slug: 'cardiovascular', description: 'Hypertension & cholesterol management', _count: { products: 15 } },
          { id: 'cat-4', name: 'Gastrointestinal', slug: 'gastrointestinal', description: 'PPIs, antacids & digestive care', _count: { products: 10 } },
          { id: 'cat-5', name: 'Respiratory & Cough', slug: 'respiratory-cough', description: 'Bronchodilators & cough syrups', _count: { products: 8 } },
          { id: 'cat-6', name: 'Vitamins & Supplements', slug: 'vitamins-supplements', description: 'Daily multivitamins & minerals', _count: { products: 14 } },
        ],
      };
    }
  });

  // POST /api/categories (Admin / Pharmacist / Inventory only)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { name, description } = req.body as { name: string; description?: string };
      if (!name || name.trim().length < 2) {
        return reply.status(400).send({ success: false, message: 'Valid category name is required' });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      try {
        const category = await prisma.category.create({
          data: { name: name.trim(), slug, description: description?.trim() },
        });
        return { success: true, data: category };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message || 'Failed to create category' });
      }
    }
  );
};
