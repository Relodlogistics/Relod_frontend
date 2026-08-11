'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, clearSession } = useSession();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('proprietorship');
  const [gstin, setGstin] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [paymentUpiId, setPaymentUpiId] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [shipmentVolume, setShipmentVolume] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    const load = session.userType === 'carrier' ? api.getCarrierProfile : api.getShipperProfile;
    load(session.accessToken, session.accountId).then((profile) => {
      setFullName(profile.fullName);
      setEmail(profile.email ?? '');
      setPreferredLanguage(profile.preferredLanguage);
      setCurrentUsername(profile.username);
      setUsername(profile.username ?? '');
      if ('businessName' in profile) {
        setBusinessName(profile.businessName ?? '');
        setBusinessType(profile.businessType ?? 'proprietorship');
        setGstin(profile.gstin ?? '');
        setBusinessAddress(profile.businessAddress ?? '');
        setPaymentUpiId(profile.paymentUpiId ?? '');
        setIndustryType(profile.industryType ?? '');
        setShipmentVolume(profile.shipmentVolume ?? '');
      }
    });
  }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      if (session.userType === 'carrier') {
        await api.updateCarrierProfile(session.accessToken, session.accountId, {
          fullName,
          email: email || undefined,
          preferredLanguage,
        });
      } else {
        await api.updateShipperProfile(session.accessToken, session.accountId, {
          fullName,
          email: email || undefined,
          businessName: businessName || undefined,
          businessType,
          gstin: gstin || undefined,
          businessAddress: businessAddress || undefined,
          paymentUpiId: paymentUpiId || undefined,
          industryType: industryType || undefined,
          shipmentVolume: shipmentVolume || undefined,
          preferredLanguage,
        });
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!session) return;
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settingsPage.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      await api.setPassword(session.accessToken, { username, password: newPassword });
      setPasswordSaved(true);
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('settingsPage.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>{t('settingsPage.saved')}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t('profile.fullName')}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('profile.email')}</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('verify.whatsappLanguageQuestion')}</Label>
            <p className="text-xs text-muted-foreground">{t('verify.whatsappLanguageHint')}</p>
            <Select value={preferredLanguage} onValueChange={(v) => v && setPreferredLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {session.userType === 'shipper' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessName')}</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessType')}</Label>
                <Select value={businessType} onValueChange={(v) => v && setBusinessType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietorship">{t('profile.businessTypeProprietorship')}</SelectItem>
                    <SelectItem value="partnership">{t('profile.businessTypePartnership')}</SelectItem>
                    <SelectItem value="company">{t('profile.businessTypeCompany')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.gstin')}</Label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessAddress')}</Label>
                <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.paymentUpiId')}</Label>
                <Input value={paymentUpiId} onChange={(e) => setPaymentUpiId(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.industryType')}</Label>
                <Input value={industryType} onChange={(e) => setIndustryType(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.shipmentVolume')}</Label>
                <Select value={shipmentVolume} onValueChange={(v) => v && setShipmentVolume(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.shipmentVolumePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">{t('profile.shipmentVolume1to5')}</SelectItem>
                    <SelectItem value="5-10">{t('profile.shipmentVolume5to10')}</SelectItem>
                    <SelectItem value="10+">{t('profile.shipmentVolume10plus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <p className="text-sm text-muted-foreground">{session.phone}</p>
          <Button onClick={handleSave} disabled={loading || !fullName} className="w-fit">
            {t('settingsPage.save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.password')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {currentUsername
              ? t('settingsPage.passwordHintExisting', { username: currentUsername })
              : t('settingsPage.passwordHint')}
          </p>
          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          {passwordSaved && (
            <Alert>
              <AlertDescription>{t('settingsPage.passwordSaved')}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t('settingsPage.username')}</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              name="relod-username"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('settingsPage.newPassword')}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              name="relod-new-password"
              placeholder={t('settingsPage.newPasswordPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('settingsPage.confirmPassword')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              name="relod-confirm-password"
            />
          </div>
          <Button
            onClick={handleSetPassword}
            disabled={passwordLoading || !username || newPassword.length < 8}
            className="w-fit"
          >
            {t('settingsPage.setPassword')}
          </Button>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={handleLogout} className="w-fit">
        {t('settingsPage.logout')}
      </Button>
    </div>
  );
}
