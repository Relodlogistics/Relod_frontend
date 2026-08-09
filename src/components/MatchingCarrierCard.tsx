'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { MatchingCarrier } from '@/lib/api';
import { truckTypeLabel } from '@/lib/truck-types';

export function MatchingCarrierCard({
  rank,
  carrier,
  selected,
  onToggle,
}: {
  rank: number;
  carrier: MatchingCarrier;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-primary"
        checked={selected}
        onChange={onToggle}
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-medium text-muted-foreground">
        {rank}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{carrier.fullName}</span>
          <Badge variant="secondary" className="shrink-0">
            {t('postings.matchScore', { score: carrier.score })}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {truckTypeLabel(carrier.truckType)} · {carrier.capacityTons} {t('postings.summaryTons')}
        </p>
        {carrier.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {carrier.reasons.map((reason, i) => (
              <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
