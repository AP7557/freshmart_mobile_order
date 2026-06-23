'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OrderLine = {
  id: number;
  itemName: string;
  quantity: number;
  lineTotal: number;
  modifiers: string[];
};
type Order = {
  id: number;
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
  estimatedReadyAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  lines: OrderLine[];
};

const STATUS_BADGE: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  paid: 'destructive',
  preparing: 'secondary',
  ready: 'default',
};
const nextStatus: Record<string, string> = {
  paid: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};
const nextLabel: Record<string, string> = {
  paid: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Complete',
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/kitchen/orders');
    const json = await res.json();
    setOrders(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/kitchen/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function print(id: number) {
    setPrinting(id);
    await fetch(`/api/kitchen/orders/${id}/print`, { method: 'POST' });
    setPrinting(null);
  }

  if (loading)
    return (
      <div className='min-h-screen flex items-center justify-center text-muted-foreground'>
        Loading…
      </div>
    );

  return (
    <div className='min-h-screen bg-gray-950 text-white p-4'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Kitchen Dashboard</h1>
        <span className='text-sm text-gray-400'>Auto-refreshes every 15s</span>
      </div>
      {orders.length === 0 ? (
        <div className='flex items-center justify-center h-64 text-gray-500 text-lg'>
          No active orders
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {orders.map((order) => (
            <Card
              key={order.id}
              className='bg-gray-900 border-gray-700 text-white'
            >
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-white'>
                    Order #{order.id}
                  </CardTitle>
                  <Badge variant={STATUS_BADGE[order.status] ?? 'outline'}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
                <p className='text-sm text-gray-300'>
                  <strong className='text-white'>{order.customerName}</strong> ·{' '}
                  {order.customerPhone}
                </p>
                <p className='text-xs text-gray-400'>
                  {new Date(order.createdAt).toLocaleTimeString()} → ready{' '}
                  {new Date(order.estimatedReadyAt).toLocaleTimeString()}
                </p>
              </CardHeader>
              <CardContent className='space-y-1 border-t border-gray-700 pt-3'>
                {order.lines.map((line) => (
                  <div key={line.id}>
                    <p className='text-sm font-medium'>
                      {line.quantity}× {line.itemName}
                    </p>
                    {line.modifiers?.map((m, i) => (
                      <p key={i} className='text-xs text-gray-400 ml-3'>
                        + {m}
                      </p>
                    ))}
                  </div>
                ))}
                <div className='border-t border-gray-700 pt-2 mt-2 flex justify-between text-sm'>
                  <span className='text-gray-400'>Total</span>
                  <span className='font-bold'>
                    ${(order.total / 100).toFixed(2)}
                  </span>
                </div>
                <div className='flex gap-2 pt-2'>
                  {nextStatus[order.status] && (
                    <Button
                      size='sm'
                      className='flex-1'
                      onClick={() =>
                        updateStatus(order.id, nextStatus[order.status])
                      }
                    >
                      {nextLabel[order.status]}
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='outline'
                    className='border-gray-600 text-gray-200 hover:bg-gray-700'
                    disabled={printing === order.id}
                    onClick={() => print(order.id)}
                  >
                    {printing === order.id ? 'Printing…' : '🖨 Print'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
