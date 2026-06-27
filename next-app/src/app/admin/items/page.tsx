'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  basePrice: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ error: 'Price required' }).int().min(0),
  ),
  imageUrl: z.union([z.url(), z.literal('')]).default(''),
  isActive: z.boolean().default(true),
});
type ItemFormData = z.output<typeof schema>;
type Item = ItemFormData & { id: number; createdAt: string };

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ItemFormData>({
    resolver: zodResolver(schema) as any,
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

  async function onSubmit(data: ItemFormData) {
    setFormError(null);
    const url = editing ? `/api/admin/items/${editing.id}` : '/api/admin/items';
    const res = await fetch(url, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json();
      setFormError(j.error ?? 'Save failed');
      return;
    }
    reset();
    setEditing(null);
    setShowForm(false);
    load();
  }

  async function handleToggleActive(id: number, isActive: boolean) {
    await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  function startEdit(item: Item) {
    setEditing(item);
    reset(item);
    setFormError(null);
    setShowForm(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new window.FormData();
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
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Items</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setFormError(null);
            reset({ isActive: true, description: '', imageUrl: '' });
            setShowForm(true);
          }}
        >
          + Add Item
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit Item' : 'New Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='grid grid-cols-1 sm:grid-cols-2 gap-4'
            >
              {formError && (
                <div className='col-span-full'>
                  <Alert variant='destructive'>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                </div>
              )}
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='name'>Name *</Label>
                <Input
                  id='name'
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className='text-xs text-destructive'>
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='basePrice'>Price (cents) *</Label>
                <Input
                  id='basePrice'
                  type='number'
                  {...register('basePrice')}
                  aria-invalid={!!errors.basePrice}
                />
                {errors.basePrice && (
                  <p className='text-xs text-destructive'>
                    {errors.basePrice.message}
                  </p>
                )}
              </div>
              <div className='flex flex-col gap-1.5 col-span-full'>
                <Label htmlFor='description'>Description</Label>
                <textarea
                  id='description'
                  {...register('description')}
                  rows={3}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='imageFile'>Image</Label>
                <Input
                  id='imageFile'
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading && (
                  <p className='text-xs text-muted-foreground'>Uploading…</p>
                )}
                {watchedImageUrl && (
                  <img
                    src={watchedImageUrl}
                    alt='Preview'
                    className='mt-2 w-24 h-24 object-cover rounded-lg border'
                  />
                )}
                <input type='hidden' {...register('imageUrl')} />
              </div>
              <div className='col-span-full flex gap-3 pt-2 border-t border-border'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className='space-y-2'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='h-12 bg-muted rounded-xl animate-pulse' />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className='p-0'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Name</th>
                  <th className='px-4 py-3 font-medium'>Price</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className='px-4 py-3 font-medium'>{item.name}</td>
                    <td className='px-4 py-3'>
                      ${(item.basePrice / 100).toFixed(2)}
                    </td>
                    <td className='px-4 py-3'>
                      <Badge variant={item.isActive ? 'default' : 'outline'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className='px-4 py-3 flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          handleToggleActive(item.id, item.isActive)
                        }
                        className={`
                       ${
                         item.isActive
                           ? 'bg-green-50 border-green-200 text-green-700 '
                           : 'bg-gray-100 border-gray-200 text-gray-400'
                       }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
