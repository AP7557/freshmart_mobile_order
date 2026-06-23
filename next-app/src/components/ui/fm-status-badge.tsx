import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid:       { label: "New",       className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  preparing:  { label: "Preparing", className: "bg-blue-100 text-blue-800 border-blue-300" },
  ready:      { label: "Ready",     className: "bg-green-100 text-green-800 border-green-300" },
  completed:  { label: "Completed", className: "bg-gray-100 text-gray-600 border-gray-300" },
  cancelled:  { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-300" },
};

export function FMStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold", s.className)}>
      {s.label}
    </Badge>
  );
}
