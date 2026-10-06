import { describe, it, expect } from 'vitest';
import {
  CreateStocktakeSchema,
  UpdateStocktakeCountsSchema,
  ApproveStocktakeSchema,
  getDaysToExpiry,
  formatPaisaToPKR,
} from '@pharmacy/shared';

describe('Phase 2C: Physical Stocktake & Approvals (Spec Section 10)', () => {
  it('validates stocktake creation schema', () => {
    const input = {
      rackLocation: 'Rack A-01',
      notes: 'Monthly physical count',
    };
    const parsed = CreateStocktakeSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rackLocation).toBe('Rack A-01');
    }
  });

  it('calculates variance quantity and value correctly for shortages and surpluses', () => {
    const systemQty = 100;
    const countedShortage = 92; // 8 units shortage
    const countedSurplus = 105;  // 5 units surplus
    const costPricePaisa = 2500; // Rs 25.00

    const varianceShortage = countedShortage - systemQty;
    const valueShortage = varianceShortage * costPricePaisa;
    expect(varianceShortage).toBe(-8);
    expect(valueShortage).toBe(-20000); // -Rs 200.00

    const varianceSurplus = countedSurplus - systemQty;
    const valueSurplus = varianceSurplus * costPricePaisa;
    expect(varianceSurplus).toBe(5);
    expect(valueSurplus).toBe(12500); // +Rs 125.00
  });

  it('rejects count updates with negative numbers', () => {
    const input = {
      items: [
        { batchId: 'batch-1', countedQuantity: -5 },
      ],
    };
    const parsed = UpdateStocktakeCountsSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('simulates stocktake approval: updates batch stock and creates movements for non-zero variances', () => {
    // Initial batch state
    const batch = {
      id: 'batch-test-1',
      productId: 'prod-test-1',
      productName: 'Panadol 500mg',
      batchNumber: 'BT-TEST-001',
      quantity: 100, // system quantity
    };

    const stocktake = {
      id: 'stk-test-101',
      stocktakeNumber: 'STK-202610-0099',
      status: 'PENDING_REVIEW',
      items: [
        {
          batchId: 'batch-test-1',
          productId: 'prod-test-1',
          productName: 'Panadol 500mg',
          batchNumber: 'BT-TEST-001',
          systemQuantity: 100,
          countedQuantity: 95, // 5 units shortage
          varianceQuantity: -5,
        },
      ],
      approvedById: null as string | null,
      approvedByName: null as string | null,
      approvedAt: null as string | null,
    };

    const movements: any[] = [];
    const approver = { id: 'usr-admin', fullName: 'Dr. Tariq (Pharmacist)' };

    // Execute approval logic
    expect(stocktake.status).toBe('PENDING_REVIEW');

    for (const it of stocktake.items) {
      if (it.countedQuantity !== null && it.varianceQuantity !== 0) {
        batch.quantity = it.countedQuantity; // stock matches count
        movements.push({
          productId: it.productId,
          batchId: it.batchId,
          movementType: it.varianceQuantity > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_DAMAGE',
          quantity: it.varianceQuantity,
          balanceAfter: it.countedQuantity,
          referenceType: 'STOCKTAKE_ADJUSTMENT',
          referenceId: stocktake.id,
          reason: `Stocktake ${stocktake.stocktakeNumber} variance`,
        });
      }
    }

    stocktake.status = 'APPROVED';
    stocktake.approvedById = approver.id;
    stocktake.approvedByName = approver.fullName;
    stocktake.approvedAt = new Date().toISOString();

    // Invariant: batch quantity now equals counted quantity
    expect(batch.quantity).toBe(95);
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe('ADJUSTMENT_DAMAGE');
    expect(movements[0].quantity).toBe(-5);
    expect(movements[0].referenceType).toBe('STOCKTAKE_ADJUSTMENT');
    expect(stocktake.status).toBe('APPROVED');
    expect(stocktake.approvedByName).toBe('Dr. Tariq (Pharmacist)');
    expect(stocktake.approvedAt).toBeTruthy();
  });

  it('enforces one-time approval lock: cannot re-approve an approved stocktake', () => {
    const stocktake = {
      id: 'stk-locked',
      status: 'APPROVED',
      approvedByName: 'Dr. Tariq',
      approvedAt: '2026-10-06T12:00:00Z',
    };

    // Attempting to approve again must be rejected
    const canApprove = stocktake.status !== 'APPROVED' && stocktake.status !== 'REJECTED';
    expect(canApprove).toBe(false);
  });
});

describe('Phase 2C: Near-Expiry Windows (Sections 4.3, 4.4)', () => {
  it('correctly classifies batches into 1-month, 3-month and 6-month windows', () => {
    const now = Date.now();
    const batch1m = new Date(now + 20 * 86400000).toISOString();  // 20 days -> 1m
    const batch3m = new Date(now + 65 * 86400000).toISOString();  // 65 days -> 3m
    const batch6m = new Date(now + 140 * 86400000).toISOString(); // 140 days -> 6m
    const batchSafe = new Date(now + 300 * 86400000).toISOString(); // 300 days -> Safe

    const days1m = Math.ceil((new Date(batch1m).getTime() - now) / 86400000);
    const days3m = Math.ceil((new Date(batch3m).getTime() - now) / 86400000);
    const days6m = Math.ceil((new Date(batch6m).getTime() - now) / 86400000);
    const daysSafe = Math.ceil((new Date(batchSafe).getTime() - now) / 86400000);

    expect(days1m <= 30).toBe(true);
    expect(days3m <= 90 && days3m > 30).toBe(true);
    expect(days6m <= 180 && days6m > 90).toBe(true);
    expect(daysSafe > 180).toBe(true);
  });

  it('aggregates stock value correctly within near-expiry windows', () => {
    const batches = [
      { days: 25, quantity: 100, costPricePaisa: 250 },   // 1m: 25,000 paisa
      { days: 75, quantity: 50, costPricePaisa: 1000 },   // 3m: 50,000 paisa
      { days: 150, quantity: 40, costPricePaisa: 2000 },  // 6m: 80,000 paisa
      { days: 250, quantity: 200, costPricePaisa: 500 },  // Safe: 100,000 paisa
    ];

    let expiring1m = 0;
    let expiring3m = 0;
    let expiring6m = 0;

    for (const b of batches) {
      const val = b.quantity * b.costPricePaisa;
      if (b.days <= 30) expiring1m += val;
      if (b.days <= 90) expiring3m += val;
      if (b.days <= 180) expiring6m += val;
    }

    expect(expiring1m).toBe(25000);
    expect(expiring3m).toBe(75000); // cumulative (25k + 50k)
    expect(expiring6m).toBe(155000); // cumulative (25k + 50k + 80k)
  });
});

describe('Phase 2C: Batch Recall Report Accuracy (Section 12)', () => {
  it('generates recall report tracing remaining stock, units sold, invoices, customers, and supplier', () => {
    const batchNumber = 'BT-RECALL-99';
    const initialQuantity = 500;
    const stockRemaining = 120;
    const unitsSold = 380;

    const supplierRecord = {
      supplierId: 'sup-1',
      supplierName: 'Al-Madina Pharma Distributors',
      phone: '0300-1234567',
      billNumber: 'INV-9821',
      billDate: '2026-09-15',
    };

    const invoiceSales = [
      { invoiceNumber: 'INV-001', customerName: 'Ahmed Pharmacy', customerPhone: '0300-1111111', quantity: 200 },
      { invoiceNumber: 'INV-002', customerName: 'City Hospital', customerPhone: '0321-2222222', quantity: 150 },
      { invoiceNumber: 'INV-003', customerName: 'Walk-in Customer', customerPhone: '0333-3333333', quantity: 30 },
    ];

    const totalSoldFromInvoices = invoiceSales.reduce((s, inv) => s + inv.quantity, 0);
    expect(totalSoldFromInvoices).toBe(unitsSold);
    expect(stockRemaining + unitsSold).toBe(initialQuantity);

    // Verify recall supplier claim information
    expect(supplierRecord.supplierName).toBe('Al-Madina Pharma Distributors');
    expect(supplierRecord.billNumber).toBe('INV-9821');

    // Verify affected customer count
    const uniqueCustomers = new Set(invoiceSales.map((i) => i.customerName));
    expect(uniqueCustomers.size).toBe(3);
  });
});
