import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Nominatim labels are full addresses ("Mumbai, Mumbai Suburban, Maharashtra, 400001, India") — keep just the first couple segments for compact UI display. */
export function shortPlaceLabel(label: string | null | undefined): string {
  if (!label) return '—'
  return label.split(',').slice(0, 2).join(',').trim()
}

/** Every user is in India, so "India" itself is never useful in a place label — drop it before splitting into a primary/secondary display pair. */
export function placeParts(label: string | null | undefined): [string, string | null] {
  if (!label) return ['—', null]
  const parts = label
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.toLowerCase() !== 'india')
  return [parts.slice(0, 2).join(', '), parts[2] ?? null]
}

/**
 * Board/list display for a posting's origin or destination — prefers the
 * structured "locality, city, state" label captured at posting-creation time
 * (Posting.originCityLabel / PostingDestination.cityLabel) over splitting the
 * full address, since the full address now starts with street-level detail
 * (house number, road, ward) rather than a city name. Falls back to the old
 * truncation for postings created before this field existed.
 */
export function boardLocation(
  cityLabel: string | null | undefined,
  fullLabel: string | null | undefined,
): string {
  return cityLabel || shortPlaceLabel(fullLabel)
}

/** Same idea as boardLocation() but split into a primary/secondary pair for two-line display. */
export function boardLocationParts(
  cityLabel: string | null | undefined,
  fullLabel: string | null | undefined,
): [string, string | null] {
  return cityLabel ? placeParts(cityLabel) : placeParts(fullLabel)
}

export function formatMoney(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Relative time for "posted 15 min ago" style labels. */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
