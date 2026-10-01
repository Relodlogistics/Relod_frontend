export interface DocumentTypeDef {
  docType: string;
  labelKey: string;
  accept?: string;
  // Must be uploaded before a truck counts as fully onboarded (see
  // register/vehicle and register/add-trucks) — this is the codebase's
  // pre-existing "verified" tier bar (CarriersService.recomputeVerificationTier)
  // minus the two items (fitness, puc) that stay optional/trust_boosted extras.
  required: boolean;
  // Groups the upload list into two labeled sections (VehicleVerificationStep)
  // instead of one long flat list — paper/legal documents vs. photos & video
  // of the truck itself.
  category: 'document' | 'media';
}

export const VEHICLE_DOCUMENTS: DocumentTypeDef[] = [
  { docType: 'rc', labelKey: 'vehicle.rc', accept: 'image/*,.pdf', required: true, category: 'document' },
  { docType: 'insurance', labelKey: 'vehicle.insurance', accept: 'image/*,.pdf', required: true, category: 'document' },
  { docType: 'fitness', labelKey: 'vehicle.fitness', accept: 'image/*,.pdf', required: false, category: 'document' },
  { docType: 'puc', labelKey: 'vehicle.puc', accept: 'image/*,.pdf', required: false, category: 'document' },
  { docType: 'permit', labelKey: 'vehicle.permit', accept: 'image/*,.pdf', required: true, category: 'document' },
  { docType: 'photo_front', labelKey: 'vehicle.photo_front', accept: 'image/*', required: true, category: 'media' },
  { docType: 'photo_side', labelKey: 'vehicle.photo_side', accept: 'image/*', required: true, category: 'media' },
  { docType: 'photo_rear', labelKey: 'vehicle.photo_rear', accept: 'image/*', required: true, category: 'media' },
  { docType: 'cargo_photo', labelKey: 'vehicle.cargo_photo', accept: 'image/*', required: false, category: 'media' },
  { docType: 'number_plate_photo', labelKey: 'vehicle.number_plate_photo', accept: 'image/*', required: true, category: 'media' },
  { docType: 'walkaround_video', labelKey: 'vehicle.walkaround_video', accept: 'video/*', required: true, category: 'media' },
];

export const DRIVER_DOCUMENTS: DocumentTypeDef[] = [
  { docType: 'driver_photo', labelKey: 'vehicle.driver_photo', accept: 'image/*', required: true, category: 'media' },
  { docType: 'driver_license', labelKey: 'vehicle.driver_license', accept: 'image/*,.pdf', required: true, category: 'document' },
];
