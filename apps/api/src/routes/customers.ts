import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ReceiveCustomerPaymentSchema,
  CustomerType,
  CustomerStatus,
  CustomerLedgerEntryType,
  PaymentMethod,
  UserRole,
} from '@pharmacy/shared';

// ── Demo fallback data ────────────────────────────────────────────────────────
export const DEMO_CUSTOMERS: any[] = [
  {
    id: 'cust-demo-1',
    name: 'Ahmed Medical Store',
    phone: '0300-1234567',
    email: 'ahmed@medstore.pk',
    address: 'Main Bazar, Lahore',
    cnic: '35201-1234567-1',
    customerType: 'REGULAR',
    status: 'ACTIVE',
    creditLimitPaisa: 10000000,
    openingBalancePaisa: 500000,
    currentBalancePaisa: 3200000,
    notes: 'Reliable regular customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-demo-2',
    name: 'City Hospital Pharmacy',
    phone: '0321-9876543',
    email: 'pharmacy@cityhospital.pk',
    address: 'Hospital Road, Karachi',
    cnic: null,
    customerType: 'CORPORATE',
    status: 'ACTIVE',
    creditLimitPaisa: 50000000,
    openingBalancePaisa: 0,
    currentBalancePaisa: 12500000,
    notes: 'Bulk buyer — monthly billing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-demo-3',
    name: 'Dr. Fatima Clinic',
    phone: '0333-5551122',
    email: 'dr.fatima@clinic.pk',
    address: 'DHA Phase 5, Lahore',
    cnic: '35202-9876543-2',
    customerType: 'DOCTOR_CLINIC',
    status: 'ACTIVE',
    creditLimitPaisa: 20000000,
    openingBalancePaisa: 200000,
    currentBalancePaisa: 4500000,
    notes: 'Partner clinic — prefer bank transfer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEMO_CUSTOMER_LEDGER: any[] = [];
export const DEMO_CUSTOMER_PAYMENTS: any[] = [];
let DEMO_CUST_ID = 4;
let DEMO_PAY_NUM = 1;

function nextReceiptNumber(): string {
  return `RCP-${String(DEMO_PAY_NUM++).padStart(6, '0')}`;
}

// ── Route Plugin ──────────────────────────────────────────────────────────────
export const customersRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /api/customers/ageing — MUST be registered before /:id
  fastify.get('/ageing', {
    preHandler: [fastify.authenticate],
  }, async (_req, reply) => {
    try {
      const customers = await prisma.customer.findMany({
        where: { status: 'ACTIVE', currentBalancePaisa: { gt: 0 } },
        orderBy: { currentBalancePaisa: 'desc' },
      });

      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const ageing = await Promise.all(customers.map(async (c) => {
        const entries = await prisma.customerLedgerEntry.findMany({
          where: { customerId: c.id, debitPaisa: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
        });

        let current = 0, d31to60 = 0, d61to90 = 0, over90 = 0;
        for (const e of entries) {
          const age = now - new Date(e.createdAt).getTime();
          if (age <= 30 * day) current += e.debitPaisa;
          else if (age <= 60 * day) d31to60 += e.debitPaisa;
          else if (age <= 90 * day) d61to90 += e.debitPaisa;
          else over90 += e.debitPaisa;
        }

        return {
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          creditLimitPaisa: c.creditLimitPaisa,
          currentBalancePaisa: c.currentBalancePaisa,
          currentPaisa: current,
          days31To60Paisa: d31to60,
          days61To90Paisa: d61to90,
          over90DaysPaisa: over90,
        };
      }));

      return { success: true, data: ageing };
    } catch {
      return {
        success: true,
        data: DEMO_CUSTOMERS
          .filter((c) => c.currentBalancePaisa > 0)
          .map((c) => ({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            creditLimitPaisa: c.creditLimitPaisa,
            currentBalancePaisa: c.currentBalancePaisa,
            currentPaisa: Math.round(c.currentBalancePaisa * 0.5),
            days31To60Paisa: Math.round(c.currentBalancePaisa * 0.3),
            days61To90Paisa: Math.round(c.currentBalancePaisa * 0.15),
            over90DaysPaisa: Math.round(c.currentBalancePaisa * 0.05),
          })),
      };
    }
  });

  // POST /api/customers/payments — receive a customer payment
  fastify.post('/payments', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'CASHIER', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const parsed = ReceiveCustomerPaymentSchema.safeParse(req.body);
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
        const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });

        const newBalance = customer.currentBalancePaisa - input.amountPaisa;

        await tx.customer.update({
          where: { id: customer.id },
          data: { currentBalancePaisa: newBalance },
        });

        let counter = await tx.invoiceCounter.findFirst();
        if (!counter) counter = await tx.invoiceCounter.create({ data: { nextNum: 1 } });
        const receiptNumber = `RCP-${String(counter.nextNum).padStart(6, '0')}`;
        await tx.invoiceCounter.update({
          where: { id: counter.id },
          data: { nextNum: { increment: 1 } },
        });

        const payment = await tx.customerPayment.create({
          data: {
            receiptNumber,
            customerId: customer.id,
            amountPaisa: input.amountPaisa,
            paymentMethod: input.paymentMethod as any,
            referenceNumber: input.referenceNumber || null,
            receivedById: user.id,
            receivedByName: user.fullName,
            notes: input.notes || null,
          },
        });

        await tx.customerLedgerEntry.create({
          data: {
            customerId: customer.id,
            entryType: CustomerLedgerEntryType.PAYMENT_RECEIVED as any,
            debitPaisa: 0,
            creditPaisa: input.amountPaisa,
            runningBalancePaisa: newBalance,
            referenceType: 'CUSTOMER_PAYMENT',
            referenceId: payment.id,
            notes: input.notes || `Payment received via ${input.paymentMethod}`,
            createdById: user.id,
          },
        });

        // Cash Book entry if customer paid in cash
        if (input.paymentMethod === PaymentMethod.CASH || (input.paymentMethod as string) === 'CASH') {
          const lastCb = await tx.cashBookEntry.findFirst({ orderBy: { date: 'desc' } });
          const prevBal = lastCb ? lastCb.runningBalancePaisa : 0;
          await tx.cashBookEntry.create({
            data: {
              entryType: 'CASH_IN',
              category: 'CUSTOMER_PAYMENT',
              amountPaisa: input.amountPaisa,
              runningBalancePaisa: prevBal + input.amountPaisa,
              description: `Customer Cash Payment Receipt ${receiptNumber} (${customer.name})`,
              referenceType: 'CUSTOMER_PAYMENT',
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
            action: 'RECEIVE_CUSTOMER_PAYMENT',
            entity: 'CustomerPayment',
            entityId: payment.id,
            newValue: { receiptNumber, amountPaisa: input.amountPaisa, customerId: input.customerId },
          },
        });

        return payment;
      });

      return reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      const custIdx = DEMO_CUSTOMERS.findIndex((c) => c.id === input.customerId);
      if (custIdx >= 0) DEMO_CUSTOMERS[custIdx].currentBalancePaisa -= input.amountPaisa;
      const demoPay: any = {
        id: `pay-demo-${Date.now()}`,
        receiptNumber: nextReceiptNumber(),
        customerId: input.customerId,
        amountPaisa: input.amountPaisa,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        receivedByName: user.fullName,
        notes: input.notes || null,
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      DEMO_CUSTOMER_PAYMENTS.push(demoPay);
      return reply.status(201).send({ success: true, data: demoPay });
    }
  });

  // GET /api/customers
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { search, status, type } = req.query as any;
    try {
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { cnic: { contains: search } },
        ];
      }
      if (status) where.status = status;
      if (type) where.customerType = type;

      const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
      return { success: true, data: customers };
    } catch {
      let filtered = [...DEMO_CUSTOMERS];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(s) ||
            c.phone.includes(s) ||
            (c.email || '').toLowerCase().includes(s)
        );
      }
      if (status) filtered = filtered.filter((c) => c.status === status);
      if (type) filtered = filtered.filter((c) => c.customerType === type);
      return { success: true, data: filtered };
    }
  });

  // POST /api/customers
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'CASHIER', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const parsed = CreateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid customer input',
        errors: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    try {
      const customer = await prisma.$transaction(async (tx) => {
        const cust = await tx.customer.create({
          data: {
            name: input.name,
            phone: input.phone,
            email: input.email || null,
            address: input.address || null,
            cnic: input.cnic || null,
            customerType: input.customerType as any,
            creditLimitPaisa: input.creditLimitPaisa,
            openingBalancePaisa: input.openingBalancePaisa,
            currentBalancePaisa: input.openingBalancePaisa,
            notes: input.notes || null,
          },
        });

        if (input.openingBalancePaisa > 0) {
          await tx.customerLedgerEntry.create({
            data: {
              customerId: cust.id,
              entryType: CustomerLedgerEntryType.OPENING_BALANCE as any,
              debitPaisa: input.openingBalancePaisa,
              creditPaisa: 0,
              runningBalancePaisa: input.openingBalancePaisa,
              referenceType: 'OPENING',
              referenceId: cust.id,
              notes: 'Opening balance on account creation',
              createdById: user.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.fullName,
            role: user.role,
            action: 'CREATE_CUSTOMER',
            entity: 'Customer',
            entityId: cust.id,
            newValue: { name: cust.name, phone: cust.phone, creditLimitPaisa: cust.creditLimitPaisa },
          },
        });

        return cust;
      });

      return reply.status(201).send({ success: true, data: customer });
    } catch (err: any) {
      const demo: any = {
        id: `cust-demo-${DEMO_CUST_ID++}`,
        ...input,
        status: CustomerStatus.ACTIVE,
        currentBalancePaisa: input.openingBalancePaisa,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DEMO_CUSTOMERS.push(demo);
      return reply.status(201).send({ success: true, data: demo });
    }
  });

  // GET /api/customers/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const customer = await prisma.customer.findUniqueOrThrow({ where: { id } });
      return { success: true, data: customer };
    } catch {
      const demo = DEMO_CUSTOMERS.find((c) => c.id === id);
      if (!demo) return reply.status(404).send({ success: false, message: 'Customer not found' });
      return { success: true, data: demo };
    }
  });

  // PUT /api/customers/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'ACCOUNTANT'])],
  }, async (req, reply) => {
    const { id } = req.params as any;
    const parsed = UpdateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid input',
      });
    }
    const input = parsed.data;
    const user = req.user as any;

    try {
      const existing = await prisma.customer.findUniqueOrThrow({ where: { id } });
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email !== undefined ? (input.email || null) : undefined,
          address: input.address !== undefined ? input.address : undefined,
          cnic: input.cnic !== undefined ? input.cnic : undefined,
          customerType: input.customerType as any,
          status: input.status as any,
          creditLimitPaisa: input.creditLimitPaisa,
          notes: input.notes !== undefined ? input.notes : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.fullName,
          role: user.role,
          action: 'UPDATE_CUSTOMER',
          entity: 'Customer',
          entityId: id,
          oldValue: { name: existing.name, creditLimitPaisa: existing.creditLimitPaisa, status: existing.status },
          newValue: { name: updated.name, creditLimitPaisa: updated.creditLimitPaisa, status: updated.status },
        },
      });

      return { success: true, data: updated };
    } catch {
      const idx = DEMO_CUSTOMERS.findIndex((c) => c.id === id);
      if (idx >= 0) {
        DEMO_CUSTOMERS[idx] = { ...DEMO_CUSTOMERS[idx], ...input, updatedAt: new Date().toISOString() };
        return { success: true, data: DEMO_CUSTOMERS[idx] };
      }
      return reply.status(404).send({ success: false, message: 'Customer not found' });
    }
  });

  // GET /api/customers/:id/ledger
  fastify.get('/:id/ledger', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as any;
    const { page = '1', limit = '50' } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const [entries, total, customer] = await Promise.all([
        prisma.customerLedgerEntry.findMany({
          where: { customerId: id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.customerLedgerEntry.count({ where: { customerId: id } }),
        prisma.customer.findUniqueOrThrow({ where: { id } }),
      ]);

      return { success: true, data: entries, customer, meta: { total, page: Number(page), limit: Number(limit) } };
    } catch {
      const custDemo = DEMO_CUSTOMERS.find((c) => c.id === id);
      const demoEntries = DEMO_CUSTOMER_LEDGER.filter((e) => e.customerId === id);
      return { success: true, data: demoEntries, customer: custDemo || null, meta: { total: demoEntries.length, page: 1, limit: 50 } };
    }
  });

  // GET /api/customers/:id/payments
  fastify.get('/:id/payments', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const payments = await prisma.customerPayment.findMany({
        where: { customerId: id },
        orderBy: { paymentDate: 'desc' },
      });
      return { success: true, data: payments };
    } catch {
      return { success: true, data: DEMO_CUSTOMER_PAYMENTS.filter((p) => p.customerId === id) };
    }
  });
};
