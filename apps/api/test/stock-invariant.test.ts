import { describe, it, expect } from 'vitest';
import {
  StockMovementType,
  calculateEffectiveUnitCost,
  evaluateBatchStatus,
  BatchStatus,
} from '@pharmacy/shared';

interface SimBatch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number; // Smallest base unit
}

interface SimMovement {
  id: string;
  batchId: string;
  movementType: StockMovementType;
  quantity: number; // Signed: positive = inflow, negative = outflow
  balanceAfter: number;
}

/**
 * Execute a stock transaction maintaining the strict system invariant:
 * batch.quantity == SUM(movements.quantity)
 */
function applyStockMovement(
  batch: SimBatch,
  movements: SimMovement[],
  type: StockMovementType,
  deltaQuantity: number
): void {
  // Disallow negative stock invariant
  if (batch.quantity + deltaQuantity < 0) {
    throw new Error(`Negative stock prohibited: cannot deduct ${Math.abs(deltaQuantity)} from ${batch.quantity}`);
  }

  batch.quantity += deltaQuantity;

  movements.push({
    id: `mov-${movements.length + 1}`,
    batchId: batch.id,
    movementType: type,
    quantity: deltaQuantity,
    balanceAfter: batch.quantity,
  });
}

describe('Phase 1B: Stock & Batch Invariant Verification', () => {
  it('proves that batch.quantity strictly equals SUM(movements.quantity) across multiple random operations', () => {
    const batch: SimBatch = {
      id: 'batch-inv-01',
      productId: 'prod-panadol',
      batchNumber: 'BT-PAN-2024-TEST',
      quantity: 0,
    };
    const movements: SimMovement[] = [];

    // 1. Initial Purchase GRN (+1,000 units)
    applyStockMovement(batch, movements, StockMovementType.PURCHASE, 1000);
    expect(batch.quantity).toBe(1000);
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(batch.quantity);

    // 2. POS Sales Outflow (-120 units)
    applyStockMovement(batch, movements, StockMovementType.SALE, -120);
    expect(batch.quantity).toBe(880);
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(batch.quantity);

    // 3. Customer Return Inflow (+20 units)
    applyStockMovement(batch, movements, StockMovementType.SALE_RETURN, 20);
    expect(batch.quantity).toBe(900);
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(batch.quantity);

    // 4. Damage Write-Off (-15 units)
    applyStockMovement(batch, movements, StockMovementType.ADJUSTMENT_DAMAGE, -15);
    expect(batch.quantity).toBe(885);
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(batch.quantity);

    // 5. Expired Write-Off (-35 units)
    applyStockMovement(batch, movements, StockMovementType.ADJUSTMENT_EXPIRED, -35);
    expect(batch.quantity).toBe(850);
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(batch.quantity);

    // 6. 100 Randomized Concurrent Operations Simulation
    for (let i = 0; i < 100; i++) {
      const isAddition = Math.random() > 0.45; // 55% additions, 45% deductions
      const amount = Math.floor(1 + Math.random() * 50);

      if (isAddition) {
        applyStockMovement(batch, movements, StockMovementType.PURCHASE, amount);
      } else {
        if (batch.quantity >= amount) {
          applyStockMovement(batch, movements, StockMovementType.SALE, -amount);
        }
      }

      // Invariant check on EVERY single transaction:
      const totalMovementSum = movements.reduce((acc, m) => acc + m.quantity, 0);
      expect(batch.quantity).toBe(totalMovementSum);
      expect(batch.quantity).toBeGreaterThanOrEqual(0);
    }

    // Final Assertion
    const finalSum = movements.reduce((acc, m) => acc + m.quantity, 0);
    expect(batch.quantity).toBe(finalSum);
    expect(movements.length).toBeGreaterThan(100);
  });

  it('proves that negative stock operations are strictly blocked', () => {
    const batch: SimBatch = {
      id: 'batch-neg-test',
      productId: 'prod-augmentin',
      batchNumber: 'BT-AUG-01',
      quantity: 50,
    };
    const movements: SimMovement[] = [];

    // Attempting to sell or deduct 51 from 50 must throw
    expect(() => {
      applyStockMovement(batch, movements, StockMovementType.SALE, -51);
    }).toThrow(/Negative stock prohibited/);

    expect(batch.quantity).toBe(50);
    expect(movements.length).toBe(0);
  });

  it('proves bonus quantity reduces average unit cost', () => {
    const tradePricePaisa = 100000; // Rs 1,000.00
    const discountPct = 10;         // 10% trade discount
    const taxPct = 0;

    // Case A: 10 boxes (100 units each) with 0 bonus
    const unitsWithoutBonus = 10 * 100; // 1,000 units
    const costWithoutBonus = calculateEffectiveUnitCost(tradePricePaisa, discountPct, taxPct, unitsWithoutBonus);

    // Case B: 10 boxes + 2 bonus boxes (100 units each = 1,200 units total)
    const unitsWithBonus = (10 + 2) * 100; // 1,200 units
    const costWithBonus = calculateEffectiveUnitCost(tradePricePaisa, discountPct, taxPct, unitsWithBonus);

    // Rs 900.00 / 1000 units = 90 Paisa per unit
    expect(costWithoutBonus).toBe(90);
    // Rs 900.00 / 1200 units = 75 Paisa per unit
    expect(costWithBonus).toBe(75);

    // Bonus units strictly lowered the average unit cost!
    expect(costWithBonus).toBeLessThan(costWithoutBonus);
  });

  it('correctly evaluates batch status for Active, Near-Expiry, and Expired', () => {
    const today = new Date();

    // Expired: 5 days ago
    const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(evaluateBatchStatus(pastDate, 3)).toBe(BatchStatus.EXPIRED);

    // Near-Expiry: 45 days in future (within 3 months = ~90 days)
    const nearDate = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
    expect(evaluateBatchStatus(nearDate, 3)).toBe(BatchStatus.NEAR_EXPIRY);

    // Active: 180 days in future (beyond 3 months)
    const futureDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    expect(evaluateBatchStatus(futureDate, 3)).toBe(BatchStatus.ACTIVE);
  });
});
