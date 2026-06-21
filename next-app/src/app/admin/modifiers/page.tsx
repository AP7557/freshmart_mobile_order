"use client";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["single", "multiple"]),
  required: z.boolean().default(false),
  maxChoices: z.coerce.number().int().positive().nullable().optional(),
  options: z.array(z.object({
    name: z.string().min(1),
    priceDelta: z.coerce.number().int().default(0),
    isDefault: z.boolean().default(false),
  })).min(1),
});
type FormData = z.infer<typeof schema>;

export default function ModifiersPage() {
  const [modifiers, setModifiers] = useState<Array<{ id: number; name: string; type: string; required: boolean }>>([]);
  const [showForm, setShowForm] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "single", required: false, options: [{ name: "", priceDelta: 0, isDefault: false }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "options" });

  async function load() {
    const res = await fetch("/api/admin/modifiers");
    const json = await res.json();
    setModifiers(json.data?.modifiers ?? []);
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(data: FormData) {
    await fetch("/api/admin/modifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reset();
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Modifiers</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Add Modifier</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">New Modifier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Name *
              <input {...register("name")} className="input" />
              {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Type
              <select {...register("type")} className="input">
                <option value="single">Single choice</option>
                <option value="multiple">Multiple choices</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("required")} />
              Required
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Options</p>
              <button type="button" onClick={() => append({ name: "", priceDelta: 0, isDefault: false })} className="text-blue-600 text-sm hover:underline">+ Add Option</button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-center">
                <input {...register(`options.${i}.name`)} placeholder="Option name" className="input flex-1" />
                <input type="number" {...register(`options.${i}.priceDelta`)} placeholder="Price delta (cents)" className="input w-36" />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input type="checkbox" {...register(`options.${i}.isDefault`)} /> Default
                </label>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-red-500 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
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
              <th className="px-4 py-3">Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {modifiers.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3 capitalize">{m.type}</td>
                <td className="px-4 py-3">{m.required ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
