export type BadgeVariant = 'default' | 'outline' | 'secondary' | 'destructive';

const LABELS: Record<string, string> = {
  completed: 'Completed',
  accepted: 'Confirmed',
  in_transit: 'In Transit',
  pending: 'Pending',
  cancelled: 'Cancelled',
  active: 'Open',
  matched: 'Matched',
  expired: 'Expired',
  awaiting_advance: 'Awaiting Advance',
  advance_settled: 'Advance Settled',
  awaiting_balance: 'Awaiting Balance',
  fully_settled: 'Fully Settled',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  approved: 'Approved',
  rejected: 'Rejected',
};

const VARIANTS: Record<string, BadgeVariant> = {
  completed: 'default',
  accepted: 'default',
  in_transit: 'default',
  pending: 'outline',
  cancelled: 'destructive',
  active: 'outline',
  matched: 'default',
  expired: 'secondary',
  awaiting_advance: 'outline',
  advance_settled: 'secondary',
  awaiting_balance: 'outline',
  fully_settled: 'default',
  open: 'outline',
  in_progress: 'secondary',
  resolved: 'default',
  approved: 'default',
  rejected: 'destructive',
};

export function statusBadge(status: string): { label: string; variant: BadgeVariant } {
  return { label: LABELS[status] ?? status, variant: VARIANTS[status] ?? 'secondary' };
}
