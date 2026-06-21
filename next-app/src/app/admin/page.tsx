import { db } from "@/db";
import { items, orders, promotions } from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";

export default async function AdminDashboard() {
  const [itemCount] = await db.select({ count: count() }).from(items).where(eq(items.isActive, true));
  const [orderCount] = await db.select({ count: count() }).from(orders).where(inArray(orders.status, ["paid", "preparing", "ready"]));
  const [promoCount] = await db.select({ count: count() }).from(promotions).where(eq(promotions.isActive, true));

  const stats = [
    { label: "Active Items", value: itemCount.count },
    { label: "Active Orders", value: orderCount.count },
    { label: "Active Promotions", value: promoCount.count },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
