import type { ChangeableFieldName } from '@/lib/api';

// Shared between the Activity page and RecentActivityCard so both label
// requests the same way.
export const FIELD_LABEL_KEY: Record<ChangeableFieldName, string> = {
  aadhaarNumber: 'settingsPage.checklistAadhaar',
  panNumber: 'profile.panNumber',
  gstin: 'profile.gstin',
  whatsappNumber: 'profile.whatsappNumber',
  businessName: 'profile.carrierBusinessName',
  businessPan: 'profile.businessPan',
  registrationNumber: 'settingsPage.vehicleRegNumber',
  truckType: 'settingsPage.vehicleTruckType',
  capacityTons: 'settingsPage.vehicleCapacity',
};
