import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const modifierTypeEnum = pgEnum('modifier_type', ['single', 'multiple']);
export const promotionTypeEnum = pgEnum('promotion_type', [
  'percent',
  'fixed',
  'item',
  'buy_x_get_y',
  'bundle',
]);

// FIX #9: 'pending_payment' added — orders start here, kitchen never sees this status.
export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]);
export const userRoleEnum = pgEnum('user_role', ['admin', 'kitchen']);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    basePrice: integer('base_price').notNull(),
    imageUrl: text('image_url').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('items_is_active_idx').on(t.isActive)],
);

export const modifiers = pgTable('modifiers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Other'),
  type: modifierTypeEnum('type').notNull(),
  required: boolean('required').notNull().default(false),
  maxChoices: integer('max_choices'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const modifierOptions = pgTable(
  'modifier_options',
  {
    id: serial('id').primaryKey(),
    modifierId: integer('modifier_id')
      .notNull()
      .references(() => modifiers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceDelta: integer('price_delta').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
  },
  (t) => [index('modifier_options_modifier_id_idx').on(t.modifierId)],
);

// FIX #11: Index on modifierId for the /api/menu JOIN query.
export const itemModifiers = pgTable(
  'item_modifiers',
  {
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    modifierId: integer('modifier_id')
      .notNull()
      .references(() => modifiers.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.modifierId] }),
    index('item_modifiers_modifier_id_idx').on(t.modifierId),
  ],
);

export const promotions = pgTable(
  'promotions',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    type: promotionTypeEnum('type').notNull(),
    value: integer('value').notNull(),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    minOrderTotal: integer('min_order_total').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    promotionCode: text('promotion_code'),
    triggerQty: integer('trigger_qty').notNull().default(1),
    rewardQty: integer('reward_qty').notNull().default(1),
    triggerItemIds: integer('trigger_item_ids').array().notNull().default([]),
    rewardItemIds: integer('reward_item_ids').array().notNull().default([]),
    appliesTo: text('applies_to').notNull().default('order'),
  },
  (t) => [index('promotions_is_active_idx').on(t.isActive)],
);

export const promotionItems = pgTable(
  'promotion_items',
  {
    id: serial('id').primaryKey(),
    promotionId: integer('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('promotion_items_promotion_id_idx').on(t.promotionId),
    index('promotion_items_item_id_idx').on(t.itemId),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    estimatedReadyAt: timestamp('estimated_ready_at').notNull(),
    status: orderStatusEnum('status').notNull().default('pending_payment'),
    subtotal: integer('subtotal').notNull(),
    discountTotal: integer('discount_total').notNull().default(0),
    taxTotal: integer('tax_total').notNull().default(0),
    total: integer('total').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('orders_status_idx').on(t.status)],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id),
    quantity: integer('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    lineSubtotal: integer('line_subtotal').notNull(),
    lineDiscount: integer('line_discount').notNull().default(0),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [index('order_items_order_id_idx').on(t.orderId)],
);

export const orderItemModifiers = pgTable(
  'order_item_modifiers',
  {
    id: serial('id').primaryKey(),
    orderItemId: integer('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    modifierOptionId: integer('modifier_option_id')
      .notNull()
      .references(() => modifierOptions.id),
    priceDelta: integer('price_delta').notNull().default(0),
  },
  (t) => [index('order_item_modifiers_order_item_id_idx').on(t.orderItemId)],
);

// Relations
export const itemsRelations = relations(items, ({ many }) => ({
  itemModifiers: many(itemModifiers),
  promotionItems: many(promotionItems),
  orderItems: many(orderItems),
}));
export const modifiersRelations = relations(modifiers, ({ many }) => ({
  options: many(modifierOptions),
  itemModifiers: many(itemModifiers),
}));
export const modifierOptionsRelations = relations(
  modifierOptions,
  ({ one }) => ({
    modifier: one(modifiers, {
      fields: [modifierOptions.modifierId],
      references: [modifiers.id],
    }),
  }),
);
export const ordersRelations = relations(orders, ({ many }) => ({
  orderItems: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  item: one(items, { fields: [orderItems.itemId], references: [items.id] }),
  modifiers: many(orderItemModifiers),
}));
export const orderItemModifiersRelations = relations(
  orderItemModifiers,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemModifiers.orderItemId],
      references: [orderItems.id],
    }),
    modifierOption: one(modifierOptions, {
      fields: [orderItemModifiers.modifierOptionId],
      references: [modifierOptions.id],
    }),
  }),
);
export const promotionsRelations = relations(promotions, ({ many }) => ({
  promotionItems: many(promotionItems),
}));
