const urgencyStyles: Record<string, string> = {
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-[#BA7517] bg-[#BA7517]/10 border-[#BA7517]/20',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  critical: 'text-[#993C1D] bg-[#993C1D]/10 border-[#993C1D]/20'
};

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const cls = urgencyStyles[urgency] || urgencyStyles.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  pending: 'text-slate-600 bg-slate-100 border-slate-200',
  needs_approval: 'text-[#BA7517] bg-[#BA7517]/10 border-[#BA7517]/20',
  approved: 'text-[#0F6E56] bg-emerald-50 border-emerald-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  fulfilled: 'text-[#185FA5] bg-blue-50 border-blue-200'
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  needs_approval: 'Needs Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled'
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] || statusStyles.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {status === 'needs_approval' && <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon>}
      {statusLabels[status] || status}
    </span>
  );
}
