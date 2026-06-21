
"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────────
type PromoType = "percent" | "fixed" | "item" | "buy_x_get_y" | "bundle";
type Item = { id: number; name: string };
type Promotion = {
  id: number; name: string; description: string; type: PromoType;
  value: number; startAt: string; endAt: string; minOrderTotal: number;
  isActive: boolean; promotionCode: string | null;
  triggerQty: number; rewardQty: number;
  triggerItemIds: number[]; rewardItemIds: number[];
  appliesTo: string; linkedItems: Item[];
};

// ─── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  name:           z.string().min(1,"Name required"),
  description:    z.string().default(""),
  type:           z.enum(["percent","fixed","item","buy_x_get_y","bundle"]),
  value:          z.coerce.number().int().min(0),
  startAt:        z.string().min(1,"Start date required"),
  endAt:          z.string().min(1,"End date required"),
  minOrderTotal:  z.coerce.number().int().min(0).default(0),
  isActive:       z.boolean().default(true),
  promotionCode:  z.string().max(50).default(""),
  itemIds:        z.array(z.number()).default([]),
  triggerQty:     z.coerce.number().int().min(1).default(1),
  rewardQty:      z.coerce.number().int().min(1).default(1),
  triggerItemIds: z.array(z.number()).default([]),
  rewardItemIds:  z.array(z.number()).default([]),
  appliesTo:      z.enum(["order","trigger_items","reward_items"]).default("order"),
});
type FormData = z.infer<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<PromoType, { label: string; color: string; icon: string; desc: string }> = {
  percent:     { label:"% Off",         color:"bg-blue-100 text-blue-800",   icon:"🏷️",  desc:"Percentage discount off items or the whole order" },
  fixed:       { label:"$ Off",         color:"bg-green-100 text-green-800", icon:"💵",  desc:"Fixed dollar amount off the order" },
  item:        { label:"Item Deal",     color:"bg-purple-100 text-purple-800",icon:"🛒", desc:"Discount on specific menu items" },
  buy_x_get_y: { label:"Buy X Get Y",   color:"bg-orange-100 text-orange-800",icon:"🎁", desc:"Buy X items → get Y items free or discounted" },
  bundle:      { label:"Bundle Deal",   color:"bg-rose-100 text-rose-800",   icon:"📦",  desc:"Select items from a bundle set for a group discount" },
};

function valueLabel(p: Promotion) {
  if (p.type === "percent") return `${p.value}% off`;
  if (p.type === "fixed")   return `$${(p.value/100).toFixed(2)} off`;
  if (p.type === "buy_x_get_y") {
    const disc = p.value === 100 ? "FREE" : p.value > 0 ? `${p.value}% off` : "discount";
    return `Buy ${p.triggerQty} → ${p.rewardQty} ${disc}`;
  }
  if (p.type === "bundle") return `${p.value}% off bundle`;
  return `${p.value}% off`;
}

function isExpired(p: Promotion) { return new Date(p.endAt) < new Date(); }
function isScheduled(p: Promotion) { return new Date(p.startAt) > new Date(); }

function StatusBadge({ p }: { p: Promotion }) {
  if (!p.isActive)     return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>;
  if (isExpired(p))    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Expired</span>;
  if (isScheduled(p))  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Scheduled</span>;
  return                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">● Live</span>;
}

// Multi-select pill component
function ItemPicker({ label, selectedIds, onChange, items, color = "blue" }:
  { label: string; selectedIds: number[]; onChange: (ids: number[]) => void; items: Item[]; color?: string }) {
  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  }
  const colorMap: Record<string, string> = {
    blue:   "bg-blue-600 border-blue-600 text-white",
    orange: "bg-orange-500 border-orange-500 text-white",
    rose:   "bg-rose-500 border-rose-500 text-white",
    green:  "bg-green-600 border-green-600 text-white",
  };
  const activeClass = colorMap[color] ?? colorMap.blue;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-600">{label} {selectedIds.length > 0 && <span className="text-gray-400">({selectedIds.length} selected)</span>}</p>
      {items.length === 0
        ? <p className="text-xs text-gray-400 italic">No items — add menu items first</p>
        : <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
          {items.map(item => {
            const on = selectedIds.includes(item.id);
            return (
              <button key={item.id} type="button" onClick={() => toggle(item.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${on ? activeClass : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                {on ? "✓ " : ""}{item.name}
              </button>
            );
          })}
        </div>
      }
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [promos,    setPromos]    = useState<Promotion[]>([]);
  const [allItems,  setAllItems]  = useState<Item[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Promotion | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterType,setFilterType]= useState("all");
  const [expandedId,setExpandedId]= useState<number | null>(null);

  const { register, control, handleSubmit, reset, watch,
    setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "percent", isActive: true, value: 10,
      triggerQty: 1, rewardQty: 1, appliesTo: "order",
      itemIds: [], triggerItemIds: [], rewardItemIds: [],
    },
  });

  const watchedType = watch("type");
  const watchedValue = watch("value");
  const watchedTriggerQty = watch("triggerQty");
  const watchedRewardQty  = watch("rewardQty");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/promotions");
      const json = await res.json();
      setPromos(json.data?.promotions ?? []);
      setAllItems(json.data?.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onSubmit(data: FormData) {
    setFormError(null);
    const payload = {
      ...data,
      promotionCode: data.promotionCode?.trim() || null,
      startAt: new Date(data.startAt).toISOString(),
      endAt:   new Date(data.endAt).toISOString(),
    };
    const url    = editing ? `/api/admin/promotions/${editing.id}` : "/api/admin/promotions";
    const method = editing ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok || !json.success) { setFormError(json.error ?? `Server error ${res.status}`); return; }
    reset(); setEditing(null); setShowForm(false); load();
  }

  function startEdit(p: Promotion) {
    setEditing(p); setFormError(null);
    reset({
      name: p.name, description: p.description, type: p.type,
      value: p.value, minOrderTotal: p.minOrderTotal, isActive: p.isActive,
      promotionCode: p.promotionCode ?? "",
      startAt: p.startAt.slice(0,16), endAt: p.endAt.slice(0,16),
      itemIds: p.linkedItems.map(i => i.id),
      triggerQty: p.triggerQty ?? 1, rewardQty: p.rewardQty ?? 1,
      triggerItemIds: p.triggerItemIds ?? [], rewardItemIds: p.rewardItemIds ?? [],
      appliesTo: (p.appliesTo ?? "order") as FormData["appliesTo"],
    });
    setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePromo(id: number) {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleActive(p: Promotion) {
    await fetch(`/api/admin/promotions/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  function cancelForm() { reset(); setEditing(null); setShowForm(false); setFormError(null); }

  const filtered = promos.filter(p => filterType === "all" || p.type === filterType);
  const live    = promos.filter(p => p.isActive && !isExpired(p) && !isScheduled(p)).length;
  const expired = promos.filter(p => isExpired(p)).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Code-based, product-triggered, and bundle deals
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); reset(); setFormError(null); setShowForm(true); window.scrollTo({ top:0, behavior:"smooth" }); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            + New Promotion
          </button>
        )}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Live now",  value: live,    color: "text-green-600" },
            { label: "Scheduled", value: promos.filter(p => p.isActive && isScheduled(p)).length, color: "text-yellow-600" },
            { label: "Expired",   value: expired, color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? `Editing: ${editing.name}` : "New Promotion"}
          </h2>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Error:</strong> {formError}
            </div>
          )}

          {/* ── Type selector — big tiles ── */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Promotion Type *</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.entries(TYPE_META) as [PromoType, typeof TYPE_META[PromoType]][]).map(([t, meta]) => (
                <button key={t} type="button" onClick={() => setValue("type", t)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition ${watchedType === t ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                  <span className="text-2xl">{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5 italic">{TYPE_META[watchedType]?.desc}</p>
          </div>

          {/* ── Base fields ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Promotion Name *</span>
              <input {...register("name")} placeholder='e.g. "Summer Sub Deal"'
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Description</span>
              <input {...register("description")} placeholder="Shown to customer at checkout"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>

          {/* ── Value + trigger fields (type-dependent) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Value */}
            {watchedType !== "buy_x_get_y" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">
                  {watchedType === "fixed" ? "Amount Off (cents)" : "Discount %"}
                </span>
                <div className="relative">
                  <input type="number" {...register("value")} placeholder={watchedType === "fixed" ? "500 = $5.00" : "10"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {watchedType === "fixed" ? "¢" : "%"}
                  </span>
                </div>
              </label>
            )}

            {/* BuyXGetY: trigger qty */}
            {(watchedType === "buy_x_get_y") && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-gray-700">Buy (trigger qty)</span>
                  <input type="number" min={1} {...register("triggerQty")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-xs text-gray-400">Customer must buy this many</span>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-gray-700">Get (reward qty)</span>
                  <input type="number" min={1} {...register("rewardQty")}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-xs text-gray-400">Reward items that get discounted</span>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-gray-700">Reward Discount %</span>
                  <div className="relative">
                    <input type="number" min={0} max={100} {...register("value")} placeholder="100 = FREE"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  <span className="text-xs text-gray-400">100 = completely free</span>
                </label>
              </>
            )}

            {/* Min order */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Min Order Total (cents)</span>
              <input type="number" {...register("minOrderTotal")} placeholder="0 = no minimum"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-gray-400">500 = min $5.00 order</span>
            </label>
          </div>

          {/* ── Promo code ── */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Promo Code</p>
              <span className="text-xs text-gray-400">Leave blank → auto-applies at checkout</span>
            </div>
            <div className="flex gap-3 items-center">
              <input {...register("promotionCode")} placeholder="e.g. SAVE10, HALFOFF"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase w-48 bg-white" />
              <p className="text-xs text-gray-500">
                {watch("promotionCode") ? "🔒 Customer must enter this code" : "✨ Auto-applied — no code needed"}
              </p>
            </div>
          </div>

          {/* ── Item selectors (type-dependent) ── */}
          {(watchedType === "percent" || watchedType === "fixed" || watchedType === "item") && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
              <Controller name="itemIds" control={control}
                render={({ field }) => (
                  <ItemPicker
                    label={watchedType === "item" ? "Items that get the discount (required)" : "Limit to specific items (leave empty = whole order)"}
                    selectedIds={field.value} onChange={field.onChange} items={allItems} color="blue" />
                )}/>
            </div>
          )}

          {watchedType === "buy_x_get_y" && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Buy X Get Y Configuration
                <span className="ml-2 text-xs font-normal text-gray-400">
                  Buy {watchedTriggerQty ?? 1} → get {watchedRewardQty ?? 1} at {watchedValue === 100 ? "FREE" : `${watchedValue}% off`}
                </span>
              </p>
              <Controller name="triggerItemIds" control={control}
                render={({ field }) => (
                  <ItemPicker
                    label="Trigger items — customer must buy these (leave empty = any item qualifies)"
                    selectedIds={field.value} onChange={field.onChange} items={allItems} color="orange" />
                )}/>
              <Controller name="rewardItemIds" control={control}
                render={({ field }) => (
                  <ItemPicker
                    label="Reward items — these get the discount (leave empty = cheapest qualifying item)"
                    selectedIds={field.value} onChange={field.onChange} items={allItems} color="green" />
                )}/>
              <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
                💡 Example: Select "Half Sub" as trigger (qty 1) + "Roll Sub" as reward (qty 1) at 100% off → buy any Half Sub, get a Roll Sub free.
              </div>
            </div>
          )}

          {watchedType === "bundle" && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
              <Controller name="itemIds" control={control}
                render={({ field }) => (
                  <ItemPicker
                    label="Bundle items — discount applies when customer has ≥2 of these in cart"
                    selectedIds={field.value} onChange={field.onChange} items={allItems} color="rose" />
                )}/>
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-xs text-rose-700">
                💡 Example: Add "Half Sub" + "Drink" + "Chips" → {watchedValue}% off when all 3 are in cart.
              </div>
            </div>
          )}

          {/* ── Dates + active ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Start Date *</span>
              <input type="datetime-local" {...register("startAt")}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.startAt && <span className="text-red-500 text-xs">{errors.startAt.message}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">End Date *</span>
              <input type="datetime-local" {...register("endAt")}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.endAt && <span className="text-red-500 text-xs">{errors.endAt.message}</span>}
            </label>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("isActive")} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-gray-700 font-medium">Active</span>
              </label>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition">
              {isSubmitting ? "Saving…" : editing ? "Update Promotion" : "Create Promotion"}
            </button>
            <button type="button" onClick={cancelForm}
              className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-1.5">
        {[["all","All"], ...Object.entries(TYPE_META).map(([t,m]) => [t, m.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterType(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterType === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="font-medium text-gray-600">No promotions yet</p>
          <p className="text-sm mt-1">Create code-based, product, or bundle deals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const meta = TYPE_META[p.type];
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${!p.isActive || isExpired(p) ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-2xl mt-0.5 shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <StatusBadge p={p} />
                      {p.promotionCode && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-semibold">
                          🔑 {p.promotionCode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{valueLabel(p)}</p>
                    {p.description && <p className="text-xs text-gray-400">{p.description}</p>}

                    {/* Linked items preview */}
                    {p.linkedItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs text-gray-400 shrink-0">On:</span>
                        {p.linkedItems.map(item => (
                          <span key={item.id} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{item.name}</span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      {new Date(p.startAt).toLocaleDateString()} → {new Date(p.endAt).toLocaleDateString()}
                      {p.minOrderTotal > 0 && ` · min $${(p.minOrderTotal/100).toFixed(2)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-50 transition">
                      {isExpanded ? "▲" : "▼"}
                    </button>
                    <button onClick={() => toggleActive(p)}
                      className={`text-xs px-2 py-1 rounded transition ${p.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                      title={p.isActive ? "Deactivate" : "Activate"}>
                      {p.isActive ? "⏸" : "▶"}
                    </button>
                    <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 transition">Edit</button>
                    <button onClick={() => deletePromo(p.id)} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition">Delete</button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs space-y-2 text-gray-600">
                    {p.type === "buy_x_get_y" && (
                      <div className="space-y-1">
                        <p><strong>Buy:</strong> {p.triggerQty} item{p.triggerQty > 1 ? "s" : ""} {p.triggerItemIds?.length ? `from: ${p.triggerItemIds.map(id => allItems.find(i=>i.id===id)?.name ?? `#${id}`).join(", ")}` : "(any item)"}</p>
                        <p><strong>Get:</strong> {p.rewardQty} item{p.rewardQty > 1 ? "s" : ""} {p.rewardItemIds?.length ? `from: ${p.rewardItemIds.map(id => allItems.find(i=>i.id===id)?.name ?? `#${id}`).join(", ")}` : "(cheapest qualifying)"} at {p.value === 100 ? "FREE" : `${p.value}% off`}</p>
                      </div>
                    )}
                    {p.type === "bundle" && (
                      <p><strong>Bundle items:</strong> {p.linkedItems.map(i=>i.name).join(", ") || "None set"}</p>
                    )}
                    <p><strong>Applies to:</strong> {p.appliesTo === "order" ? "Whole order" : p.appliesTo === "trigger_items" ? "Trigger items only" : "Reward items only"}</p>
                    <p><strong>Code required:</strong> {p.promotionCode ? `Yes — ${p.promotionCode}` : "No (auto-applied)"}</p>
                    {p.minOrderTotal > 0 && <p><strong>Min order:</strong> ${(p.minOrderTotal/100).toFixed(2)}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
