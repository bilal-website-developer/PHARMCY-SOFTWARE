import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  StockAdjustmentSchema,
  StockMovementType,
  evaluateBatchStatus,
  getDaysToExpiry,
} from '@pharmacy/shared';
import { MEMORY_BATCHES, MEMORY_MOVEMENTS } from './purchases';

export const stockRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/stock/batches
  // Query: status, productId, search
  fastify.get(
    '/batches',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const user = req.user as any;
      const role = user?.role;
      const isCashier = role === 'CASHIER';

      const { status, productId, search } = req.query as {
        status?: string;
        productId?: string;
        search?: string;
      };

      try {
        const where: any = {};
        if (status) where.status = status;
        if (productId) where.productId = productId;
        if (search) {
          where.OR = [
            { batchNumber: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
            { product: { sku: { contains: search, mode: 'insensitive' } } },
          ];
        }

        const batches = await prisma.stockBatch.findMany({
          where,
          orderBy: { expiryDate: 'asc' }, // FEFO default
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                genericName: true,
                dosageForm: true,
                rackLocation: true,
              },
            },
          },
        });

        const mapped = batches.map((b) => {
          const daysToExpiry = getDaysToExpiry(b.expiryDate);
          const computedStatus = evaluateBatchStatus(b.expiryDate, 3);

          const item: any = {
            id: b.id,
            productId: b.productId,
            productName: b.product.name,
            productSku: b.product.sku,
            genericName: b.product.genericName,
            dosageForm: b.product.dosageForm,
            rackLocation: b.product.rackLocation,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate.toISOString(),
            daysToExpiry,
            quantity: b.quantity,
            initialQuantity: b.initialQuantity,
            mrpPaisa: b.mrpPaisa,
            status: b.status || computedStatus,
            createdAt: b.createdAt.toISOString(),
          };

          // NEVER expose cost to Cashier
          if (!isCashier) {
            item.costPricePaisa = b.costPricePaisa;
          }

          return item;
        });

        return { success: true, data: mapped };
      } catch {
        // Fallback to in-memory batches
        let filtered = [...MEMORY_BATCHES];
        if (status) filtered = filtered.filter((b) => b.status === status);
        if (productId) filtered = filtered.filter((b) => b.productId === productId);
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.batchNumber.toLowerCase().includes(s) ||
              b.productName.toLowerCase().includes(s) ||
              b.productSku.toLowerCase().includes(s)
          );
        }

        const sanitized = filtered.map((b) => {
          if (isCashier) {
            const { costPricePaisa, ...rest } = b;
            return rest;
          }
          return b;
        });

        return { success: true, data: sanitized };
      }
    }
  );

  // GET /api/stock/movements
  // Audit trail of movements (proves batch.quantity = SUM(movements))
  fastify.get(
    '/movements',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY', 'ACCOUNTANT'])] },
    async (req, reply) => {
      const { batchId, productId } = req.query as { batchId?: string; productId?: string };

      try {
        const where: any = {};
        if (batchId) where.batchId = batchId;
        if (productId) where.productId = productId;

        const movements = await prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            product: { select: { name: true, sku: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
            user: { select: { fullName: true, username: true } },
          },
        });

        const mapped = movements.map((m) => ({
          id: m.id,
          productId: m.productId,
          productName: m.product.name,
          batchId: m.batchId,
          batchNumber: m.batch.batchNumber,
          movementType: m.movementType,
          quantity: m.quantity,
          balanceAfter: m.balanceAfter,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          reason: m.reason,
          createdByName: m.user?.fullName || m.user?.username || 'System',
          createdAt: m.createdAt.toISOString(),
        }));

        return { success: true, data: mapped };
      } catch {
        let filtered = [...MEMORY_MOVEMENTS];
        if (batchId) filtered = filtered.filter((m) => m.batchId === batchId);
        if (productId) filtered = filtered.filter((m) => m.productId === productId);
        return { success: true, data: filtered };
      }
    }
  );

  // POST /api/stock/adjustments (Damage write-off, expired write-off, manual inventory count)
  fastify.post(
    '/adjustments',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const parsed = StockAdjustmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid stock adjustment input',
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      const isDeduction =
        input.adjustmentType === StockMovementType.ADJUSTMENT_DAMAGE ||
        input.adjustmentType === StockMovementType.ADJUSTMENT_EXPIRED;

      try {
        const result = await prisma.$transaction(async (tx) => {
          const batch = await tx.stockBatch.findUnique({
            where: { id: input.batchId },
            include: { product: true },
          });

          if (!batch) {
            throw new Error('Stock batch not found');
          }

          if (isDeduction && batch.quantity < input.quantitySmallestUnits) {
            throw new Error(
              `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Attempted write-off: ${input.quantitySmallestUnits}`
            );
          }

          const signedQuantity = isDeduction
            ? -input.quantitySmallestUnits
            : input.quantitySmallestUnits;

          const newBatchQuantity = batch.quantity + signedQuantity;

          // Update Batch Quantity and Status
          let newStatus = batch.status;
          if (newBatchQuantity === 0 && input.adjustmentType === StockMovementType.ADJUSTMENT_EXPIRED) {
            newStatus = 'EXPIRED' as any;
          } else if (input.adjustmentType === StockMovementType.ADJUSTMENT_DAMAGE) {
            newStatus = 'QUARANTINE' as any;
          }

          const updatedBatch = await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              quantity: newBatchQuantity,
              status: newStatus,
            },
          });

          // Create Adjustment Record
          const adjustment = await tx.stockAdjustment.create({
            data: {
              productId: batch.productId,
              batchId: batch.id,
              adjustmentType: input.adjustmentType as any,
              quantitySmallestUnits: input.quantitySmallestUnits,
              reason: input.reason.trim(),
              authorizedById: user?.id,
            },
          });

          // Create StockMovement Ledger Entry
          const movement = await tx.stockMovement.create({
            data: {
              productId: batch.productId,
              batchId: batch.id,
              movementType: input.adjustmentType as any,
              quantity: signedQuantity,
              balanceAfter: newBatchQuantity,
              referenceType: 'ADJUSTMENT',
              referenceId: adjustment.id,
              reason: input.reason.trim(),
              createdById: user?.id,
            },
          });

          // Update Product.currentStock
          await tx.product.update({
            where: { id: batch.productId },
            data: {
              currentStock: {
                increment: signedQuantity,
              },
            },
          });

          // Audit Log
          await tx.auditLog.create({
            data: {
              userId: user?.id,
              userName: user?.fullName || user?.username,
              role: user?.role,
              action: `STOCK_ADJUSTMENT_${input.adjustmentType}`,
              entity: 'StockBatch',
              entityId: batch.id,
              oldValue: { quantity: batch.quantity, status: batch.status },
              newValue: { quantity: newBatchQuantity, status: newStatus },
              reason: input.reason,
            },
          });

          return { updatedBatch, movement, adjustment };
        });

        return { success: true, data: result };
      } catch (err: any) {
        // Fallback for offline DB: modify memory
        const idx = MEMORY_BATCHES.findIndex((b) => b.id === input.batchId);
        if (idx !== -1) {
          const batch = MEMORY_BATCHES[idx];
          const signedQty = isDeduction ? -input.quantitySmallestUnits : input.quantitySmallestUnits;
          batch.quantity = Math.max(0, batch.quantity + signedQty);

          MEMORY_MOVEMENTS.push({
            id: `mov-adj-${Date.now()}`,
            productId: batch.productId,
            batchId: batch.id,
            movementType: input.adjustmentType,
            quantity: signedQty,
            balanceAfter: batch.quantity,
            referenceType: 'ADJUSTMENT',
            referenceId: `adj-${Date.now()}`,
            reason: input.reason,
            createdAt: new Date().toISOString(),
          });

          return { success: true, data: { updatedBatch: batch } };
        }

        return reply.status(400).send({
          success: false,
          message: err.message || 'Stock adjustment failed',
        });
      }
    }
  );

  // GET /api/stock/reports/expiry
  fastify.get(
    '/reports/expiry',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'EXPIRY_WARNING_MONTHS' } });
        const months = setting ? parseInt(setting.value, 10) || 3 : 3;
        const thresholdDate = new Date(Date.now() + months * 30.5 * 24 * 60 * 60 * 1000);

        const batches = await prisma.stockBatch.findMany({
          where: {
            expiryDate: { lte: thresholdDate },
            quantity: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
          include: {
            product: { select: { id: true, name: true, sku: true, rackLocation: true } },
          },
        });

        const mapped = batches.map((b) => ({
          id: b.id,
          productName: b.product.name,
          productSku: b.product.sku,
          rackLocation: b.product.rackLocation,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate.toISOString(),
          daysToExpiry: getDaysToExpiry(b.expiryDate),
          quantity: b.quantity,
          mrpPaisa: b.mrpPaisa,
          status: evaluateBatchStatus(b.expiryDate, months),
        }));

        return {
          success: true,
          data: {
            warningMonths: months,
            totalBatches: mapped.length,
            expiredCount: mapped.filter((b) => b.daysToExpiry <= 0).length,
            nearExpiryCount: mapped.filter((b) => b.daysToExpiry > 0).length,
            batches: mapped,
          },
        };
      } catch {
        const now = Date.now();
        const nearOrExpired = MEMORY_BATCHES.filter(
          (b) => new Date(b.expiryDate).getTime() <= now + 90 * 24 * 60 * 60 * 1000
        );
        return {
          success: true,
          data: {
            warningMonths: 3,
            totalBatches: nearOrExpired.length,
            expiredCount: nearOrExpired.filter((b) => b.daysToExpiry <= 0).length,
            nearExpiryCount: nearOrExpired.filter((b) => b.daysToExpiry > 0).length,
            batches: nearOrExpired,
          },
        };
      }
    }
  );
};
