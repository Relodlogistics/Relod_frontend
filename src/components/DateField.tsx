'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromValue(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(v: string): string {
  const d = fromValue(v);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}

/**
 * Replaces native <input type="date"> — Android's WebView calendar overlay
 * doesn't reliably composite above the page in this app's "legacy bridge"
 * mode (required for background geolocation), so absolutely-positioned
 * elements further down the same form bleed through on top of it. This
 * renders entirely in-DOM instead, so normal stacking just works.
 */
export function DateField({ value, onChange, min, max, placeholder }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = fromValue(value);
  const minDate = fromValue(min ?? '');
  const maxDate = fromValue(max ?? '');
  const [viewDate, setViewDate] = useState(() => selected ?? minDate ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isDisabled = (d: Date) => !!(minDate && d < minDate) || !!(maxDate && d > maxDate);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) setViewDate(selected ?? minDate ?? new Date());
          setOpen((o) => !o);
        }}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn(!value && 'text-muted-foreground')}>{value ? formatDisplay(value) : placeholder || 'Select date'}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border bg-card p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-medium">
              {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled(d)}
                  onClick={() => {
                    onChange(toValue(d));
                    setOpen(false);
                  }}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md text-sm',
                    isDisabled(d) && 'cursor-not-allowed text-muted-foreground/40',
                    !isDisabled(d) && 'hover:bg-accent',
                    selected && isSameDay(d, selected) && 'bg-primary text-primary-foreground hover:bg-primary',
                    (!selected || !isSameDay(d, selected)) && isSameDay(d, today) && 'border border-primary',
                  )}
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => { onChange(''); setOpen(false); }}>
              Clear
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isDisabled(today)}
              onClick={() => { onChange(toValue(today)); setOpen(false); }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
