import { describe, it, expect } from 'vitest';
import {
  calcLineTotal,
  calcBillTotals,
  CartItem,
  PostSaleSchema,
  ROLE_MAX_DISCOUNT,
  PaymentMethod,
  formatPaisaToPKR,
} from '@pharmacy/shared';

describe('Phase 1C: POS Sales Calculations & Invariants', () => {
  it('correctly calculates line total in paisa with item discount and tax', () => {
    // 10 units at PKR 50.00 (5000 paisa) each = 50,000 paisa gross
    // 10% discount = 5,000 paisa discount -> 45,000 paisa discounted
    // 5% tax on discounted = 2,250 paisa tax -> 47,250 paisa total
    const totalPaisa = calcLineTotal(5000, 10, 10, 5);
    expect(totalPaisa).toBe(47250);
  });

  it('correctly calculates zero discount and zero tax line total', () => {
    const totalPaisa = calcLineTotal(1500, 4, 0, 0);
    expect(totalPaisa).toBe(6000); // 4 * 15.00 PKR = 60.00 PKR = 6000 paisa
  });

  it('correctly calculates bill totals with bill-level discount and item taxes', () => {
    const items: CartItem[] = [
      {
        cartRowId: 'row-1',
        productId: 'prod-1',
        productName: 'Panadol 500mg',
        batchId: 'batch-1',
        batchNumber: 'BT-001',
        expiryDate: '2026-12-31',
        unitName: 'strip',
        conversionFactor: 10,
        mrpPaisaPerUnit: 3500, // PKR 35.00
        quantityInUnit: 2,      // 2 strips = 7,000 paisa
        discountPct: 0,
        taxPct: 0,
        lineTotalPaisa: 7000,
        availableUnits: 50,
      },
      {
        cartRowId: 'row-2',
        productId: 'prod-2',
        productName: 'Augmentin 625mg',
        batchId: 'batch-2',
        batchNumber: 'BT-002',
        expiryDate: '2027-06-30',
        unitName: 'pack',
        conversionFactor: 1,
        mrpPaisaPerUnit: 18500, // PKR 185.00
        quantityInUnit: 1,       // 1 pack = 18,500 paisa
        discountPct: 10,         // 10% off = 1,850 paisa -> 16,650 paisa
        taxPct: 0,
        lineTotalPaisa: 16650,
        availableUnits: 10,
      },
    ];

    // Subtotal = 7000 + 16650 = 23650 paisa
    // 5% bill discount on 23650 = 1182.5 -> 1183 paisa
    // Grand Total = 23650 - 1183 = 22467 paisa
    const totals = calcBillTotals(items, 5);
    expect(totals.subtotalPaisa).toBe(23650);
    expect(totals.discountPaisa).toBe(1183);
    expect(totals.grandTotalPaisa).toBe(22467);
  });

  it('enforces role-based maximum discount limits', () => {
    expect(ROLE_MAX_DISCOUNT.CASHIER).toBe(5);
    expect(ROLE_MAX_DISCOUNT.PHARMACIST).toBe(20);
    expect(ROLE_MAX_DISCOUNT.ADMIN).toBe(100);
  });

  it('validates PostSaleSchema prevents zero or negative quantities and prices', () => {
    const invalidPayload = {
      items: [
        {
          productId: 'prod-1',
          batchId: 'batch-1',
          unitName: 'pack',
          conversionFactor: 1,
          quantityInUnit: 0, // Invalid: must be >= 1
          mrpPaisaPerUnit: -100, // Invalid: must be >= 0
          discountPct: 15,
          taxPct: 0,
        },
      ],
      billDiscountPct: 5,
      payments: [
        {
          method: PaymentMethod.CASH,
          amountPaisa: 1000,
        },
      ],
      requiresRx: false,
    };

    const result = PostSaleSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('validates PostSaleSchema requires doctor and patient info for Rx items', () => {
    const rxPayloadMissingDoctor = {
      items: [
        {
          productId: 'prod-1',
          batchId: 'batch-1',
          unitName: 'ampoule',
          conversionFactor: 1,
          quantityInUnit: 1,
          mrpPaisaPerUnit: 5000,
          discountPct: 0,
          taxPct: 0,
        },
      ],
      billDiscountPct: 0,
      payments: [
        {
          method: PaymentMethod.CASH,
          amountPaisa: 5000,
        },
      ],
      requiresRx: true,
      doctorName: '', // empty!
      patientName: 'John Doe',
      patientPhone: '03001234567',
    };

    const result = PostSaleSchema.safeParse(rxPayloadMissingDoctor);
    expect(result.success).toBe(false);
  });

  it('formats paisa to PKR display correctly without floating point errors', () => {
    expect(formatPaisaToPKR(10050)).toBe('Rs 100.50');
    expect(formatPaisaToPKR(0)).toBe('Rs 0');
    expect(formatPaisaToPKR(250000)).toBe('Rs 2,500');
  });
});
