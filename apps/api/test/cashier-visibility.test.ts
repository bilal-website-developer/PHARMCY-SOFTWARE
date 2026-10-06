import { describe, expect, it } from 'vitest';
import { sanitizeProductForRole } from '../src/routes/products';
import { sanitizeSaleForRole } from '../src/routes/sales';

describe('cashier data visibility', () => {
    it('removes cost and profit fields from products for cashier', () => {
        const product = {
            id: 'p1',
            name: 'Panadol 500mg',
            costPricePaisa: 2500,
            mrpPaisa: 7000,
            priceHistory: [
                { oldCostPricePaisa: 2300, newCostPricePaisa: 2500, createdAt: '2024-01-01' },
            ],
        };

        const sanitized = sanitizeProductForRole(product, 'CASHIER');

        expect(sanitized).not.toHaveProperty('costPricePaisa');
        expect(sanitized.priceHistory[0]).not.toHaveProperty('oldCostPricePaisa');
        expect(sanitized.priceHistory[0]).not.toHaveProperty('newCostPricePaisa');
        expect(sanitized).toHaveProperty('mrpPaisa', 7000);
    });

    it('removes cost and profit fields from sales for cashier', () => {
        const sale = {
            id: 'sale-1',
            subtotalPaisa: 1000,
            totalCostPaisa: 650,
            grossProfitPaisa: 350,
            items: [{
                id: 'item-1',
                productId: 'p1',
                costPricePaisa: 350,
                profitPaisa: 150,
                lineTotalPaisa: 1000,
            }],
        };

        const sanitized = sanitizeSaleForRole(sale, 'CASHIER');

        expect(sanitized).not.toHaveProperty('totalCostPaisa');
        expect(sanitized).not.toHaveProperty('grossProfitPaisa');
        expect(sanitized.items[0]).not.toHaveProperty('costPricePaisa');
        expect(sanitized.items[0]).not.toHaveProperty('profitPaisa');
        expect(sanitized.items[0]).toHaveProperty('lineTotalPaisa', 1000);
    });
});
