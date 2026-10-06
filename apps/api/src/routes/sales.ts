import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  PostSaleSchema,
  PostSaleInput,
  VoidSchema,
  SaleStatus,
  StockMovementType,
  BatchStatus,
  UserRole,
  evaluateBatchStatus,
  getDaysToExpiry,
  ROLE_MAX_DISCOUNT,
  PaymentMethod,
  CustomerStatus,
  CustomerLedgerEntryType,
  paisaToRupees,
} from '@pharmacy/shared';
import { DEMO_CUSTOMERS, DEMO_CUSTOMER_LEDGER } from './customers';

// ── In-memory demo fallback (used when DB is not connected) ──────────────────
export const MEMORY_SALES: any[] = [];
const MEMORY_HELD: any[] = [];
let DEMO_INVOICE_NUM = 1;

function nextDemoInvoice(): string {
  return `INV-${String(DEMO_INVOICE_NUM++).padStart(6, '0')}`;
}

export function sanitizeSaleForRole(sale: any, role?: string) {
  if (role !== UserRole.CASHIER) return sale;

  const removedKeys = [
    'totalCostPaisa',
    'grossProfitPaisa',
    'netProfitPaisa',
    'profitPaisa',
    'costPaisa',
    'costPricePaisa',
    'grossMarginPct',
    'marginPct',
    'profitMarginPct',
  ];

  const sanitizeEntry = (entry: any): any => {
    if (!entry || typeof entry !== 'object') return entry;

    const cleaned = { ...entry };
    for (const key of removedKeys) {
      delete cleaned[key];
    }

    if (Array.isArray(cleaned.items)) {
      cleaned.items = cleaned.items.map((item: any) => sanitizeEntry(item));
    }

    return cleaned;
  };

  return sanitizeEntry(sale);
}

// ── Route Plugin ─────────────────────────────────────────────────────────────
export const salesRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /api/sales — list posted sales (Admin/Pharmacist/Accountant) ────────
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    if (
      ![UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT, UserRole.CASHIER].includes(user.role)
    ) {
      return reply.status(403).send({ success: false, error: 'Access denied' });
    }

    try {
      const { date, cashierId, page = '1', limit = '50' } = request.query as any;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (date) {
        const d = new Date(date);
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end = new Date(d.setHours(23, 59, 59, 999));
        where.saleDate = { gte: start, lte: end };
      }
      if (cashierId) where.cashierId = cashierId;

      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where,
          include: { items: true, payments: true },
          orderBy: { saleDate: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.sale.count({ where }),
      ]);

      const sanitizedSales = sales.map((sale) => sanitizeSaleForRole(sale, user.role));

      // Strip cost data for Cashier role (never expose cost/profit to cashier)
      return reply.send({
        success: true,
        data: sanitizedSales,
        meta: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (_err) {
      // Demo fallback
      return reply.send({ success: true, data: MEMORY_SALES.map((sale) => sanitizeSaleForRole(sale, user.role)), meta: { total: MEMORY_SALES.length } });
    }
  });

  // ── GET /api/sales/:id — single sale ────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const sale = await prisma.sale.findUniqueOrThrow({
        where: { id },
        include: { items: true, payments: true },
      });
      return reply.send({ success: true, data: sanitizeSaleForRole(sale, (request as any).user?.role) });
    } catch (_err) {
      const demo = MEMORY_SALES.find((s) => s.id === id);
      if (!demo) return reply.status(404).send({ success: false, error: 'Sale not found' });
      return reply.send({ success: true, data: sanitizeSaleForRole(demo, (request as any).user?.role) });
    }
  });

  // ── POST /api/sales/:id/void — void a sale with reason (no deletes) ─────────
  fastify.post('/:id/void', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    const { id } = request.params as any;

    // Role check: Only Admin and Pharmacist can void posted sales
    if (![UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role)) {
      return reply.status(403).send({ success: false, error: 'Only Pharmacists or Admins can void posted invoices' });
    }

    const parseResult = VoidSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'A valid reason (minimum 5 characters) is required to void an invoice.',
      });
    }
    const { reason } = parseResult.data;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        });

        if (sale.status === SaleStatus.VOIDED) {
          throw new Error('This invoice has already been voided.');
        }

        // 1. Mark sale as voided
        const voided = await tx.sale.update({
          where: { id },
          data: {
            status: SaleStatus.VOIDED,
            voidReason: reason,
            voidedAt: new Date(),
            voidedById: user.id,
            voidedByName: user.fullName,
          },
        });

        // 2. Re-credit stock back to original batches
        for (const item of sale.items) {
          const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: item.batchId } });
          const newQty = batch.quantity + item.quantitySmallestUnits;

          await tx.stockBatch.update({
            where: { id: item.batchId },
            data: { quantity: newQty },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantitySmallestUnits } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              batchId: item.batchId,
              movementType: StockMovementType.SALE_RETURN,
              quantity: item.quantitySmallestUnits,
              balanceAfter: newQty,
              referenceType: 'SALE_VOID',
              referenceId: sale.id,
              reason: `Sale ${sale.invoiceNumber} voided: ${reason}`,
              createdById: user.id,
            },
          });
        }

        // 3. Audit log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'VOID_SALE',
            entity: 'Sale',
            entityId: sale.id,
            oldValue: { status: sale.status },
            newValue: { status: 'VOIDED', voidReason: reason },
            reason,
          },
        });

        return voided;
      });

      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      // In-memory demo fallback
      const demo = MEMORY_SALES.find((s) => s.id === id);
      if (demo) {
        demo.status = SaleStatus.VOIDED;
        demo.voidReason = reason;
        demo.voidedAt = new Date().toISOString();
        demo.voidedByName = user.fullName;
        return reply.send({ success: true, data: demo });
      }
      return reply.status(400).send({ success: false, error: err.message || 'Failed to void invoice' });
    }
  });

  // ── POST /api/sales — post a new sale (atomic FEFO transaction) ─────────────
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;

    // Role check
    if (
      ![UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER].includes(user.role)
    ) {
      return reply.status(403).send({ success: false, error: 'Only cashiers and pharmacists can post sales' });
    }

    // Validate body
    const parseResult = PostSaleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const input: PostSaleInput = parseResult.data;

    // Enforce role discount limit (server-side)
    const maxDisc = ROLE_MAX_DISCOUNT[user.role] ?? 0;
    for (const item of input.items) {
      if (item.discountPct > maxDisc) {
        return reply.status(400).send({
          success: false,
          error: `Your role (${user.role}) may not apply more than ${maxDisc}% discount per item`,
        });
      }
    }

    // Rx gate: if any item needs Rx, doctor + patient details must be present
    if (input.requiresRx && (!input.doctorName || !input.patientName)) {
      return reply.status(400).send({
        success: false,
        error: 'Rx/controlled items require doctor name and patient name',
      });
    }

    // Credit Sale checks
    const isCredit = Boolean(
      input.isCreditSale ||
      input.payments.some((p) => p.method === PaymentMethod.CREDIT)
    );
    let creditAmountPaisa = 0;
    if (isCredit) {
      const creditPayments = input.payments.filter((p) => p.method === PaymentMethod.CREDIT);
      if (creditPayments.length > 0) {
        creditAmountPaisa = creditPayments.reduce((acc, p) => acc + p.amountPaisa, 0);
      } else {
        creditAmountPaisa = Math.max(0, input.grandTotalPaisa - input.paidPaisa);
      }

      if (!input.customerId) {
        return reply.status(400).send({
          success: false,
          error: 'A credit customer must be selected for credit sales',
        });
      }
    }

    try {
      // All of the below runs inside ONE atomic database transaction.
      const sale = await prisma.$transaction(async (tx) => {
        // ── 0. Credit Customer validation & limit check ────────────
        let customerRecord: any = null;
        if (input.customerId) {
          customerRecord = await tx.customer.findUnique({
            where: { id: input.customerId },
          });
          if (!customerRecord) {
            throw new Error(`Customer with ID ${input.customerId} not found`);
          }
          if (customerRecord.status === CustomerStatus.BLOCKED) {
            throw new Error(`Customer ${customerRecord.name} is BLOCKED from making credit purchases.`);
          }
          if (isCredit && creditAmountPaisa > 0) {
            const newBal = customerRecord.currentBalancePaisa + creditAmountPaisa;
            if (newBal > customerRecord.creditLimitPaisa) {
              const isAdminOrPharmacist = [UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role);
              if (!input.creditApprovedById && !isAdminOrPharmacist) {
                throw new Error(
                  `Credit limit exceeded for ${customerRecord.name}. Limit: PKR ${paisaToRupees(customerRecord.creditLimitPaisa)}, ` +
                  `Current Balance: PKR ${paisaToRupees(customerRecord.currentBalancePaisa)}, ` +
                  `Requested: PKR ${paisaToRupees(creditAmountPaisa)}. Override requires Pharmacist/Admin approval.`
                );
              }
            }
          }
        }

        // ── 1. Gap-free invoice number (lock row then increment) ────────────
        let counter = await tx.invoiceCounter.findFirst();
        if (!counter) {
          counter = await tx.invoiceCounter.create({ data: { nextNum: 1 } });
        }
        const invoiceNumber = `INV-${String(counter.nextNum).padStart(6, '0')}`;
        await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { nextNum: { increment: 1 } },
        });

        // ── 2. For each line item: validate batch, deduct stock ─────────────
        for (const item of input.items) {
          const batch = await tx.stockBatch.findUnique({ where: { id: item.batchId } });

          if (!batch) {
            throw new Error(`Batch ${item.batchId} not found`);
          }

          // Guard: expired batches cannot be sold
          const status = evaluateBatchStatus(batch.expiryDate, 3);
          if (status === BatchStatus.EXPIRED) {
            throw new Error(`Batch ${batch.batchNumber} is expired and cannot be sold`);
          }

          // Guard: no negative stock
          if (batch.quantity < item.quantitySmallestUnits) {
            throw new Error(
              `Insufficient stock for batch ${batch.batchNumber}: ` +
              `need ${item.quantitySmallestUnits}, have ${batch.quantity}`
            );
          }

          // Deduct from batch
          const newQty = batch.quantity - item.quantitySmallestUnits;
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              quantity: newQty,
              status: newQty === 0 ? 'RETURNED' : status as any,
            },
          });

          // Decrement product.currentStock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantitySmallestUnits } },
          });
        }

        // ── 3. Create sale record ───────────────────────────────────────────
        const newSale = await tx.sale.create({
          data: {
            invoiceNumber,
            status: 'POSTED',
            subtotalPaisa: input.subtotalPaisa,
            discountPaisa: input.discountPaisa,
            taxPaisa: input.taxPaisa,
            grandTotalPaisa: input.grandTotalPaisa,
            paidPaisa: input.paidPaisa,
            changePaisa: input.changePaisa,
            requiresRx: input.requiresRx,
            doctorName: input.doctorName,
            patientName: input.patientName,
            patientPhone: input.patientPhone,
            customerId: input.customerId,
            customerName: customerRecord?.name || input.customerName,
            isCreditSale: isCredit,
            creditApprovedById: input.creditApprovedById || (isCredit ? user.id : undefined),
            creditApprovedByName: input.creditApprovedByName || (isCredit ? user.fullName : undefined),
            cashierId: user.id,
            cashierName: user.fullName,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                batchId: item.batchId,
                batchNumber: item.batchNumber,
                expiryDate: new Date(item.expiryDate),
                unitName: item.unitName,
                conversionFactor: item.conversionFactor,
                quantityInUnit: item.quantityInUnit,
                quantitySmallestUnits: item.quantitySmallestUnits,
                mrpPaisaPerUnit: item.mrpPaisaPerUnit,
                discountPct: item.discountPct,
                taxPct: item.taxPct,
                lineTotalPaisa: item.lineTotalPaisa,
              })),
            },
            payments: {
              create: input.payments.map((p) => ({
                method: p.method as any,
                amountPaisa: p.amountPaisa,
              })),
            },
          },
          include: { items: true, payments: true },
        });

        // ── 3.1. Customer balance & ledger update for credit sales ───────────
        if (customerRecord && isCredit && creditAmountPaisa > 0) {
          const updatedCustomer = await tx.customer.update({
            where: { id: customerRecord.id },
            data: { currentBalancePaisa: { increment: creditAmountPaisa } },
          });

          await tx.customerLedgerEntry.create({
            data: {
              customerId: customerRecord.id,
              entryType: CustomerLedgerEntryType.CREDIT_SALE,
              debitPaisa: creditAmountPaisa,
              creditPaisa: 0,
              runningBalancePaisa: updatedCustomer.currentBalancePaisa,
              referenceType: 'SALE',
              referenceId: newSale.id,
              notes: `Credit Sale Invoice ${invoiceNumber}`,
              createdById: user.id,
            },
          });
        }

        // ── 4. Stock movement log & Controlled Drug Register ──────────────
        for (const item of input.items) {
          const batch = await tx.stockBatch.findUnique({ where: { id: item.batchId } });
          if (!batch) continue;
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              batchId: item.batchId,
              movementType: StockMovementType.SALE,
              quantity: -item.quantitySmallestUnits, // outflow = negative
              balanceAfter: batch.quantity,           // already decremented above
              referenceType: 'SALE',
              referenceId: newSale.id,
              reason: `POS Sale ${invoiceNumber}`,
              createdById: user.id,
            },
          });

          // Controlled drug register outflow entry if drugClass is controlled/narcotic
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (prod && ['CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC', 'PRECURSOR'].includes(prod.drugClass)) {
            await tx.controlledDrugRegisterEntry.create({
              data: {
                productId: item.productId,
                productName: prod.name,
                genericName: prod.genericName,
                batchNumber: item.batchNumber,
                drugClass: prod.drugClass as any,
                movementType: 'OUTFLOW',
                quantitySmallestUnits: item.quantitySmallestUnits,
                balanceAfterSmallestUnits: batch.quantity,
                patientName: input.patientName || null,
                patientCnic: input.patientCnic || null,
                doctorName: input.doctorName || null,
                doctorRegNo: input.doctorRegNo || null,
                prescriptionRef: input.prescriptionRef || null,
                invoiceNumber,
                dispensedByName: user.fullName,
                notes: `POS Dispense - Invoice ${invoiceNumber}`,
              },
            });
          }
        }

        // ── 4.1. Cash Book entry for cash payments ─────────────────────────
        const cashPayments = input.payments.filter(
          (p) => p.method === PaymentMethod.CASH || (p.method as string) === 'CASH'
        );
        const cashReceivedPaisa = cashPayments.reduce((s, p) => s + p.amountPaisa, 0);
        if (cashReceivedPaisa > 0) {
          const lastCb = await tx.cashBookEntry.findFirst({ orderBy: { date: 'desc' } });
          const prevBal = lastCb ? lastCb.runningBalancePaisa : 0;
          await tx.cashBookEntry.create({
            data: {
              entryType: 'CASH_IN',
              category: 'SALE_CASH',
              amountPaisa: cashReceivedPaisa,
              runningBalancePaisa: prevBal + cashReceivedPaisa,
              description: `POS Cash Sale ${invoiceNumber}`,
              referenceType: 'SALE',
              referenceId: newSale.id,
              performedById: user.id,
              performedByName: user.fullName,
            },
          });
        }

        // ── 4.2. Auto Prescription capture if doctor + patient provided ────
        if (input.requiresRx && input.doctorName && input.patientName) {
          const rxNum = `RX-${invoiceNumber.replace('INV-', '')}`;
          await tx.prescription.create({
            data: {
              prescriptionNumber: rxNum,
              saleId: newSale.id,
              doctorName: input.doctorName,
              doctorRegNo: input.doctorRegNo || null,
              patientName: input.patientName,
              patientCnic: input.patientCnic || null,
              patientPhone: input.patientPhone || null,
              capturedById: user.id,
              capturedByName: user.fullName,
              notes: `Captured at POS checkout for Invoice ${invoiceNumber}`,
            },
          });
        }

        // ── 5. Audit log ────────────────────────────────────────────────────
        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'POST_SALE',
            entity: 'Sale',
            entityId: newSale.id,
            newValue: { invoiceNumber, grandTotalPaisa: input.grandTotalPaisa, isCreditSale: isCredit },
          },
        });

        return newSale;
      }); // end transaction

      return reply.status(201).send({ success: true, data: sale });
    } catch (err: any) {
      if (err.message && (err.message.includes('Credit limit') || err.message.includes('BLOCKED') || err.message.includes('expired and cannot be sold') || err.message.includes('Insufficient stock'))) {
        return reply.status(400).send({ success: false, error: err.message });
      }

      // Demo fallback: if no DB, simulate posting
      const demoSale = {
        id: `sale-demo-${Date.now()}`,
        invoiceNumber: nextDemoInvoice(),
        saleDate: new Date().toISOString(),
        status: SaleStatus.POSTED,
        ...input,
        isCreditSale: isCredit,
        cashierId: user.id,
        cashierName: user.fullName,
        createdAt: new Date().toISOString(),
      };
      MEMORY_SALES.unshift(demoSale);

      if (input.customerId && isCredit && creditAmountPaisa > 0) {
        const demoCust = DEMO_CUSTOMERS.find((c) => c.id === input.customerId);
        if (demoCust) {
          demoCust.currentBalancePaisa += creditAmountPaisa;
          DEMO_CUSTOMER_LEDGER.unshift({
            id: `cledge-demo-${Date.now()}`,
            customerId: demoCust.id,
            entryType: CustomerLedgerEntryType.CREDIT_SALE,
            debitPaisa: creditAmountPaisa,
            creditPaisa: 0,
            runningBalancePaisa: demoCust.currentBalancePaisa,
            referenceType: 'SALE',
            referenceId: demoSale.id,
            notes: `Credit Sale Invoice ${demoSale.invoiceNumber}`,
            createdById: user.id,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return reply.status(201).send({ success: true, data: demoSale });
    }
  });

  // ── GET /api/sales/pos/search — product search for POS ─────────────────────
  fastify.get('/pos/search', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    const { q = '' } = request.query as any;

    if (q.trim().length < 2) {
      return reply.send({ success: true, data: [] });
    }

    try {
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { genericName: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcodes: { some: { barcode: { contains: q } } } },
          ],
        },
        include: {
          units: { orderBy: { conversionFactor: 'desc' } },
          batches: {
            where: { status: { in: ['ACTIVE', 'NEAR_EXPIRY'] }, quantity: { gt: 0 } },
            orderBy: { expiryDate: 'asc' }, // FEFO: earliest first
          },
        },
        take: 20,
      });

      const isCashier = user.role === UserRole.CASHIER;

      const result = products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        genericName: p.genericName,
        dosageForm: p.dosageForm,
        drugClass: p.drugClass,
        isLooseSellingEnabled: p.isLooseSellingEnabled,
        loosePricePaisa: p.loosePricePaisa,
        mrpPaisa: p.mrpPaisa,
        taxRatePct: p.taxRatePct,
        requiresPrescription: p.requiresPrescription,
        currentStock: p.currentStock,
        rackLocation: p.rackLocation,
        // Never expose cost to cashier
        ...(isCashier ? {} : { costPricePaisa: p.costPricePaisa }),
        units: p.units,
        batches: p.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate.toISOString(),
          daysToExpiry: getDaysToExpiry(b.expiryDate),
          quantity: b.quantity,
          status: b.status,
          mrpPaisa: b.mrpPaisa,
          ...(isCashier ? {} : { costPricePaisa: b.costPricePaisa }),
        })),
      }));

      return reply.send({ success: true, data: result });
    } catch (_err) {
      // Demo fallback with rich data
      return reply.send({ success: true, data: getDemoProducts(q) });
    }
  });

  // ── GET /api/sales/pos/substitutes/:productId ────────────────────────────────
  fastify.get('/pos/substitutes/:productId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { productId } = request.params as any;

    try {
      const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      const subs = await prisma.product.findMany({
        where: {
          id: { not: productId },
          genericName: product.genericName,
          strength: product.strength,
          status: 'ACTIVE',
          currentStock: { gt: 0 },
        },
        select: {
          id: true, sku: true, name: true, genericName: true,
          strength: true, dosageForm: true, mrpPaisa: true,
          currentStock: true, rackLocation: true,
          company: { select: { name: true } },
        },
      });
      return reply.send({ success: true, data: subs });
    } catch (_err) {
      return reply.send({ success: true, data: [] });
    }
  });

  // ── POST /api/sales/held — hold a bill ──────────────────────────────────────
  fastify.post('/held', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    const { label, billData } = request.body as any;

    try {
      const held = await prisma.heldBill.create({
        data: {
          label: label || null,
          status: 'HELD',
          billData: billData as any,
          cashierId: user.id,
          cashierName: user.fullName,
        },
      });
      return reply.status(201).send({ success: true, data: held });
    } catch (_err) {
      const demo = {
        id: `held-${Date.now()}`,
        label,
        status: 'HELD',
        billData,
        cashierId: user.id,
        cashierName: user.fullName,
        createdAt: new Date().toISOString(),
      };
      MEMORY_HELD.push(demo);
      return reply.status(201).send({ success: true, data: demo });
    }
  });

  // ── GET /api/sales/held — list held bills for this cashier ──────────────────
  fastify.get('/held', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;

    try {
      const held = await prisma.heldBill.findMany({
        where: { cashierId: user.id, status: 'HELD' },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ success: true, data: held });
    } catch (_err) {
      return reply.send({ success: true, data: MEMORY_HELD.filter((h) => h.status === 'HELD') });
    }
  });

  // ── DELETE /api/sales/held/:id — resume (delete hold) ──────────────────────
  fastify.delete('/held/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const held = await prisma.heldBill.update({
        where: { id },
        data: { status: 'RESUMED', resumedAt: new Date() },
      });
      return reply.send({ success: true, data: held });
    } catch (_err) {
      const idx = MEMORY_HELD.findIndex((h) => h.id === id);
      if (idx !== -1) MEMORY_HELD[idx].status = 'RESUMED';
      return reply.send({ success: true });
    }
  });
};

// ── Demo product data (used when DB is offline) ──────────────────────────────
function getDemoProducts(q: string) {
  const DEMO_PRODUCTS = [
    {
      id: 'prod-1',
      sku: 'MED-001',
      name: 'Panadol 500mg',
      genericName: 'Paracetamol',
      dosageForm: 'Tablet',
      drugClass: 'OTC',
      isLooseSellingEnabled: true,
      loosePricePaisa: 200,
      mrpPaisa: 7000,
      taxRatePct: 0,
      requiresPrescription: false,
      currentStock: 2200,
      rackLocation: 'Rack A-01',
      units: [
        { id: 'pu-1a', unitName: 'Box', conversionFactor: 200, isDefaultSellingUnit: false, isBaseUnit: false, pricePaisa: 7000 },
        { id: 'pu-1b', unitName: 'Strip', conversionFactor: 10, isDefaultSellingUnit: true, isBaseUnit: false, pricePaisa: 350 },
        { id: 'pu-1c', unitName: 'Tablet', conversionFactor: 1, isDefaultSellingUnit: false, isBaseUnit: true, pricePaisa: 35 },
      ],
      batches: [
        { id: 'batch-1', batchNumber: 'BT-PAN-2024-01', expiryDate: new Date(Date.now() + 210 * 86400000).toISOString(), daysToExpiry: 210, quantity: 1200, status: 'ACTIVE', mrpPaisa: 7000 },
        { id: 'batch-2', batchNumber: 'BT-PAN-2025-02', expiryDate: new Date(Date.now() + 540 * 86400000).toISOString(), daysToExpiry: 540, quantity: 1000, status: 'ACTIVE', mrpPaisa: 7200 },
      ],
    },
    {
      id: 'prod-2',
      sku: 'MED-002',
      name: 'Disprin 300mg',
      genericName: 'Aspirin',
      dosageForm: 'Tablet',
      drugClass: 'OTC',
      isLooseSellingEnabled: true,
      loosePricePaisa: 150,
      mrpPaisa: 4500,
      taxRatePct: 0,
      requiresPrescription: false,
      currentStock: 600,
      rackLocation: 'Rack A-02',
      units: [
        { id: 'pu-2a', unitName: 'Box', conversionFactor: 30, isDefaultSellingUnit: false, isBaseUnit: false, pricePaisa: 4500 },
        { id: 'pu-2b', unitName: 'Tablet', conversionFactor: 1, isDefaultSellingUnit: true, isBaseUnit: true, pricePaisa: 150 },
      ],
      batches: [
        { id: 'batch-3', batchNumber: 'BT-DISP-2024', expiryDate: new Date(Date.now() + 75 * 86400000).toISOString(), daysToExpiry: 75, quantity: 600, status: 'NEAR_EXPIRY', mrpPaisa: 4500 },
      ],
    },
    {
      id: 'prod-3',
      sku: 'MED-003',
      name: 'Augmentin 625mg',
      genericName: 'Amoxicillin + Clavulanate',
      dosageForm: 'Tablet',
      drugClass: 'RX',
      isLooseSellingEnabled: false,
      loosePricePaisa: null,
      mrpPaisa: 22800,
      taxRatePct: 0,
      requiresPrescription: true,
      currentStock: 204,
      rackLocation: 'Rack B-03',
      units: [
        { id: 'pu-3a', unitName: 'Box', conversionFactor: 12, isDefaultSellingUnit: true, isBaseUnit: false, pricePaisa: 22800 },
        { id: 'pu-3b', unitName: 'Tablet', conversionFactor: 1, isDefaultSellingUnit: false, isBaseUnit: true, pricePaisa: 1900 },
      ],
      batches: [
        { id: 'batch-4', batchNumber: 'BT-AUG-2024-03', expiryDate: new Date(Date.now() + 360 * 86400000).toISOString(), daysToExpiry: 360, quantity: 204, status: 'ACTIVE', mrpPaisa: 22800 },
      ],
    },
    {
      id: 'prod-4',
      sku: 'MED-004',
      name: 'Brufen 400mg',
      genericName: 'Ibuprofen',
      dosageForm: 'Tablet',
      drugClass: 'OTC',
      isLooseSellingEnabled: true,
      loosePricePaisa: 250,
      mrpPaisa: 6000,
      taxRatePct: 0,
      requiresPrescription: false,
      currentStock: 900,
      rackLocation: 'Rack A-04',
      units: [
        { id: 'pu-4a', unitName: 'Box', conversionFactor: 30, isDefaultSellingUnit: false, isBaseUnit: false, pricePaisa: 6000 },
        { id: 'pu-4b', unitName: 'Tablet', conversionFactor: 1, isDefaultSellingUnit: true, isBaseUnit: true, pricePaisa: 200 },
      ],
      batches: [
        { id: 'batch-5', batchNumber: 'BT-BRU-2024', expiryDate: new Date(Date.now() + 400 * 86400000).toISOString(), daysToExpiry: 400, quantity: 900, status: 'ACTIVE', mrpPaisa: 6000 },
      ],
    },
    {
      id: 'prod-5',
      sku: 'MED-005',
      name: 'Amoxil 500mg',
      genericName: 'Amoxicillin',
      dosageForm: 'Capsule',
      drugClass: 'RX',
      isLooseSellingEnabled: false,
      loosePricePaisa: null,
      mrpPaisa: 18500,
      taxRatePct: 0,
      requiresPrescription: true,
      currentStock: 360,
      rackLocation: 'Rack B-01',
      units: [
        { id: 'pu-5a', unitName: 'Box', conversionFactor: 20, isDefaultSellingUnit: true, isBaseUnit: false, pricePaisa: 18500 },
        { id: 'pu-5b', unitName: 'Capsule', conversionFactor: 1, isDefaultSellingUnit: false, isBaseUnit: true, pricePaisa: 925 },
      ],
      batches: [
        { id: 'batch-6', batchNumber: 'BT-AMOX-2024', expiryDate: new Date(Date.now() + 270 * 86400000).toISOString(), daysToExpiry: 270, quantity: 360, status: 'ACTIVE', mrpPaisa: 18500 },
      ],
    },
    {
      id: 'prod-6',
      sku: 'MED-006',
      name: 'Lexotanil 3mg',
      genericName: 'Bromazepam',
      dosageForm: 'Tablet',
      drugClass: 'CONTROLLED',
      isLooseSellingEnabled: false,
      loosePricePaisa: null,
      mrpPaisa: 12000,
      taxRatePct: 0,
      requiresPrescription: true,
      currentStock: 150,
      rackLocation: 'Rack C-01 (Controlled)',
      units: [
        { id: 'pu-6a', unitName: 'Strip', conversionFactor: 10, isDefaultSellingUnit: true, isBaseUnit: false, pricePaisa: 12000 },
        { id: 'pu-6b', unitName: 'Tablet', conversionFactor: 1, isDefaultSellingUnit: false, isBaseUnit: true, pricePaisa: 1200 },
      ],
      batches: [
        { id: 'batch-7', batchNumber: 'BT-LEX-2024', expiryDate: new Date(Date.now() + 500 * 86400000).toISOString(), daysToExpiry: 500, quantity: 150, status: 'ACTIVE', mrpPaisa: 12000 },
      ],
    },
  ];

  const lq = q.toLowerCase();
  return DEMO_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(lq) ||
      p.genericName.toLowerCase().includes(lq) ||
      p.sku.toLowerCase().includes(lq)
  );
}
