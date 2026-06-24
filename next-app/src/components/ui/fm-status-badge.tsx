import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status =
  | 'active'
  | 'inactive'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'pending_payment';

const CONFIG: Record<Status, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-100  text-green-800  border-green-200',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100   text-gray-600   border-gray-200',
  },
  paid: {
    label: 'Paid',
    className: 'bg-blue-100   text-blue-800   border-blue-200',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-amber-100  text-amber-800  border-amber-200',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-100  text-green-800  border-green-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-100   text-gray-600   border-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100    text-red-800    border-red-200',
  },
  pending_payment: {
    label: 'Pending Payment',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
};

// Component Fix #4: Shared badge — replaces the duplicated inline <StatusBadge>
// (plain <span> elements) that existed in admin/promotions/page.tsx.
export function FMStatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const cfg = CONFIG[status] ?? CONFIG.inactive;
  return (
    <Badge
      variant='outline'
      className={cn('text-xs font-medium border', cfg.className, className)}
    >
      {cfg.label}
    </Badge>
  );
}
