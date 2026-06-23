import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FMLogo } from "@/components/fm-logo";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "kitchen" && session.role !== "admin")) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <FMLogo size={28} className="[&_span]:text-white" />
        <span className="text-xs text-gray-500">Kitchen Display</span>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
