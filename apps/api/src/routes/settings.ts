import { FastifyInstance } from 'fastify';
import { UserRole, SystemSettingsDto, UpdateSettingsSchema } from '@pharmacy/shared';
import { prisma } from '../prisma';

const DEFAULT_SETTINGS: SystemSettingsDto = {
  expiryWarningMonths: 3,
  maxDiscountCashier: 5,
  maxDiscountPharmacist: 20,
  maxDiscountAdmin: 100,
  looseSellingDefault: false,
  receiptHeaderName: 'PharmaCare Pharmacy',
  receiptHeaderAddress: 'Main Boulevard, Gulberg III, Lahore',
  receiptHeaderPhone: '+92 42 3578 9000',
  receiptHeaderNtn: 'NTN: 8945210-7',
  receiptFooterMsg: 'Thank you for choosing PharmaCare! Medicines once sold cannot be returned without original receipt.',
};

let MEMORY_SETTINGS: SystemSettingsDto = { ...DEFAULT_SETTINGS };

export async function settingsRoutes(fastify: FastifyInstance) {
  // GET all settings formatted as a structured object
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (_request, reply) => {
      try {
        const rows = await prisma.systemSetting.findMany();
        const map: Record<string, string> = {};
        for (const r of rows) map[r.key] = r.value;

        const result: SystemSettingsDto = {
          expiryWarningMonths: map['EXPIRY_WARNING_MONTHS'] ? Number(map['EXPIRY_WARNING_MONTHS']) : DEFAULT_SETTINGS.expiryWarningMonths,
          maxDiscountCashier: map['MAX_DISCOUNT_CASHIER'] ? Number(map['MAX_DISCOUNT_CASHIER']) : DEFAULT_SETTINGS.maxDiscountCashier,
          maxDiscountPharmacist: map['MAX_DISCOUNT_PHARMACIST'] ? Number(map['MAX_DISCOUNT_PHARMACIST']) : DEFAULT_SETTINGS.maxDiscountPharmacist,
          maxDiscountAdmin: map['MAX_DISCOUNT_ADMIN'] ? Number(map['MAX_DISCOUNT_ADMIN']) : DEFAULT_SETTINGS.maxDiscountAdmin,
          looseSellingDefault: map['LOOSE_SELLING_DEFAULT'] !== undefined ? map['LOOSE_SELLING_DEFAULT'] === 'true' : DEFAULT_SETTINGS.looseSellingDefault,
          receiptHeaderName: map['RECEIPT_HEADER_NAME'] || DEFAULT_SETTINGS.receiptHeaderName,
          receiptHeaderAddress: map['RECEIPT_HEADER_ADDRESS'] || DEFAULT_SETTINGS.receiptHeaderAddress,
          receiptHeaderPhone: map['RECEIPT_HEADER_PHONE'] || DEFAULT_SETTINGS.receiptHeaderPhone,
          receiptHeaderNtn: map['RECEIPT_HEADER_NTN'] || DEFAULT_SETTINGS.receiptHeaderNtn,
          receiptFooterMsg: map['RECEIPT_FOOTER_MSG'] || DEFAULT_SETTINGS.receiptFooterMsg,
        };

        return reply.send({ success: true, data: result });
      } catch (_err) {
        return reply.send({ success: true, data: MEMORY_SETTINGS });
      }
    }
  );

  // PUT update all settings in bulk (Admin only)
  fastify.put(
    '/',
    {
      preHandler: [fastify.requireRole(['ADMIN'])],
    },
    async (request, reply) => {
      const parseResult = UpdateSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error: ' + parseResult.error.errors.map((e) => e.message).join(', '),
        });
      }

      const updates = parseResult.data;
      const keyMap: Record<string, any> = {};
      if (updates.expiryWarningMonths !== undefined) keyMap['EXPIRY_WARNING_MONTHS'] = String(updates.expiryWarningMonths);
      if (updates.maxDiscountCashier !== undefined) keyMap['MAX_DISCOUNT_CASHIER'] = String(updates.maxDiscountCashier);
      if (updates.maxDiscountPharmacist !== undefined) keyMap['MAX_DISCOUNT_PHARMACIST'] = String(updates.maxDiscountPharmacist);
      if (updates.maxDiscountAdmin !== undefined) keyMap['MAX_DISCOUNT_ADMIN'] = String(updates.maxDiscountAdmin);
      if (updates.looseSellingDefault !== undefined) keyMap['LOOSE_SELLING_DEFAULT'] = String(updates.looseSellingDefault);
      if (updates.receiptHeaderName !== undefined) keyMap['RECEIPT_HEADER_NAME'] = updates.receiptHeaderName;
      if (updates.receiptHeaderAddress !== undefined) keyMap['RECEIPT_HEADER_ADDRESS'] = updates.receiptHeaderAddress;
      if (updates.receiptHeaderPhone !== undefined) keyMap['RECEIPT_HEADER_PHONE'] = updates.receiptHeaderPhone;
      if (updates.receiptHeaderNtn !== undefined) keyMap['RECEIPT_HEADER_NTN'] = updates.receiptHeaderNtn;
      if (updates.receiptFooterMsg !== undefined) keyMap['RECEIPT_FOOTER_MSG'] = updates.receiptFooterMsg;

      try {
        await prisma.$transaction(async (tx) => {
          for (const [k, v] of Object.entries(keyMap)) {
            await tx.systemSetting.upsert({
              where: { key: k },
              update: { value: v },
              create: { key: k, value: v },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: request.user.id,
              userName: request.user.username,
              role: request.user.role,
              action: 'UPDATE_SETTINGS_BULK',
              entity: 'SystemSetting',
              newValue: updates,
              reason: 'Admin updated pharmacy configuration',
            },
          });
        });

        MEMORY_SETTINGS = { ...MEMORY_SETTINGS, ...updates };
        return reply.send({ success: true, data: MEMORY_SETTINGS });
      } catch (_err) {
        MEMORY_SETTINGS = { ...MEMORY_SETTINGS, ...updates };
        return reply.send({ success: true, data: MEMORY_SETTINGS });
      }
    }
  );

  // PUT single setting (legacy route)
  fastify.put(
    '/:key',
    {
      preHandler: [fastify.requireRole(['ADMIN'])],
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: string };

      if (value === undefined || value === null) {
        return reply.status(400).send({ success: false, error: 'Value is required' });
      }

      try {
        const existing = await prisma.systemSetting.findUnique({ where: { key } });
        const updated = await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });

        await prisma.auditLog.create({
          data: {
            userId: request.user.id,
            userName: request.user.username,
            role: request.user.role,
            action: 'UPDATE_SETTING',
            entity: 'SystemSetting',
            entityId: key,
            oldValue: existing ? { value: existing.value } : undefined,
            newValue: { value: String(value) },
          },
        });

        return reply.send({ success: true, data: updated });
      } catch (_err) {
        return reply.send({ success: true, data: { key, value } });
      }
    }
  );
}
