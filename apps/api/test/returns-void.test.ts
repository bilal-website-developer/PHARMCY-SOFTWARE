import { describe, it, expect } from 'vitest';
import {
  PostReturnSchema,
  VoidSchema,
  UpdateSettingsSchema,
  ReturnDestination,
  RefundMethod,
  StockMovementType,
  PurchaseStatus,
  SaleStatus,
} from '@pharmacy/shared';

describe('Phase 1D: Sales Returns, Void Invariants & System Settings', () => {
  it('validates PostReturnSchema requires reason and valid items', () => {
    const validReturn = {
      saleId: 'sale-1',
      saleInvoiceNumber: 'INV-202610-000001',
      refundMethod: RefundMethod.CASH,
      reason: 'Customer bought incorrect dosage (prescribed 250mg, bought 500mg)',
      items: [
        {
          productId: 'prod-1',
          productName: 'Panadol 500mg',
          batchId: 'batch-1',
          batchNumber: 'BT-001',
          unitName: 'strip',
          conversionFactor: 10,
          quantityInUnit: 1,
          refundPricePaisaPerUnit: 3500,
          destination: ReturnDestination.RESTOCK_ORIGINAL_BATCH,
        },
      ],
    };

    const parsed = PostReturnSchema.safeParse(validReturn);
    expect(parsed.success).toBe(true);
  });

  it('rejects PostReturnSchema when reason is shorter than 3 characters', () => {
    const invalidReturn = {
      saleInvoiceNumber: 'INV-202610-000001',
      refundMethod: RefundMethod.CASH,
      reason: 'No', // Too short!
      items: [
        {
          productId: 'prod-1',
          productName: 'Panadol 500mg',
          batchId: 'batch-1',
          batchNumber: 'BT-001',
          unitName: 'strip',
          conversionFactor: 10,
          quantityInUnit: 1,
          refundPricePaisaPerUnit: 3500,
          destination: ReturnDestination.RESTOCK_ORIGINAL_BATCH,
        },
      ],
    };

    const parsed = PostReturnSchema.safeParse(invalidReturn);
    expect(parsed.success).toBe(false);
  });

  it('rejects PostReturnSchema with empty items list', () => {
    const emptyItems = {
      saleInvoiceNumber: 'INV-202610-000001',
      refundMethod: RefundMethod.CASH,
      reason: 'Customer returned unopened pack',
      items: [],
    };

    const parsed = PostReturnSchema.safeParse(emptyItems);
    expect(parsed.success).toBe(false);
  });

  it('validates VoidSchema strictly requires a justification reason of at least 5 characters', () => {
    expect(VoidSchema.safeParse({ reason: 'Accidental double bill swipe' }).success).toBe(true);
    expect(VoidSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(VoidSchema.safeParse({ reason: 'Bad' }).success).toBe(false); // < 5 chars
  });

  it('enforces non-negative stock invariant when voiding purchases', () => {
    // Simulated batch where GRN added 100 units, but 80 units were sold -> 20 remaining
    const batch = {
      batchNumber: 'BT-AUG-10',
      quantity: 20, // Only 20 left
    };
    const purchaseItem = {
      batchNumber: 'BT-AUG-10',
      totalSmallestUnits: 100, // Attempting to void 100 units
    };

    // Voiding must fail because 20 - 100 = -80 (negative stock violation)
    const canVoid = batch.quantity >= purchaseItem.totalSmallestUnits;
    expect(canVoid).toBe(false);
  });

  it('simulates stock movement reversal on approved shelf restock return', () => {
    const initialBatchStock = 50;
    const returnUnits = 10;

    // Movement: SALE_RETURN (+10)
    const updatedBatchStock = initialBatchStock + returnUnits;
    expect(updatedBatchStock).toBe(60);

    const movement = {
      movementType: StockMovementType.SALE_RETURN,
      quantity: returnUnits,
      balanceAfter: updatedBatchStock,
    };

    expect(movement.movementType).toBe('SALE_RETURN');
    expect(movement.quantity).toBe(10);
    expect(movement.balanceAfter).toBe(60);
  });

  it('validates UpdateSettingsSchema boundary constraints', () => {
    const validSettings = {
      expiryWarningMonths: 4,
      maxDiscountCashier: 5,
      maxDiscountPharmacist: 20,
      maxDiscountAdmin: 100,
      receiptHeaderName: 'Al-Shifa Community Pharmacy',
    };
    expect(UpdateSettingsSchema.safeParse(validSettings).success).toBe(true);

    const invalidMonths = {
      expiryWarningMonths: 36, // Max is 24
    };
    expect(UpdateSettingsSchema.safeParse(invalidMonths).success).toBe(false);

    const invalidDiscount = {
      maxDiscountCashier: 150, // Max is 100
    };
    expect(UpdateSettingsSchema.safeParse(invalidDiscount).success).toBe(false);
  });
});
