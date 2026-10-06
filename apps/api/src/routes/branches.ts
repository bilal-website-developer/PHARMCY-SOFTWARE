import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  BranchDto,
  StockTransferDto,
  CreateStockTransferSchema,
  CreateStockTransferInput,
  StockTransferStatus,
  UserRole,
} from '@pharmacy/shared';

export const MEMORY_BRANCHES: BranchDto[] = [
  {
    id: 'br-main',
    code: 'BR-01',
    name: 'PharmaCare Central & Retail (Main Branch)',
    city: 'Lahore',
    address: 'Katchery Road / Hospital Boulevard, Lahore',
    phone: '042-35889900',
    isMainBranch: true,
    status: 'ACTIVE',
    currentCashPaisa: 2365000, // PKR 23,650
    todaySalesPaisa: 1245000,  // PKR 12,450
  },
  {
    id: 'br-dha',
    code: 'BR-02',
    name: 'PharmaCare Phase 5 Clinic Branch',
    city: 'Lahore',
    address: 'Commercial Area, Phase 5 DHA, Lahore',
    phone: '042-37123456',
    isMainBranch: false,
    status: 'ACTIVE',
    currentCashPaisa: 1540000, // PKR 15,400
    todaySalesPaisa: 890000,   // PKR 8,900
  },
  {
    id: 'br-gulberg',
    code: 'BR-03',
    name: 'PharmaCare Gulberg Medical Complex',
    city: 'Lahore',
    address: 'Main Boulevard, Gulberg III, Lahore',
    phone: '042-35771122',
    isMainBranch: false,
    status: 'ACTIVE',
    currentCashPaisa: 980000,  // PKR 9,800
    todaySalesPaisa: 620000,   // PKR 6,200
  },
];

let TRANSFER_COUNTER = 101;

export const MEMORY_TRANSFERS: StockTransferDto[] = [
  {
    id: 'trf-1',
    transferNumber: 'TRF-202610-0099',
    sourceBranchId: 'br-main',
    sourceBranchName: 'PharmaCare Central & Retail (Main Branch)',
    destinationBranchId: 'br-dha',
    destinationBranchName: 'PharmaCare Phase 5 Clinic Branch',
    status: 'RECEIVED',
    notes: 'Urgent transfer of Augmentin and Insulin requested by clinic doctor',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdByName: 'Dr. Tariq (Pharmacist)',
    dispatchedAt: new Date(Date.now() - 80000000).toISOString(),
    receivedAt: new Date(Date.now() - 60000000).toISOString(),
    items: [
      {
        productId: 'prod-3',
        productName: 'Augmentin 625mg',
        sku: 'MED-AUG-625',
        batchNumber: 'BT-AUG-2024-03',
        expiryDate: '2027-10',
        quantitySmallestUnits: 120,
        unitName: 'Box',
        conversionFactor: 12,
        quantityInUnit: 10,
      },
      {
        productId: 'prod-4',
        productName: 'Insulin Mixtard 30/70',
        sku: 'MED-INS-MIX',
        batchNumber: 'BT-INS-2024-04',
        expiryDate: '2026-11',
        quantitySmallestUnits: 15,
        unitName: 'Vial',
        conversionFactor: 1,
        quantityInUnit: 15,
      },
    ],
  },
];

export const branchesRoutes: FastifyPluginAsync = async (fastify) => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GET /api/branches
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    return reply.send({ success: true, data: MEMORY_BRANCHES });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. GET /api/branches/transfers
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/transfers', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    return reply.send({ success: true, data: MEMORY_TRANSFERS });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. POST /api/branches/transfers
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/transfers', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { user } = request as any;
    if (
      ![UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY].includes(user.role)
    ) {
      return reply.status(403).send({ success: false, error: 'Only inventory managers and pharmacists can create transfers' });
    }

    const parseResult = CreateStockTransferSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const input: CreateStockTransferInput = parseResult.data;

    const source = MEMORY_BRANCHES.find((b) => b.id === input.sourceBranchId);
    const dest = MEMORY_BRANCHES.find((b) => b.id === input.destinationBranchId);

    if (!source || !dest) {
      return reply.status(400).send({ success: false, error: 'Invalid source or destination branch' });
    }

    if (source.id === dest.id) {
      return reply.status(400).send({ success: false, error: 'Source and destination branches must be different' });
    }

    const now = new Date();
    const trfNum = `TRF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(TRANSFER_COUNTER++).padStart(4, '0')}`;

    const newTransfer: StockTransferDto = {
      id: `trf-${Date.now()}`,
      transferNumber: trfNum,
      sourceBranchId: source.id,
      sourceBranchName: source.name,
      destinationBranchId: dest.id,
      destinationBranchName: dest.name,
      status: 'REQUESTED',
      notes: input.notes,
      createdAt: now.toISOString(),
      createdByName: user.fullName || user.username,
      items: input.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate,
        quantitySmallestUnits: it.quantityInUnit * it.conversionFactor,
        unitName: it.unitName,
        conversionFactor: it.conversionFactor,
        quantityInUnit: it.quantityInUnit,
      })),
    };

    MEMORY_TRANSFERS.unshift(newTransfer);

    return reply.status(201).send({
      success: true,
      data: newTransfer,
      message: `Stock transfer ${newTransfer.transferNumber} requested successfully`,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PATCH /api/branches/transfers/:id/status
  // Workflow: REQUESTED -> DISPATCHED -> RECEIVED / CANCELLED
  // ───────────────────────────────────────────────────────────────────────────
  fastify.patch('/transfers/:id/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: StockTransferStatus };

    const trf = MEMORY_TRANSFERS.find((t) => t.id === id);
    if (!trf) {
      return reply.status(404).send({ success: false, error: 'Transfer not found' });
    }

    trf.status = status;
    if (status === 'DISPATCHED') {
      trf.dispatchedAt = new Date().toISOString();
    } else if (status === 'RECEIVED') {
      trf.receivedAt = new Date().toISOString();
    }

    return reply.send({
      success: true,
      data: trf,
      message: `Transfer status updated to ${status}`,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. GET /api/branches/:id/cash-book
  // Returns branch-specific cash book ledger
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/:id/cash-book', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const branch = MEMORY_BRANCHES.find((b) => b.id === id);
    if (!branch) {
      return reply.status(404).send({ success: false, error: 'Branch not found' });
    }

    const todayEntries = [
      {
        id: 'cb-1',
        time: '09:00 AM',
        entryType: 'CASH_IN',
        particulars: 'Morning Cash Drawer Opening Balance',
        amountPaisa: 500000, // PKR 5,000
        balanceAfterPaisa: 500000,
      },
      {
        id: 'cb-2',
        time: '01:30 PM',
        entryType: 'CASH_IN',
        particulars: 'POS Retail Cash Sales (Invoices INV-001 - INV-025)',
        amountPaisa: branch.todaySalesPaisa,
        balanceAfterPaisa: 500000 + branch.todaySalesPaisa,
      },
      {
        id: 'cb-3',
        time: '03:15 PM',
        entryType: 'CASH_OUT',
        particulars: 'Local Shop Expenses & Courier Freight',
        amountPaisa: 35000,
        balanceAfterPaisa: 500000 + branch.todaySalesPaisa - 35000,
      },
    ];

    return reply.send({
      success: true,
      data: {
        branch,
        entries: todayEntries,
      },
    });
  });
};
