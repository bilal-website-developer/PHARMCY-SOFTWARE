import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  BarcodeLabelDto,
  PrintLabelsSchema,
  PrintLabelsInput,
} from '@pharmacy/shared';
import { SEED_PRODUCTS } from './products';
import { MEMORY_BATCHES } from './purchases';

export const barcodesRoutes: FastifyPluginAsync = async (fastify) => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GET /api/barcodes/unlabeled-products
  // Returns products needing custom internal barcode labels
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/unlabeled-products', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { filter = 'all' } = request.query as { filter?: string };

    let products: any[] = [];
    try {
      products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: {
          batches: { where: { quantity: { gt: 0 } } },
          barcodes: true,
        },
      });
    } catch {
      products = [];
    }

    if (products.length === 0) {
      products = SEED_PRODUCTS.map((p) => {
        const pBatches = MEMORY_BATCHES.filter((b) => b.productId === p.id);
        return {
          ...p,
          batches: pBatches,
          barcodes: p.barcodes ? p.barcodes.map((b) => ({ barcode: b })) : [],
        };
      });
    }

    const labels: BarcodeLabelDto[] = [];

    for (const p of products) {
      const hasBarcode = p.barcodes && p.barcodes.length > 0;
      if (filter === 'unlabeled-only' && hasBarcode) {
        continue;
      }

      // Generate a consistent internal barcode if none exists
      const cleanSku = p.sku.replace(/[^A-Za-z0-9]/g, '');
      const defaultBarcode = hasBarcode
        ? (p.barcodes[0].barcode || p.barcodes[0])
        : `896${cleanSku.slice(-6).padStart(6, '0')}1`;

      if (p.batches && p.batches.length > 0) {
        for (const b of p.batches) {
          labels.push({
            productId: p.id,
            productName: p.name,
            strength: p.strength,
            sku: p.sku,
            barcode: defaultBarcode,
            batchNumber: b.batchNumber,
            expiryDate: new Date(b.expiryDate).toISOString().slice(0, 7), // YYYY-MM
            mrpPaisa: b.mrpPaisa || p.mrpPaisa,
            rackLocation: p.rackLocation || 'Rack A-01',
            quantityToPrint: Math.min(10, b.quantity || 5),
          });
        }
      } else {
        labels.push({
          productId: p.id,
          productName: p.name,
          strength: p.strength,
          sku: p.sku,
          barcode: defaultBarcode,
          batchNumber: 'GEN-2026',
          expiryDate: '2028-12',
          mrpPaisa: p.mrpPaisa,
          rackLocation: p.rackLocation || 'Rack A-01',
          quantityToPrint: 5,
        });
      }
    }

    return reply.send({ success: true, data: labels });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. POST /api/barcodes/print-job
  // Previews / validates print job
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/print-job', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parseResult = PrintLabelsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const input: PrintLabelsInput = parseResult.data;
    const totalStickers = input.items.reduce((s, it) => s + it.quantityToPrint, 0);

    return reply.send({
      success: true,
      data: {
        jobId: `job-${Date.now()}`,
        labelSize: input.labelSize,
        totalStickers,
        items: input.items,
      },
      message: `Print job ready: ${totalStickers} labels in ${input.labelSize} layout`,
    });
  });
};
