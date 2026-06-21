import { create } from "zustand";
import { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) =>
          i.item.id === item.item.id &&
          JSON.stringify(i.selectedModifierOptionIds.slice().sort()) ===
            JSON.stringify(item.selectedModifierOptionIds.slice().sort())
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartId === existing.cartId ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (cartId) =>
    set((state) => ({ items: state.items.filter((i) => i.cartId !== cartId) })),

  updateQuantity: (cartId, quantity) =>
    set((state) => ({
      items: quantity <= 0
        ? state.items.filter((i) => i.cartId !== cartId)
        : state.items.map((i) => (i.cartId === cartId ? { ...i, quantity } : i)),
    })),

  clearCart: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
}));
