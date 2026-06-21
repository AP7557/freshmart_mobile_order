'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type ModifierOption = {
  id: number;
  name: string;
  priceDelta: number;
  isDefault: boolean;
};
type AssignedItem = { id: number; name: string };
type Modifier = {
  id: number;
  name: string;
  category: string;
  type: 'single' | 'multiple';
  required: boolean;
  maxChoices: number | null;
  sortOrder: number;
  options: ModifierOption[];
  assignedItems: AssignedItem[];
};
type Item = { id: number; name: string };

const CATEGORIES = [
  'Bread / Base',
  'Protein',
  'Cheese',
  'Vegetables',
  'Sauce / Dressing',
  'Spice Level',
  'Extras / Add-ons',
  'Temperature',
  'Other',
] as const;

const CATEGORY_COLOURS: Record<string, string> = {
  'Bread / Base': 'bg-amber-100 text-amber-800',
  Protein: 'bg-red-100 text-red-800',
  Cheese: 'bg-yellow-100 text-yellow-800',
  Vegetables: 'bg-green-100 text-green-800',
  'Sauce / Dressing': 'bg-orange-100 text-orange-800',
  'Spice Level': 'bg-rose-100 text-rose-800',
  'Extras / Add-ons': 'bg-purple-100 text-purple-800',
  Temperature: 'bg-cyan-100 text-cyan-800',
  Other: 'bg-gray-100 text-gray-700',
};

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(CATEGORIES),
  type: z.enum(['single', 'multiple']),
  required: z.boolean().default(false),
  maxChoices: z.coerce.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        name: z.string().min(1, 'Option name required'),
        priceDelta: z.coerce.number().int().default(0),
        isDefault: z.boolean().default(false),
      }),
    )
    .min(1, 'Add at least one option'),
});
type FormData = z.infer<typeof schema>;

function centsToDisplay(c: number) {
  if (c === 0) return 'Free';
  return `${c > 0 ? '+' : '-'}$${(Math.abs(c) / 100).toFixed(2)}`;
}

export default function ModifiersPage() {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modifier | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'Bread / Base',
      type: 'single',
      required: false,
      sortOrder: 0,
      options: [{ name: '', priceDelta: 0, isDefault: false }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });
  const watchedType = watch('type');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        fetch('/api/admin/modifiers'),
        fetch('/api/admin/items'),
      ]);
      const mJson = await mRes.json();
      const iJson = await iRes.json();
      const mods: Modifier[] = (mJson.data?.modifiers ?? []).map(
        (m: Modifier) => ({
          ...m,
          assignedItems: m.assignedItems ?? [],
          options: (mJson.data?.options ?? []).filter(
            (o: ModifierOption & { modifierId: number }) =>
              o.modifierId === m.id,
          ),
        }),
      );
      mods.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.category.localeCompare(b.category),
      );
      setModifiers(mods);
      setItems(iJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data: FormData) {
    setFormError(null);
    const url = editing
      ? `/api/admin/modifiers/${editing.id}`
      : '/api/admin/modifiers';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setFormError(json.error ?? `Server error ${res.status}`);
      return;
    }
    reset();
    setEditing(null);
    setShowForm(false);
    load();
  }

  function startEdit(mod: Modifier) {
    setEditing(mod);
    setFormError(null);
    reset({
      name: mod.name,
      category: mod.category as FormData['category'],
      type: mod.type,
      required: mod.required,
      maxChoices: mod.maxChoices ?? undefined,
      sortOrder: mod.sortOrder ?? 0,
      options: mod.options.map((o) => ({
        name: o.name,
        priceDelta: o.priceDelta,
        isDefault: o.isDefault,
      })),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteModifier(id: number) {
    if (!confirm('Delete this modifier and all its options?')) return;
    await fetch(`/api/admin/modifiers/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleAssignment(
    modifierId: number,
    itemId: number,
    assigned: boolean,
  ) {
    await fetch(`/api/admin/modifiers/${modifierId}/items`, {
      method: assigned ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    load();
  }

  async function moveModifier(modifierId: number, dir: 'up' | 'down') {
    const mod = modifiers.find((m) => m.id === modifierId);
    if (!mod) return;
    const newOrder =
      dir === 'up'
        ? Math.max(0, (mod.sortOrder ?? 0) - 1)
        : (mod.sortOrder ?? 0) + 1;
    await fetch(`/api/admin/modifiers/${modifierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sortOrder: newOrder }),
    });
    load();
  }

  function cancelForm() {
    reset();
    setEditing(null);
    setShowForm(false);
    setFormError(null);
  }

  const filtered = modifiers.filter(
    (m) =>
      (filterCat === 'All' || m.category === filterCat) &&
      m.name.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped = CATEGORIES.reduce<Record<string, Modifier[]>>((acc, cat) => {
    const list = filtered.filter((m) => m.category === cat);
    if (list.length) acc[cat] = list;
    return acc;
  }, {});

  // ── unassigned modifier count for the warning banner
  const unassigned = modifiers.filter(
    (m) => m.assignedItems.length === 0,
  ).length;

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Modifier Steps</h1>
          <p className='text-sm text-gray-500 mt-0.5'>
            Build sandwich-style steps — Bread → Cheese → Veggies → Sauce →
            Spice
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditing(null);
              reset();
              setFormError(null);
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition'
          >
            + New Modifier Step
          </button>
        )}
      </div>

      {/* Unassigned warning */}
      {!loading && unassigned > 0 && (
        <div className='flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800'>
          <span className='text-lg leading-none mt-0.5'>⚠️</span>
          <div>
            <strong>
              {unassigned} modifier step{unassigned > 1 ? 's' : ''} not assigned
              to any item.
            </strong>
            <span className='text-amber-700'>
              {' '}
              They won&apos;t appear in the customer flow until you assign them
              to at least one menu item.
            </span>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5'
        >
          <h2 className='text-lg font-semibold text-gray-900'>
            {editing ? `Editing: ${editing.name}` : 'New Modifier Step'}
          </h2>
          {formError && (
            <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700'>
              <strong>Error:</strong> {formError}
            </div>
          )}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Step Name *</span>
              <input
                {...register('name')}
                placeholder='e.g. "Choose your bread"'
                className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              {errors.name && (
                <span className='text-red-500 text-xs'>
                  {errors.name.message}
                </span>
              )}
            </label>
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Category *</span>
              <select
                {...register('category')}
                className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Selection Type</span>
              <select
                {...register('type')}
                className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                <option value='single'>Pick one</option>
                <option value='multiple'>Pick multiple</option>
              </select>
            </label>
            {watchedType === 'multiple' && (
              <label className='flex flex-col gap-1 text-sm'>
                <span className='font-medium text-gray-700'>Max Choices</span>
                <input
                  type='number'
                  {...register('maxChoices')}
                  placeholder='blank = unlimited'
                  className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </label>
            )}
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Display Order</span>
              <input
                type='number'
                {...register('sortOrder')}
                placeholder='0 = first'
                className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-xs text-gray-400'>Lower = shown first</span>
            </label>
          </div>
          <label className='flex items-center gap-2 text-sm cursor-pointer'>
            <input
              type='checkbox'
              {...register('required')}
              className='w-4 h-4 rounded border-gray-300 text-blue-600'
            />
            <span className='text-gray-700'>
              <strong>Required step</strong> — customer must choose before
              checkout
            </span>
          </label>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-medium text-gray-700'>
                Options ({fields.length})
              </p>
              <button
                type='button'
                onClick={() =>
                  append({ name: '', priceDelta: 0, isDefault: false })
                }
                className='text-blue-600 text-sm hover:underline font-medium'
              >
                + Add Option
              </button>
            </div>
            <div className='bg-gray-50 rounded-xl p-4 space-y-2'>
              <div className='grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1 pb-1 border-b border-gray-200'>
                <span className='col-span-5'>Option Name</span>
                <span className='col-span-4'>Price (cents)</span>
                <span className='col-span-2 text-center'>Default?</span>
                <span className='col-span-1' />
              </div>
              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className='grid grid-cols-12 gap-2 items-center'
                >
                  <input
                    {...register(`options.${i}.name`)}
                    placeholder='e.g. Wheat Roll'
                    className='col-span-5 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                  />
                  <div className='col-span-4 relative'>
                    <input
                      type='number'
                      {...register(`options.${i}.priceDelta`)}
                      placeholder='0'
                      className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none'>
                      ¢
                    </span>
                  </div>
                  <div className='col-span-2 flex justify-center'>
                    <input
                      type='checkbox'
                      {...register(`options.${i}.isDefault`)}
                      className='w-4 h-4 rounded border-gray-300 text-blue-600'
                    />
                  </div>
                  <div className='col-span-1 flex justify-center'>
                    {fields.length > 1 ? (
                      <button
                        type='button'
                        onClick={() => remove(i)}
                        className='text-red-400 hover:text-red-600 text-lg leading-none'
                      >
                        ×
                      </button>
                    ) : (
                      <span className='w-5' />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className='text-xs text-gray-400'>
              Positive = upcharge (+50¢), negative = discount (-25¢), 0 =
              included.
            </p>
          </div>
          <div className='flex gap-3 pt-2 border-t border-gray-100'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition'
            >
              {isSubmitting
                ? 'Saving…'
                : editing
                  ? 'Update Step'
                  : 'Create Step'}
            </button>
            <button
              type='button'
              onClick={cancelForm}
              className='px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition'
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Filter bar ── */}
      <div className='flex flex-wrap items-center gap-3'>
        <input
          type='search'
          placeholder='Search modifiers…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48'
        />
        <div className='flex flex-wrap gap-1.5'>
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterCat === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='h-16 bg-gray-100 rounded-xl animate-pulse'
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='text-center py-16 text-gray-400'>
          <p className='text-4xl mb-3'>🥪</p>
          <p className='font-medium text-gray-600'>No modifier steps yet</p>
        </div>
      ) : (
        <div className='space-y-8'>
          {Object.entries(grouped).map(([category, mods]) => (
            <div key={category}>
              <div className='flex items-center gap-3 mb-3'>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLOURS[category]}`}
                >
                  {category}
                </span>
                <span className='text-xs text-gray-400'>
                  {mods.length} step{mods.length > 1 ? 's' : ''}
                </span>
                <div className='flex-1 border-t border-gray-100' />
              </div>
              <div className='space-y-3'>
                {mods.map((mod, idx) => {
                  const isExpanded = expandedId === mod.id;
                  const isAssigning = assignTarget === mod.id;
                  const assigned = mod.assignedItems ?? [];
                  const assignedIds = assigned.map((a) => a.id);

                  return (
                    <div
                      key={mod.id}
                      className='bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'
                    >
                      {/* ── Main row ── */}
                      <div className='flex items-start gap-3 px-4 py-3'>
                        {/* Sort arrows */}
                        <div className='flex flex-col gap-0.5 mt-1 shrink-0'>
                          <button
                            onClick={() => moveModifier(mod.id, 'up')}
                            disabled={idx === 0}
                            className='text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none'
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveModifier(mod.id, 'down')}
                            disabled={idx === mods.length - 1}
                            className='text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none'
                          >
                            ▼
                          </button>
                        </div>

                        {/* Step number */}
                        <span className='w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5'>
                          {(mod.sortOrder ?? 0) + 1}
                        </span>

                        {/* Content — takes up all remaining space */}
                        <div className='flex-1 min-w-0 space-y-2'>
                          {/* Name + type badges */}
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-semibold text-gray-900 text-sm'>
                              {mod.name}
                            </span>
                            {mod.required && (
                              <span className='px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium'>
                                Required
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 text-xs rounded font-medium ${mod.type === 'single' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}
                            >
                              {mod.type === 'single'
                                ? 'Pick one'
                                : `Pick ${mod.maxChoices ? `up to ${mod.maxChoices}` : 'multiple'}`}
                            </span>
                          </div>

                          {/* ── Assigned items row — THE KEY ADDITION ── */}
                          <div className='flex flex-wrap items-center gap-1.5'>
                            {assigned.length === 0 ? (
                              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium'>
                                ⚠ Not assigned to any item
                              </span>
                            ) : (
                              <>
                                <span className='text-xs text-gray-400 shrink-0'>
                                  On items:
                                </span>
                                {assigned.map((a) => (
                                  <span
                                    key={a.id}
                                    className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-xs text-green-800 font-medium'
                                  >
                                    ✓ {a.name}
                                    {/* click × to remove just this assignment inline */}
                                    <button
                                      type='button'
                                      onClick={() =>
                                        toggleAssignment(mod.id, a.id, true)
                                      }
                                      className='ml-0.5 text-green-500 hover:text-red-500 transition leading-none'
                                      title={`Remove from ${a.name}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </>
                            )}
                            {/* Assign button — always visible */}
                            <button
                              onClick={() =>
                                setAssignTarget(isAssigning ? null : mod.id)
                              }
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition ${isAssigning ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
                            >
                              {isAssigning ? '▲ Done' : '+ Assign item'}
                            </button>
                          </div>

                          {/* Options summary line */}
                          <p className='text-xs text-gray-400'>
                            {mod.options.length} option
                            {mod.options.length !== 1 ? 's' : ''}
                            {mod.options.filter((o) => o.isDefault).length >
                              0 && (
                              <>
                                {' '}
                                · default:{' '}
                                {mod.options
                                  .filter((o) => o.isDefault)
                                  .map((o) => o.name)
                                  .join(', ')}
                              </>
                            )}
                          </p>
                        </div>

                        {/* Right-side actions */}
                        <div className='flex items-center gap-1 shrink-0'>
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : mod.id)
                            }
                            className='text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-50 transition'
                          >
                            {isExpanded ? '▲ Hide' : '▼ Options'}
                          </button>
                          <button
                            onClick={() => startEdit(mod)}
                            className='text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 transition'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteModifier(mod.id)}
                            className='text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition'
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* ── Expanded options ── */}
                      {isExpanded && (
                        <div className='border-t border-gray-100 bg-gray-50 px-4 py-3'>
                          <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>
                            Options
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {mod.options.map((opt) => (
                              <span
                                key={opt.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${opt.isDefault ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : 'bg-white border-gray-200 text-gray-700'}`}
                              >
                                {opt.isDefault && (
                                  <span className='text-blue-500'>★</span>
                                )}
                                {opt.name}
                                {opt.priceDelta !== 0 && (
                                  <span
                                    className={`font-medium ${opt.priceDelta > 0 ? 'text-green-600' : 'text-orange-600'}`}
                                  >
                                    {centsToDisplay(opt.priceDelta)}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Item assignment panel ── */}
                      {isAssigning && (
                        <div className='border-t border-blue-100 bg-blue-50 px-4 py-3'>
                          <p className='text-xs font-semibold text-gray-600 mb-2'>
                            Toggle items — this step shows up when customer
                            picks these items:
                          </p>
                          {items.length === 0 ? (
                            <p className='text-xs text-gray-400'>
                              No menu items yet. Add items first.
                            </p>
                          ) : (
                            <div className='flex flex-wrap gap-2'>
                              {items.map((item) => {
                                const isOn = assignedIds.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() =>
                                      toggleAssignment(mod.id, item.id, isOn)
                                    }
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${isOn ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}
                                  >
                                    {isOn ? '✓ ' : ''}
                                    {item.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Customer flow preview ── */}
      {modifiers.length > 0 && (
        <div className='mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5'>
          <p className='text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3'>
            📱 Customer Step Preview
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            {modifiers.map((m, i) => (
              <div key={m.id} className='flex items-center gap-2'>
                <div className='flex flex-col items-center'>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${m.required ? 'bg-white border-blue-300 text-blue-800 shadow-sm' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    <span className='text-gray-400 mr-1'>{i + 1}.</span>
                    {m.name}
                  </div>
                  {m.assignedItems.length === 0 && (
                    <span className='text-amber-500 text-xs mt-0.5'>
                      unassigned
                    </span>
                  )}
                </div>
                {i < modifiers.length - 1 && (
                  <span className='text-gray-300 text-lg'>→</span>
                )}
              </div>
            ))}
            <span className='text-gray-300 text-lg'>→</span>
            <div className='px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium'>
              🛒 Checkout
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
