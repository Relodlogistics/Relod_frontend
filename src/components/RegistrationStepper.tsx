import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  key: string;
  label: string;
}

export function RegistrationStepper({
  steps,
  currentIndex,
}: {
  steps: StepperStep[];
  currentIndex: number;
}) {
  return (
    <div className="mb-6 flex items-center justify-center">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                i < currentIndex && 'bg-primary text-primary-foreground',
                i === currentIndex && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                i > currentIndex && 'bg-muted text-muted-foreground',
              )}
            >
              {i < currentIndex ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                'hidden text-[11px] whitespace-nowrap sm:block',
                i === currentIndex ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mx-1.5 h-px w-6 shrink-0 sm:w-10',
                i < currentIndex ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
