const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

// Uploaded documents/photos come back as either a relative /uploads/... path
// (LocalStorageProvider) or a full signed URL (a real object-storage provider) —
// this normalizes either into something a browser can load directly.
export function apiFileUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

/**
 * Vehicle documents (RC, insurance, driver license, truck photos, etc.) are
 * served through an authenticated endpoint, not a public static path — the
 * token has to be a query param rather than an Authorization header since
 * this URL gets used directly as an <a href>/<img src>, which can't send
 * custom headers. See VehiclesController.getDocument.
 */
export function vehicleDocumentUrl(vehicleId: string, docType: string, token: string): string {
  return `${API_BASE_URL}/vehicles/${vehicleId}/documents/${docType}?token=${encodeURIComponent(token)}`;
}

/** Same pattern as vehicleDocumentUrl — support-ticket attachments are also served through an authenticated, ownership-checked endpoint now. See SupportTicketsController.getAttachment. */
export function supportAttachmentUrl(ticketId: string, messageId: string, token: string): string {
  return `${API_BASE_URL}/support-tickets/${ticketId}/attachments/${messageId}?token=${encodeURIComponent(token)}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Inert against a real backend — only skips localtunnel's human-check
      // interstitial when developing behind a tunnel.
      'Bypass-Tunnel-Reminder': '1',
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401 && path.startsWith('/admin/') && path !== '/admin/auth/login' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin-session-invalid'));
    }
    throw new ApiError(body.message ?? 'Request failed', res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  sendOtp: (
    phone: string,
    purpose: 'signup' | 'login' | 'whatsapp_verify' | 'driver_login',
    turnstileToken?: string,
  ) =>
    request<{ message: string; expiresInSeconds: number; devCode?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose, turnstileToken }),
    }),

  verifyOtp: (
    phone: string,
    purpose: 'signup' | 'login' | 'whatsapp_verify' | 'driver_login',
    code: string,
  ) =>
    request<{
      verified: boolean;
      token: string;
      expiresIn: string;
      accountFound?: boolean;
      accessToken?: string;
      accountId?: string;
      userType?: 'carrier' | 'shipper';
      // Only present when purpose is 'driver_login'.
      vehicleId?: string;
      driverName?: string | null;
      registrationNumber?: string;
      driverAuthorizedAt?: string | null;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose, code }),
    }),

  setPassword: (token: string, data: { username: string; password: string }) =>
    request<{ message: string }>('/auth/set-password', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  // Invalidates the token server-side (see AccessTokenGuard's sessionVersion
  // check) — clearing it from the client alone doesn't stop it being reused
  // if it were ever copied/stolen.
  logout: (token: string) =>
    request<{ message: string }>('/auth/logout', { method: 'POST', token }),

  loginPassword: (data: { username: string; password: string; turnstileToken: string }) =>
    request<{ accessToken: string; accountId: string; userType: 'carrier' | 'shipper' }>(
      '/auth/login-password',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  forgotPassword: (phone: string) =>
    request<{ message: string; expiresInSeconds: number; devCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  resetPassword: (data: { phone: string; code: string; newPassword: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotUsername: (phone: string) =>
    request<{ message: string; expiresInSeconds: number; devCode?: string }>('/auth/forgot-username', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  resetUsername: (data: { phone: string; code: string; newUsername: string }) =>
    request<{ message: string; username: string }>('/auth/reset-username', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // An owner-operator carrier account is only ever created together with its
  // first vehicle (vehicle is required, whatsappNumber is their own). A
  // non-owner-operator carrier is created alone, with no vehicle and no
  // personal WhatsApp number — see register/profile and register/vehicle
  // pages, and addVehicle below for how each of their trucks gets added
  // afterward with a WhatsApp-verified driver number.
  registerCarrier: (
    token: string,
    data: {
      fullName: string;
      phone: string;
      isOwnerOperator: boolean;
      whatsappNumber?: string;
      whatsappVerificationToken?: string;
      truckCount?: number;
      aadhaarNumber: string;
      panNumber?: string;
      email?: string;
      preferredLanguage?: string;
      vehicle?: VehicleRegistrationFields;
    },
  ) =>
    request<
      Carrier & {
        vehicleId?: string;
        accessToken: string;
        alreadyRegistered: boolean;
        trucksToAdd?: number;
      }
    >('/carriers/register', { method: 'POST', token, body: JSON.stringify(data) }),

  // Adds one truck to a non-owner-operator carrier's fleet — called once per
  // truck from the "add trucks" flow after registration.
  addVehicle: (token: string, data: AddVehicleFields) =>
    request<Vehicle>('/vehicles', { method: 'POST', token, body: JSON.stringify(data) }),

  registerShipper: (
    token: string,
    data: {
      fullName: string;
      phone: string;
      whatsappNumber: string;
      whatsappVerificationToken: string;
      email?: string;
      businessName?: string;
      businessType?: string;
      gstin?: string;
      panNumber?: string;
      paymentUpiId?: string;
      industryType?: string;
      shipmentVolume?: string;
      businessAddress?: string;
      preferredLanguage?: string;
    },
  ) =>
    request<Shipper & { accessToken: string; alreadyRegistered: boolean }>('/shippers/register', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  // KYC — run during registration against the registration token, before the
  // carrier/shipper account exists (see kyc.controller.ts: keyed by the
  // verified phone on that token, same as carrier/shipper registration).
  kycStatus: (token: string) => request<KycVerification[]>('/kyc/status', { token }),

  sendAadhaarOtp: (token: string, aadhaarNumber: string) =>
    request<{ referenceId: string }>('/kyc/aadhaar/send-otp', {
      method: 'POST',
      token,
      body: JSON.stringify({ aadhaarNumber }),
    }),

  verifyAadhaarOtp: (token: string, referenceId: string, otp: string) =>
    request<{ verified: boolean; maskedAadhaar: string }>('/kyc/aadhaar/verify-otp', {
      method: 'POST',
      token,
      body: JSON.stringify({ referenceId, otp }),
    }),

  verifyPan: (token: string, panNumber: string, fullName: string) =>
    request<{ verified: boolean; nameOnPan: string }>('/kyc/pan/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ panNumber, fullName }),
    }),

  verifyFaceMatch: (token: string, selfie: File) => {
    const form = new FormData();
    form.append('file', selfie);
    return request<{ verified: boolean; matchScore: number }>('/kyc/face-match/verify', {
      method: 'POST',
      token,
      body: form,
    });
  },

  verifyDrivingLicense: (token: string, dlNumber: string, dob: string) =>
    request<{ verified: boolean; nameOnDl: string }>('/kyc/driving-license/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ dlNumber, dob }),
    }),

  verifyBankAccount: (token: string, accountNumber: string, ifsc: string, fullName: string) =>
    request<{ verified: boolean; accountHolderName: string }>('/kyc/bank-account/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ accountNumber, ifsc, fullName }),
    }),

  verifyGstin: (token: string, gstin: string) =>
    request<{ verified: boolean; legalName: string }>('/kyc/gstin/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ gstin }),
    }),

  verifyVehicleRc: (token: string, vehicleId: string) =>
    request<{ verified: boolean; ownerName: string; vehicleClass: string }>(
      `/kyc/vehicle-rc/${vehicleId}/verify`,
      { method: 'POST', token },
    ),

  getCarrierProfile: (token: string, id: string) => request<Carrier>(`/carriers/${id}`, { token }),

  getShipperProfile: (token: string, id: string) => request<Shipper>(`/shippers/${id}`, { token }),

  updateCarrierProfile: (
    token: string,
    id: string,
    data: { fullName?: string; email?: string; preferredLanguage?: string },
  ) => request<Carrier>(`/carriers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

  updateShipperProfile: (
    token: string,
    id: string,
    data: {
      fullName?: string;
      email?: string;
      businessName?: string;
      businessType?: string;
      gstin?: string;
      businessAddress?: string;
      paymentUpiId?: string;
      industryType?: string;
      shipmentVolume?: string;
      preferredLanguage?: string;
    },
  ) => request<Shipper>(`/shippers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),

  createChangeRequest: (
    token: string,
    data: { fieldName: ChangeableFieldName; vehicleId?: string; requestedValue: string; reason: string },
  ) => request<ChangeRequest>('/change-requests', { method: 'POST', token, body: JSON.stringify(data) }),

  listMyChangeRequests: (token: string) => request<ChangeRequest[]>('/change-requests/mine', { token }),

  listUnseenResolvedChangeRequests: (token: string) =>
    request<ChangeRequest[]>('/change-requests/unseen-resolved', { token }),

  markResolvedChangeRequestsSeen: (token: string) =>
    request<{ message: string }>('/change-requests/mark-resolved-seen', { method: 'POST', token }),

  adminListChangeRequests: (token: string, status?: ChangeRequest['status']) =>
    request<AdminChangeRequest[]>(`/admin/change-requests${status ? `?status=${status}` : ''}`, { token }),

  adminApproveChangeRequest: (token: string, id: string) =>
    request<ChangeRequest>(`/admin/change-requests/${id}/approve`, { method: 'POST', token }),

  adminRejectChangeRequest: (token: string, id: string, adminNote?: string) =>
    request<ChangeRequest>(`/admin/change-requests/${id}/reject`, {
      method: 'POST',
      token,
      body: JSON.stringify({ adminNote }),
    }),

  adminCountUnseenChangeRequests: (token: string) =>
    request<{ count: number }>('/admin/change-requests/unseen-count', { token }),

  adminMarkChangeRequestsSeen: (token: string) =>
    request<{ message: string }>('/admin/change-requests/mark-seen', { method: 'POST', token }),

  uploadVehicleDocument: (
    token: string,
    vehicleId: string,
    docType: string,
    file: File,
    expiryDate?: string,
  ) => {
    const form = new FormData();
    form.append('docType', docType);
    if (expiryDate) form.append('expiryDate', expiryDate);
    form.append('file', file);
    return request<{ docType: string; url: string }>(`/vehicles/${vehicleId}/documents`, {
      method: 'POST',
      token,
      body: form,
    });
  },

  getCarrierVerificationStatus: (carrierId: string) =>
    request<{
      carrierId: string;
      verificationTier: 'basic' | 'verified' | 'trust_boosted';
      vehicles: { id: string; registrationNumber: string; verificationStatus: string }[];
    }>(`/carriers/${carrierId}/verification-status`),

  // Phase 2: Postings & Booking
  createPosting: (
    token: string,
    data: {
      originLat: number;
      originLng: number;
      originLabel?: string;
      originCityLabel?: string;
      destinations: { lat: number; lng: number; label?: string; cityLabel?: string }[];
      availableFromDate: string;
      availableToDate: string;
      priceType: 'fixed' | 'open_to_offers';
      priceAmount?: string;
      priceMin?: string;
      priceMax?: string;
      loadType: 'full' | 'part_load_ok';
      optionalNote?: string;
      requiredTruckType?: string;
      requiredCapacityTons?: string;
      cargoType?: CargoType;
      vehicleId?: string;
      selfDeclared?: boolean;
    },
  ) => request<Posting>('/postings', { method: 'POST', token, body: JSON.stringify(data) }),

  searchPostings: (
    token: string,
    params: {
      origin?: string;
      destination?: string;
      radiusKm?: number;
      loadType?: 'full' | 'part_load_ok';
      priceType?: 'fixed' | 'open_to_offers';
      fromDate?: string;
      toDate?: string;
      nearLat?: number;
      nearLng?: number;
      page?: number;
      pageSize?: number;
    },
  ) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    return request<PaginatedPostings>(`/postings/search?${query.toString()}`, { token });
  },

  saveLoad: (token: string, postingId: string) =>
    request<{ saved: true }>(`/postings/${postingId}/save`, { method: 'POST', token }),

  unsaveLoad: (token: string, postingId: string) =>
    request<{ saved: false }>(`/postings/${postingId}/save`, { method: 'DELETE', token }),

  listSavedLoads: (token: string) => request<PaginatedPostings>('/postings/saved', { token }),

  getPosting: (token: string, postingId: string) =>
    request<Posting>(`/postings/${postingId}`, { token }),

  listMyPostings: (token: string) => request<Posting[]>('/postings/mine', { token }),

  cancelPosting: (token: string, postingId: string) =>
    request<Posting>(`/postings/${postingId}`, { method: 'PATCH', token }),

  broadcastPosting: (token: string, postingId: string) =>
    request<{ notified: number }>(`/postings/${postingId}/broadcast`, { method: 'POST', token }),

  matchingCarriers: (token: string, postingId: string) =>
    request<MatchingCarriersResult>(`/postings/${postingId}/matching-carriers`, { token }),

  sendLoadAlerts: (token: string, postingId: string, carrierIds: string[]) =>
    request<{ sent: number; failed: number }>(`/postings/${postingId}/send-alerts`, {
      method: 'POST',
      token,
      body: JSON.stringify({ carrierIds }),
    }),

  instantBook: (token: string, postingId: string) =>
    request<Booking>(`/postings/${postingId}/book`, { method: 'POST', token }),

  negotiate: (token: string, postingId: string, message: string, proposedPrice?: number) =>
    request<Booking>(`/postings/${postingId}/negotiate`, {
      method: 'POST',
      token,
      body: JSON.stringify({ message, proposedPrice }),
    }),

  listMyVehicles: (token: string) => request<Vehicle[]>('/vehicles/mine', { token }),

  // Driver-scoped — token is a DriverAccessGuard token (see driver-session-context),
  // not a carrier/shipper access token. Read-only for now (Phase 1).
  getMyDriverVehicle: (token: string) =>
    request<DriverVehicle>('/driver/me', { token }),

  rebook: (token: string, postingId: string, carrierId: string) =>
    request<Booking>(`/postings/${postingId}/rebook`, {
      method: 'POST',
      token,
      body: JSON.stringify({ carrierId }),
    }),

  listMyBookings: (token: string) => request<Booking[]>('/bookings/mine', { token }),

  getBooking: (token: string, bookingId: string) => request<Booking>(`/bookings/${bookingId}`, { token }),

  sendBookingMessage: (token: string, bookingId: string, body: string) =>
    request<BookingMessage>(`/bookings/${bookingId}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ body }),
    }),

  listBookingMessages: (token: string, bookingId: string) =>
    request<BookingMessage[]>(`/bookings/${bookingId}/messages`, { token }),

  acceptBooking: (token: string, bookingId: string) =>
    request<Booking>(`/bookings/${bookingId}/accept`, { method: 'POST', token }),

  submitReview: (token: string, bookingId: string, rating: number, comment?: string) =>
    request<Review>(`/bookings/${bookingId}/review`, {
      method: 'POST',
      token,
      body: JSON.stringify({ rating, comment }),
    }),

  sendLocationPing: (token: string, vehicleId: string, data: { lat: number; lng: number; speedKmh?: number }) =>
    request<{ recorded: true }>(`/vehicles/${vehicleId}/location-ping`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  getBookingTracking: (token: string, bookingId: string) =>
    request<BookingTracking>(`/bookings/${bookingId}/tracking`, { token }),

  createLanePreference: (
    token: string,
    data: {
      originLabel: string;
      originLat: number;
      originLng: number;
      destinationLabel: string;
      destinationLat: number;
      destinationLng: number;
      radiusKm?: number;
    },
  ) => request<LanePreference>('/lane-preferences', { method: 'POST', token, body: JSON.stringify(data) }),

  listLanePreferences: (token: string) => request<LanePreference[]>('/lane-preferences', { token }),

  deleteLanePreference: (token: string, id: string) =>
    request<{ deleted: boolean }>(`/lane-preferences/${id}`, { method: 'DELETE', token }),

  listNotifications: (token: string) => request<AppNotification[]>('/notifications', { token }),

  markNotificationRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH', token }),

  // Phase 3: Payment Tracking
  getPaymentTracking: (token: string, bookingId: string) =>
    request<PaymentTrackingLog>(`/payment-tracking/${bookingId}`, { token }),

  listMyPaymentTracking: (token: string) => request<PaymentTrackingLog[]>('/payment-tracking/mine', { token }),

  // Dashboard: geocoding + support tickets
  geocodeSearch: (token: string, q: string) =>
    request<{ label: string; lat: number; lng: number }[]>(
      `/geocode/search?q=${encodeURIComponent(q)}`,
      { token },
    ),

  geocodeAutocomplete: (token: string, input: string, sessionToken: string) =>
    request<{ placeId: string; label: string }[]>(
      `/geocode/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { token },
    ),

  geocodePlaceDetails: (token: string, placeId: string, sessionToken: string) =>
    request<{
      label: string;
      lat: number;
      lng: number;
      locality?: string;
      city?: string;
      district?: string;
      state?: string;
    }>(
      `/geocode/place-details?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      { token },
    ),

  createSupportTicket: (token: string, data: { issueSummary: string; relatedBookingId?: string }) =>
    request<SupportTicket>('/support-tickets', { method: 'POST', token, body: JSON.stringify(data) }),

  listMySupportTickets: (token: string) => request<SupportTicket[]>('/support-tickets', { token }),

  sendSupportTicketMessage: (token: string, ticketId: string, body: string, file?: File) => {
    const form = new FormData();
    if (body) form.append('body', body);
    if (file) form.append('file', file);
    return request<SupportTicketMessage>(`/support-tickets/${ticketId}/messages`, {
      method: 'POST',
      token,
      body: form,
    });
  },

  listSupportTicketMessages: (token: string, ticketId: string) =>
    request<SupportTicketMessage[]>(`/support-tickets/${ticketId}/messages`, { token }),

  // Admin — separate token type (AdminAccessGuard), never interchangeable
  // with a carrier/shipper accessToken.
  adminLogin: (data: { email: string; password: string }) =>
    request<{ accessToken: string; expiresIn: string; admin: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminLogout: (token: string) =>
    request<{ message: string }>('/admin/auth/logout', { method: 'POST', token }),

  adminListCarriers: (token: string) => request<AdminCarrierListItem[]>('/admin/carriers', { token }),

  adminGetCarrier: (token: string, id: string) =>
    request<AdminCarrierDetail>(`/admin/carriers/${id}`, { token }),

  adminSuspendCarrier: (token: string, id: string, isSuspended: boolean) =>
    request<Carrier>(`/admin/carriers/${id}/suspend`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isSuspended }),
    }),

  adminUpdateVehicleVerification: (token: string, vehicleId: string, status: 'approved' | 'rejected') =>
    request<AdminVehicle>(`/admin/vehicles/${vehicleId}/verification`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    }),

  adminListPostings: (token: string, status?: Posting['status']) =>
    request<Posting[]>(`/admin/postings${status ? `?status=${status}` : ''}`, { token }),

  adminListBookings: (token: string, status?: Booking['status']) =>
    request<AdminBooking[]>(`/admin/bookings${status ? `?status=${status}` : ''}`, { token }),

  adminUpdateBookingStatus: (token: string, id: string, status: Booking['status']) =>
    request<Booking>(`/admin/bookings/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    }),

  adminListPaymentQueue: (token: string) =>
    request<AdminPaymentTrackingLog[]>('/admin/payment-tracking/queue', { token }),

  adminListPayments: (token: string) =>
    request<AdminPaymentTrackingLog[]>('/admin/payment-tracking', { token }),

  adminGetPayment: (token: string, id: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}`, { token }),

  adminMarkAdvanceReceived: (token: string, id: string, amount: string, utr: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/advance-received`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ amount, utr }),
    }),

  adminMarkAdvancePaid: (token: string, id: string, utr: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/advance-paid`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ utr }),
    }),

  adminMarkBalanceReceived: (token: string, id: string, amount: string, utr: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/balance-received`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ amount, utr }),
    }),

  adminMarkBalancePaid: (token: string, id: string, utr: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/balance-paid`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ utr }),
    }),

  adminSetDiscrepancy: (token: string, id: string, notes?: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/discrepancy`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ notes }),
    }),

  adminClearDiscrepancy: (token: string, id: string) =>
    request<AdminPaymentTrackingLog>(`/admin/payment-tracking/${id}/discrepancy/clear`, {
      method: 'PATCH',
      token,
    }),

  adminListShippers: (token: string) => request<Shipper[]>('/admin/shippers', { token }),

  adminGetShipper: (token: string, id: string) => request<Shipper>(`/admin/shippers/${id}`, { token }),

  adminSuspendShipper: (token: string, id: string, isSuspended: boolean) =>
    request<Shipper>(`/admin/shippers/${id}/suspend`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isSuspended }),
    }),

  adminListSupportTickets: (token: string, status?: string) =>
    request<AdminSupportTicket[]>(`/admin/support-tickets${status ? `?status=${status}` : ''}`, { token }),

  adminGetSupportTicket: (token: string, id: string) =>
    request<AdminSupportTicket>(`/admin/support-tickets/${id}`, { token }),

  adminUpdateSupportTicket: (
    token: string,
    id: string,
    data: { status?: string; notes?: string; assignToSelf?: boolean },
  ) =>
    request<AdminSupportTicket>(`/admin/support-tickets/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  adminSendSupportTicketMessage: (token: string, ticketId: string, body: string, file?: File) => {
    const form = new FormData();
    if (body) form.append('body', body);
    if (file) form.append('file', file);
    return request<SupportTicketMessage>(`/admin/support-tickets/${ticketId}/messages`, {
      method: 'POST',
      token,
      body: form,
    });
  },

  adminListSupportTicketMessages: (token: string, ticketId: string) =>
    request<SupportTicketMessage[]>(`/admin/support-tickets/${ticketId}/messages`, { token }),

  adminListAdminUsers: (token: string) => request<AdminUserListItem[]>('/admin/users', { token }),

  adminCreateAdminUser: (
    token: string,
    data: { name: string; email: string; password: string; role: AdminUser['role'] },
  ) =>
    request<AdminUserListItem>('/admin/users', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  adminUpdateAdminUser: (token: string, id: string, data: { role?: AdminUser['role']; isActive?: boolean }) =>
    request<AdminUserListItem>(`/admin/users/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),
};

export interface PaymentTrackingLog {
  id: string;
  bookingId: string;
  advanceAmount: string | null;
  advanceReceivedAt: string | null;
  balanceAmount: string | null;
  balanceReceivedAt: string | null;
  status: 'awaiting_advance' | 'advance_settled' | 'awaiting_balance' | 'fully_settled';
  discrepancyFlag: boolean;
  discrepancyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostingDestination {
  id: string;
  lat: string;
  lng: string;
  label: string | null;
  cityLabel: string | null;
}

export interface Posting {
  id: string;
  source: 'carrier_manual' | 'shipper_manual' | 'platform_predicted' | 'carrier_self_declared';
  postedByCarrierId: string | null;
  postedByShipperId: string | null;
  vehicleId: string | null;
  originLat: string;
  originLng: string;
  originLabel: string | null;
  originCityLabel: string | null;
  availableFromDate: string;
  availableToDate: string;
  priceType: 'fixed' | 'open_to_offers';
  priceAmount: string | null;
  priceMin: string | null;
  priceMax: string | null;
  loadType: 'full' | 'part_load_ok';
  status: 'active' | 'matched' | 'expired' | 'cancelled';
  optionalNote: string | null;
  requiredTruckType: string | null;
  requiredCapacityTons: string | null;
  cargoType: CargoType | null;
  createdAt: string;
  destinations: PostingDestination[];
  distanceKm?: number | null;
  bookings?: { status: Booking['status'] }[];
  postedBy?: { name: string; verified: boolean; rating: number | null; ratingCount: number } | null;
  equipment?: { truckType: string | null; capacityTons: string | null } | null;
  savedByMe?: boolean;
  // How high a carrier can negotiate a fixed-price load — computed server-side
  // from the shipper's private actual budget (priceMax) minus the platform
  // margin. priceMax itself is only ever present when you own the posting.
  negotiationCeiling?: number | null;
  // Only populated on the single-posting fetch (getPosting), not on list/search
  // results. phone is null until a booking exists between you and this
  // posting — kept off the load board to stop contact scraping pre-booking.
  contact?: PostingContact | null;
}

export interface PostingContact {
  partyType: 'shipper' | 'carrier';
  fullName: string;
  phone: string | null;
  email: string | null;
  // shipper-only
  businessName?: string | null;
  businessType?: string | null;
  industryType?: string | null;
  gstin?: string | null;
  businessAddress?: string | null;
  isVerified?: boolean;
  // carrier-only
  verificationTier?: 'basic' | 'verified' | 'trust_boosted';
  isOwnerOperator?: boolean;
  vehicles?: { truckType: string; capacityTons: string; registrationNumber: string }[];
}

export interface MatchingCarrier {
  carrierId: string;
  fullName: string;
  whatsappNumber: string | null;
  phone: string;
  vehicleId: string;
  truckType: string;
  capacityTons: number;
  distanceKm: number;
  rating: number | null;
  ratingCount: number;
  verificationTier: 'basic' | 'verified' | 'trust_boosted';
  hasDeclaredAvailability: boolean;
  onRegisteredLane: boolean;
  usedLiveLocation: boolean;
  score: number;
  reasons: string[];
}

export interface MatchingCarriersResult {
  items: MatchingCarrier[];
  // 100 normally; 200 if nothing matched within 100km and the search
  // automatically widened.
  searchRadiusKm: number;
}

export interface PaginatedPostings {
  items: Posting[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Vehicle {
  id: string;
  carrierId: string;
  registrationNumber: string;
  truckType: string;
  capacityTons: string;
  numberOfAxles: number | null;
  cargoTypes: string[];
  rcVerifiedAt: string | null;
  rcUrl: string | null;
  insuranceUrl: string | null;
  fitnessUrl: string | null;
  pucUrl: string | null;
  permitUrl: string | null;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
  photoRearUrl: string | null;
  cargoPhotoUrl: string | null;
  numberPlatePhotoUrl: string | null;
  walkaroundVideoUrl: string | null;
  driverPhotoUrl: string | null;
  driverLicenseUrl: string | null;
}

// Shape returned by GET /driver/me — deliberately narrower than Vehicle/
// AdminVehicle: no financial data, no other trucks, matching the driver
// permission boundary enforced server-side by DriversService.getMyVehicle.
export interface DriverVehicle {
  id: string;
  registrationNumber: string;
  truckType: string;
  capacityTons: string;
  numberOfAxles: number | null;
  cargoTypes: string[];
  verificationStatus: 'pending' | 'approved' | 'rejected';
  rcVerifiedAt: string | null;
  driverName: string | null;
  driverAuthorizedAt: string | null;
  ownerFullName: string;
  documents: {
    rc: boolean;
    insurance: boolean;
    fitness: boolean;
    puc: boolean;
    permit: boolean;
    photoFront: boolean;
    photoSide: boolean;
    photoRear: boolean;
    cargoPhoto: boolean;
    numberPlatePhoto: boolean;
    walkaroundVideo: boolean;
    driverPhoto: boolean;
    driverLicense: boolean;
  };
}

export interface Booking {
  id: string;
  postingId: string;
  carrierId: string;
  shipperId: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'completed' | 'cancelled';
  bookingType: 'instant_book' | 'negotiated';
  agreedPrice: string | null;
  createdAt: string;
  updatedAt: string;
  posting?: Posting;
  counterpartyContact?: { name: string; phone: string; whatsappNumber?: string | null } | null;
  reviews?: Review[];
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerType: 'carrier' | 'shipper';
  revieweeId: string;
  revieweeType: 'carrier' | 'shipper';
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface LocationPing {
  id: string;
  vehicleId: string;
  lat: string;
  lng: string;
  speedKmh: string | null;
  source: 'device' | 'browser';
  recordedAt: string;
  createdAt: string;
}

export interface BookingTracking {
  vehicleId: string | null;
  // True when the tracked vehicle has a hardware GPS tracker registered —
  // it reports automatically, so the manual "share my location" toggle
  // should be hidden rather than offered as a redundant option.
  hasDevice: boolean;
  latestPing: LocationPing | null;
  history: LocationPing[];
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderType: 'carrier' | 'shipper';
  body: string;
  createdAt: string;
}

export interface LanePreference {
  id: string;
  userId: string;
  userType: 'carrier' | 'shipper';
  originLabel: string;
  originLat: string;
  originLng: string;
  destinationLabel: string;
  destinationLat: string;
  destinationLng: string;
  radiusKm: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  userType: 'carrier' | 'shipper';
  type: 'lane_match' | 'broadcast' | 'booking_update';
  payload: { postingId?: string };
  readAt: string | null;
  createdAt: string;
}

export type CargoType = 'general' | 'refrigerated' | 'hazardous' | 'fragile' | 'livestock' | 'oversized';

export interface VehicleRegistrationFields {
  registrationNumber: string;
  truckType: string;
  capacityTons: string;
  cargoTypes: CargoType[];
  numberOfAxles?: number;
  upiId?: string;
  isOwnerDriver?: boolean;
  driverName?: string;
  driverPhone?: string;
  driverWhatsappVerificationToken?: string;
  // Required whenever a driver other than the account holder is named —
  // explicit consent that this driver may post this truck and accept loads
  // on the owner's behalf (see DriverAccessGuard).
  driverAuthorized?: boolean;
  homeBaseLat?: number;
  homeBaseLng?: number;
  preferredLanes: { originLabel: string; destinationLabel: string }[];
}

// For non-owner-operator carriers adding a truck after registration — driver
// details and a WhatsApp verification token for the driver are always
// required, unlike VehicleRegistrationFields where they're conditional.
export interface AddVehicleFields {
  registrationNumber: string;
  truckType: string;
  capacityTons: string;
  cargoTypes: CargoType[];
  numberOfAxles?: number;
  upiId?: string;
  homeBaseLat?: number;
  homeBaseLng?: number;
  driverName: string;
  driverPhone: string;
  driverWhatsappVerificationToken: string;
  // Explicit owner consent that this driver may post this truck and accept
  // loads on the owner's behalf (see DriverAccessGuard) — always required
  // here, since AddVehicleFields is only ever used for a driver-driven truck.
  driverAuthorized: boolean;
  preferredLanes: { originLabel: string; destinationLabel: string }[];
}

export type KycDocType = 'aadhaar' | 'pan' | 'face_match' | 'driving_license' | 'bank_account' | 'gstin';

export interface KycVerification {
  id: string;
  phone: string;
  docType: KycDocType;
  status: 'pending' | 'verified' | 'failed';
  referenceId: string | null;
  resultData: Record<string, unknown> | null;
  verifiedAt: string | null;
}

export type ChangeableFieldName =
  | 'aadhaarNumber'
  | 'panNumber'
  | 'gstin'
  | 'whatsappNumber'
  | 'registrationNumber'
  | 'truckType'
  | 'capacityTons';

export interface ChangeRequest {
  id: string;
  accountId: string;
  accountType: 'carrier' | 'shipper';
  vehicleId: string | null;
  fieldName: ChangeableFieldName;
  currentValue: string | null;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminChangeRequest extends ChangeRequest {
  account: { fullName: string; phone: string } | null;
  vehicle: { id: string; registrationNumber: string } | null;
}

export interface Carrier {
  id: string;
  fullName: string;
  phone: string;
  username: string | null;
  email: string | null;
  whatsappNumber: string | null;
  isOwnerOperator: boolean;
  truckCount: number | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  verificationTier: 'basic' | 'verified' | 'trust_boosted';
  preferredLanguage: string;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shipper {
  id: string;
  fullName: string;
  phone: string;
  username: string | null;
  whatsappNumber: string | null;
  email: string | null;
  businessName: string | null;
  businessType: string | null;
  gstin: string | null;
  panNumber: string | null;
  paymentUpiId: string | null;
  industryType: string | null;
  shipmentVolume: string | null;
  businessAddress: string | null;
  isVerified: boolean;
  preferredLanguage: string;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBooking extends Booking {
  posting: Posting;
  carrier: { id: string; fullName: string; phone: string } | null;
  shipper: { id: string; fullName: string; phone: string } | null;
}

export interface AdminPaymentTrackingLog {
  id: string;
  bookingId: string;
  booking: Booking & { posting: Posting };
  carrier: { id: string; fullName: string; phone: string } | null;
  shipper: { id: string; fullName: string; phone: string } | null;
  advanceAmount: string | null;
  advanceReceivedAt: string | null;
  advanceReceivedUtr: string | null;
  advanceReceivedByAdminId: string | null;
  advancePaidAt: string | null;
  advancePaidUtr: string | null;
  advancePaidByAdminId: string | null;
  balanceAmount: string | null;
  balanceReceivedAt: string | null;
  balanceReceivedUtr: string | null;
  balanceReceivedByAdminId: string | null;
  balancePaidAt: string | null;
  balancePaidUtr: string | null;
  balancePaidByAdminId: string | null;
  platformMargin: string | null;
  status: 'awaiting_advance' | 'advance_settled' | 'awaiting_balance' | 'fully_settled';
  discrepancyFlag: boolean;
  discrepancyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'support' | 'ops' | 'super_admin';
}

export interface AdminUserListItem extends AdminUser {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminVehicle extends Vehicle {
  driverName: string | null;
  driverPhone: string | null;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  insuranceExpiryDate: string | null;
  fitnessExpiryDate: string | null;
  pucExpiryDate: string | null;
  permitExpiryDate: string | null;
  photoUrls: string[];
  upiId: string | null;
}

export interface AdminCarrierListItem extends Carrier {
  _count: { vehicles: number };
}

export interface AdminCarrierDetail extends Carrier {
  vehicles: AdminVehicle[];
}

export interface SupportTicket {
  id: string;
  relatedBookingId: string | null;
  relatedCarrierId: string | null;
  relatedShipperId: string | null;
  raisedBy: string;
  issueSummary: string;
  status: 'open' | 'in_progress' | 'resolved';
  handledByAdminId: string | null;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  raiserLastReadAt: string | null;
}

export interface AdminSupportTicket extends SupportTicket {
  raiser: { id: string; fullName: string; phone: string } | null;
  raiserType: 'carrier' | 'shipper';
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastMessageAttachmentName: string | null;
  lastMessageSenderType: 'admin' | 'carrier' | 'shipper' | null;
  needsReply: boolean;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderType: 'admin' | 'carrier' | 'shipper';
  senderAdminId: string | null;
  body: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  createdAt: string;
}
