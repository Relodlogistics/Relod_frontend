'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Minimal centred dialog: dimmed backdrop, X in the top-right, Esc and a
 * backdrop click both close it. Portalled to <body> so it can't be clipped
 * by a Card's overflow-hidden (same reasoning as PlaceAutocompleteInput).
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  sheetOnPhone = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Below sm: slides up from the bottom edge instead of floating centred. */
  sheetOnPhone?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-black/50',
        sheetOnPhone ? 'items-end sm:items-center sm:p-4' : 'items-center p-4',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border bg-card shadow-xl',
          sheetOnPhone ? 'rounded-t-2xl sm:rounded-xl' : 'rounded-xl',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/30 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
