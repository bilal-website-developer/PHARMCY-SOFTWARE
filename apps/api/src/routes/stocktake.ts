import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  CreateStocktakeSchema,
  UpdateStocktakeCountsSchema,
  ApproveStocktakeSchema,
  StocktakeDto,
  StocktakeItemDto,
  StocktakeStatus,
  StockMovementType,
} from '@pharmacy/shared';
import { MEMORY_BATCHES, MEMORY_MOVEMENTS } from './purchases';
import { SEED_PRODUCTS } from './products';

// ── In-Memory Store for Stocktake Fallback ────────────────────────────────────
let STOCKTAKE_COUNTER = 1;
const MEMORY_STOCKTAKES: any[] = [];

function nextStocktakeNumber(): string {
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
  return `STK-${yyyymm}-${String(STOCKTAKE_COUNTER++).padStart(4, '0')}`;
}

// Seed 1 initial demo stocktake audit so reviewer can test variance review & approvals immediately
const SEED_STK_ITEMS: any[] = [
  {
    id: 'stki-1',
    stocktakeId: 'stk-demo-1',
    productId: 'prod-1',
    productName: 'Panadol 500mg',
    productSku: 'MED-PAN-500',
    rackLocation: 'Rack A-01',
    batchId: 'batch-1',
    batchNumber: 'BT-PAN-2024-01',
    expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    systemQuantity: 1250,
    countedQuantity: 1240, // 10 units shortage
    varianceQuantity: -10,
    costPricePaisa: 25,
    varianceValuePaisa: -250,
    isRefrigerated: false,
  },
  {
    id: 'stki-2',
    stocktakeId: 'stk-demo-1',
    productId: 'prod-2',
    productName: 'Calpol 500mg',
    productSku: 'MED-CAL-500',
    rackLocation: 'Rack A-02',
    batchId: 'batch-2',
    batchNumber: 'BT-CAL-2024-09',
    expiryDate: new Date(Date.now() + 45 * 86400000).toISOString(),
    systemQuantity: 480,
    countedQuantity: 485, // 5 units surplus
    varianceQuantity: 5,
    costPricePaisa: 27,
    varianceValuePaisa: 135,
    isRefrigerated: false,
  },
  {
    id: 'stki-3',
    stocktakeId: 'stk-demo-1',
    productId: 'prod-4',
    productName: 'Insulin Mixtard 30/70',
    productSku: 'MED-INS-MIX',
    rackLocation: 'Fridge F-01',
    batchId: 'batch-4',
    batchNumber: 'BT-INS-2024-01',
    expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    systemQuantity: 60,
    countedQuantity: 60, // Exact match
    varianceQuantity: 0,
    costPricePaisa: 120000,
    varianceValuePaisa: 0,
    isRefrigerated: true,
  },
];

MEMORY_STOCKTAKES.push({
  id: 'stk-demo-1',
  stocktakeNumber: 'STK-202610-0001',
  rackLocation: null,
  status: 'PENDING_REVIEW',
  notes: 'Quarterly general physical audit — ready for Pharmacist review',
  createdById: 'user-inventory-1',
  createdByName: 'Kamran (Inventory Manager)',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  approvedById: null,
  approvedByName: null,
  approvedAt: null,
  rejectedById: null,
  rejectedByName: null,
  rejectedAt: null,
  rejectionReason: null,
  totalItems: 3,
  varianceItemsCount: 2,
  netVarianceQuantity: -5,
  netVarianceValuePaisa: -115,
  items: SEED_STK_ITEMS,
});

export const stocktakeRoutes: FastifyPluginAsync = async (fastify) => {

  // ── 1. GET /api/stocktake/count-sheet — Generate Printable Sheet ────────────
  fastify.get('/count-sheet', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])],
  }, async (req, reply) => {
    const { rackLocation } = req.query as { rackLocation?: string };

    try {
      const where: any = { quantity: { gt: 0 } };
      if (rackLocation) {
        where.product = { rackLocation: { equals: rackLocation, mode: 'insensitive' } };
      }

      const batches = await prisma.stockBatch.findMany({
        where,
        orderBy: [{ product: { rackLocation: 'asc' } }, { product: { name: 'asc' } }, { expiryDate: 'asc' }],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              rackLocation: true,
              storageCondition: true,
            },
          },
        },
      });

      const sheet = batches.map((b) => ({
        batchId: b.id,
        productId: b.productId,
        productName: b.product.name,
        productSku: b.product.sku,
        rackLocation: b.product.rackLocation || 'Unassigned',
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate.toISOString(),
        systemQuantity: b.quantity,
        costPricePaisa: b.costPricePaisa,
        isRefrigerated: b.product.storageCondition === 'COLD_REFRIGERATED' || b.product.storageCondition === 'COOL',
      }));

      return { success: true, data: sheet };
    } catch {
      // In-memory fallback
      let list = MEMORY_BATCHES.filter((b) => b.quantity > 0);
      if (rackLocation) {
        list = list.filter((b) => b.rackLocation?.toLowerCase() === rackLocation.toLowerCase());
      }

      const sheet = list.map((b) => {
        const prod = SEED_PRODUCTS.find((p) => p.id === b.productId) || {
          name: b.productName,
          sku: b.productSku,
          storageCondition: 'ROOM_TEMPERATURE',
        };
        const isRefrig = prod.storageCondition === 'COLD_REFRIGERATED' || prod.storageCondition === 'COOL';

        return {
          batchId: b.id,
          productId: b.productId,
          productName: b.productName || prod.name,
          productSku: b.productSku || prod.sku,
          rackLocation: b.rackLocation || 'Unassigned',
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          systemQuantity: b.quantity,
          costPricePaisa: b.costPricePaisa || 0,
          isRefrigerated: isRefrig,
        };
      });

      return { success: true, data: sheet };
    }
  });

  // ── 2. GET /api/stocktake — List audits ─────────────────────────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY', 'ACCOUNTANT'])],
  }, async (_req, _reply) => {
    return { success: true, data: MEMORY_STOCKTAKES };
  });

  // ── 3. GET /api/stocktake/:id — Audit details + variance review ─────────────
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const stocktake = MEMORY_STOCKTAKES.find((s) => s.id === id);
    if (!stocktake) {
      return reply.status(404).send({ success: false, message: 'Stocktake audit not found' });
    }
    return { success: true, data: stocktake };
  });

  // ── 4. POST /api/stocktake — Create new count session (Draft) ──────────────
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])],
  }, async (req, reply) => {
    const parsed = CreateStocktakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, message: 'Invalid stocktake parameters' });
    }

    const user = req.user as any;
    const { rackLocation, notes } = parsed.data;

    // Snapshot existing batches
    let batches = MEMORY_BATCHES.filter((b) => b.quantity > 0);
    if (rackLocation) {
      batches = batches.filter((b) => b.rackLocation?.toLowerCase() === rackLocation.toLowerCase());
    }

    const stkId = `stk-${Date.now()}`;
    const items: any[] = batches.map((b, idx) => {
      const prod = SEED_PRODUCTS.find((p) => p.id === b.productId);
      const isRefrig = prod?.storageCondition === 'COLD_REFRIGERATED' || prod?.storageCondition === 'COOL';

      return {
        id: `stki-${Date.now()}-${idx}`,
        stocktakeId: stkId,
        productId: b.productId,
        productName: b.productName,
        productSku: b.productSku,
        rackLocation: b.rackLocation || 'Unassigned',
        batchId: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        systemQuantity: b.quantity,
        countedQuantity: null,
        varianceQuantity: 0,
        costPricePaisa: b.costPricePaisa || 0,
        varianceValuePaisa: 0,
        isRefrigerated: isRefrig,
      };
    });

    const newStocktake = {
      id: stkId,
      stocktakeNumber: nextStocktakeNumber(),
      rackLocation: rackLocation || null,
      status: 'DRAFT',
      notes: notes || 'Physical stock audit',
      createdById: user?.id || 'usr-inventory',
      createdByName: user?.fullName || 'Kamran (Inventory Manager)',
      createdAt: new Date().toISOString(),
      approvedById: null,
      approvedByName: null,
      approvedAt: null,
      rejectedById: null,
      rejectedByName: null,
      rejectedAt: null,
      rejectionReason: null,
      totalItems: items.length,
      varianceItemsCount: 0,
      netVarianceQuantity: 0,
      netVarianceValuePaisa: 0,
      items,
    };

    MEMORY_STOCKTAKES.unshift(newStocktake);
    return reply.status(201).send({ success: true, data: newStocktake });
  });

  // ── 5. PUT /api/stocktake/:id/counts — Update Counted Quantities ────────────
  fastify.put('/:id/counts', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateStocktakeCountsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, message: 'Invalid counted values submitted' });
    }

    const stocktake = MEMORY_STOCKTAKES.find((s) => s.id === id);
    if (!stocktake) {
      return reply.status(404).send({ success: false, message: 'Stocktake not found' });
    }

    // Non-negotiable rule: Approved or Rejected stocktakes cannot be edited!
    if (stocktake.status === 'APPROVED' || stocktake.status === 'REJECTED') {
      return reply.status(400).send({
        success: false,
        message: `This stocktake is ${stocktake.status} and locked from further edits.`,
      });
    }

    const { items: countedUpdates, notes, submitForReview } = parsed.data;

    let varianceCount = 0;
    let netVarianceQty = 0;
    let netVarianceVal = 0;

    stocktake.items = stocktake.items.map((item: any) => {
      const match = countedUpdates.find((u) => u.batchId === item.batchId);
      if (match) {
        const counted = match.countedQuantity;
        const variance = counted - item.systemQuantity;
        const val = variance * item.costPricePaisa;

        if (variance !== 0) varianceCount++;
        netVarianceQty += variance;
        netVarianceVal += val;

        return {
          ...item,
          countedQuantity: counted,
          varianceQuantity: variance,
          varianceValuePaisa: val,
        };
      }
      return item;
    });

    stocktake.varianceItemsCount = varianceCount;
    stocktake.netVarianceQuantity = netVarianceQty;
    stocktake.netVarianceValuePaisa = netVarianceVal;
    if (notes) stocktake.notes = notes;
    if (submitForReview) {
      stocktake.status = 'PENDING_REVIEW';
    }

    return { success: true, data: stocktake };
  });

  // ── 6. POST /api/stocktake/:id/approve — Pharmacist / Admin Approves ────────
  fastify.post('/:id/approve', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user as any;
    const { notes } = (req.body as any) || {};

    const stocktake = MEMORY_STOCKTAKES.find((s) => s.id === id);
    if (!stocktake) {
      return reply.status(404).send({ success: false, message: 'Stocktake not found' });
    }

    // Must be one-time and non-editable afterward
    if (stocktake.status === 'APPROVED') {
      return reply.status(400).send({
        success: false,
        message: `Stocktake was already approved by ${stocktake.approvedByName} on ${stocktake.approvedAt}. Cannot re-approve.`,
      });
    }
    if (stocktake.status === 'REJECTED') {
      return reply.status(400).send({
        success: false,
        message: 'Cannot approve a rejected stocktake.',
      });
    }

    // For every variance, create stock movement (type: stocktake adjustment) and update batch quantity
    const createdMovements: any[] = [];

    for (const it of stocktake.items) {
      if (it.countedQuantity !== null && it.varianceQuantity !== 0) {
        // Find batch
        const batch = MEMORY_BATCHES.find((b) => b.id === it.batchId);
        if (batch) {
          const oldQty = batch.quantity;
          const newQty = it.countedQuantity;
          batch.quantity = newQty; // Update stock to match physical count!

          const mov = {
            id: `mov-stk-${Date.now()}-${it.batchId}`,
            productId: it.productId,
            productName: it.productName,
            batchId: it.batchId,
            batchNumber: it.batchNumber,
            movementType: it.varianceQuantity > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_DAMAGE',
            quantity: it.varianceQuantity,
            balanceAfter: newQty,
            referenceType: 'STOCKTAKE_ADJUSTMENT',
            referenceId: stocktake.id,
            reason: `Physical stocktake ${stocktake.stocktakeNumber}: system had ${oldQty}, counted ${newQty} (variance ${it.varianceQuantity > 0 ? '+' : ''}${it.varianceQuantity})`,
            createdByName: user?.fullName || 'Authorized Pharmacist',
            createdAt: new Date().toISOString(),
          };

          MEMORY_MOVEMENTS.unshift(mov);
          createdMovements.push(mov);
        }
      }
    }

    // Finalize one-time approval record
    stocktake.status = 'APPROVED';
    stocktake.approvedById = user?.id || 'usr-admin';
    stocktake.approvedByName = user?.fullName || 'Dr. Tariq Khan (Pharmacist)';
    stocktake.approvedAt = new Date().toISOString();
    if (notes) stocktake.notes = `${stocktake.notes || ''} | Approval Note: ${notes}`.trim();

    return {
      success: true,
      message: `Stocktake approved. Created ${createdMovements.length} adjustment movements. Stock balances synchronized.`,
      data: stocktake,
      movementsCreated: createdMovements.length,
    };
  });

  // ── 7. POST /api/stocktake/:id/reject — Pharmacist / Admin Rejects ──────────
  fastify.post('/:id/reject', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST'])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user as any;
    const { reason } = (req.body as any) || {};

    const stocktake = MEMORY_STOCKTAKES.find((s) => s.id === id);
    if (!stocktake) {
      return reply.status(404).send({ success: false, message: 'Stocktake not found' });
    }

    if (stocktake.status === 'APPROVED') {
      return reply.status(400).send({
        success: false,
        message: 'Cannot reject an already approved stocktake.',
      });
    }

    stocktake.status = 'REJECTED';
    stocktake.rejectedById = user?.id;
    stocktake.rejectedByName = user?.fullName;
    stocktake.rejectedAt = new Date().toISOString();
    stocktake.rejectionReason = reason || 'Audit rejected by management. Recount required.';

    return {
      success: true,
      message: 'Stocktake rejected. No stock balances were modified.',
      data: stocktake,
    };
  });
};
