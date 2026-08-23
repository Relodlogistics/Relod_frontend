'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session-context';

const DEBOUNCE_MS = 300;

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
}

/**
 * "Ramapuram, Chennai, Tamil Nadu" style compact display, derived from the
 * address components rather than truncating the full label — see
 * Posting.originCityLabel. Adjacent duplicates are dropped (e.g. a town whose
 * district shares its name) so the result stays a clean 3ish-part label
 * regardless of which components the geocoder actually returned.
 */
export function cityLabel(place: PlaceResult | null | undefined): string {
  if (!place) return '';
  const parts = [place.locality, place.city, place.district, place.state].filter(
    (p): p is string => !!p,
  );
  const deduped = parts.filter(
    (p, i) => i === 0 || p.trim().toLowerCase() !== parts[i - 1].trim().toLowerCase(),
  );
  return deduped.join(', ');
}

export function PlaceAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}) {
  const { session } = useSession();
  const [suggestions, setSuggestions] = useState<{ placeId: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!listRef.current || !listRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Every Card in this app has overflow-hidden by default (for rounded image
  // corners) — that silently clips an inline dropdown whenever the field
  // sits anywhere the suggestion list would overflow the card's box, exactly
  // the invisible-calendar bug fixed for DateField. Same fix here: portal
  // the list to document.body with fixed positioning so it can't be clipped.
  useEffect(() => {
    if (!open) return;
    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    updateCoords();
    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const handleChange = (text: string) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!session || text.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.geocodeAutocomplete(session.accessToken, text, sessionTokenRef.current);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = async (suggestion: { placeId: string; label: string }) => {
    if (!session) return;
    setOpen(false);
    onChange(suggestion.label);
    try {
      const details = await api.geocodePlaceDetails(session.accessToken, suggestion.placeId, sessionTokenRef.current);
      onSelect(details);
    } finally {
      // A completed selection ends the autocomplete session — start a fresh
      // token so the next search bills as its own session, not a
      // continuation of this one.
      sessionTokenRef.current = crypto.randomUUID();
      setSuggestions([]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className={className ?? 'pl-9'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(suggestions.length > 0)}
        />
      </div>
      {open && coords && typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={listRef}
            className="fixed z-50 overflow-hidden rounded-lg border bg-popover shadow-md"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="flex w-full items-start gap-1.5 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelect(s)}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
