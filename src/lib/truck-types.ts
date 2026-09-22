// Keep in sync with TRUCK_TYPES in the backend's vehicles/truck-types.ts.
// Groups are only headings in the dropdown — a carrier always picks one
// specific type under them, never a group.
export const TRUCK_TYPE_GROUPS = [
  {
    label: 'General freight',
    types: ['open_body', 'closed_container', 'flatbed', 'mini_truck', 'pickup', 'trailer', 'multi_axle'],
  },
  { label: 'Bulk and liquids', types: ['tanker', 'bulker', 'tipper'] },
  { label: 'Temperature controlled', types: ['refrigerated'] },
  {
    label: 'Heavy and special',
    types: ['low_bed_trailer', 'car_carrier', 'oversized_platform', 'crane_truck'],
  },
  {
    label: 'Specialised bodies',
    types: ['livestock_carrier', 'glass_carrier', 'garbage_truck', 'concrete_mixer'],
  },
] as const;

// Everything a carrier can register, including 'other' (which asks what it is).
// Shippers choose from TRUCK_TYPES only — a truck registered as 'other' can't
// match a specific request, only "any type".
export const TRUCK_TYPES: readonly string[] = TRUCK_TYPE_GROUPS.flatMap((group) => group.types);
export const OTHER_TRUCK_TYPE = 'other';

const LABELS: Record<string, string> = {
  open_body: 'Open Body',
  closed_container: 'Closed Container',
  flatbed: 'Flatbed',
  mini_truck: 'Mini Truck',
  pickup: 'Pickup',
  trailer: 'Trailer',
  multi_axle: 'Multi-Axle',
  tanker: 'Tanker',
  bulker: 'Bulker',
  tipper: 'Tipper (Dumper)',
  refrigerated: 'Refrigerated',
  low_bed_trailer: 'Low-Bed Trailer',
  car_carrier: 'Car Carrier',
  oversized_platform: 'Oversized / Heavy Cargo Platform',
  crane_truck: 'Crane Truck',
  livestock_carrier: 'Livestock Carrier',
  glass_carrier: 'Glass Carrier',
  garbage_truck: 'Garbage / Municipal Truck',
  concrete_mixer: 'Concrete Mixer',
  other: 'Other',
};

export function truckTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  if (LABELS[type]) return LABELS[type];
  // Older or unknown values: fall back to a readable version of the slug.
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** The label for a registered truck — shows what the carrier typed when they chose "other". */
export function vehicleTypeLabel(vehicle: { truckType: string; truckTypeOther?: string | null }): string {
  return vehicle.truckType === OTHER_TRUCK_TYPE && vehicle.truckTypeOther
    ? `${truckTypeLabel(vehicle.truckType)} (${vehicle.truckTypeOther})`
    : truckTypeLabel(vehicle.truckType);
}
