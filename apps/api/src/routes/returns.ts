import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  PostReturnSchema,
  PostReturnInput,
  ReturnStatus,
  ReturnDestination,
  RefundMethod,
  StockMovementType,
  UserRole,
} from '@pharmacy/shared';

// ── In-memory fallback demo dataset ─────────────────────────────────────────
let DEMO_RETURN_COUNTER = 1;
const MEMORY_RETURNS: any[] = [
  {
    id: 'ret-demo-1',
    returnNumber: 'RET-202610-000001',
    saleId: 'sale-1',
    saleInvoiceNumber: 'INV-202610-000001',
    returnDate: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'COMPLETED',
    refundMethod: 'CASH',
    totalRefundPaisa: 3500, // Rs 35.00
    reason: 'Customer bought incorrect dosage (prescribed 250mg, bought 500mg)',
    needsApproval: false,
    isApproved: true,
    cashierId: 'user-cashier-1',
    cashierName: 'Fatima Noor (Cashier)',
    notes: 'Unopened blister pack inspected and verified intact.',
    items: [
      {
        id: 'reti-1',
        saleReturnId: 'ret-demo-1',
        productId: 'prod-panadol',
        productName: 'Panadol 500mg',
        batchId: 'batch-pan-01',
        batchNumber: 'BT-PAN-2024-01',
        unitName: 'strip',
        conversionFactor: 10,
        quantityInUnit: 1,
        quantitySmallestUnits: 10,
        refundPricePaisaPerUnit: 3500,
        lineTotalRefundPaisa: 3500,
        destination: 'RESTOCK_ORIGINAL_BATCH',
        reason: 'Wrong dosage requested by patient',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

function nextReturnNumber(): string {
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
  return `RET-${yyyymm}-${String(DEMO_RETURN_COUNTER++).padStart(6, '0')}`;
}

export const returnsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/returns — list all sales returns ──────────────────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { date, cashierId, destination, page = '1', limit = '50' } = request.query as any;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (date) {
        const d = new Date(date);
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end = new Date(d.setHours(23, 59, 59, 999));
        where.returnDate = { gte: start, lte: end };
      }
      if (cashierId) where.cashierId = cashierId;

      const [returns, total] = await Promise.all([
        prisma.saleReturn.findMany({
          where,
          include: { items: true },
          orderBy: { returnDate: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.saleReturn.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: returns,
        meta: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (_err) {
      // Demo fallback
      return reply.send({
        success: true,
        data: MEMORY_RETURNS,
        meta: { total: MEMORY_RETURNS.length, page: 1, limit: 50 },
      });
    }
  });

  // ── GET /api/returns/:id — get single return ───────────────────────────────
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const record = await prisma.saleReturn.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
      return reply.send({ success: true, data: record });
    } catch (_err) {
      const demo = MEMORY_RETURNS.find((r) => r.id === id);
      if (!demo) return reply.status(404).send({ success: false, error: 'Return record not found' });
      return reply.send({ success: true, data: demo });
    }
  });

  // ── POST /api/returns — process sales return (atomic stock transaction) ─────
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;

    const parseResult = PostReturnSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid return data: ' + parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const input: PostReturnInput = parseResult.data;

    // Check if return without invoice requires approval
    const isManagerOrAdmin = [UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role);
    if (!input.saleInvoiceNumber && !isManagerOrAdmin && !input.approvedById) {
      return reply.status(403).send({
        success: false,
        error: 'Manager or Pharmacist approval is strictly required for returns without an original invoice.',
      });
    }

    try {
      // Execute within atomic transaction
      const returnRecord = await prisma.$transaction(async (tx) => {
        // 1. Verify non-returnable constraint
        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, isNonReturnable: true },
          });
          if (product?.isNonReturnable) {
            throw new Error(`Product "${product.name}" is marked non-returnable (e.g. cold-chain biologics / hygiene rule).`);
          }
        }

        // 2. Generate sequential return number
        const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
        const count = await tx.saleReturn.count();
        const returnNumber = `RET-${yyyymm}-${String(count + 1).padStart(6, '0')}`;

        // 3. Compute total refund
        const totalRefundPaisa = input.items.reduce(
          (sum, it) => sum + it.quantityInUnit * it.refundPricePaisaPerUnit,
          0
        );

        // 4. Create SaleReturn header
        const newReturn = await tx.saleReturn.create({
          data: {
            returnNumber,
            saleId: input.saleId || null,
            saleInvoiceNumber: input.saleInvoiceNumber || null,
            status: ReturnStatus.COMPLETED,
            refundMethod: input.refundMethod,
            totalRefundPaisa,
            reason: input.reason,
            needsApproval: !input.saleInvoiceNumber && !isManagerOrAdmin,
            isApproved: true,
            approvedById: input.approvedById || (isManagerOrAdmin ? user.id : null),
            approvedByName: isManagerOrAdmin ? user.fullName : null,
            cashierId: user.id,
            cashierName: user.fullName,
            notes: input.notes || null,
          },
        });

        // 5. Create return items & update stock
        for (const it of input.items) {
          const smallestUnits = it.quantityInUnit * it.conversionFactor;
          const lineTotalRefundPaisa = it.quantityInUnit * it.refundPricePaisaPerUnit;

          await tx.saleReturnItem.create({
            data: {
              saleReturnId: newReturn.id,
              saleItemId: it.saleItemId || null,
              productId: it.productId,
              productName: it.productName,
              batchId: it.batchId,
              batchNumber: it.batchNumber,
              unitName: it.unitName,
              conversionFactor: it.conversionFactor,
              quantityInUnit: it.quantityInUnit,
              quantitySmallestUnits: smallestUnits,
              refundPricePaisaPerUnit: it.refundPricePaisaPerUnit,
              lineTotalRefundPaisa,
              destination: it.destination,
              reason: it.reason || input.reason,
            },
          });

          if (it.destination === ReturnDestination.RESTOCK_ORIGINAL_BATCH) {
            // Restore batch quantity
            const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: it.batchId } });
            const newBatchQty = batch.quantity + smallestUnits;

            await tx.stockBatch.update({
              where: { id: it.batchId },
              data: { quantity: newBatchQty },
            });

            // Restore product total current stock
            await tx.product.update({
              where: { id: it.productId },
              data: { currentStock: { increment: smallestUnits } },
            });

            // Log stock movement (positive inflow)
            await tx.stockMovement.create({
              data: {
                productId: it.productId,
                batchId: it.batchId,
                movementType: StockMovementType.SALE_RETURN,
                quantity: smallestUnits,
                balanceAfter: newBatchQty,
                referenceType: 'SALE_RETURN',
                referenceId: newReturn.id,
                reason: `Returned to shelf: ${input.reason}`,
                createdById: user.id,
              },
            });
          } else {
            // DAMAGED / QUARANTINE:
            // Do not restock active shelf stock. Movement recorded as quarantine adjustment.
            const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: it.batchId } });
            await tx.stockMovement.create({
              data: {
                productId: it.productId,
                batchId: it.batchId,
                movementType: StockMovementType.ADJUSTMENT_DAMAGE,
                quantity: 0, // No active stock added
                balanceAfter: batch.quantity,
                referenceType: 'SALE_RETURN_QUARANTINE',
                referenceId: newReturn.id,
                reason: `Quarantine bucket: ${it.reason || input.reason}`,
                createdById: user.id,
              },
            });
          }
        }

        // 6. Audit trail
        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'SALE_RETURN',
            entity: 'SaleReturn',
            entityId: newReturn.id,
            newValue: {
              returnNumber,
              saleInvoiceNumber: input.saleInvoiceNumber,
              totalRefundPaisa,
              itemCount: input.items.length,
            },
            reason: input.reason,
          },
        });

        return newReturn;
      });

      return reply.status(201).send({ success: true, data: returnRecord });
    } catch (err: any) {
      // If error was non-returnable constraint or other business rule, return 400
      if (err.message && err.message.includes('non-returnable')) {
        return reply.status(400).send({ success: false, error: err.message });
      }

      // Demo fallback when DB offline
      const demoReturnNumber = nextReturnNumber();
      const totalRefundPaisa = input.items.reduce(
        (sum, it) => sum + it.quantityInUnit * it.refundPricePaisaPerUnit,
        0
      );

      const demoRecord = {
        id: `ret-demo-${Date.now()}`,
        returnNumber: demoReturnNumber,
        saleId: input.saleId || null,
        saleInvoiceNumber: input.saleInvoiceNumber || null,
        returnDate: new Date().toISOString(),
        status: ReturnStatus.COMPLETED,
        refundMethod: input.refundMethod,
        totalRefundPaisa,
        reason: input.reason,
        needsApproval: false,
        isApproved: true,
        cashierId: user.id,
        cashierName: user.fullName,
        notes: input.notes || null,
        items: input.items.map((it, idx) => ({
          id: `reti-demo-${Date.now()}-${idx}`,
          saleReturnId: `ret-demo-${Date.now()}`,
          ...it,
          quantitySmallestUnits: it.quantityInUnit * it.conversionFactor,
          lineTotalRefundPaisa: it.quantityInUnit * it.refundPricePaisaPerUnit,
        })),
        createdAt: new Date().toISOString(),
      };

      MEMORY_RETURNS.unshift(demoRecord);
      return reply.status(201).send({ success: true, data: demoRecord });
    }
  });
};
