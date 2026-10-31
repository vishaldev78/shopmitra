'use client';

/**
 * Delivery-address form used on checkout and the account addresses page.
 * Indian-market conveniences: one-tap "detect my location" (fills city,
 * state and PIN code from GPS) and PIN-code lookup (fills city/state from
 * the India Post directory). Purely assistive — every field stays editable.
 */

import { useState } from 'react';
import { MapPin, Loader2, Navigation, LocateFixed } from 'lucide-react';
import type { SavedAddress } from '@/lib/types';

export interface AddressFormData {
  /** Free text shown as a chip (UI offers Home / Work / Other shortcuts). */
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressFormProps {
  initial?: Partial<AddressFormData>;
  submitLabel?: string;
  /** Parent performs the actual persistence; return false to keep the form open. */
  onSave: (data: AddressFormData) => Promise<boolean>;
  onCancel?: () => void;
  onNotify?: (type: 'success' | 'error', message: string) => void;
  compact?: boolean;
}

const emptyForm: AddressFormData = {
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

export function AddressForm({ initial, submitLabel = 'Save Address', onSave, onCancel, onNotify, compact }: AddressFormProps) {
  const [values, setValues] = useState<AddressFormData>({ ...emptyForm, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pinLooking, setPinLooking] = useState(false);

  const set = (key: keyof AddressFormData, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const notify = (type: 'success' | 'error', message: string) => onNotify?.(type, message);

  // ── Current-location detection (GPS + reverse geocoding) ────────────────
  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      notify('error', 'Location is not supported on this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const a = data?.address ?? {};
          const city = a.city || a.town || a.village || a.county || a.district || '';
          const state = a.state || '';
          const pin = (a.postcode || '').replace(/\D/g, '').slice(0, 6);
          setValues((v) => ({
            ...v,
            city: city || v.city,
            state: state || v.state,
            postalCode: pin || v.postalCode,
          }));
          if (city || state || pin) {
            notify('success', 'Location detected — please review the details');
          } else {
            notify('error', 'Could not read your area details — please fill them in');
          }
        } catch {
          notify('error', 'Could not detect your area — please fill the details manually');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        notify('error', 'Location permission denied — please enter the address manually');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  };

  // ── PIN-code → city/state lookup (India Post directory) ─────────────────
  const lookupPincode = async (pin: string) => {
    if (pin.length !== 6) return;
    setPinLooking(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const rec = Array.isArray(data) ? data[0] : null;
      if (rec?.Status === 'Success' && rec.PostOffice?.length) {
        const po = rec.PostOffice[0];
        setValues((v) => ({
          ...v,
          city: v.city || po.Block || po.District || '',
          state: v.state || po.State || '',
        }));
      }
    } catch {
      /* silent — the field stays manual */
    } finally {
      setPinLooking(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!values.fullName.trim()) e.fullName = 'Required';
    if (!/^\d{10}$/.test(values.phone.trim())) e.phone = 'Valid 10-digit phone required';
    if (!values.addressLine1.trim()) e.addressLine1 = 'Required';
    if (!values.city.trim()) e.city = 'Required';
    if (!values.state.trim()) e.state = 'Required';
    if (!/^\d{6}$/.test(values.postalCode.trim())) e.postalCode = 'Valid 6-digit PIN required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const ok = await onSave({ ...values, country: values.country || 'India' });
      if (!ok) return;
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (key: string) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      errors[key] ? 'border-red-300' : 'border-gray-200'
    }`;

  const labelCls = 'block text-sm font-medium text-navy-700 mb-1';

  return (
    <div className={compact ? 'space-y-4' : 'space-y-4 animate-fade-in'}>
      {/* Assists row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={detectLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition disabled:opacity-60"
        >
          {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
          {locating ? 'Detecting…' : 'Use my current location'}
        </button>
        {pinLooking && (
          <span className="inline-flex items-center gap-1 text-[11px] text-navy-400">
            <Loader2 size={11} className="animate-spin" /> checking PIN…
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Full Name *</label>
          <input type="text" value={values.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputCls('fullName')} placeholder="Full name" autoComplete="name" />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <input type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={inputCls('phone')} placeholder="10-digit mobile number" autoComplete="tel" inputMode="numeric" />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Flat, House no., Building, Area *</label>
          <input type="text" value={values.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className={inputCls('addressLine1')} placeholder="House no., street, area" autoComplete="address-line1" />
          {errors.addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Landmark (optional)</label>
          <input type="text" value={values.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className={inputCls('addressLine2')} placeholder="Near… / landmark" autoComplete="address-line2" />
        </div>
        <div>
          <label className={labelCls}>Pincode *</label>
          <div className="relative">
            <input type="text" value={values.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))} onBlur={(e) => lookupPincode(e.target.value)} className={inputCls('postalCode')} placeholder="6-digit PIN" autoComplete="postal-code" inputMode="numeric" />
            {pinLooking && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-navy-300" />}
          </div>
          {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode}</p>}
        </div>
        <div>
          <label className={labelCls}>City *</label>
          <input type="text" value={values.city} onChange={(e) => set('city', e.target.value)} className={inputCls('city')} placeholder="City / town" autoComplete="address-level2" />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className={labelCls}>State *</label>
          <input type="text" value={values.state} onChange={(e) => set('state', e.target.value)} className={inputCls('state')} placeholder="State" autoComplete="address-level1" />
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
        <div>
          <label className={labelCls}>Address Type</label>
          <div className="flex gap-2">
            {(['Home', 'Work', 'Other'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set('label', l)}
                className={`px-4 py-2 text-sm rounded-lg border transition ${
                  values.label === l ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-navy-600 hover:bg-gray-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50 transition">
            Cancel
          </button>
        )}
        <span className="hidden sm:flex items-center gap-1 text-xs text-navy-400 ml-auto">
          <MapPin size={12} /> Used only to deliver your order
        </span>
      </div>
    </div>
  );
}

/** Compact one-line summary of an address (used in collapsed steps). */
export function AddressSummaryLine({ address }: { address: Pick<SavedAddress, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode'> }) {
  return (
    <span>
      {address.addressLine1}
      {address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} — {address.postalCode}
    </span>
  );
}
