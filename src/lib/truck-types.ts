export const TRUCK_TYPES = ['open_body', 'closed_container', 'flatbed', 'trailer', 'tanker'] as const;

export function truckTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
