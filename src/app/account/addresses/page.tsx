'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { SavedAddress } from '@/lib/types';
import { AddressForm, type AddressFormData } from '@/components/shop/AddressForm';
import { SkeletonLine } from '@/components/shop/Skeletons';

type Editor = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; address: SavedAddress };

export default function AccountAddresses() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' });
  const [removing, setRemoving] = useState<string | null>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    dispatch({ type: 'SET_NOTIFICATION', notification: { type, message } });
  }, [dispatch]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.status === 401) return;
      const data = await res.json();
      setAddresses(data.addresses ?? []);
    } catch {
      /* keep whatever we have */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (state.dbReady && state.isLoggedIn && !loaded) {
      setLoaded(true);
      load();
    }
  }, [state.dbReady, state.isLoggedIn, loaded, load]);

  // Signed-out visitors go to sign-in and come straight back.
  useEffect(() => {
    if (state.dbReady && !state.isLoggedIn) {
      router.replace('/login?redirect=/account/addresses');
    }
  }, [state.dbReady, state.isLoggedIn]);

  const handleSave = async (data: AddressFormData): Promise<boolean> => {
    try {
      const editing = editor.mode === 'edit' ? editor.address.id : null;
      const res = await fetch(editing ? `/api/addresses/${editing}` : '/api/addresses', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const saved = await res.json();
      if (!res.ok || !saved.address) throw new Error(saved.error || 'Could not save the address');
      setEditor({ mode: 'closed' });
      await load();
      notify('success', editing ? 'Address updated' : 'Address saved');
      return true;
    } catch (error) {
      notify('error', (error as Error).message);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the address');
      await load();
      notify('success', 'Address removed');
    } catch (error) {
      notify('error', (error as Error).message);
    } finally {
      setRemoving(null);
    }
  };

  if (!state.dbReady) {
    return (
      <div className="shell py-10" role="status" aria-label="Loading addresses">
        <SkeletonLine className="h-8 w-56 mb-6" />
        <SkeletonLine className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!state.isLoggedIn) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-navy-500">
        <Loader2 size={28} className="animate-spin text-primary-600" />
        <p className="text-sm">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="shell py-6">
      <Link href="/account" className="flex items-center gap-2 text-sm text-navy-500 hover:text-primary-600 mb-5">
        <ArrowLeft size={16} /> Back to My Account
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2"><MapPin size={22} className="text-primary-600" /> Saved Addresses</h1>
          <p className="text-sm text-navy-500 mt-1">Addresses you save here are offered automatically at checkout.</p>
        </div>
        {editor.mode === 'closed' && (
          <button
            onClick={() => setEditor({ mode: 'new' })}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
          >
            <Plus size={15} /> Add New
          </button>
        )}
      </div>

      {editor.mode !== 'closed' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 max-w-3xl">
          <p className="text-sm font-semibold text-navy-900 mb-4">
            {editor.mode === 'edit' ? 'Edit address' : 'Add a new address'}
          </p>
          <AddressForm
            initial={editor.mode === 'edit' ? editor.address : { fullName: state.user?.name || '' }}
            submitLabel={editor.mode === 'edit' ? 'Save Changes' : 'Save Address'}
            onSave={handleSave}
            onCancel={() => setEditor({ mode: 'closed' })}
            onNotify={notify}
          />
        </div>
      ) : null}

      {addresses.length === 0 && editor.mode === 'closed' ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <MapPin size={40} className="text-navy-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-semibold text-navy-900 mb-1">No saved addresses yet</p>
          <p className="text-sm text-navy-500 mb-5">Add one now — checkout will never ask for it again.</p>
          <button
            onClick={() => setEditor({ mode: 'new' })}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add Address
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`border-2 rounded-xl p-5 ${a.isDefault ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-semibold text-navy-900 text-sm">{a.fullName}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-900 text-white px-1.5 py-0.5 rounded">{a.label}</span>
                {a.isDefault && <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">DEFAULT</span>}
              </div>
              <p className="text-sm text-navy-600">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</p>
              <p className="text-sm text-navy-600">{a.city}, {a.state} — {a.postalCode}</p>
              <p className="text-xs text-navy-400 mt-1">Phone: {a.phone}</p>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setEditor({ mode: 'edit', address: a })}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={removing === a.id}
                  className="text-xs font-medium text-navy-400 hover:text-red-600 transition flex items-center gap-1 disabled:opacity-50"
                >
                  {removing === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
