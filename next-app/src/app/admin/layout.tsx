import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-gray-900 text-white flex flex-col p-4 gap-2">
        <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
        {[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/items", label: "Items" },
          { href: "/admin/modifiers", label: "Modifiers" },
          { href: "/admin/promotions", label: "Promotions" },
          { href: "/admin/settings", label: "Settings" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
          >
            {link.label}
          </Link>
        ))}
        <form action="/api/auth/logout" method="POST" className="mt-auto">
          <button
            type="submit"
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 rounded-lg transition text-red-300"
          >
            Logout
          </button>
        </form>
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
