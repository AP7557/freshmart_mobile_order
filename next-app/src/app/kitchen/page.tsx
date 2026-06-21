"use client";
import { useState, useEffect, useCallback } from "react";

type OrderLine = { id: number; itemName: string; quantity: number; lineTotal: number; modifiers: string[] };
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

const STATUS_LABELS: Record<string, string> = {
  paid: "New",
  preparing: "Preparing",
  ready: "Ready",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-yellow-100 text-yellow-800 border-yellow-300",
  preparing: "bg-blue-100 text-blue-800 border-blue-300",
  ready: "bg-green-100 text-green-800 border-green-300",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/kitchen/orders");
    const json = await res.json();
    setOrders(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/kitchen/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function print(id: number) {
    setPrinting(id);
    await fetch(`/api/kitchen/orders/${id}/print`, { method: "POST" });
    setPrinting(null);
  }

  const nextStatus: Record<string, string> = { paid: "preparing", preparing: "ready", ready: "completed" };
  const nextLabel: Record<string, string> = { paid: "Start Preparing", preparing: "Mark Ready", ready: "Complete" };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading orders…</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
        <span className="text-sm text-gray-400">Auto-refreshes every 15s</span>
      </div>

      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 text-lg">No active orders</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className={`bg-gray-900 rounded-xl border p-4 flex flex-col gap-3 ${STATUS_COLORS[order.status] ?? ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Order #{order.id}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[order.status] ?? ""}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <div className="text-sm text-gray-300">
                <p><strong className="text-white">{order.customerName}</strong> · {order.customerPhone}</p>
                <p className="text-xs mt-0.5">
                  Ordered: {new Date(order.createdAt).toLocaleTimeString()} ·
                  Ready by: {new Date(order.estimatedReadyAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="border-t border-gray-700 pt-3 flex flex-col gap-1">
                {order.lines.map((line) => (
                  <div key={line.id}>
                    <p className="text-sm font-medium">{line.quantity}× {line.itemName}</p>
                    {line.modifiers.map((m, i) => (
                      <p key={i} className="text-xs text-gray-400 ml-3">+ {m}</p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-2 text-xs text-gray-400">
                <span>Subtotal ${(order.subtotal / 100).toFixed(2)}</span>
                {order.discountTotal > 0 && <span> · Discount -${(order.discountTotal / 100).toFixed(2)}</span>}
                <span> · Total ${(order.total / 100).toFixed(2)}</span>
              </div>

              <div className="flex gap-2 mt-1">
                {nextStatus[order.status] && (
                  <button
                    onClick={() => updateStatus(order.id, nextStatus[order.status])}
                    className="flex-1 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
                  >
                    {nextLabel[order.status]}
                  </button>
                )}
                <button
                  onClick={() => print(order.id)}
                  disabled={printing === order.id}
                  className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition disabled:opacity-50"
                >
                  {printing === order.id ? "…" : "🖨 Print"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
