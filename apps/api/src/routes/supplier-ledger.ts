import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  RecordSupplierPaymentSchema,
  CreateDebitNoteSchema,
  CreateExpiryClaimSchema,
  UpdateExpiryClaimStatusSchema,
  SupplierLedgerEntryType,
  ExpiryClaimStatus,
  PaymentMethod,
  UserRole,
} from '@pharmacy/shared';

// ── Demo fallback stores ──────────────────────────────────────────────────────
const DEMO_SUP_PAYMENTS: any[] = [];
const DEMO_DEBIT_NOTES: any[] = [];
const DEMO_EXPIRY_CLAIMS: any[] = [
  {
    id: 'claim-demo-1',
    claimNumber: 'CLM-000001',
    supplierId: 'sup-1',
    supplierName: 'Al-Madina Pharma Distributors',
    claimDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    status: 'CLAIM_PENDING',
    totalClaimPaisa: 1850000,
    creditNoteNumber: null,
    creditNoteReceivedDate: null,
    creditNoteAmountPaisa: null,
    adjustedAt: null,
    adjustedPaymentId: null,
    notes: 'Expired paracetamol batch Jan-2026',
    items: [
      {
        id: 'citem-demo-1',
        claimId: 'claim-demo-1',
        productId: 'prod-1',
        productName: 'Paracetamol 500mg',
        batchId: 'batch-1',
        batchNumber: 'PAR-2024-JAN',
        expiryDate: '2025-01-31',
        quantitySmallestUnits: 500,
        costPricePaisa: 2000,
        totalAmountPaisa: 1000000,
      },
    ],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'claim-demo-2',
    claimNumber: 'CLM-000002',
    supplierId: 'sup-2',
    supplierName: 'Khyber Medicos & Wholesale',
    claimDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    status: 'CREDIT_NOTE_RECEIVED',
    totalClaimPaisa: 3200000,
    creditNoteNumber: 'CN-KMW-2026-045',
    creditNoteReceivedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    creditNoteAmountPaisa: 3000000,
    adjustedAt: null,
    adjustedPaymentId: null,
    notes: 'Partial credit note accepted',
    items: [],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const DEMO_SUP_LEDGER: any[] = [];
let DEMO_CLAIM_NUM = 3;
let DEMO_DEBIT_NUM = 1;
let DEMO_VOUCHER_NUM = 1;

function nextClaimNumber(): string {
  return `CLM-${String(DEMO_CLAIM_NUM++).padStart(6, '0')}`;
}
function nextDebitNumber(): string {
  return `DN-${String(DEMO_DEBIT_NUM++).padStart(6, '0')}`;
}
function nextVoucherNumber(): string {
  return `PV-${String(DEMO_VOUCHER_NUM++).padStart(6, '0')}`;
}

// ── Route Plugin ──────────────────────────────────────────────────────────────
export const supplierLedgerRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /api/supplier-ledger/:supplierId/ledger ──────────────────────────────
  fastify.get('/:supplierId/ledger', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { supplierId } = req.params as any;
    const { page = '1', limit = '50' } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const [entries, total, supplier] = await Promise.all([
        prisma.supplierLedgerEntry.findMany({
          where: { supplierId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.supplierLedgerEntry.count({ where: { supplierId } }),
        prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } }),
      ]);

      return { success: true, data: entries, supplier, meta: { total, page: Number(page), limit: Number(limit) } };
    } catch {
      const demoEntries = DEMO_SUP_LEDGER.filter((e) => e.supplierId === supplierId);
      return { success: true, data: demoEntries, supplier: null, meta: { total: demoEntries.length, page: 1, limit: 50 } };
    }
  });

  // ── POST /api/supplier-ledger/payments — record a supplier payment ────────────
  fastify.post('/payments', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const parsed = RecordSupplierPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid payment input',
        errors: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });

        const newBalance = supplier.currentBalancePaisa - input.amountPaisa;

        await tx.supplier.update({
          where: { id: supplier.id },
          data: { currentBalancePaisa: newBalance },
        });

        let counter = await tx.invoiceCounter.findFirst();
        if (!counter) counter = await tx.invoiceCounter.create({ data: { nextNum: 1 } });
        const voucherNumber = `PV-${String(counter.nextNum).padStart(6, '0')}`;
        await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { nextNum: { increment: 1 } },
        });

        const payment = await tx.supplierPayment.create({
          data: {
            voucherNumber,
            supplierId: supplier.id,
            amountPaisa: input.amountPaisa,
            paymentMethod: input.paymentMethod as any,
            chequeOrTxNumber: input.chequeOrTxNumber || null,
            adjustedCreditNoteId: input.adjustedCreditNoteId || null,
            paidById: user.id,
            paidByName: user.fullName,
            notes: input.notes || null,
          },
        });

        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: supplier.id,
            entryType: SupplierLedgerEntryType.PAYMENT_MADE as any,
            creditPaisa: 0,
            debitPaisa: input.amountPaisa,
            runningBalancePaisa: newBalance,
            referenceType: 'SUPPLIER_PAYMENT',
            referenceId: payment.id,
            notes: input.notes || `Payment made via ${input.paymentMethod}`,
            createdById: user.id,
          },
        });

        // Cash Book entry if payment was made in cash
        if (input.paymentMethod === PaymentMethod.CASH || (input.paymentMethod as string) === 'CASH') {
          const lastCb = await tx.cashBookEntry.findFirst({ orderBy: { date: 'desc' } });
          const prevBal = lastCb ? lastCb.runningBalancePaisa : 0;
          await tx.cashBookEntry.create({
            data: {
              entryType: 'CASH_OUT',
              category: 'SUPPLIER_PAYMENT',
              amountPaisa: input.amountPaisa,
              runningBalancePaisa: prevBal - input.amountPaisa,
              description: `Supplier Cash Payment Voucher ${voucherNumber} (${supplier.name})`,
              referenceType: 'SUPPLIER_PAYMENT',
              referenceId: payment.id,
              performedById: user.id,
              performedByName: user.fullName,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'RECORD_SUPPLIER_PAYMENT',
            entity: 'SupplierPayment',
            entityId: payment.id,
            newValue: { voucherNumber, amountPaisa: input.amountPaisa, supplierId: input.supplierId },
          },
        });

        return payment;
      });

      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      const demoPay: any = {
        id: `spay-demo-${Date.now()}`,
        voucherNumber: nextVoucherNumber(),
        supplierId: input.supplierId,
        amountPaisa: input.amountPaisa,
        paymentMethod: input.paymentMethod,
        chequeOrTxNumber: input.chequeOrTxNumber || null,
        paidByName: user.fullName,
        notes: input.notes || null,
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      DEMO_SUP_PAYMENTS.push(demoPay);
      return reply.status(201).send({ success: true, data: demoPay });
    }
  });

  // ── GET /api/supplier-ledger/:supplierId/payments ────────────────────────────
  fastify.get('/:supplierId/payments', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { supplierId } = req.params as any;
    try {
      const payments = await prisma.supplierPayment.findMany({
        where: { supplierId },
        orderBy: { paymentDate: 'desc' },
      });
      return { success: true, data: payments };
    } catch {
      return { success: true, data: DEMO_SUP_PAYMENTS.filter((p) => p.supplierId === supplierId) };
    }
  });

  // ── POST /api/supplier-ledger/debit-notes — purchase return debit note ────────
  fastify.post('/debit-notes', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])],
  }, async (req, reply) => {
    const parsed = CreateDebitNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid debit note input',
        errors: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    const totalAmountPaisa = input.items.reduce(
      (sum, item) => sum + item.costPricePaisaPerUnit * item.quantitySmallestUnits,
      0
    );

    try {
      const result = await prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });

        let counter = await tx.invoiceCounter.findFirst();
        if (!counter) counter = await tx.invoiceCounter.create({ data: { nextNum: 1 } });
        const debitNoteNumber = `DN-${String(counter.nextNum).padStart(6, '0')}`;
        await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { nextNum: { increment: 1 } },
        });

        const debitNote = await tx.purchaseReturnDebitNote.create({
          data: {
            debitNoteNumber,
            supplierId: supplier.id,
            purchaseId: input.purchaseId || null,
            totalAmountPaisa,
            reason: input.reason,
            notes: input.notes || null,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                batchId: item.batchId,
                batchNumber: item.batchNumber,
                quantitySmallestUnits: item.quantitySmallestUnits,
                costPricePaisaPerUnit: item.costPricePaisaPerUnit,
                totalAmountPaisa: item.costPricePaisaPerUnit * item.quantitySmallestUnits,
              })),
            },
          },
          include: { items: true },
        });

        // Reduce supplier balance
        const newBalance = supplier.currentBalancePaisa - totalAmountPaisa;
        await tx.supplier.update({
          where: { id: supplier.id },
          data: { currentBalancePaisa: newBalance },
        });

        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: supplier.id,
            entryType: SupplierLedgerEntryType.PURCHASE_RETURN_DEBIT as any,
            creditPaisa: 0,
            debitPaisa: totalAmountPaisa,
            runningBalancePaisa: newBalance,
            referenceType: 'DEBIT_NOTE',
            referenceId: debitNote.id,
            notes: `Debit note ${debitNoteNumber}: ${input.reason}`,
            createdById: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'CREATE_DEBIT_NOTE',
            entity: 'PurchaseReturnDebitNote',
            entityId: debitNote.id,
            newValue: { debitNoteNumber, totalAmountPaisa, supplierId: input.supplierId },
          },
        });

        return debitNote;
      });

      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      const demoNote: any = {
        id: `dn-demo-${Date.now()}`,
        debitNoteNumber: nextDebitNumber(),
        supplierId: input.supplierId,
        purchaseId: input.purchaseId || null,
        totalAmountPaisa,
        reason: input.reason,
        status: 'PENDING',
        notes: input.notes || null,
        items: input.items.map((item, idx) => ({
          id: `dnitem-${idx}`,
          ...item,
          totalAmountPaisa: item.costPricePaisaPerUnit * item.quantitySmallestUnits,
        })),
        returnDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      DEMO_DEBIT_NOTES.push(demoNote);
      return reply.status(201).send({ success: true, data: demoNote });
    }
  });

  // ── GET /api/supplier-ledger/:supplierId/debit-notes ─────────────────────────
  fastify.get('/:supplierId/debit-notes', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { supplierId } = req.params as any;
    try {
      const notes = await prisma.purchaseReturnDebitNote.findMany({
        where: { supplierId },
        include: { items: true },
        orderBy: { returnDate: 'desc' },
      });
      return { success: true, data: notes };
    } catch {
      return { success: true, data: DEMO_DEBIT_NOTES.filter((n) => n.supplierId === supplierId) };
    }
  });

  // ── GET /api/supplier-ledger/expiry-claims ───────────────────────────────────
  fastify.get('/expiry-claims', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { supplierId, status } = req.query as any;
    try {
      const where: any = {};
      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;

      const claims = await prisma.expiryClaim.findMany({
        where,
        include: { items: true, supplier: { select: { name: true } } },
        orderBy: { claimDate: 'desc' },
      });
      return {
        success: true,
        data: claims.map((c) => ({
          ...c,
          supplierName: c.supplier?.name,
        })),
      };
    } catch {
      let filtered = [...DEMO_EXPIRY_CLAIMS];
      if (supplierId) filtered = filtered.filter((c) => c.supplierId === supplierId);
      if (status) filtered = filtered.filter((c) => c.status === status);
      return { success: true, data: filtered };
    }
  });

  // ── POST /api/supplier-ledger/expiry-claims — create an expiry claim ─────────
  fastify.post('/expiry-claims', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])],
  }, async (req, reply) => {
    const parsed = CreateExpiryClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid expiry claim input',
        errors: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    const totalClaimPaisa = input.items.reduce((sum, item) => sum + item.costPricePaisa, 0);

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });

        let counter = await tx.invoiceCounter.findFirst();
        if (!counter) counter = await tx.invoiceCounter.create({ data: { nextNum: 1 } });
        const claimNumber = `CLM-${String(counter.nextNum).padStart(6, '0')}`;
        await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { nextNum: { increment: 1 } },
        });

        const claim = await tx.expiryClaim.create({
          data: {
            claimNumber,
            supplierId: input.supplierId,
            status: ExpiryClaimStatus.CLAIM_PENDING as any,
            totalClaimPaisa,
            notes: input.notes || null,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                batchId: item.batchId,
                batchNumber: item.batchNumber,
                expiryDate: new Date(item.expiryDate),
                quantitySmallestUnits: item.quantitySmallestUnits,
                costPricePaisa: item.costPricePaisa,
                totalAmountPaisa: item.costPricePaisa,
              })),
            },
          },
          include: { items: true },
        });

        // Mark batches as EXPIRED_CLAIM_PENDING
        for (const item of input.items) {
          await tx.stockBatch.update({
            where: { id: item.batchId },
            data: { status: 'EXPIRED_CLAIM_PENDING' },
          }).catch(() => { /* batch may not exist in demo */ });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'CREATE_EXPIRY_CLAIM',
            entity: 'ExpiryClaim',
            entityId: claim.id,
            newValue: { claimNumber, totalClaimPaisa, supplierId: input.supplierId },
          },
        });

        return claim;
      });

      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      const demoClaim: any = {
        id: `claim-demo-${Date.now()}`,
        claimNumber: nextClaimNumber(),
        supplierId: input.supplierId,
        claimDate: new Date().toISOString(),
        status: ExpiryClaimStatus.CLAIM_PENDING,
        totalClaimPaisa,
        creditNoteNumber: null,
        creditNoteReceivedDate: null,
        creditNoteAmountPaisa: null,
        adjustedAt: null,
        adjustedPaymentId: null,
        notes: input.notes || null,
        items: input.items.map((item, idx) => ({
          id: `clitem-${idx}`,
          ...item,
          totalAmountPaisa: item.costPricePaisa,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DEMO_EXPIRY_CLAIMS.push(demoClaim);
      return reply.status(201).send({ success: true, data: demoClaim });
    }
  });

  // ── PATCH /api/supplier-ledger/expiry-claims/:id/status — update claim status ─
  fastify.patch('/expiry-claims/:id/status', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const { id } = req.params as any;
    const parsed = UpdateExpiryClaimStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid status update input',
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const claim = await tx.expiryClaim.findUniqueOrThrow({ where: { id }, include: { items: true } });

        const updateData: any = {
          status: input.status,
          notes: input.notes || claim.notes,
        };

        if (input.status === ExpiryClaimStatus.CREDIT_NOTE_RECEIVED) {
          if (!input.creditNoteNumber) throw new Error('Credit note number is required');
          updateData.creditNoteNumber = input.creditNoteNumber;
          updateData.creditNoteReceivedDate = new Date();
          updateData.creditNoteAmountPaisa = input.creditNoteAmountPaisa ?? claim.totalClaimPaisa;
        }

        if (input.status === ExpiryClaimStatus.ADJUSTED) {
          updateData.adjustedAt = new Date();

          // Apply credit to supplier ledger
          const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: claim.supplierId } });
          const adjustAmount = claim.creditNoteAmountPaisa ?? claim.totalClaimPaisa;
          const newBalance = supplier.currentBalancePaisa - adjustAmount;
          await tx.supplier.update({
            where: { id: supplier.id },
            data: { currentBalancePaisa: newBalance },
          });

          await tx.supplierLedgerEntry.create({
            data: {
              supplierId: supplier.id,
              entryType: SupplierLedgerEntryType.EXPIRY_CLAIM_CREDIT_NOTE as any,
              creditPaisa: 0,
              debitPaisa: adjustAmount,
              runningBalancePaisa: newBalance,
              referenceType: 'EXPIRY_CLAIM',
              referenceId: claim.id,
              notes: `Expiry claim ${claim.claimNumber} adjusted against credit note ${claim.creditNoteNumber || ''}`,
              createdById: user.id,
            },
          });
        }

        const updated = await tx.expiryClaim.update({
          where: { id },
          data: updateData,
          include: { items: true },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'UPDATE_EXPIRY_CLAIM_STATUS',
            entity: 'ExpiryClaim',
            entityId: id,
            oldValue: { status: claim.status },
            newValue: { status: input.status },
          },
        });

        return updated;
      });

      return { success: true, data: result };
    } catch (err: any) {
      // Demo fallback
      const idx = DEMO_EXPIRY_CLAIMS.findIndex((c) => c.id === id);
      if (idx >= 0) {
        DEMO_EXPIRY_CLAIMS[idx] = {
          ...DEMO_EXPIRY_CLAIMS[idx],
          status: input.status,
          creditNoteNumber: input.creditNoteNumber || DEMO_EXPIRY_CLAIMS[idx].creditNoteNumber,
          creditNoteAmountPaisa: input.creditNoteAmountPaisa || DEMO_EXPIRY_CLAIMS[idx].creditNoteAmountPaisa,
          updatedAt: new Date().toISOString(),
        };
        return { success: true, data: DEMO_EXPIRY_CLAIMS[idx] };
      }
      return reply.status(404).send({ success: false, message: err.message || 'Claim not found' });
    }
  });

  // ── GET /api/supplier-ledger/expiry-claims/:id ───────────────────────────────
  fastify.get('/expiry-claims/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const claim = await prisma.expiryClaim.findUniqueOrThrow({
        where: { id },
        include: { items: true, supplier: { select: { name: true, phone: true } } },
      });
      return { success: true, data: { ...claim, supplierName: claim.supplier?.name } };
    } catch {
      const demo = DEMO_EXPIRY_CLAIMS.find((c) => c.id === id);
      if (!demo) return reply.status(404).send({ success: false, message: 'Claim not found' });
      return { success: true, data: demo };
    }
  });
};
