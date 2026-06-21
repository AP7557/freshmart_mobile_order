"use client";
import { useState, useEffect } from "react";

type Setting = { key: string; value: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    setSettings(json.data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save(key: string) {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: editValue }),
    });
    setEditKey(null);
    setSaving(false);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {settings.map((s) => (
              <tr key={s.key}>
                <td className="px-4 py-3 font-mono text-xs">{s.key}</td>
                <td className="px-4 py-3">
                  {editKey === s.key ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    s.value
                  )}
                </td>
                <td className="px-4 py-3">
                  {editKey === s.key ? (
                    <div className="flex gap-2">
                      <button onClick={() => save(s.key)} disabled={saving} className="text-blue-600 hover:underline">
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditKey(null)} className="text-gray-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditKey(s.key); setEditValue(s.value); }} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
