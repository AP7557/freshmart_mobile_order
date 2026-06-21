"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  type: z.enum(["percent", "fixed", "item"]),
  value: z.coerce.number().int().min(0),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  minOrderTotal: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  promotionCode: z.string().max(50).or(z.literal("")).default(""),
});
type FormData = z.infer<typeof schema>;
type Promotion = FormData & { id: number };

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, type: "percent", description: "" },
  });

  async function load() {
    const res = await fetch("/api/admin/promotions");
    const json = await res.json();
    setPromos(json.data?.promotions ?? []);
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(data: FormData) {
    await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, promotionCode: data.promotionCode || null, itemIds: [] }),
    });
    reset();
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promotions</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
          + Add Promotion
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h2 className="col-span-full text-lg font-semibold">New Promotion</h2>
          <label className="flex flex-col gap-1 text-sm">
            Name *
            <input {...register("name")} className="input" />
            {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Type *
            <select {...register("type")} className="input">
              <option value="percent">Percent Off</option>
              <option value="fixed">Fixed Amount Off</option>
              <option value="item">Item Discount</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Value (% or cents) *
            <input type="number" {...register("value")} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Min Order Total (cents)
            <input type="number" {...register("minOrderTotal")} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Start Date *
            <input type="datetime-local" {...register("startAt")} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            End Date *
            <input type="datetime-local" {...register("endAt")} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Promo Code (optional)
            <input {...register("promotionCode")} className="input" placeholder="SAVE10" />
          </label>
          <label className="flex items-center gap-2 text-sm self-end">
            <input type="checkbox" {...register("isActive")} />
            Active
          </label>
          <div className="col-span-full flex gap-3">
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {promos.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 capitalize">{p.type}</td>
                <td className="px-4 py-3">{p.type === "percent" ? `${p.value}%` : `$${(p.value / 100).toFixed(2)}`}</td>
                <td className="px-4 py-3">{p.promotionCode ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
