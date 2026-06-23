'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type Setting = { key: string; value: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/settings');
    const json = await res.json();
    setSettings(json.data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(key: string) {
    setSaving(true);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValue }),
    });
    setEditKey(null);
    setSaving(false);
    load();
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Settings</h1>
      <Card>
        <CardContent className='p-0'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50 text-left'>
              <tr>
                <th className='px-4 py-3 font-medium'>Key</th>
                <th className='px-4 py-3 font-medium'>Value</th>
                <th className='px-4 py-3 font-medium'>Action</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {settings.map((s) => (
                <tr key={s.key}>
                  <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
                    {s.key}
                  </td>
                  <td className='px-4 py-3 min-w-[200px]'>
                    {editKey === s.key ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className='h-8'
                        autoFocus
                      />
                    ) : (
                      <span>{s.value}</span>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    {editKey === s.key ? (
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => save(s.key)}
                          disabled={saving}
                        >
                          {saving ? '…' : 'Save'}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setEditKey(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => {
                          setEditKey(s.key);
                          setEditValue(s.value);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
