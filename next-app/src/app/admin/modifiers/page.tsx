'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModifierOption = {
  id: number;
  name: string;
  priceDelta: number;
  isDefault: boolean;
};

type Modifier = {
  id: number;
  name: string;
  category: string;
  type: 'single' | 'multiple';
  required: boolean;
  maxChoices: number | null;
  sortOrder: number;
  options: ModifierOption[];
};

type Item = {
  id: number;
  name: string;
  modifiers: Array<{ modifierId: number; sortOrder: number }>;
};

// ─── Zod schema ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Bread / Base',
  'Protein',
  'Cheese',
  'Vegetables',
  'Sauce / Dressing',
  'Spice Level',
  'Extras / Add-ons',
  'Size',
  'Temperature',
  'Other',
] as const;

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

// ─── Category badge colours ───────────────────────────────────────────────────

const CATEGORY_COLOURS: Record<string, string> = {
  'Bread / Base': 'bg-amber-100 text-amber-800',
  Protein: 'bg-red-100 text-red-800',
  Cheese: 'bg-yellow-100 text-yellow-800',
  Vegetables: 'bg-green-100 text-green-800',
  'Sauce / Dressing': 'bg-orange-100 text-orange-800',
  'Spice Level': 'bg-rose-100 text-rose-800',
  'Extras / Add-ons': 'bg-purple-100 text-purple-800',
  Size: 'bg-blue-100 text-blue-800',
  Temperature: 'bg-cyan-100 text-cyan-800',
  Other: 'bg-gray-100 text-gray-700',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number) {
  if (cents === 0) return 'Free';
  const sign = cents > 0 ? '+' : '-';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModifiersPage() {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Modifier | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState<number | null>(null); // modifier id being assigned
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

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

  // ── Data fetching ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modRes, itemRes] = await Promise.all([
        fetch('/api/admin/modifiers'),
        fetch('/api/admin/items'),
      ]);
      const modJson = await modRes.json();
      const itemJson = await itemRes.json();

      // Build full modifier objects with their options
      const mods: Modifier[] = (modJson.data?.modifiers ?? []).map(
        (m: Modifier) => ({
          ...m,
          options: (modJson.data?.options ?? []).filter(
            (o: ModifierOption & { modifierId: number }) =>
              o.modifierId === m.id,
          ),
        }),
      );
      mods.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.category.localeCompare(b.category),
      );
      setModifiers(mods);

      // Items with their modifier assignments
      setItems(
        (itemJson.data ?? []).map((item: Item) => ({
          ...item,
          modifiers: item.modifiers ?? [],
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Form submit ────────────────────────────────────────────────────────────

  async function onSubmit(data: FormData) {
    const url = editing
      ? `/api/admin/modifiers/${editing.id}`
      : '/api/admin/modifiers';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      reset();
      setEditing(null);
      setShowForm(false);
      load();
    } else {
      const json = await res.json();
      alert(json.error ?? 'Save failed');
    }
  }

  function startEdit(mod: Modifier) {
    setEditing(mod);
    reset({
      name: mod.name,
      category: mod.category as FormData['category'],
      type: mod.type,
      required: mod.required,
      maxChoices: mod.maxChoices ?? undefined,
      sortOrder: mod.sortOrder,
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

  // ── Item assignment ────────────────────────────────────────────────────────

  async function toggleItemAssignment(
    modifierId: number,
    itemId: number,
    currentlyAssigned: boolean,
  ) {
    await fetch(`/api/admin/modifiers/${modifierId}/items`, {
      method: currentlyAssigned ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    load();
  }

  // ── Reorder sort order ─────────────────────────────────────────────────────

  async function moveModifier(modifierId: number, direction: 'up' | 'down') {
    const mod = modifiers.find((m) => m.id === modifierId);
    if (!mod) return;
    const newOrder =
      direction === 'up' ? Math.max(0, mod.sortOrder - 1) : mod.sortOrder + 1;
    await fetch(`/api/admin/modifiers/${modifierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sortOrder: newOrder }),
    });
    load();
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = modifiers.filter((m) => {
    const matchCategory =
      filterCategory === 'All' || m.category === filterCategory;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const grouped = CATEGORIES.reduce<Record<string, Modifier[]>>((acc, cat) => {
    const list = filtered.filter((m) => m.category === cat);
    if (list.length) acc[cat] = list;
    return acc;
  }, {});

  const allCategories = ['All', ...CATEGORIES];

  // ── Cancel form ────────────────────────────────────────────────────────────

  function cancelForm() {
    reset();
    setEditing(null);
    setShowForm(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

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
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition'
          >
            + New Modifier Step
          </button>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5'
        >
          <h2 className='text-lg font-semibold text-gray-900'>
            {editing ? `Editing: ${editing.name}` : 'New Modifier Step'}
          </h2>

          {/* Row 1: name + category */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Step Name *</span>
              <input
                {...register('name')}
                placeholder='e.g. "Choose your bread"'
                className='input border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                className='input border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Row 2: type + required + sort order */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Selection Type</span>
              <select
                {...register('type')}
                className='input border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                <option value='single'>Pick one (e.g. bread type)</option>
                <option value='multiple'>Pick multiple (e.g. toppings)</option>
              </select>
            </label>

            {watchedType === 'multiple' && (
              <label className='flex flex-col gap-1 text-sm'>
                <span className='font-medium text-gray-700'>Max Choices</span>
                <input
                  type='number'
                  {...register('maxChoices')}
                  placeholder='Leave blank for unlimited'
                  className='input border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </label>
            )}

            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium text-gray-700'>Display Order</span>
              <input
                type='number'
                {...register('sortOrder')}
                placeholder='0 = first'
                className='input border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-xs text-gray-400'>
                Lower = shown first to customer
              </span>
            </label>
          </div>

          {/* Required checkbox */}
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

          {/* Options */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-medium text-gray-700'>
                Options{' '}
                <span className='text-gray-400 font-normal'>
                  ({fields.length} {fields.length === 1 ? 'option' : 'options'})
                </span>
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
              {/* Header row */}
              <div className='grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1 pb-1 border-b border-gray-200'>
                <span className='col-span-5'>Option Name</span>
                <span className='col-span-4'>Price Adjustment (cents)</span>
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
                    placeholder='e.g. Wheat Roll, American Cheese…'
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
                        className='text-red-400 hover:text-red-600 text-lg leading-none transition'
                        title='Remove option'
                      >
                        ×
                      </button>
                    ) : (
                      <span className='w-5' />
                    )}
                  </div>
                </div>
              ))}

              {errors.options && (
                <p className='text-red-500 text-xs mt-1'>
                  {errors.options.message ?? 'Fix option errors above'}
                </p>
              )}
            </div>

            <p className='text-xs text-gray-400'>
              Price adjustment: use positive cents for upcharge (+50 = +$0.50),
              negative for discount (-25 = -$0.25), 0 for included.
            </p>
          </div>

          {/* Actions */}
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

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className='flex flex-wrap items-center gap-3'>
        <input
          type='search'
          placeholder='Search modifiers…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48'
        />
        <div className='flex flex-wrap gap-1.5'>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────── */}
      {!loading && (
        <div className='flex flex-wrap gap-4 text-sm text-gray-500'>
          <span>{modifiers.length} total modifier steps</span>
          <span>·</span>
          {CATEGORIES.map((cat) => {
            const count = modifiers.filter((m) => m.category === cat).length;
            if (!count) return null;
            return (
              <span key={cat}>
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1 ${CATEGORY_COLOURS[cat]?.replace(/text-\S+/g, '').replace('bg-', 'bg-')}`}
                />
                {cat}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Modifier list grouped by category ──────────────────────────── */}
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
          <p className='text-sm mt-1'>
            Create steps like "Choose your bread", "Add toppings", etc.
          </p>
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
                  const assignedItemIds = items
                    .filter((item) =>
                      item.modifiers?.some((m) => m.modifierId === mod.id),
                    )
                    .map((item) => item.id);

                  return (
                    <div
                      key={mod.id}
                      className='bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'
                    >
                      {/* Modifier header row */}
                      <div className='flex items-center gap-3 px-4 py-3'>
                        {/* Sort order controls */}
                        <div className='flex flex-col gap-0.5'>
                          <button
                            onClick={() => moveModifier(mod.id, 'up')}
                            disabled={idx === 0}
                            className='text-gray-300 hover:text-gray-600 disabled:opacity-20 transition text-xs leading-none'
                            title='Move up'
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveModifier(mod.id, 'down')}
                            disabled={idx === mods.length - 1}
                            className='text-gray-300 hover:text-gray-600 disabled:opacity-20 transition text-xs leading-none'
                            title='Move down'
                          >
                            ▼
                          </button>
                        </div>

                        {/* Step number pill */}
                        <span className='w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0'>
                          {mod.sortOrder + 1}
                        </span>

                        {/* Name + meta */}
                        <div className='flex-1 min-w-0'>
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
                              className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                                mod.type === 'single'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-indigo-50 text-indigo-700'
                              }`}
                            >
                              {mod.type === 'single'
                                ? 'Pick one'
                                : `Pick ${mod.maxChoices ? `up to ${mod.maxChoices}` : 'multiple'}`}
                            </span>
                          </div>
                          <p className='text-xs text-gray-400 mt-0.5'>
                            {mod.options.length} option
                            {mod.options.length !== 1 ? 's' : ''}
                            {mod.options.filter((o) => o.isDefault).length >
                              0 && (
                              <>
                                {' '}
                                · defaults:{' '}
                                {mod.options
                                  .filter((o) => o.isDefault)
                                  .map((o) => o.name)
                                  .join(', ')}
                              </>
                            )}
                          </p>
                        </div>

                        {/* Item assignment count */}
                        <button
                          onClick={() =>
                            setAssignTarget(
                              assignTarget === mod.id ? null : mod.id,
                            )
                          }
                          className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                            assignedItemIds.length > 0
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                          title='Assign to menu items'
                        >
                          {assignedItemIds.length > 0
                            ? `${assignedItemIds.length} item${assignedItemIds.length > 1 ? 's' : ''}`
                            : 'Assign items'}
                        </button>

                        {/* Expand options */}
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : mod.id)
                          }
                          className='text-gray-400 hover:text-gray-600 text-xs transition px-2 py-1 rounded hover:bg-gray-50'
                        >
                          {isExpanded ? '▲ Hide' : '▼ Options'}
                        </button>

                        {/* Edit / delete */}
                        <div className='flex gap-1'>
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

                      {/* Expanded options list */}
                      {isExpanded && (
                        <div className='border-t border-gray-100 bg-gray-50 px-4 py-3'>
                          <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>
                            Options
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {mod.options.map((opt) => (
                              <span
                                key={opt.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                                  opt.isDefault
                                    ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
                                    : 'bg-white border-gray-200 text-gray-700'
                                }`}
                              >
                                {opt.isDefault && (
                                  <span className='text-blue-500 text-xs'>
                                    ★
                                  </span>
                                )}
                                {opt.name}
                                {opt.priceDelta !== 0 && (
                                  <span
                                    className={`ml-0.5 font-medium ${opt.priceDelta > 0 ? 'text-green-600' : 'text-orange-600'}`}
                                  >
                                    {centsToDisplay(opt.priceDelta)}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Item assignment panel */}
                      {assignTarget === mod.id && (
                        <div className='border-t border-gray-100 bg-blue-50 px-4 py-3'>
                          <p className='text-xs font-semibold text-gray-600 mb-2'>
                            Assign to menu items — this step will appear when
                            customer selects these items:
                          </p>
                          {items.length === 0 ? (
                            <p className='text-xs text-gray-400'>
                              No menu items yet. Add items first.
                            </p>
                          ) : (
                            <div className='flex flex-wrap gap-2'>
                              {items.map((item) => {
                                const assigned = assignedItemIds.includes(
                                  item.id,
                                );
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() =>
                                      toggleItemAssignment(
                                        mod.id,
                                        item.id,
                                        assigned,
                                      )
                                    }
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                                      assigned
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'
                                    }`}
                                  >
                                    {assigned ? '✓ ' : ''}
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

      {/* ── Customer preview strip ──────────────────────────────────────── */}
      {modifiers.length > 0 && (
        <div className='mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5'>
          <p className='text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3'>
            📱 Customer Step Preview (mobile order flow)
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            {modifiers.map((m, i) => (
              <div key={m.id} className='flex items-center gap-2'>
                <div className='flex flex-col items-center'>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      m.required
                        ? 'bg-white border-blue-300 text-blue-800 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className='text-gray-400 mr-1'>{i + 1}.</span>
                    {m.name}
                  </div>
                  {m.required && (
                    <span className='text-red-500 text-xs mt-0.5'>
                      required
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
