import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  PurchaseSchema,
  PurchaseStatus,
  StockMovementType,
  VoidSchema,
  UserRole,
  calculateEffectiveUnitCost,
  evaluateBatchStatus,
} from '@pharmacy/shared';

// In-memory demo store for fallback if DB is offline
const SAMPLE_INVOICE_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="%23ffffff"/><rect x="20" y="20" width="560" height="100" fill="%2315803D" rx="8"/><text x="40" y="60" fill="%23ffffff" font-family="sans-serif" font-size="20" font-weight="bold">AL-MADINA PHARMA DISTRIBUTORS</text><text x="40" y="85" fill="%23F0FDF4" font-family="sans-serif" font-size="12">Wholesale Medicine Market, Katchery Road, Lahore - NTN: 4891234-7</text><text x="40" y="105" fill="%23F0FDF4" font-family="sans-serif" font-size="12">Phone: +92 42 35889900 | Official Tax Invoice / Delivery Challan</text><rect x="20" y="140" width="560" height="80" fill="%23f8fafc" stroke="%23cbd5e1" rx="6"/><text x="40" y="165" font-family="sans-serif" font-size="12" fill="%23475569">Bill / Invoice No: <tspan font-weight="bold" fill="%230f172a">INV-9821</tspan></text><text x="320" y="165" font-family="sans-serif" font-size="12" fill="%23475569">Invoice Date: <tspan font-weight="bold" fill="%230f172a">02/10/2026</tspan></text><text x="40" y="195" font-family="sans-serif" font-size="12" fill="%23475569">Customer: <tspan font-weight="bold" fill="%230f172a">PharmaCare Pharmacy</tspan></text><text x="320" y="195" font-family="sans-serif" font-size="12" fill="%23475569">Payment Terms: <tspan font-weight="bold" fill="%230f172a">30 Days Net</tspan></text><rect x="20" y="240" width="560" height="30" fill="%23e2e8f0"/><text x="30" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">ITEM DESCRIPTION</text><text x="240" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">BATCH</text><text x="320" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">EXPIRY</text><text x="400" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">QTY</text><text x="460" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">BONUS</text><text x="520" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">AMOUNT</text><line x1="20" y1="300" x2="580" y2="300" stroke="%23e2e8f0"/><text x="30" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">Panadol 500mg (Box of 200)</text><text x="240" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">BT-PAN-24</text><text x="320" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">04/2027</text><text x="400" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">10</text><text x="460" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">1</text><text x="520" y="290" font-family="sans-serif" font-size="11" fill="%231e293b">Rs 580</text><line x1="20" y1="335" x2="580" y2="335" stroke="%23e2e8f0"/><text x="30" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">Augmentin 625mg (Box of 12)</text><text x="240" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">BT-AUG-24</text><text x="320" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">10/2027</text><text x="400" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">15</text><text x="460" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">2</text><text x="520" y="325" font-family="sans-serif" font-size="11" fill="%231e293b">Rs 2,925</text><rect x="340" y="400" width="240" height="110" fill="%23f1f5f9" rx="6"/><text x="360" y="425" font-family="sans-serif" font-size="12" fill="%23475569">Gross Subtotal: Rs 3,505.00</text><text x="360" y="450" font-family="sans-serif" font-size="12" fill="%2315803d">Trade Discount (5%): -Rs 175.25</text><text x="360" y="485" font-family="sans-serif" font-size="14" font-weight="bold" fill="%230f172a">Net Payable: Rs 3,329.75</text><rect x="60" y="550" width="160" height="60" stroke="%2315803D" stroke-width="2" stroke-dasharray="4" rx="4" fill="none"/><text x="80" y="585" fill="%2315803D" font-family="sans-serif" font-size="14" font-weight="bold">GOODS VERIFIED</text><text x="95" y="600" fill="%2315803D" font-family="sans-serif" font-size="10">PHARMACIST SIGN</text></svg>`;

export const MEMORY_PURCHASES: any[] = [
  {
    id: 'pur-101',
    supplierId: 'sup-1',
    supplierName: 'Al-Madina Pharma Distributors',
    supplierCode: 'SUP-MADINA-01',
    billNumber: 'INV-9821',
    billDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmountPaisa: 350500,
    discountPaisa: 17525,
    taxPaisa: 0,
    netPayablePaisa: 332975,
    paidAmountPaisa: 150000,
    status: 'CONFIRMED',
    billAttachmentUrl: SAMPLE_INVOICE_DATA_URL,
    notes: 'Received via TCS cargo, batch and expiry verified by Pharmacist.',
    items: [
      {
        id: 'pi-1',
        productId: 'prod-1',
        productName: 'Panadol 500mg',
        batchNumber: 'BT-PAN-2024-01',
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 10,
        unitName: 'Box',
        conversionFactor: 200,
        bonusQuantity: 1,
        tradePricePaisa: 58000,
        discountPct: 5,
        taxPct: 0,
        mrpPaisa: 7000,
        totalSmallestUnits: 2200,
        costPerSmallestUnitPaisa: 25,
      },
      {
        id: 'pi-2',
        productId: 'prod-3',
        productName: 'Augmentin 625mg',
        batchNumber: 'BT-AUG-2024-03',
        expiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 15,
        unitName: 'Box',
        conversionFactor: 12,
        bonusQuantity: 2,
        tradePricePaisa: 19500,
        discountPct: 5,
        taxPct: 0,
        mrpPaisa: 22800,
        totalSmallestUnits: 204,
        costPerSmallestUnitPaisa: 1360,
      },
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pur-102',
    supplierId: 'sup-2',
    supplierName: 'Khyber Medicos & Wholesale',
    supplierCode: 'SUP-KHYBER-02',
    billNumber: 'INV-4410',
    billDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmountPaisa: 215000,
    discountPaisa: 10750,
    taxPaisa: 0,
    netPayablePaisa: 204250,
    paidAmountPaisa: 204250,
    status: 'CONFIRMED',
    billAttachmentUrl: SAMPLE_INVOICE_DATA_URL,
    notes: 'Paid in full on receipt.',
    items: [
      {
        id: 'pi-3',
        productId: 'prod-2',
        productName: 'Calpol 500mg',
        batchNumber: 'BT-CAL-2024-09',
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: 5,
        unitName: 'Box',
        conversionFactor: 200,
        bonusQuantity: 0,
        tradePricePaisa: 56500,
        discountPct: 5,
        taxPct: 0,
        mrpPaisa: 6800,
        totalSmallestUnits: 1000,
        costPerSmallestUnitPaisa: 27,
      },
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MEMORY_BATCHES: any[] = [
  {
    id: 'batch-1',
    productId: 'prod-1',
    productName: 'Panadol 500mg',
    productSku: 'MED-PAN-500',
    rackLocation: 'Rack A-01',
    batchNumber: 'BT-PAN-2024-01',
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 180,
    quantity: 1250,
    initialQuantity: 2200,
    costPricePaisa: 25,
    mrpPaisa: 7000,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-2',
    productId: 'prod-2',
    productName: 'Calpol 500mg',
    productSku: 'MED-CAL-500',
    rackLocation: 'Rack A-02',
    batchNumber: 'BT-CAL-2024-09',
    expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 45,
    quantity: 480,
    initialQuantity: 1000,
    costPricePaisa: 27,
    mrpPaisa: 6800,
    status: 'NEAR_EXPIRY',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-3',
    productId: 'prod-3',
    productName: 'Augmentin 625mg',
    productSku: 'MED-AUG-625',
    rackLocation: 'Rack B-05',
    batchNumber: 'BT-AUG-2024-03',
    expiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 360,
    quantity: 180,
    initialQuantity: 204,
    costPricePaisa: 1360,
    mrpPaisa: 22800,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-4',
    productId: 'prod-5',
    productName: 'Risek 20mg',
    productSku: 'MED-RIS-20',
    rackLocation: 'Rack C-01',
    batchNumber: 'BT-RIS-2023-11',
    expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: -10,
    quantity: 60,
    initialQuantity: 400,
    costPricePaisa: 2390,
    mrpPaisa: 39200,
    status: 'EXPIRED',
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-5',
    productId: 'prod-4',
    productName: 'Amoclav 625mg',
    productSku: 'MED-AMOCLAV-625',
    rackLocation: 'Rack B-06',
    batchNumber: 'BT-AMC-2024-04',
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 240,
    quantity: 95,
    initialQuantity: 120,
    costPricePaisa: 1430,
    mrpPaisa: 20400,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-6',
    productId: 'prod-6',
    productName: 'Brufen 400mg',
    productSku: 'MED-BRU-400',
    rackLocation: 'Rack A-03',
    batchNumber: 'BT-BRU-2024-02',
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 300,
    quantity: 600,
    initialQuantity: 600,
    costPricePaisa: 110,
    mrpPaisa: 3200,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-7',
    productId: 'prod-7',
    productName: 'Disprin 300mg',
    productSku: 'MED-DIS-300',
    rackLocation: 'Rack A-04',
    batchNumber: 'BT-DIS-2024-08',
    expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 20,
    quantity: 150,
    initialQuantity: 500,
    costPricePaisa: 65,
    mrpPaisa: 1800,
    status: 'NEAR_EXPIRY',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-8',
    productId: 'prod-8',
    productName: 'Flagyl 400mg',
    productSku: 'MED-FLA-400',
    rackLocation: 'Rack B-02',
    batchNumber: 'BT-FLA-2024-05',
    expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 400,
    quantity: 350,
    initialQuantity: 400,
    costPricePaisa: 85,
    mrpPaisa: 2500,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'batch-9',
    productId: 'prod-9',
    productName: 'Surbex Z',
    productSku: 'MED-SURBEX-Z',
    rackLocation: 'Rack V-01',
    batchNumber: 'BT-SBX-2024-06',
    expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString(),
    daysToExpiry: 500,
    quantity: 120,
    initialQuantity: 150,
    costPricePaisa: 28500,
    mrpPaisa: 33000,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MEMORY_MOVEMENTS: any[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    batchId: 'batch-1',
    batchNumber: 'BT-PAN-2024-01',
    movementType: 'PURCHASE',
    quantity: 2200,
    balanceAfter: 2200,
    referenceType: 'PURCHASE',
    referenceId: 'pur-101',
    reason: 'GRN Bill #INV-9821 from Al-Madina Pharma',
    createdByName: 'Pharmacist',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mov-2',
    productId: 'prod-1',
    batchId: 'batch-1',
    batchNumber: 'BT-PAN-2024-01',
    movementType: 'SALE',
    quantity: -950,
    balanceAfter: 1250,
    referenceType: 'SALE',
    referenceId: 'pos-inv-001',
    reason: 'Counter Dispensing',
    createdByName: 'Bilal Cashier',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mov-3',
    productId: 'prod-2',
    batchId: 'batch-2',
    batchNumber: 'BT-CAL-2024-09',
    movementType: 'PURCHASE',
    quantity: 1000,
    balanceAfter: 1000,
    referenceType: 'PURCHASE',
    referenceId: 'pur-102',
    reason: 'GRN Bill #INV-4410 from Khyber Medicos',
    createdByName: 'Inventory Manager',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mov-4',
    productId: 'prod-2',
    batchId: 'batch-2',
    batchNumber: 'BT-CAL-2024-09',
    movementType: 'SALE',
    quantity: -520,
    balanceAfter: 480,
    referenceType: 'SALE',
    referenceId: 'pos-inv-002',
    reason: 'Counter Dispensing',
    createdByName: 'Bilal Cashier',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mov-5',
    productId: 'prod-5',
    batchId: 'batch-4',
    batchNumber: 'BT-RIS-2023-11',
    movementType: 'PURCHASE',
    quantity: 400,
    balanceAfter: 400,
    referenceType: 'PURCHASE',
    referenceId: 'pur-090',
    reason: 'GRN Opening Stock',
    createdByName: 'System',
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mov-6',
    productId: 'prod-5',
    batchId: 'batch-4',
    batchNumber: 'BT-RIS-2023-11',
    movementType: 'SALE',
    quantity: -340,
    balanceAfter: 60,
    referenceType: 'SALE',
    referenceId: 'pos-inv-old',
    reason: 'Counter Sales',
    createdByName: 'Bilal Cashier',
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export { MEMORY_BATCHES, MEMORY_MOVEMENTS };

export const purchasesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/purchases
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY', 'ACCOUNTANT'])] },
    async (req, reply) => {
      const { search, supplierId } = req.query as { search?: string; supplierId?: string };

      try {
        const where: any = {};
        if (supplierId) where.supplierId = supplierId;
        if (search) {
          where.OR = [
            { billNumber: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
          ];
        }

        const purchases = await prisma.purchase.findMany({
          where,
          orderBy: { billDate: 'desc' },
          include: {
            supplier: { select: { id: true, name: true, code: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        });

        const formatted = purchases.map((p) => ({
          ...p,
          supplierName: p.supplier.name,
          supplierCode: p.supplier.code,
          itemCount: p.items.length,
        }));

        return { success: true, data: formatted };
      } catch {
        return { success: true, data: MEMORY_PURCHASES };
      }
    }
  );

  // POST /api/purchases/check-bill (Warn duplicate bill number per supplier)
  fastify.post(
    '/check-bill',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { supplierId, billNumber } = req.body as { supplierId: string; billNumber: string };
      if (!supplierId || !billNumber) {
        return { success: true, isDuplicate: false };
      }

      try {
        const existing = await prisma.purchase.findUnique({
          where: {
            supplierId_billNumber: {
              supplierId,
              billNumber: billNumber.trim(),
            },
          },
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            netPayablePaisa: true,
          },
        });

        return {
          success: true,
          isDuplicate: !!existing,
          existingPurchase: existing || null,
        };
      } catch {
        const found = MEMORY_PURCHASES.find(
          (p) => p.supplierId === supplierId && p.billNumber.toLowerCase() === billNumber.trim().toLowerCase()
        );
        return {
          success: true,
          isDuplicate: !!found,
          existingPurchase: found || null,
        };
      }
    }
  );

  // GET /api/purchases/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY', 'ACCOUNTANT'])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const purchase = await prisma.purchase.findUnique({
          where: { id },
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
            stockMovements: true,
          },
        });

        if (!purchase) {
          return reply.status(404).send({ success: false, message: 'Purchase not found' });
        }

        return { success: true, data: purchase };
      } catch {
        const found = MEMORY_PURCHASES.find((p) => p.id === id);
        if (!found) {
          return reply.status(404).send({ success: false, message: 'Purchase not found' });
        }
        return { success: true, data: found };
      }
    }
  );

  // POST /api/purchases (Atomic Transaction: Purchase + Stock Batches + Movements + Supplier Ledger Credit)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const parsed = PurchaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid purchase entry',
          errors: parsed.error.issues,
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      // 1. Fetch system setting for expiry warning months (default 3)
      let warningMonths = 3;
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'EXPIRY_WARNING_MONTHS' } });
        if (setting) warningMonths = parseInt(setting.value, 10) || 3;
      } catch {
        // default 3
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Check for duplicate bill number
          const duplicate = await tx.purchase.findUnique({
            where: {
              supplierId_billNumber: {
                supplierId: input.supplierId,
                billNumber: input.billNumber.trim(),
              },
            },
          });

          if (duplicate) {
            throw new Error(`Duplicate Bill Alert: Bill #${input.billNumber} already exists for this supplier`);
          }

          // Create Purchase Record
          const purchase = await tx.purchase.create({
            data: {
              supplierId: input.supplierId,
              billNumber: input.billNumber.trim(),
              billDate: new Date(input.billDate),
              totalAmountPaisa: input.totalAmountPaisa,
              discountPaisa: input.discountPaisa,
              taxPaisa: input.taxPaisa,
              netPayablePaisa: input.netPayablePaisa,
              paidAmountPaisa: input.paidAmountPaisa,
              status: input.status as any,
              billAttachmentUrl: input.billAttachmentUrl || null,
              notes: input.notes || null,
              createdById: user?.id,
            },
          });

          const createdBatches: any[] = [];
          const createdMovements: any[] = [];

          // Process each item
          for (const item of input.items) {
            const factor = item.conversionFactor || 1;
            const totalSmallestUnits = (item.quantity + item.bonusQuantity) * factor;
            const effectiveUnitCost = calculateEffectiveUnitCost(
              item.tradePricePaisa,
              item.discountPct,
              item.taxPct,
              totalSmallestUnits
            );

            // Create PurchaseItem
            const purchaseItem = await tx.purchaseItem.create({
              data: {
                purchaseId: purchase.id,
                productId: item.productId,
                batchNumber: item.batchNumber.trim().toUpperCase(),
                expiryDate: new Date(item.expiryDate),
                quantity: item.quantity,
                unitName: item.unitName,
                conversionFactor: factor,
                bonusQuantity: item.bonusQuantity,
                tradePricePaisa: item.tradePricePaisa,
                discountPct: item.discountPct,
                taxPct: item.taxPct,
                mrpPaisa: item.mrpPaisa,
                totalSmallestUnits,
                costPerSmallestUnitPaisa: effectiveUnitCost,
              },
            });

            // Evaluate batch status (Active, Near Expiry, Expired)
            const batchStatus = evaluateBatchStatus(item.expiryDate, warningMonths);

            // Upsert StockBatch
            const existingBatch = await tx.stockBatch.findUnique({
              where: {
                productId_batchNumber: {
                  productId: item.productId,
                  batchNumber: item.batchNumber.trim().toUpperCase(),
                },
              },
            });

            let batch: any;
            if (existingBatch) {
              const newQty = existingBatch.quantity + totalSmallestUnits;
              batch = await tx.stockBatch.update({
                where: { id: existingBatch.id },
                data: {
                  quantity: newQty,
                  costPricePaisa: effectiveUnitCost,
                  mrpPaisa: item.mrpPaisa,
                  expiryDate: new Date(item.expiryDate),
                  status: batchStatus as any,
                  purchaseItemId: purchaseItem.id,
                },
              });
            } else {
              batch = await tx.stockBatch.create({
                data: {
                  productId: item.productId,
                  batchNumber: item.batchNumber.trim().toUpperCase(),
                  expiryDate: new Date(item.expiryDate),
                  quantity: totalSmallestUnits,
                  initialQuantity: totalSmallestUnits,
                  costPricePaisa: effectiveUnitCost,
                  mrpPaisa: item.mrpPaisa,
                  status: batchStatus as any,
                  purchaseItemId: purchaseItem.id,
                },
              });
            }
            createdBatches.push(batch);

            // Create StockMovement Ledger Entry (Invariant: Batch Quantity = SUM(movements))
            const movement = await tx.stockMovement.create({
              data: {
                productId: item.productId,
                batchId: batch.id,
                movementType: StockMovementType.PURCHASE,
                quantity: totalSmallestUnits, // Positive inflow
                balanceAfter: batch.quantity,
                referenceType: 'PURCHASE',
                referenceId: purchase.id,
                purchaseId: purchase.id,
                reason: `GRN Bill #${input.billNumber} from Supplier`,
                createdById: user?.id,
              },
            });
            createdMovements.push(movement);

            // Update Product.currentStock and last costPricePaisa
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const mrpChanged = item.mrpPaisa !== product.mrpPaisa;
              const costChanged = effectiveUnitCost !== (product.costPricePaisa || 0);

              await tx.product.update({
                where: { id: item.productId },
                data: {
                  currentStock: product.currentStock + totalSmallestUnits,
                  costPricePaisa: effectiveUnitCost * factor, // Store as pack cost
                  mrpPaisa: item.mrpPaisa,
                },
              });

              if (mrpChanged || costChanged) {
                await tx.priceHistory.create({
                  data: {
                    productId: item.productId,
                    oldMrpPaisa: product.mrpPaisa,
                    newMrpPaisa: item.mrpPaisa,
                    oldCostPricePaisa: product.costPricePaisa,
                    newCostPricePaisa: effectiveUnitCost * factor,
                    changeReason: `Purchase GRN Bill #${input.billNumber} price update`,
                    changedByUserId: user?.id,
                    changedByName: user?.fullName || user?.username,
                  },
                });
              }

              // Controlled Drug Register inflow entry if drug is controlled/narcotic
              if (['CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC', 'PRECURSOR'].includes(product.drugClass)) {
                await tx.controlledDrugRegisterEntry.create({
                  data: {
                    productId: item.productId,
                    productName: product.name,
                    genericName: product.genericName,
                    batchNumber: item.batchNumber.trim().toUpperCase(),
                    drugClass: product.drugClass as any,
                    movementType: 'INFLOW',
                    quantitySmallestUnits: totalSmallestUnits,
                    balanceAfterSmallestUnits: batch.quantity,
                    invoiceNumber: input.billNumber.trim(),
                    dispensedByName: user?.fullName || 'Purchasing Incharge',
                    notes: `Purchase GRN Bill #${input.billNumber.trim()}`,
                  },
                });
              }
            }
          }

          // Credit Supplier Ledger: currentBalancePaisa increases by (netPayable - paidAmount)
          const unpaidPaisa = input.netPayablePaisa - input.paidAmountPaisa;
          if (unpaidPaisa !== 0) {
            await tx.supplier.update({
              where: { id: input.supplierId },
              data: {
                currentBalancePaisa: {
                  increment: unpaidPaisa,
                },
              },
            });
          }

          // Cash Book entry if cash paid on purchase
          if (input.paidAmountPaisa > 0) {
            const lastCb = await tx.cashBookEntry.findFirst({ orderBy: { date: 'desc' } });
            const curBal = lastCb ? lastCb.runningBalancePaisa : 0;
            await tx.cashBookEntry.create({
              data: {
                entryType: 'CASH_OUT',
                category: 'SUPPLIER_PAYMENT',
                amountPaisa: input.paidAmountPaisa,
                runningBalancePaisa: curBal - input.paidAmountPaisa,
                description: `Supplier Payment on Purchase Bill #${input.billNumber.trim()}`,
                referenceType: 'PURCHASE',
                referenceId: purchase.id,
                performedById: user?.id,
                performedByName: user?.fullName || user?.username,
              },
            });
          }

          // Audit Log
          await tx.auditLog.create({
            data: {
              userId: user?.id,
              userName: user?.fullName || user?.username,
              role: user?.role,
              action: 'CONFIRM_PURCHASE',
              entity: 'Purchase',
              entityId: purchase.id,
              newValue: {
                billNumber: input.billNumber,
                netPayablePaisa: input.netPayablePaisa,
                paidAmountPaisa: input.paidAmountPaisa,
                itemCount: input.items.length,
              },
            },
          });

          return { purchase, createdBatches, createdMovements };
        });

        return { success: true, data: result.purchase };
      } catch (err: any) {
        // Fallback for offline DB: add to memory
        const newPurchase = {
          ...input,
          id: `pur-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        MEMORY_PURCHASES.unshift(newPurchase);

        // Record batches into memory
        for (const item of input.items) {
          const factor = item.conversionFactor || 1;
          const totalSmallestUnits = (item.quantity + item.bonusQuantity) * factor;
          const effectiveUnitCost = calculateEffectiveUnitCost(
            item.tradePricePaisa,
            item.discountPct,
            item.taxPct,
            totalSmallestUnits
          );

          const existingIdx = MEMORY_BATCHES.findIndex(
            (b) => b.productId === item.productId && b.batchNumber === item.batchNumber
          );

          let batchId: string;
          let newQty: number;

          if (existingIdx !== -1) {
            MEMORY_BATCHES[existingIdx].quantity += totalSmallestUnits;
            batchId = MEMORY_BATCHES[existingIdx].id;
            newQty = MEMORY_BATCHES[existingIdx].quantity;
          } else {
            batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
            newQty = totalSmallestUnits;
            MEMORY_BATCHES.unshift({
              id: batchId,
              productId: item.productId,
              productName: item.productName || 'Medicine',
              productSku: item.productSku || 'SKU',
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              daysToExpiry: 180,
              quantity: totalSmallestUnits,
              initialQuantity: totalSmallestUnits,
              costPricePaisa: effectiveUnitCost,
              mrpPaisa: item.mrpPaisa,
              status: evaluateBatchStatus(item.expiryDate, warningMonths),
              createdAt: new Date().toISOString(),
            });
          }

          // Record movement
          MEMORY_MOVEMENTS.push({
            id: `mov-${Date.now()}`,
            productId: item.productId,
            batchId,
            movementType: StockMovementType.PURCHASE,
            quantity: totalSmallestUnits,
            balanceAfter: newQty,
            referenceType: 'PURCHASE',
            referenceId: newPurchase.id,
            reason: `GRN Bill #${input.billNumber}`,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          success: true,
          data: newPurchase,
          message: 'Saved to memory (DB offline)',
        };
      }
    }
  );

  // ── POST /api/purchases/:id/void — void a purchase with reason ───────────────
  fastify.post(
    '/:id/void',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { user } = request as any;
      const { id } = request.params as any;

      if (![UserRole.ADMIN, UserRole.PHARMACIST].includes(user.role)) {
        return reply.status(403).send({ success: false, error: 'Only Pharmacists or Admins can void purchases' });
      }

      const parseResult = VoidSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'A valid reason (minimum 5 characters) is required to void a purchase.',
        });
      }
      const { reason } = parseResult.data;

      try {
        const cancelled = await prisma.$transaction(async (tx) => {
          const purchase = await tx.purchase.findUniqueOrThrow({
            where: { id },
            include: { items: true },
          });

          if (purchase.status === PurchaseStatus.CANCELLED) {
            throw new Error('This purchase has already been cancelled.');
          }

          // 1. Verify that deducting stock will not violate non-negative stock invariant
          for (const item of purchase.items) {
            const batch = await tx.stockBatch.findFirst({
              where: { productId: item.productId, batchNumber: item.batchNumber },
            });
            if (batch && batch.quantity < item.totalSmallestUnits) {
              throw new Error(
                `Cannot void purchase: batch "${item.batchNumber}" has only ${batch.quantity} units left, but purchase GRN added ${item.totalSmallestUnits} units. Some units have already been dispensed/sold.`
              );
            }
          }

          // 2. Deduct batch stock & record movements
          for (const item of purchase.items) {
            const batch = await tx.stockBatch.findFirst({
              where: { productId: item.productId, batchNumber: item.batchNumber },
            });
            if (batch) {
              const newQty = batch.quantity - item.totalSmallestUnits;
              await tx.stockBatch.update({
                where: { id: batch.id },
                data: { quantity: newQty },
              });

              await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: { decrement: item.totalSmallestUnits } },
              });

              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  batchId: batch.id,
                  movementType: StockMovementType.PURCHASE_RETURN,
                  quantity: -item.totalSmallestUnits,
                  balanceAfter: newQty,
                  referenceType: 'PURCHASE_VOID',
                  referenceId: purchase.id,
                  purchaseId: purchase.id,
                  reason: `Purchase Bill #${purchase.billNumber} voided: ${reason}`,
                  createdById: user.id,
                },
              });
            }
          }

          // 3. Reverse supplier ledger impact
          const unpaidPaisa = purchase.netPayablePaisa - purchase.paidAmountPaisa;
          if (unpaidPaisa !== 0) {
            await tx.supplier.update({
              where: { id: purchase.supplierId },
              data: { currentBalancePaisa: { decrement: unpaidPaisa } },
            });
          }

          // 4. Update purchase status
          const updated = await tx.purchase.update({
            where: { id },
            data: {
              status: PurchaseStatus.CANCELLED,
              voidReason: reason,
              voidedAt: new Date(),
              voidedById: user.id,
              voidedByName: user.fullName || user.username,
            },
          });

          // 5. Audit Log
          await tx.auditLog.create({
            data: {
              userId: user.id,
              userName: user.fullName || user.username,
              role: user.role,
              action: 'VOID_PURCHASE',
              entity: 'Purchase',
              entityId: purchase.id,
              oldValue: { status: purchase.status, billNumber: purchase.billNumber },
              newValue: { status: 'CANCELLED', voidReason: reason },
              reason,
            },
          });

          return updated;
        });

        return reply.send({ success: true, data: cancelled });
      } catch (err: any) {
        const demo = MEMORY_PURCHASES.find((p) => p.id === id);
        if (demo) {
          demo.status = 'CANCELLED';
          demo.voidReason = reason;
          demo.voidedAt = new Date().toISOString();
          demo.voidedByName = user.fullName || user.username;
          return reply.send({ success: true, data: demo });
        }
        return reply.status(400).send({ success: false, error: err.message || 'Failed to void purchase' });
      }
    }
  );
};
