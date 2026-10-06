/**
 * POS Cart Store (Zustand)
 * Manages the in-memory cart state for Phase 1C POS billing screen.
 * Serialized into HeldBill.billData when a bill is held.
 */

import { create } from 'zustand';
import {
  CartItem,
  CartState,
  PaymentEntry,
  calcLineTotal,
  calcBillTotals,
} from '@pharmacy/shared';

interface CartStore extends CartState {
  // Cart mutation actions
  addItem: (item: Omit<CartItem, 'cartRowId' | 'lineTotalPaisa'>) => void;
  updateItemQty: (cartRowId: string, newQty: number) => void;
  updateItemDiscount: (cartRowId: string, discountPct: number) => void;
  removeItem: (cartRowId: string) => void;

  // Bill-level
  setBillDiscountPct: (pct: number) => void;
  setRxFields: (fields: { requiresRx: boolean; doctorName: string; patientName: string; patientPhone: string }) => void;

  // Payments
  setPayments: (payments: PaymentEntry[]) => void;
  addPayment: (payment: PaymentEntry) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;

  // Session actions
  clearCart: () => void;
  loadHeldBill: (state: CartState) => void;

  // Computed selectors (memoized getters)
  getSubtotalPaisa: () => number;
  getDiscountPaisa: () => number;
  getTaxPaisa: () => number;
  getGrandTotalPaisa: () => number;
  getPaidPaisa: () => number;
  getChangePaisa: () => number;
}

const INITIAL_CART: CartState = {
  items: [],
  billDiscountPct: 0,
  payments: [],
  requiresRx: false,
  doctorName: '',
  patientName: '',
  patientPhone: '',
};

let _rowCounter = 0;

export const usePosStore = create<CartStore>((set, get) => ({
  ...INITIAL_CART,

  addItem: (partial) => {
    const cartRowId = `row-${++_rowCounter}`;
    const lineTotalPaisa = calcLineTotal(
      partial.mrpPaisaPerUnit,
      partial.quantityInUnit,
      partial.discountPct,
      partial.taxPct
    );
    const item: CartItem = { ...partial, cartRowId, lineTotalPaisa };
    set((s) => {
      // If same product+batch+unit already in cart, merge quantity
      const existing = s.items.find(
        (i) => i.productId === item.productId && i.batchId === item.batchId && i.unitName === item.unitName
      );
      if (existing) {
        const newQty = existing.quantityInUnit + item.quantityInUnit;
        return {
          items: s.items.map((i) =>
            i.cartRowId === existing.cartRowId
              ? {
                  ...i,
                  quantityInUnit: newQty,
                  lineTotalPaisa: calcLineTotal(i.mrpPaisaPerUnit, newQty, i.discountPct, i.taxPct),
                }
              : i
          ),
        };
      }
      return { items: [...s.items, item] };
    });
  },

  updateItemQty: (cartRowId, newQty) => {
    if (newQty < 1) return;
    set((s) => ({
      items: s.items.map((i) =>
        i.cartRowId === cartRowId
          ? {
              ...i,
              quantityInUnit: newQty,
              lineTotalPaisa: calcLineTotal(i.mrpPaisaPerUnit, newQty, i.discountPct, i.taxPct),
            }
          : i
      ),
    }));
  },

  updateItemDiscount: (cartRowId, discountPct) => {
    set((s) => ({
      items: s.items.map((i) =>
        i.cartRowId === cartRowId
          ? {
              ...i,
              discountPct,
              lineTotalPaisa: calcLineTotal(i.mrpPaisaPerUnit, i.quantityInUnit, discountPct, i.taxPct),
            }
          : i
      ),
    }));
  },

  removeItem: (cartRowId) => {
    set((s) => ({ items: s.items.filter((i) => i.cartRowId !== cartRowId) }));
  },

  setBillDiscountPct: (pct) => set({ billDiscountPct: pct }),

  setRxFields: (fields) => set(fields),

  setPayments: (payments) => set({ payments }),

  addPayment: (payment) => set((s) => ({ payments: [...s.payments, payment] })),

  removePayment: (index) =>
    set((s) => ({ payments: s.payments.filter((_, i) => i !== index) })),

  clearPayments: () => set({ payments: [] }),

  clearCart: () => set({ ...INITIAL_CART, items: [], payments: [] }),

  loadHeldBill: (state) => set({ ...state }),

  getSubtotalPaisa: () => {
    const { items, billDiscountPct } = get();
    return calcBillTotals(items, billDiscountPct).subtotalPaisa;
  },

  getDiscountPaisa: () => {
    const { items, billDiscountPct } = get();
    return calcBillTotals(items, billDiscountPct).discountPaisa;
  },

  getTaxPaisa: () => {
    const { items, billDiscountPct } = get();
    return calcBillTotals(items, billDiscountPct).taxPaisa;
  },

  getGrandTotalPaisa: () => {
    const { items, billDiscountPct } = get();
    return calcBillTotals(items, billDiscountPct).grandTotalPaisa;
  },

  getPaidPaisa: () => {
    return get().payments.reduce((sum, p) => sum + p.amountPaisa, 0);
  },

  getChangePaisa: () => {
    const paid = get().payments.reduce((sum, p) => sum + p.amountPaisa, 0);
    const grand = get().getGrandTotalPaisa();
    return Math.max(0, paid - grand);
  },
}));
