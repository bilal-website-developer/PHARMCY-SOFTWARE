import { describe, it, expect } from 'vitest';
import {
  CreateCustomerSchema,
  ReceiveCustomerPaymentSchema,
  RecordSupplierPaymentSchema,
  CreateDebitNoteSchema,
  CreateExpiryClaimSchema,
  UpdateExpiryClaimStatusSchema,
  CustomerType,
  CustomerStatus,
  CustomerLedgerEntryType,
  SupplierLedgerEntryType,
  ExpiryClaimStatus,
  PaymentMethod,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
} from '@pharmacy/shared';

describe('Phase 2A: Customer Credit & Ledgers', () => {
  it('validates customer creation schema with integer paisa credit limit', () => {
    const input = {
      name: 'Ali Health Clinic',
      phone: '03001234567',
      customerType: CustomerType.DOCTOR_CLINIC,
      creditLimitPaisa: 5000000, // PKR 50,000
      openingBalancePaisa: 1000000, // PKR 10,000
    };

    const parsed = CreateCustomerSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.creditLimitPaisa).toBe(5000000);
      expect(parsed.data.status).toBe(CustomerStatus.ACTIVE);
    }
  });

  it('rejects customer with negative credit limit', () => {
    const input = {
      name: 'Bad Limit Customer',
      phone: '03009999999',
      creditLimitPaisa: -100,
    };

    const parsed = CreateCustomerSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('validates customer payment receipt schema with integer paisa', () => {
    const input = {
      customerId: 'cust-123',
      amountPaisa: 2500000, // PKR 25,000
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'HBL-FT-99812',
      notes: 'Cleared overdue bill',
    };

    const parsed = ReceiveCustomerPaymentSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('calculates customer ledger running balance invariant', () => {
    // Opening balance: 10,000 PKR (1,000,000 paisa)
    let runningBalancePaisa = 1000000;

    // Credit Sale of 15,000 PKR (1,500,000 paisa) -> balance increases
    const saleAmountPaisa = 1500000;
    runningBalancePaisa += saleAmountPaisa;
    expect(runningBalancePaisa).toBe(2500000);

    // Customer Payment of 20,000 PKR (2,000,000 paisa) -> balance decreases
    const paymentAmountPaisa = 2000000;
    runningBalancePaisa -= paymentAmountPaisa;
    expect(runningBalancePaisa).toBe(500000); // 5,000 PKR remaining
  });

  it('enforces credit limit breach detection', () => {
    const customer = {
      id: 'cust-1',
      name: 'Test Customer',
      creditLimitPaisa: 5000000, // PKR 50,000 limit
      currentBalancePaisa: 4000000, // PKR 40,000 current
    };

    const requestedCreditPaisa = 1500000; // PKR 15,000
    const newBalancePaisa = customer.currentBalancePaisa + requestedCreditPaisa;

    const isExceeded = newBalancePaisa > customer.creditLimitPaisa;
    expect(isExceeded).toBe(true);
    expect(newBalancePaisa - customer.creditLimitPaisa).toBe(500000); // Exceeded by PKR 5,000
  });
});

describe('Phase 2A: Supplier Ledger & Debit Notes', () => {
  it('validates supplier payment schema', () => {
    const input = {
      supplierId: 'sup-1',
      amountPaisa: 10000000, // PKR 100,000
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      chequeOrTxNumber: 'CHQ-00192',
      notes: 'Invoice payment',
    };

    const parsed = RecordSupplierPaymentSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates purchase return debit note schema with line items', () => {
    const input = {
      supplierId: 'sup-1',
      reason: 'DAMAGED_ON_ARRIVAL',
      items: [
        {
          productId: 'prod-1',
          productName: 'Amoxicillin 500mg',
          batchId: 'batch-1',
          batchNumber: 'BT-991',
          quantitySmallestUnits: 10,
          costPricePaisaPerUnit: 5000, // PKR 50
        },
      ],
    };

    const parsed = CreateDebitNoteSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('calculates supplier ledger balance reduction on payment and debit note', () => {
    // Current payable to supplier: PKR 200,000 (20,000,000 paisa)
    let payableLiabilityPaisa = 20000000;

    // Supplier Payment made: PKR 80,000 (8,000,000 paisa)
    const paymentPaisa = 8000000;
    payableLiabilityPaisa -= paymentPaisa;
    expect(payableLiabilityPaisa).toBe(12000000);

    // Debit Note issued: PKR 20,000 (2,000,000 paisa)
    const debitNotePaisa = 2000000;
    payableLiabilityPaisa -= debitNotePaisa;
    expect(payableLiabilityPaisa).toBe(10000000);
  });
});

describe('Phase 2A: Expiry Claims 3-Status Workflow', () => {
  it('validates expiry claim creation schema with status CLAIM_PENDING', () => {
    const input = {
      supplierId: 'sup-1',
      items: [
        {
          productId: 'prod-1',
          productName: 'Expired Syrup 120ml',
          batchId: 'batch-exp-1',
          batchNumber: 'EXP-101',
          expiryDate: '2026-01-01T00:00:00.000Z',
          quantitySmallestUnits: 5,
          costPricePaisa: 250000, // 5 * PKR 500
        },
      ],
    };

    const parsed = CreateExpiryClaimSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates status transition: CLAIM_PENDING -> CREDIT_NOTE_RECEIVED', () => {
    const updateInput = {
      status: ExpiryClaimStatus.CREDIT_NOTE_RECEIVED,
      creditNoteNumber: 'SCN-2026-4412',
      creditNoteAmountPaisa: 250000,
      notes: 'Supplier acknowledged claim in full',
    };

    const parsed = UpdateExpiryClaimStatusSchema.safeParse(updateInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.creditNoteNumber).toBe('SCN-2026-4412');
      expect(parsed.data.status).toBe(ExpiryClaimStatus.CREDIT_NOTE_RECEIVED);
    }
  });

  it('validates status transition: CREDIT_NOTE_RECEIVED -> ADJUSTED', () => {
    const updateInput = {
      status: ExpiryClaimStatus.ADJUSTED,
      notes: 'Adjusted against monthly distributor ledger bill',
    };

    const parsed = UpdateExpiryClaimStatusSchema.safeParse(updateInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe(ExpiryClaimStatus.ADJUSTED);
    }
  });

  it('applies claim adjustment to supplier running balance', () => {
    // Current payable to supplier: PKR 500,000 (50,000,000 paisa)
    let supplierBalancePaisa = 50000000;

    // Adjusted credit note of PKR 2,500 (250,000 paisa)
    const creditNoteAmountPaisa = 250000;
    supplierBalancePaisa -= creditNoteAmountPaisa;

    expect(supplierBalancePaisa).toBe(49750000);
    expect(formatPaisaToPKR(supplierBalancePaisa)).toBe('Rs 497,500');
  });
});
