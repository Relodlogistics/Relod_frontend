// Maps a ReverificationRequest.fieldName (a raw DB column / DocumentType
// string) to the i18n key that already displays it elsewhere in the admin
// panel — so the Reverifications list and the ReverifyButton's confirm text
// show the same label the admin sees on the profile/vehicle-doc row itself,
// instead of a second, possibly-inconsistent set of labels.
const FIELD_LABEL_KEYS: Record<string, string> = {
  phone: 'admin.colPhone',
  whatsappNumber: 'admin.colWhatsapp',
  aadhaarNumber: 'admin.colAadhaar',
  panNumber: 'admin.colPan',
  email: 'admin.email',
  fullName: 'profile.fullName',
  gstin: 'admin.colGstin',
  businessName: 'admin.colBusiness',
  businessAddress: 'admin.colAddress',
  businessType: 'admin.colBusinessType',
  paymentUpiId: 'admin.colUpi',
  industryType: 'admin.colIndustry',
  shipmentVolume: 'admin.colShipmentVolume',
  registrationNumber: 'settingsPage.vehicleRegNumber',
  truckType: 'settingsPage.vehicleTruckType',
  capacityTons: 'settingsPage.vehicleCapacity',
  rc: 'admin.docRc',
  insurance: 'admin.docInsurance',
  permit: 'admin.docPermit',
  fitness: 'admin.docFitness',
  puc: 'admin.docPuc',
  driver_license: 'admin.docDriverLicense',
  driver_photo: 'admin.docDriverPhoto',
  walkaround_video: 'admin.docWalkaround',
  photo_front: 'admin.docPhotoFront',
  photo_side: 'admin.docPhotoSide',
  photo_rear: 'admin.docPhotoRear',
  cargo_photo: 'admin.docPhotoCargo',
  number_plate_photo: 'admin.docPhotoPlate',
};

export function reverificationFieldLabel(t: (key: string) => string, fieldName: string): string {
  const key = FIELD_LABEL_KEYS[fieldName];
  return key ? t(key) : fieldName;
}
