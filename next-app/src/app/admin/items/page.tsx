'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  basePrice: z.coerce.number().int().min(0),
  imageUrl: z.string().url().or(z.literal('')),
  isActive: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

type Item = FormData & { id: number; createdAt: string };

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, description: '', imageUrl: '' },
  });
  const watchedImageUrl = watch('imageUrl');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/items');
    const json = await res.json();
    setItems(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(data: FormData) {
    const url = editing ? `/api/admin/items/${editing.id}` : '/api/admin/items';
    const method = editing ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    reset();
    setEditing(null);
    setShowForm(false);
    load();
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/admin/items/${id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(item: Item) {
    setEditing(item);
    reset(item);
    setShowForm(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error);
        return;
      }
      setValue('imageUrl', json.data.url, { shouldValidate: true });
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Items</h1>
        <button
          onClick={() => {
            setEditing(null);
            reset({ isActive: true, description: '', imageUrl: '' });
            setShowForm(true);
          }}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm'
        >
          + Add Item
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4'
        >
          <h2 className='col-span-full text-lg font-semibold'>
            {editing ? 'Edit Item' : 'New Item'}
          </h2>
          <label className='flex flex-col gap-1 text-sm'>
            Name *
            <input {...register('name')} className='input' />
            {errors.name && (
              <span className='text-red-500 text-xs'>
                {errors.name.message}
              </span>
            )}
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Price (cents) *
            <input type='number' {...register('basePrice')} className='input' />
            {errors.basePrice && (
              <span className='text-red-500 text-xs'>
                {errors.basePrice.message}
              </span>
            )}
          </label>
          <label className='flex flex-col gap-1 text-sm col-span-full'>
            Description
            <textarea {...register('description')} rows={3} className='input' />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Image
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp,image/avif'
              onChange={handleFileChange}
              disabled={uploading}
              className='input'
            />
            {uploading && (
              <span className='text-xs text-gray-500'>Uploading…</span>
            )}
            {watchedImageUrl && (
              <img
                src={watchedImageUrl}
                alt='Preview'
                className='mt-2 w-24 h-24 object-cover rounded-lg border'
              />
            )}
            {/* keep hidden input so react-hook-form tracks the value */}
            <input type='hidden' {...register('imageUrl')} />
          </label>
          <label className='flex items-center gap-2 text-sm self-end'>
            <input type='checkbox' {...register('isActive')} />
            Active
          </label>
          <div className='col-span-full flex gap-3'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50'
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type='button'
              onClick={() => setShowForm(false)}
              className='px-4 py-2 border rounded-lg text-sm'
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className='text-gray-500'>Loading…</p>
      ) : (
        <div className='bg-white rounded-xl shadow overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50 text-left'>
              <tr>
                <th className='px-4 py-3 font-medium'>Name</th>
                <th className='px-4 py-3 font-medium'>Price</th>
                <th className='px-4 py-3 font-medium'>Status</th>
                <th className='px-4 py-3 font-medium'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className='px-4 py-3'>{item.name}</td>
                  <td className='px-4 py-3'>
                    ${(item.basePrice / 100).toFixed(2)}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className='px-4 py-3 flex gap-2'>
                    <button
                      onClick={() => startEdit(item)}
                      className='text-blue-600 hover:underline'
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className='text-red-600 hover:underline'
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
