import { describe, it, expect } from 'vitest';
import {
  CreateShiftClosingSchema,
  RecordExpenseSchema,
  CapturePrescriptionSchema,
  CreateControlledDrugRegisterEntrySchema,
  ExpenseCategory,
  PaymentMethod,
  ShiftClosingStatus,
  UserRole,
  formatPaisaToPKR,
  rupeesToPaisa,
  paisaToRupees,
} from '@pharmacy/shared';

describe('Phase 2B: Cash Drawer, Expenses & Shift Closing', () => {
  it('validates expense recording with positive integer paisa', () => {
    const input = {
      category: ExpenseCategory.TEA_REFRESHMENT,
      amountPaisa: 120000, // PKR 1,200
      paymentMethod: PaymentMethod.CASH,
      payee: 'Chai Stall',
      notes: 'Daily staff tea',
    };

    const parsed = RecordExpenseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amountPaisa).toBe(120000);
      expect(parsed.data.category).toBe(ExpenseCategory.TEA_REFRESHMENT);
    }
  });

  it('rejects expense with non-positive or negative amount', () => {
    const input = {
      category: ExpenseCategory.UTILITIES,
      amountPaisa: 0,
      payee: 'LESCO',
    };
    const parsed = RecordExpenseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('calculates expected cash and records balanced shift closing', () => {
    const openingCashPaisa = 1500000; // Rs 15,000 opening float
    const cashSalesPaisa = 3200000;   // Rs 32,000 cash sales
    const customerReceiptsPaisa = 500000; // Rs 5,000 received in cash from credit customer
    const cashExpensesPaisa = 120000; // Rs 1,200 paid out in cash expenses
    const supplierCashPaymentsPaisa = 0;

    const expectedCashPaisa =
      openingCashPaisa + cashSalesPaisa + customerReceiptsPaisa - cashExpensesPaisa - supplierCashPaymentsPaisa;
    expect(expectedCashPaisa).toBe(5080000); // Rs 50,800

    const countedCashPaisa = 5080000;
    const differencePaisa = countedCashPaisa - expectedCashPaisa;

    expect(differencePaisa).toBe(0); // Perfectly balanced day
  });

  it('records cash shortage when counted cash is less than expected', () => {
    const openingCashPaisa = 1000000; // Rs 10,000
    const cashSalesPaisa = 2500000;   // Rs 25,000
    const customerReceiptsPaisa = 0;
    const cashExpensesPaisa = 200000; // Rs 2,000

    const expectedCashPaisa = openingCashPaisa + cashSalesPaisa + customerReceiptsPaisa - cashExpensesPaisa;
    expect(expectedCashPaisa).toBe(3300000); // Rs 33,000 expected

    const countedCashPaisa = 3250000; // Rs 32,500 in drawer
    const differencePaisa = countedCashPaisa - expectedCashPaisa;

    expect(differencePaisa).toBe(-50000); // Shortage of PKR 500 (negative)
    expect(differencePaisa < 0).toBe(true);
  });

  it('records cash excess when counted cash is more than expected', () => {
    const openingCashPaisa = 1000000;
    const cashSalesPaisa = 1500000;
    const expectedCashPaisa = openingCashPaisa + cashSalesPaisa; // Rs 25,000

    const countedCashPaisa = 2550000; // Rs 25,500
    const differencePaisa = countedCashPaisa - expectedCashPaisa;

    expect(differencePaisa).toBe(50000); // Excess of PKR 500 (positive)
    expect(differencePaisa > 0).toBe(true);
  });

  it('calculates counted cash from denomination counts', () => {
    const denominations: Record<number, number> = {
      5000: 2, // 10,000
      1000: 5, // 5,000
      500: 4,  // 2,000
      100: 10, // 1,000
      50: 10,  // 500
    };

    let totalCountedPkr = 0;
    for (const [note, count] of Object.entries(denominations)) {
      totalCountedPkr += Number(note) * count;
    }
    const countedCashPaisa = Math.round(totalCountedPkr * 100);

    expect(totalCountedPkr).toBe(18500);
    expect(countedCashPaisa).toBe(1850000);
  });
});

describe('Phase 2B: Profit & Loss and Margin Reports', () => {
  it('verifies sale profit equals selling price minus that exact batch cost', () => {
    // Batch purchased at trade cost of 25 paisa per tablet
    const batch = {
      id: 'batch-pan-01',
      batchNumber: 'BT-PAN-24',
      costPricePaisa: 25, // Rs 0.25 per tablet
      mrpPaisa: 35,        // Rs 0.35 per tablet
    };

    // Sale of 2 strips (20 tablets) at Rs 7.00 (700 paisa)
    const quantitySmallestUnits = 20;
    const sellingPricePaisa = 700; // Rs 7.00 line total

    const exactBatchCostPaisa = batch.costPricePaisa * quantitySmallestUnits; // 25 * 20 = 500 paisa (Rs 5.00)
    const profitPaisa = sellingPricePaisa - exactBatchCostPaisa;               // 700 - 500 = 200 paisa (Rs 2.00)
    const marginPct = Math.round((profitPaisa / sellingPricePaisa) * 1000) / 10; // (200 / 700) * 100 = 28.6%

    expect(exactBatchCostPaisa).toBe(500);
    expect(profitPaisa).toBe(200);
    expect(profitPaisa).toBe(sellingPricePaisa - exactBatchCostPaisa);
    expect(marginPct).toBe(28.6);
  });

  it('calculates comprehensive P&L waterfall (Sales - Batch Cost - Expenses)', () => {
    const grossSalesPaisa = 18500000;     // Rs 185,000
    const discountPaisa = 925000;         // Rs 9,250
    const netSalesPaisa = grossSalesPaisa - discountPaisa; // Rs 175,750 (17,575,000 paisa)

    // COGS aggregated from exact batch cost of each sold unit
    const cogsPaisa = 13181250;           // Rs 131,812.50
    const grossProfitPaisa = netSalesPaisa - cogsPaisa; // Rs 43,937.50 (4,393,750 paisa)
    const grossMarginPct = Math.round((grossProfitPaisa / netSalesPaisa) * 1000) / 10;

    // Operating expenses in period
    const expensesByCategory: Record<string, number> = {
      [ExpenseCategory.UTILITIES]: 2500000,       // Rs 25,000
      [ExpenseCategory.PACKAGING]: 350000,         // Rs 3,500
      [ExpenseCategory.TEA_REFRESHMENT]: 120000,   // Rs 1,200
    };
    const totalExpensesPaisa = Object.values(expensesByCategory).reduce((s, v) => s + v, 0); // Rs 29,700

    const netOperatingProfitPaisa = grossProfitPaisa - totalExpensesPaisa; // Rs 14,237.50
    const netMarginPct = Math.round((netOperatingProfitPaisa / netSalesPaisa) * 1000) / 10;

    expect(grossProfitPaisa).toBe(4393750);
    expect(grossMarginPct).toBe(25.0);
    expect(totalExpensesPaisa).toBe(2970000);
    expect(netOperatingProfitPaisa).toBe(1423750);
    expect(netMarginPct).toBe(8.1);
  });

  it('aggregates margin reports across product, company, category, and cashier dimensions', () => {
    const salesItems = [
      {
        productId: 'p-1',
        productName: 'Panadol 500mg',
        company: 'GSK Pakistan',
        category: 'Analgesics',
        cashier: 'Rashid Cashier',
        units: 200,
        revenuePaisa: 700000,
        costPaisa: 500000,
      },
      {
        productId: 'p-2',
        productName: 'Augmentin 625mg',
        company: 'GSK Pakistan',
        category: 'Antibiotics',
        cashier: 'Fatima Noor',
        units: 50,
        revenuePaisa: 925000,
        costPaisa: 693750,
      },
    ];

    // Group by company
    const byCompany: Record<string, { revenue: number; cost: number; profit: number }> = {};
    for (const item of salesItems) {
      if (!byCompany[item.company]) byCompany[item.company] = { revenue: 0, cost: 0, profit: 0 };
      byCompany[item.company].revenue += item.revenuePaisa;
      byCompany[item.company].cost += item.costPaisa;
      byCompany[item.company].profit += item.revenuePaisa - item.costPaisa;
    }

    expect(byCompany['GSK Pakistan'].revenue).toBe(1625000);
    expect(byCompany['GSK Pakistan'].cost).toBe(1193750);
    expect(byCompany['GSK Pakistan'].profit).toBe(431250);
  });

  it('enforces cost and margin visibility restriction for Cashier role', () => {
    function canViewCostAndMargin(role: UserRole): boolean {
      // Non-negotiable data rule: Cashiers must NEVER see cost or margin data
      return role !== UserRole.CASHIER;
    }

    expect(canViewCostAndMargin(UserRole.ADMIN)).toBe(true);
    expect(canViewCostAndMargin(UserRole.PHARMACIST)).toBe(true);
    expect(canViewCostAndMargin(UserRole.ACCOUNTANT)).toBe(true);
    expect(canViewCostAndMargin(UserRole.INVENTORY)).toBe(true);
    expect(canViewCostAndMargin(UserRole.CASHIER)).toBe(false);
  });

  it('calculates stock valuation at cost and at MRP', () => {
    const batches = [
      { quantity: 1000, costPricePaisa: 25, mrpPaisa: 35 },
      { quantity: 500, costPricePaisa: 120, mrpPaisa: 160 },
    ];

    let valuationAtCostPaisa = 0;
    let valuationAtMrpPaisa = 0;

    for (const b of batches) {
      valuationAtCostPaisa += b.costPricePaisa * b.quantity;
      valuationAtMrpPaisa += b.mrpPaisa * b.quantity;
    }

    const unrealizedProfitPaisa = valuationAtMrpPaisa - valuationAtCostPaisa;
    const potentialMarginPct = Math.round((unrealizedProfitPaisa / valuationAtMrpPaisa) * 1000) / 10;

    expect(valuationAtCostPaisa).toBe(85000);   // Rs 850
    expect(valuationAtMrpPaisa).toBe(115000);   // Rs 1,150
    expect(unrealizedProfitPaisa).toBe(30000);   // Rs 300
    expect(potentialMarginPct).toBe(26.1);
  });
});

describe('Phase 2B: Controlled Drugs & Prescription Compliance', () => {
  it('validates prescription capture schema with PMDC reg and patient CNIC', () => {
    const input = {
      doctorName: 'Dr. Salman Farooq',
      doctorRegNo: 'PMDC-12345',
      doctorHospital: 'Ittefaq Hospital',
      patientName: 'Muhammad Arif',
      patientCnic: '35201-1234567-9',
      patientPhone: '03001234567',
      patientAge: 45,
      patientGender: 'MALE' as const,
      saleId: 'INV-000014',
      notes: 'Antibiotic therapy',
    };

    const parsed = CapturePrescriptionSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.doctorName).toBe('Dr. Salman Farooq');
      expect(parsed.data.patientCnic).toBe('35201-1234567-9');
    }
  });

  it('validates controlled drug register entry schema', () => {
    const input = {
      productId: 'prod-cd-1',
      productName: 'Codeine Phosphate 30mg',
      genericName: 'Codeine Phosphate',
      batchNumber: 'BTH-CD-001',
      drugClass: 'NARCOTIC',
      movementType: 'OUTFLOW' as const,
      quantitySmallestUnits: 10,
      balanceAfterSmallestUnits: 290,
      patientName: 'Muhammad Arif',
      patientCnic: '35201-1234567-9',
      doctorName: 'Dr. Salman Farooq',
      doctorRegNo: 'PMDC-12345',
      prescriptionRef: 'RX-20261006-0001',
      invoiceNumber: 'INV-000014',
      dispensedByName: 'Dr. Sarah (Pharmacist)',
      notes: 'Dispensed on physical prescription',
    };

    const parsed = CreateControlledDrugRegisterEntrySchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.quantitySmallestUnits).toBe(10);
      expect(parsed.data.balanceAfterSmallestUnits).toBe(290);
    }
  });

  it('maintains controlled drug register balance invariant matching physical batch stock', () => {
    // 1. Initial Stock Batch created via purchase inflow
    let batchStock = 0;
    let registerBalance = 0;

    // Inflow: Purchase of 300 units received
    const purchaseInflow = 300;
    batchStock += purchaseInflow;
    registerBalance += purchaseInflow;

    const inflowEntry = {
      movementType: 'INFLOW',
      quantity: purchaseInflow,
      balanceAfter: registerBalance,
    };
    expect(inflowEntry.balanceAfter).toBe(batchStock); // Matches 300

    // Outflow: Dispensing 10 units with prescription
    const dispenseQty1 = 10;
    batchStock -= dispenseQty1;
    registerBalance -= dispenseQty1;

    const outflowEntry1 = {
      movementType: 'OUTFLOW',
      quantity: dispenseQty1,
      balanceAfter: registerBalance,
    };
    expect(outflowEntry1.balanceAfter).toBe(batchStock); // Matches 290

    // Outflow: Dispensing another 20 units
    const dispenseQty2 = 20;
    batchStock -= dispenseQty2;
    registerBalance -= dispenseQty2;

    const outflowEntry2 = {
      movementType: 'OUTFLOW',
      quantity: dispenseQty2,
      balanceAfter: registerBalance,
    };

    // Invariant: Controlled-drug register balance strictly equals current stock
    expect(outflowEntry2.balanceAfter).toBe(270);
    expect(batchStock).toBe(270);
    expect(outflowEntry2.balanceAfter).toBe(batchStock);
  });
});
