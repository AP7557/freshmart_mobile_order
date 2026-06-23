import { create } from 'zustand';
import { CartItem } from '@/types';

const TAX_RATE = 0.0625; // 6.25% NJ — update to your state

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  // Computed totals — call as functions
  subtotal: () => number;
  discountTotal: () => number;
  taxTotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find(
        (i) =>
          i.item.id === newItem.item.id &&
          JSON.stringify([...i.selectedModifierOptionIds].sort()) ===
            JSON.stringify([...newItem.selectedModifierOptionIds].sort()),
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartId === existing.cartId
              ? {
                  ...i,
                  quantity: i.quantity + newItem.quantity,
                  lineTotal: i.unitPrice * (i.quantity + newItem.quantity),
                }
              : i,
          ),
        };
      }
      return { items: [...state.items, newItem] };
    }),

  removeItem: (cartId) =>
    set((state) => ({ items: state.items.filter((i) => i.cartId !== cartId) })),

  updateQuantity: (cartId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.cartId !== cartId)
          : state.items.map((i) =>
              i.cartId === cartId
                ? { ...i, quantity, lineTotal: i.unitPrice * quantity }
                : i,
            ),
    })),

  clearCart: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),

  discountTotal: () =>
    get().items.reduce((sum, i) => sum + (i.lineDiscount ?? 0), 0),

  taxTotal: () => {
    const taxable = get().subtotal() - get().discountTotal();
    return Math.round(taxable * TAX_RATE);
  },

  total: () => get().subtotal() - get().discountTotal() + get().taxTotal(),
}));
