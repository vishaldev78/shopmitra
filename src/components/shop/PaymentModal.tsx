'use client';

/**
 * In-page secure payment overlay.
 *
 * The customer never leaves the store: the hosted checkout page renders as an
 * overlay INSIDE this app (official checkout web SDK), while this card watches
 * the order status server-side and moves to success/failure the moment the
 * payment settles. If the overlay SDK cannot load (old browser, blocked
 * script), the card falls back to a same-tab secure redirect that lands back
 * on the in-app payment confirmation page when done.
 *
 * For the sandbox provider (no gateway connectivity) the card shows demo
 * controls instead — completing or failing the payment is an explicit user
 * action that carries the unguessable `sim_…` reference issued at checkout.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Lock, ShieldCheck, Loader2, CheckCircle2, XCircle,
  AlertTriangle, RotateCcw, ExternalLink,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export type PaymentProvider = 'dodo' | 'simulated';
export type PaymentOutcome = 'succeeded' | 'failed';

type Phase = 'opening' | 'awaiting' | 'sdk_unavailable' | 'window_closed' | 'success' | 'failed' | 'demo';

const POLL_INTERVAL_MS = 2500;

/* ------------------------------------------------------------------ */
/* Checkout web SDK — initialized once per page load, events bridged   */
/* to the active overlay instance through a module-level ref.          */
/* ------------------------------------------------------------------ */

type SdkModule = typeof import('dodopayments-checkout');
type CheckoutEventName =
  | 'checkout.opened' | 'checkout.payment_page_opened' | 'checkout.closed' | 'checkout.error';

const sdkState: { module: SdkModule | null; initialized: boolean } = { module: null, initialized: false };
const sdkEventSink: { current: ((type: CheckoutEventName) => void) | null } = { current: null };

async function loadCheckoutSdk(mode: 'test' | 'live'): Promise<SdkModule> {
  if (sdkState.module) return sdkState.module;
  const mod = await import('dodopayments-checkout');
  if (!sdkState.initialized) {
    mod.DodoPayments.Initialize({
      mode,
      displayType: 'overlay',
      onEvent: (event) => {
        sdkEventSink.current?.(event.event_type as CheckoutEventName);
      },
    });
    sdkState.initialized = true;
  }
  sdkState.module = mod;
  return mod;
}

interface PaymentModalProps {
  open: boolean;
  orderNumber: string;
  amount: number;
  provider: PaymentProvider;
  checkoutUrl: string;
  /** Gateway environment — drives the overlay SDK mode. */
  paymentMode?: 'test' | 'live';
  /** Unguessable reference for simulated payments — required to finalize them. */
  simulatedPaymentId?: string | null;
  /** Fires once when the payment settles; parent clears cart + redirects. */
  onFinalized: (orderNumber: string, outcome: PaymentOutcome) => void;
  /** Re-opens the payment session for the same order (retry after failure). */
  onRetry: () => void;
  /** Dismiss the overlay — the order stays pending and can be paid later. */
  onClose: () => void;
}

export function PaymentModal({
  open, orderNumber, amount, provider, checkoutUrl,
  paymentMode = 'test', simulatedPaymentId, onFinalized, onRetry, onClose,
}: PaymentModalProps) {
  const [phase, setPhase] = useState<Phase>(provider === 'simulated' ? 'demo' : 'opening');
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const settledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset internal state whenever a new payment session starts.
  useEffect(() => {
    if (!open) return;
    settledRef.current = false;
    if (provider === 'simulated') setPhase('demo');
  }, [open, provider]);

  // Open the in-app checkout overlay and keep server-side status polling.
  useEffect(() => {
    if (!open || provider !== 'dodo') return;
    let cancelled = false;

    setPhase('opening');
    loadCheckoutSdk(paymentMode)
      .then((mod) => {
        if (cancelled) return;
        mod.DodoPayments.Checkout.open({ checkoutUrl });
        setPhase('awaiting');
      })
      .catch(() => {
        if (!cancelled) setPhase('sdk_unavailable');
      });

    sdkEventSink.current = (type) => {
      if (settledRef.current) return;
      if (type === 'checkout.closed' && phaseRef.current !== 'success' && phaseRef.current !== 'failed') {
        setPhase('window_closed');
      }
    };

    return () => {
      cancelled = true;
      sdkEventSink.current = null;
      try {
        sdkState.module?.DodoPayments.Checkout.close(false);
      } catch {
        /* overlay already gone */
      }
    };
  }, [open, provider, checkoutUrl, paymentMode]);

  // Live status polling while the checkout overlay is open (source of truth
  // is always the server, never anything the client claims).
  useEffect(() => {
    if (!open || provider !== 'dodo') return;

    const check = async () => {
      if (settledRef.current) return;
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_number: orderNumber }),
        });
        const data = await res.json();
        if (settledRef.current || !res.ok || !data.success) return;
        if (data.state === 'succeeded' || data.state === 'failed') {
          settledRef.current = true;
          stopPolling();
          setPhase(data.state === 'succeeded' ? 'success' : 'failed');
          onFinalized(orderNumber, data.state);
        }
      } catch {
        // transient network error — next tick retries
      }
    };

    timerRef.current = setInterval(check, POLL_INTERVAL_MS);
    return stopPolling;
  }, [open, provider, orderNumber, onFinalized, stopPolling]);

  // Manual status check for the "closed early" state.
  const checkNow = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber }),
      });
      const data = await res.json();
      if (res.ok && data.success && (data.state === 'succeeded' || data.state === 'failed') && !settledRef.current) {
        settledRef.current = true;
        stopPolling();
        setPhase(data.state === 'succeeded' ? 'success' : 'failed');
        onFinalized(orderNumber, data.state);
        return;
      }
      if (sdkState.module?.DodoPayments.Checkout.isOpen()) setPhase('awaiting');
    } finally {
      setChecking(false);
    }
  };

  // Sandbox demo actions — explicit, reference-bound finalization.
  const simulatePayment = async (outcome: PaymentOutcome) => {
    setChecking(true);
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          payment_id: simulatedPaymentId,
          status: outcome,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && (data.state === 'succeeded' || data.state === 'failed')) {
        settledRef.current = true;
        setPhase(data.state === 'succeeded' ? 'success' : 'failed');
        onFinalized(orderNumber, data.state);
      }
    } finally {
      setChecking(false);
    }
  };

  // Same-tab secure redirect fallback — the gateway lands back on the
  // in-app confirmation page when the payment completes.
  const redirectToSecurePage = () => {
    window.location.href = checkoutUrl;
  };

  const reopenOverlay = async () => {
    try {
      const mod = await loadCheckoutSdk(paymentMode);
      mod.DodoPayments.Checkout.open({ checkoutUrl });
      setPhase('awaiting');
    } catch {
      setPhase('sdk_unavailable');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Secure payment"
    >
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
              <Lock size={15} className="text-green-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900 leading-tight">Secure Payment</p>
              <p className="text-[11px] text-navy-400 leading-tight">256-bit SSL encrypted</p>
            </div>
          </div>
          {phase !== 'success' && (
            <button
              onClick={() => { stopPolling(); onClose(); }}
              aria-label="Close payment dialog"
              className="p-1.5 rounded-lg text-navy-400 hover:bg-gray-100 hover:text-navy-700 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Amount */}
        <div className="px-5 pt-5 pb-1 text-center">
          <p className="text-xs text-navy-400 uppercase tracking-wide">Paying for order</p>
          <p className="text-sm font-medium text-navy-700 mt-0.5">{orderNumber}</p>
          <p className="text-3xl font-bold text-navy-900 mt-2">{formatPrice(amount)}</p>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-3">
          {(phase === 'opening' || phase === 'awaiting') && (
            <div className="text-center space-y-4">
              <Loader2 size={36} className="animate-spin text-primary-600 mx-auto" />
              <p className="text-sm text-navy-600 font-medium">
                {phase === 'opening' ? 'Opening secure payment…' : 'Waiting for your payment…'}
              </p>
              <p className="text-xs text-navy-400 -mt-2">
                Complete the payment in the secure window. This page updates automatically.
              </p>
              <button
                onClick={reopenOverlay}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-navy-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <ExternalLink size={15} /> Reopen payment window
              </button>
            </div>
          )}

          {phase === 'sdk_unavailable' && (
            <div className="space-y-4 text-center">
              <span className="inline-flex w-12 h-12 bg-amber-50 rounded-full items-center justify-center">
                <AlertTriangle size={22} className="text-amber-600" />
              </span>
              <p className="text-sm text-navy-600 font-medium">Continue to secure payment</p>
              <p className="text-xs text-navy-400 -mt-2">
                The embedded payment window could not start on this browser. Continue on the secure
                payment page — you&apos;ll be brought right back here when it&apos;s done.
              </p>
              <button
                onClick={redirectToSecurePage}
                className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Pay {formatPrice(amount)} Securely
              </button>
            </div>
          )}

          {phase === 'window_closed' && (
            <div className="space-y-4 text-center">
              <span className="inline-flex w-12 h-12 bg-amber-50 rounded-full items-center justify-center">
                <AlertTriangle size={22} className="text-amber-600" />
              </span>
              <p className="text-sm text-navy-600 font-medium">Payment window closed</p>
              <p className="text-xs text-navy-400 -mt-2">
                If you already completed the payment, we&apos;ll verify it. Otherwise reopen the window to try again.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={checkNow}
                  disabled={checking}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-navy-700 hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checking ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Check status
                </button>
                <button
                  onClick={reopenOverlay}
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
                >
                  Reopen window
                </button>
              </div>
            </div>
          )}

          {phase === 'demo' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Sandbox checkout — no real money moves. Choose the outcome below; the order is
                    finalized exactly like a live payment.
                  </span>
                </p>
              </div>
              <button
                onClick={() => simulatePayment('succeeded')}
                disabled={checking}
                className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Complete Payment · {formatPrice(amount)}
              </button>
              <button
                onClick={() => simulatePayment('failed')}
                disabled={checking}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-navy-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Simulate payment failure
              </button>
            </div>
          )}

          {phase === 'success' && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 size={44} className="text-green-600 mx-auto" />
              <p className="text-base font-bold text-navy-900">Payment successful</p>
              <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                <ShieldCheck size={13} /> Payment verified
              </p>
              <p className="text-xs text-navy-400">Taking you to your order…</p>
            </div>
          )}

          {phase === 'failed' && (
            <div className="text-center space-y-3 py-2">
              <XCircle size={44} className="text-red-500 mx-auto" />
              <p className="text-base font-bold text-navy-900">Payment failed</p>
              <p className="text-xs text-navy-400">You were not charged. Your order is saved — you can retry.</p>
              <button
                onClick={onRetry}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Try again
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-navy-500 hover:text-navy-700 transition"
              >
                Pay later from your orders
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
