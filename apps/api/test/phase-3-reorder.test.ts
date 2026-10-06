import { describe, it, expect } from 'vitest';
import {
  CreateDraftPoSchema,
  formatPaisaToPKR,
} from '@pharmacy/shared';

describe('Phase 3: Reorder Suggestions & 30/60/90-Day Velocity Calculations', () => {
  it('calculates daily run rate and remaining days of stock correctly', () => {
    const sales30d = 300; // 300 tablets sold in 30 days
    const sales60d = 540; // 540 in 60 days
    const sales90d = 810; // 810 in 90 days

    const rate30 = Number((sales30d / 30).toFixed(2));
    const rate60 = Number((sales60d / 60).toFixed(2));
    const rate90 = Number((sales90d / 90).toFixed(2));

    expect(rate30).toBe(10);  // 10 units/day
    expect(rate60).toBe(9);   // 9 units/day
    expect(rate90).toBe(9);   // 9 units/day

    const currentStock = 50; // 50 units in stock
    const daysStockRemaining = Math.round(currentStock / rate30);
    expect(daysStockRemaining).toBe(5); // 5 days left -> CRITICAL
  });

  it('determines urgency levels based on stock and days remaining', () => {
    function getUrgency(currentStock: number, daysRemaining: number, minStock: number) {
      if (currentStock <= 0) return 'OUT_OF_STOCK';
      if (daysRemaining <= 5) return 'CRITICAL';
      if (daysRemaining <= 15 || currentStock <= minStock) return 'REORDER_NOW';
      return 'ADEQUATE';
    }

    expect(getUrgency(0, 0, 20)).toBe('OUT_OF_STOCK');
    expect(getUrgency(25, 4, 20)).toBe('CRITICAL');
    expect(getUrgency(80, 10, 20)).toBe('REORDER_NOW');
    expect(getUrgency(15, 20, 20)).toBe('REORDER_NOW'); // below minStock
    expect(getUrgency(500, 45, 20)).toBe('ADEQUATE');
  });

  it('calculates suggested reorder quantities rounded to whole packs/boxes', () => {
    const dailyRate = 12; // 12 tablets / day
    const currentStock = 60; // 60 tablets on shelf (5 days supply)
    const targetCoverageDays = 30; // want 30 days stock
    const leadTimeDays = 7; // 7 days supplier delivery lead time

    // Needed total = (30 + 7) * 12 = 444 tablets
    const neededTotal = (targetCoverageDays + leadTimeDays) * dailyRate;
    expect(neededTotal).toBe(444);

    // Suggested base units to order = 444 - 60 = 384 tablets
    const suggestedBaseUnits = Math.max(0, neededTotal - currentStock);
    expect(suggestedBaseUnits).toBe(384);

    // Box has 100 tablets (conversion factor = 100)
    // 384 / 100 = 3.84 -> must ceil to 4 boxes to never stock out
    const conversionFactor = 100;
    const suggestedBoxes = Math.ceil(suggestedBaseUnits / conversionFactor);
    expect(suggestedBoxes).toBe(4);

    // 4 boxes * 100 = 400 tablets delivered
    expect(suggestedBoxes * conversionFactor).toBe(400);
  });

  it('groups suggested items by primary supplier with accurate line and group totals', () => {
    const suggestions = [
      {
        supplierId: 'sup-1',
        supplierName: 'Al-Madina Pharma Distributors',
        productId: 'prod-1',
        productName: 'Panadol 500mg',
        suggestedPackUnits: 10,
        unitCostPaisa: 5800, // Rs 58.00
      },
      {
        supplierId: 'sup-1',
        supplierName: 'Al-Madina Pharma Distributors',
        productId: 'prod-3',
        productName: 'Augmentin 625mg',
        suggestedPackUnits: 5,
        unitCostPaisa: 19500, // Rs 195.00
      },
      {
        supplierId: 'sup-2',
        supplierName: 'Khyber Medicos & Wholesale',
        productId: 'prod-4',
        productName: 'Insulin Mixtard 30/70',
        suggestedPackUnits: 8,
        unitCostPaisa: 12000, // Rs 120.00
      },
    ];

    const groups: Record<string, { count: number; totalPaisa: number; items: any[] }> = {};
    for (const item of suggestions) {
      if (!groups[item.supplierId]) {
        groups[item.supplierId] = { count: 0, totalPaisa: 0, items: [] };
      }
      const grp = groups[item.supplierId];
      grp.items.push(item);
      grp.count += 1;
      grp.totalPaisa += item.suggestedPackUnits * item.unitCostPaisa;
    }

    // Supplier 1: (10 * 5800) + (5 * 19500) = 58000 + 97500 = 155500 paisa (Rs 1,555.00)
    expect(groups['sup-1'].count).toBe(2);
    expect(groups['sup-1'].totalPaisa).toBe(155500);

    // Supplier 2: 8 * 12000 = 96000 paisa (Rs 960.00)
    expect(groups['sup-2'].count).toBe(1);
    expect(groups['sup-2'].totalPaisa).toBe(96000);
  });

  it('validates CreateDraftPoSchema and catches invalid payload', () => {
    const validPayload = {
      supplierId: 'sup-1',
      targetCoverageDays: 30,
      speedWindowDays: 60,
      notes: 'Urgent weekend replenishment',
      items: [
        {
          productId: 'prod-1',
          productName: 'Panadol 500mg',
          sku: 'MED-PAN-500',
          unitName: 'Box',
          conversionFactor: 200,
          quantityInPacks: 10,
          costPricePaisa: 58000,
        },
      ],
    };

    const res = CreateDraftPoSchema.safeParse(validPayload);
    expect(res.success).toBe(true);

    // Empty items array should be rejected
    const invalidEmptyItems = { ...validPayload, items: [] };
    const resInvalid = CreateDraftPoSchema.safeParse(invalidEmptyItems);
    expect(resInvalid.success).toBe(false);

    // Invalid speed window (must be 30, 60, or 90)
    const resBadWindow = CreateDraftPoSchema.safeParse({ ...validPayload, speedWindowDays: 45 });
    expect(resBadWindow.success).toBe(false);
  });
});
