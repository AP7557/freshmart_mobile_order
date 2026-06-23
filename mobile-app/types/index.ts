export interface Item {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface MenuModifier {
  modifierId: number;
  modifierName: string;
  modifierType: 'single' | 'multiple';
  required: boolean;
  maxChoices: number | null;
  sortOrder: number;
  category: string;
  itemId: number;
}

export interface ModifierOption {
  id: number;
  modifierId: number;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export type PromoType = 'percent' | 'fixed' | 'item' | 'buy_x_get_y' | 'bundle';

export interface Promotion {
  id: number;
  name: string;
  description: string;
  type: PromoType;
  value: number;
  isActive: boolean;
  promotionCode: string | null;
  startAt: string;
  endAt: string;
  minOrderTotal: number;
  triggerQty: number;
  rewardQty: number;
  triggerItemIds: number[];
  rewardItemIds: number[];
  appliesTo: string;
}

export interface CartItem {
  cartId: string;
  item: Item;
  quantity: number;
  selectedModifierOptionIds: number[];
  unitPrice: number;
  lineTotal: number; // cents — (unitPrice × quantity), including modifier deltas
  lineDiscount: number; // cents — discount applied to this line
}

export interface OrderConfirmation {
  orderId: number;
  clientSecret: string;
  pricing: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  estimatedReadyAt: string;
}

export interface MenuData {
  items: Item[];
  modifiers: MenuModifier[];
  modifierOptions: ModifierOption[];
  promotions: Promotion[];
}
