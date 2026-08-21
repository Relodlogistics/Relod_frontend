'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Common Indian LCV/truck capacities and body lengths — tapping a chip fills
// the input, same field either way, so a custom value still works too.
export const TONNAGE_PRESETS = ['1', '4.5', '7', '12', '15', '18', '25'];
export const LENGTH_PRESETS = ['7', '8', '10', '14', '17', '19', '20', '22', '32'];

export function PresetChipField({
  id,
  label,
  hint,
  value,
  onChange,
  presets,
  unit,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.1" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              value === p
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {p} {unit}
          </button>
        ))}
      </div>
    </div>
  );
}
