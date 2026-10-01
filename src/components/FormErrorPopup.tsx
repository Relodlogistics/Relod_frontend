'use client';

import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * A submit error shown centered on screen, instead of only as inline text at
 * the top of a long form — on a form tall enough that the submit button is
 * scrolled below the fold, an inline error at the top goes unseen. Closing
 * this doesn't clear the error itself; the inline text (wherever the form
 * already renders it) stays as a reference while the person corrects the
 * field it points at.
 */
export function FormErrorPopup({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!message || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-card p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm">{message}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('formErrorPopup.close')}
            className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <Button onClick={onClose} variant="outline" className="w-fit self-end">
          {t('formErrorPopup.gotIt')}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
