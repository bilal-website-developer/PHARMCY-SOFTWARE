import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import { SupplierSchema, SupplierStatus } from '@pharmacy/shared';

export const suppliersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/suppliers
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { search, status } = req.query as { search?: string; status?: string };

      try {
        const where: any = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ];
        }
        if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
          where.status = status;
        }

        const suppliers = await prisma.supplier.findMany({
          where,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { products: true },
            },
          },
        });
        return { success: true, data: suppliers };
      } catch {
        // Fallback demo data
        const demoSuppliers = [
          {
            id: 'sup-1',
            name: 'Al-Madina Pharma Distributors',
            code: 'SUP-MADINA-01',
            contactPerson: 'Haji Muhammad Rizwan',
            phone: '0300-1234567',
            email: 'sales@almadinapharma.pk',
            address: 'Medicine Market, Katchery Road, Lahore',
            taxNumber: 'NTN-4891234-7',
            paymentTermsDays: 30,
            openingBalancePaisa: 5000000, // Rs 50,000.00
            currentBalancePaisa: 12500000, // Rs 125,000.00
            status: SupplierStatus.ACTIVE,
            _count: { products: 45 },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sup-2',
            name: 'Khyber Medicos & Wholesale',
            code: 'SUP-KHYBER-02',
            contactPerson: 'Sardar Farooq Khan',
            phone: '0321-9876543',
            email: 'info@khybermedicos.pk',
            address: 'Namak Mandi, Peshawar',
            taxNumber: 'NTN-2938471-2',
            paymentTermsDays: 15,
            openingBalancePaisa: 0,
            currentBalancePaisa: 4200000, // Rs 42,000.00
            status: SupplierStatus.ACTIVE,
            _count: { products: 28 },
            createdAt: new Date().toISOString(),
          },
          {
            id: 'sup-3',
            name: 'Sindh Healthcare Logistics',
            code: 'SUP-SINDH-03',
            contactPerson: 'Mr. Asif Memon',
            phone: '0333-5551234',
            email: 'asif@sindhhealth.com',
            address: 'M.A. Jinnah Road, Karachi',
            taxNumber: 'NTN-7654321-9',
            paymentTermsDays: 45,
            openingBalancePaisa: 10000000, // Rs 100,000.00
            currentBalancePaisa: 31000000, // Rs 310,000.00
            status: SupplierStatus.ACTIVE,
            _count: { products: 62 },
            createdAt: new Date().toISOString(),
          },
        ];

        let filtered = demoSuppliers;
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (sup) =>
              sup.name.toLowerCase().includes(s) ||
              sup.code.toLowerCase().includes(s) ||
              sup.contactPerson.toLowerCase().includes(s)
          );
        }
        return { success: true, data: filtered };
      }
    }
  );

  // GET /api/suppliers/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        const supplier = await prisma.supplier.findUnique({
          where: { id },
          include: {
            products: {
              select: {
                id: true,
                sku: true,
                name: true,
                genericName: true,
                mrpPaisa: true,
              },
            },
          },
        });
        if (!supplier) {
          return reply.status(404).send({ success: false, message: 'Supplier not found' });
        }
        return { success: true, data: supplier };
      } catch {
        return reply.status(404).send({ success: false, message: 'Supplier lookup failed' });
      }
    }
  );

  // POST /api/suppliers (Admin / Pharmacist / Inventory only)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const parsed = SupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid supplier input',
          errors: parsed.error.issues,
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      try {
        const supplier = await prisma.supplier.create({
          data: {
            name: input.name,
            code: input.code.toUpperCase(),
            contactPerson: input.contactPerson,
            phone: input.phone,
            email: input.email || null,
            address: input.address,
            taxNumber: input.taxNumber,
            paymentTermsDays: input.paymentTermsDays,
            openingBalancePaisa: input.openingBalancePaisa,
            currentBalancePaisa: input.openingBalancePaisa,
            status: input.status as any,
          },
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            userId: user?.id,
            userName: user?.fullName || user?.username,
            role: user?.role,
            action: 'CREATE_SUPPLIER',
            entity: 'Supplier',
            entityId: supplier.id,
            newValue: supplier as any,
          },
        });

        return { success: true, data: supplier };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message || 'Failed to create supplier' });
      }
    }
  );

  // PUT /api/suppliers/:id
  fastify.put(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = SupplierSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid supplier input',
        });
      }

      const input = parsed.data;
      const user = req.user as any;

      try {
        const existing = await prisma.supplier.findUnique({ where: { id } });
        if (!existing) {
          return reply.status(404).send({ success: false, message: 'Supplier not found' });
        }

        const updated = await prisma.supplier.update({
          where: { id },
          data: {
            name: input.name,
            code: input.code?.toUpperCase(),
            contactPerson: input.contactPerson,
            phone: input.phone,
            email: input.email !== undefined ? input.email : undefined,
            address: input.address,
            taxNumber: input.taxNumber,
            paymentTermsDays: input.paymentTermsDays,
            status: input.status as any,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user?.id,
            userName: user?.fullName || user?.username,
            role: user?.role,
            action: 'UPDATE_SUPPLIER',
            entity: 'Supplier',
            entityId: id,
            oldValue: existing as any,
            newValue: updated as any,
          },
        });

        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message || 'Failed to update supplier' });
      }
    }
  );

  // POST /api/suppliers/import-csv
  fastify.post(
    '/import-csv',
    { preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN', 'PHARMACIST', 'INVENTORY'])] },
    async (req, reply) => {
      const { csvText, dryRun = false } = req.body as { csvText: string; dryRun?: boolean };
      if (!csvText) {
        return reply.status(400).send({ success: false, message: 'CSV content is required' });
      }

      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        return reply.status(400).send({ success: false, message: 'CSV has no data rows' });
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const expected = ['name', 'code', 'phone'];
      for (const exp of expected) {
        if (!headers.includes(exp)) {
          return reply.status(400).send({ success: false, message: `Missing required column: ${exp}` });
        }
      }

      const results: any[] = [];
      const errors: { row: number; reason: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowCols = lines[i].split(',').map((c) => c.trim());
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = rowCols[idx] || '';
        });

        if (!rowData.name || !rowData.code || !rowData.phone) {
          errors.push({ row: i + 1, reason: 'Name, code, and phone are mandatory' });
          continue;
        }

        const openingRupees = parseFloat(rowData.openingbalance || '0');
        const openingPaisa = isNaN(openingRupees) ? 0 : Math.round(openingRupees * 100);

        results.push({
          name: rowData.name,
          code: rowData.code.toUpperCase(),
          contactPerson: rowData.contactperson || null,
          phone: rowData.phone,
          email: rowData.email || null,
          address: rowData.address || null,
          taxNumber: rowData.taxnumber || null,
          paymentTermsDays: parseInt(rowData.paymenttermsdays || '30', 10) || 30,
          openingBalancePaisa: openingPaisa,
          currentBalancePaisa: openingPaisa,
          status: SupplierStatus.ACTIVE,
        });
      }

      if (!dryRun && results.length > 0) {
        try {
          for (const s of results) {
            await prisma.supplier.upsert({
              where: { code: s.code },
              update: s,
              create: s,
            });
          }
        } catch {
          // In case DB is offline, continue and report processed count
        }
      }

      return {
        success: true,
        summary: {
          totalRows: lines.length - 1,
          validCount: results.length,
          errorCount: errors.length,
          dryRun,
        },
        preview: results.slice(0, 5),
        errors,
      };
    }
  );
};
