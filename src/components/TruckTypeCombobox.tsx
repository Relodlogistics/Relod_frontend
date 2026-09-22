'use client';

import { useMemo } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { OTHER_TRUCK_TYPE, TRUCK_TYPE_GROUPS, truckTypeLabel } from '@/lib/truck-types';
import { cn } from '@/lib/utils';

interface TruckTypeItem {
  value: string;
  label: string;
}

interface TruckTypeGroup {
  value: string;
  items: TruckTypeItem[];
}

const item = (type: string): TruckTypeItem => ({ value: type, label: truckTypeLabel(type) });

// A searchable dropdown of truck types, grouped under headings. Typing
// narrows the list to matching types; groups with no match disappear. A
// carrier always picks one specific type, never a group. Registration passes
// includeOther; shippers pass anyOption instead (their requests can't ask for
// "other").
export function TruckTypeCombobox({
  id,
  value,
  onValueChange,
  includeOther = false,
  anyOption,
  className,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  includeOther?: boolean;
  anyOption?: { value: string; label: string };
  className?: string;
}) {
  // Depend on the option's fields, not the object, so a caller passing a fresh
  // literal each render doesn't rebuild the list (and reset the highlight).
  const anyValue = anyOption?.value;
  const anyLabel = anyOption?.label;
  const groups = useMemo<TruckTypeGroup[]>(() => {
    const built: TruckTypeGroup[] = [];
    if (anyValue !== undefined && anyLabel !== undefined) {
      built.push({ value: '', items: [{ value: anyValue, label: anyLabel }] });
    }
    for (const group of TRUCK_TYPE_GROUPS) {
      built.push({ value: group.label, items: group.types.map(item) });
    }
    if (includeOther) built.push({ value: 'Anything else', items: [item(OTHER_TRUCK_TYPE)] });
    return built;
  }, [includeOther, anyValue, anyLabel]);

  // The same objects the list renders, so the selected one is recognised.
  const selected = useMemo(
    () => groups.flatMap((group) => group.items).find((entry) => entry.value === value) ?? null,
    [groups, value],
  );

  return (
    <Combobox.Root
      items={groups}
      value={selected}
      onValueChange={(next) => next && onValueChange(next.value)}
    >
      <div className={cn('relative w-full', className)}>
        <Combobox.Input
          id={id}
          placeholder="Search truck type"
          className="h-8 w-full rounded-lg border border-input bg-transparent py-2 pr-8 pl-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <Combobox.Trigger
          aria-label="Show truck types"
          className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center text-muted-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-2.5 py-3 text-sm text-muted-foreground empty:hidden">
              No truck type matches. Choose &ldquo;Other&rdquo; to describe yours.
            </Combobox.Empty>
            <Combobox.List>
              {(group: TruckTypeGroup) => (
                <Combobox.Group key={group.value || 'any'} items={group.items} className="p-1">
                  {group.value && (
                    <Combobox.GroupLabel className="px-1.5 py-1 text-xs text-muted-foreground">
                      {group.value}
                    </Combobox.GroupLabel>
                  )}
                  <Combobox.Collection>
                    {(entry: TruckTypeItem) => (
                      <Combobox.Item
                        key={entry.value}
                        value={entry}
                        className="relative flex w-full cursor-default items-center rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                      >
                        {entry.label}
                        <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                          <CheckIcon className="size-4" />
                        </Combobox.ItemIndicator>
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
