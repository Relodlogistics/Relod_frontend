'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, ChangeRequest } from '@/lib/api';
import type { Session } from '@/lib/session-context';

type ChangeableFieldName = ChangeRequest['fieldName'];

// Shared state/actions behind every RequestableField on the account-level
// Identity page and the per-vehicle fields on the Vehicles page — pulled out
// of the old single settings page so both routes can use it without
// duplicating the request/cancel/submit plumbing.
export function useChangeRequests(session: Session | null, t: (key: string) => string) {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [openRequestField, setOpenRequestField] = useState<ChangeableFieldName | null>(null);
  const [openRequestVehicleId, setOpenRequestVehicleId] = useState<string | undefined>(undefined);
  const [requestValue, setRequestValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api.listMyChangeRequests(session.accessToken).then(setChangeRequests).catch(() => undefined);
  }, [session]);

  const pendingRequestFor = (field: ChangeableFieldName, vehicleId?: string) =>
    changeRequests.find(
      (r) => r.fieldName === field && (r.vehicleId ?? undefined) === vehicleId && r.status === 'pending',
    );

  const lastReviewedRequestFor = (field: ChangeableFieldName, vehicleId?: string) =>
    changeRequests.find(
      (r) => r.fieldName === field && (r.vehicleId ?? undefined) === vehicleId && r.status !== 'pending',
    );

  const handleOpenRequest = (field: ChangeableFieldName, vehicleId?: string) => {
    setOpenRequestField(field);
    setOpenRequestVehicleId(vehicleId);
    setRequestValue('');
    setRequestReason('');
    setRequestError(null);
  };

  const handleCancelRequest = () => {
    setOpenRequestField(null);
    setOpenRequestVehicleId(undefined);
  };

  const handleSubmitRequest = async () => {
    if (!session || !openRequestField) return;
    setRequestError(null);
    setRequestSubmitting(true);
    try {
      const created = await api.createChangeRequest(session.accessToken, {
        fieldName: openRequestField,
        vehicleId: openRequestVehicleId,
        requestedValue: requestValue,
        reason: requestReason,
      });
      setChangeRequests((prev) => [created, ...prev]);
      setOpenRequestField(null);
      setOpenRequestVehicleId(undefined);
    } catch (e) {
      setRequestError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setRequestSubmitting(false);
    }
  };

  return {
    changeRequests,
    pendingRequestFor,
    lastReviewedRequestFor,
    openRequestField,
    openRequestVehicleId,
    requestValue,
    setRequestValue,
    requestReason,
    setRequestReason,
    requestSubmitting,
    requestError,
    handleOpenRequest,
    handleCancelRequest,
    handleSubmitRequest,
  };
}
