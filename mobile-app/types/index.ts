export interface Item {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isActive: boolean;
}

export interface ModifierOption {
  id: number;
  modifierId: number;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface Modifier {
  modifierId: number;
  modifierName: string;
  modifierType: "single" | "multiple";
  required: boolean;
  maxChoices: number | null;
  itemId: number;
}

export interface Promotion {
  id: number;
  name: string;
  description: string;
  type: "percent" | "fixed" | "item";
  value: number;
  isActive: boolean;
  promotionCode: string | null;
}

export interface CartItem {
  cartId: string;
  item: Item;
  quantity: number;
  selectedModifierOptionIds: number[];
  unitPrice: number;
}

export interface OrderConfirmation {
  orderId: number;
  clientSecret: string;
  publishableKey: string;
  pricing: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  estimatedReadyAt: string;
}
