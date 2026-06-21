import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "kitchen" && session.role !== "admin")) redirect("/login");
  return <>{children}</>;
}
