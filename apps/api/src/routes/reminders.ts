import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import {
  CreditReminderItemDto,
  RefillReminderItemDto,
  ReminderLogDto,
  SendReminderSchema,
  SendReminderInput,
  formatPaisaToPKR,
} from '@pharmacy/shared';
import { DEMO_CUSTOMERS } from './customers';

// In-memory log of sent reminders
export const MEMORY_REMINDER_LOGS: ReminderLogDto[] = [
  {
    id: 'log-1',
    recipientName: 'Malik Medical Store',
    phone: '0300-4444444',
    reminderType: 'CREDIT',
    channel: 'WHATSAPP',
    sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    messageText: 'Assalam-o-Alaikum Malik Medical Store, gentle reminder that your pending balance at PharmaCare is Rs 45,000. Please clear by 10th.',
    status: 'SENT',
  },
];

export const remindersRoutes: FastifyPluginAsync = async (fastify) => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GET /api/reminders/credit
  // Fetches customers with unpaid balance past due date
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/credit', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    let customers: any[] = [];
    try {
      customers = await prisma.customer.findMany({
        where: {
          currentBalancePaisa: { gt: 0 },
        },
        orderBy: { currentBalancePaisa: 'desc' },
      });
    } catch {
      customers = [];
    }

    if (customers.length === 0) {
      customers = DEMO_CUSTOMERS.filter((c) => c.currentBalancePaisa > 0);
    }

    const items: CreditReminderItemDto[] = customers.map((c, idx) => {
      const daysOverdue = 15 + idx * 7;
      const balancePKR = formatPaisaToPKR(c.currentBalancePaisa);
      const suggestedMsg =
        `Assalam-o-Alaikum ${c.name},\n` +
        `This is a gentle payment reminder from *PharmaCare Pharmacy*.\n` +
        `Your outstanding ledger balance is *${balancePKR}* which is currently ${daysOverdue} days overdue.\n\n` +
        `Kindly arrange payment at your earliest convenience or visit our counter.\n` +
        `Thank you for your business!`;

      return {
        customerId: c.id,
        customerName: c.name,
        phone: c.phone || '0300-1234567',
        currentBalancePaisa: c.currentBalancePaisa,
        creditLimitPaisa: c.creditLimitPaisa,
        daysOverdue,
        lastPaymentDate: new Date(Date.now() - daysOverdue * 86400000).toISOString().slice(0, 10),
        suggestedMessage: suggestedMsg,
      };
    });

    return reply.send({ success: true, data: items });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. GET /api/reminders/refills
  // Maintenance drug patients due for refill based on dosage duration
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/refills', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    const now = Date.now();
    const demoRefills: RefillReminderItemDto[] = [
      {
        id: 'ref-1',
        patientName: 'Haji Abdul Rehman',
        phone: '0321-9876543',
        doctorName: 'Dr. Shahzad (Cardiologist)',
        medicineName: 'Risek 20mg Capsule (Pack of 14)',
        dosageForm: 'Capsule',
        lastPurchaseDate: new Date(now - 27 * 86400000).toISOString().slice(0, 10),
        daysSupply: 30,
        daysSincePurchase: 27,
        daysUntilRefill: 3,
        isOverdue: false,
        suggestedMessage:
          `Assalam-o-Alaikum Haji Abdul Rehman sb,\n` +
          `Your monthly medication *Risek 20mg* from *PharmaCare Pharmacy* will finish in *3 days*.\n` +
          `To ensure uninterrupted maintenance dosage, please visit us or reply to this message for free home delivery.\n` +
          `PharmaCare Pharmacy - Call: 042-35889900`,
      },
      {
        id: 'ref-2',
        patientName: 'Begum Parveen Akhtar',
        phone: '0300-8889991',
        doctorName: 'Dr. Fatima Noor (Endocrinologist)',
        medicineName: 'Insulin Mixtard 30/70 100IU/ml',
        dosageForm: 'Vial',
        lastPurchaseDate: new Date(now - 28 * 86400000).toISOString().slice(0, 10),
        daysSupply: 30,
        daysSincePurchase: 28,
        daysUntilRefill: 2,
        isOverdue: false,
        suggestedMessage:
          `Assalam-o-Alaikum Begum Parveen Akhtar,\n` +
          `Your cold-chain insulin supply (*Insulin Mixtard 30/70*) is due for refill in *2 days*.\n` +
          `Fresh batches stored at 2°C - 8°C are ready at *PharmaCare Pharmacy*.\n` +
          `Stay healthy!`,
      },
      {
        id: 'ref-3',
        patientName: 'Muhammad Arshad',
        phone: '0333-5551234',
        doctorName: 'Dr. Tariq Mahmood (Physician)',
        medicineName: 'Concor 5mg Tablet',
        dosageForm: 'Tablet',
        lastPurchaseDate: new Date(now - 32 * 86400000).toISOString().slice(0, 10),
        daysSupply: 30,
        daysSincePurchase: 32,
        daysUntilRefill: -2,
        isOverdue: true,
        suggestedMessage:
          `Assalam-o-Alaikum Muhammad Arshad sb,\n` +
          `Your blood pressure prescription *Concor 5mg* was scheduled for refill 2 days ago.\n` +
          `Stopping hypertension medicine suddenly can cause blood pressure spikes. Please visit *PharmaCare Pharmacy* to collect your fresh pack today.`,
      },
    ];

    return reply.send({ success: true, data: demoRefills });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. POST /api/reminders/log
  // Records reminder dispatch
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/log', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parseResult = SendReminderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const input: SendReminderInput = parseResult.data;

    const newLog: ReminderLogDto = {
      id: `log-${Date.now()}`,
      recipientName: input.recipientName,
      phone: input.recipientPhone,
      reminderType: input.reminderType,
      channel: input.channel,
      sentAt: new Date().toISOString(),
      messageText: input.messageText,
      status: 'SENT',
    };

    MEMORY_REMINDER_LOGS.unshift(newLog);

    return reply.status(201).send({
      success: true,
      data: newLog,
      message: 'Reminder logged successfully',
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. GET /api/reminders/logs
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/logs', {
    preHandler: [fastify.authenticate],
  }, async (_request, reply) => {
    return reply.send({ success: true, data: MEMORY_REMINDER_LOGS });
  });
};
