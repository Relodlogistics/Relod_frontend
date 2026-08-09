export interface DocumentTypeDef {
  docType: string;
  labelKey: string;
  accept?: string;
}

export const VEHICLE_DOCUMENTS: DocumentTypeDef[] = [
  { docType: 'rc', labelKey: 'vehicle.rc', accept: 'image/*,.pdf' },
  { docType: 'insurance', labelKey: 'vehicle.insurance', accept: 'image/*,.pdf' },
  { docType: 'fitness', labelKey: 'vehicle.fitness', accept: 'image/*,.pdf' },
  { docType: 'puc', labelKey: 'vehicle.puc', accept: 'image/*,.pdf' },
  { docType: 'permit', labelKey: 'vehicle.permit', accept: 'image/*,.pdf' },
  { docType: 'photo_front', labelKey: 'vehicle.photo_front', accept: 'image/*' },
  { docType: 'photo_side', labelKey: 'vehicle.photo_side', accept: 'image/*' },
  { docType: 'photo_rear', labelKey: 'vehicle.photo_rear', accept: 'image/*' },
  { docType: 'cargo_photo', labelKey: 'vehicle.cargo_photo', accept: 'image/*' },
  { docType: 'number_plate_photo', labelKey: 'vehicle.number_plate_photo', accept: 'image/*' },
  { docType: 'walkaround_video', labelKey: 'vehicle.walkaround_video', accept: 'video/*' },
];

export const DRIVER_DOCUMENTS: DocumentTypeDef[] = [
  { docType: 'driver_photo', labelKey: 'vehicle.driver_photo', accept: 'image/*' },
  { docType: 'driver_license', labelKey: 'vehicle.driver_license', accept: 'image/*,.pdf' },
];
