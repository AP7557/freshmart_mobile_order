import { db } from '@/db';
import { items, orders, promotions } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';

async function getStats() {
  const [activeItems, activeOrders, activePromos] = await Promise.all([
    db.select().from(items).where(eq(items.isActive, true)),
    db
      .select()
      .from(orders)
      .where(inArray(orders.status, ['paid', 'preparing', 'ready'])),
    db
      .select()
      .from(promotions)
      .where(and(eq(promotions.isActive, true))),
  ]);
  return [
    { label: 'Active Items', value: activeItems.length },
    { label: 'Active Orders', value: activeOrders.length },
    { label: 'Live Promotions', value: activePromos.length },
  ];
}

export default async function AdminDashboard() {
  const stats = await getStats();
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-foreground'>Dashboard</h1>
        <p className='text-muted-foreground text-sm mt-1'>
          Live snapshot of your store
        </p>
      </div>
      {/* Component Fix #3: Was plain <div className="bg-white rounded-xl shadow p-6">.
          Now uses shadcn <Card> for consistent theme + dark mode support. */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className='p-6'>
              <p className='text-sm text-muted-foreground'>{s.label}</p>
              <p className='text-3xl font-bold mt-1 text-foreground'>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
