import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  'pk_live_51TK8Jo01tmZbQrzJLrrrGtFnxC51or7dWGTVRbW7m5pvpwUidIPk2UjboavxP5wcg3F0CI2STZadsUfLF1RU6DTd00NzaszOFs'
);

interface Props {
  clientSecret: string;
  mode: 'payment' | 'setup';
  onSuccess: () => void;
  onClose: () => void;
}

function CheckoutForm({ mode, onSuccess, onClose }: Omit<Props, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError('');
    setLoading(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'An error occurred.');
      setLoading(false);
      return;
    }

    const confirmArgs = {
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required' as const,
    };

    const result =
      mode === 'payment'
        ? await stripe.confirmPayment(confirmArgs)
        : await stripe.confirmSetup(confirmArgs);

    if (result.error) {
      setError(result.error.message ?? 'Payment failed.');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold disabled:opacity-60"
      >
        {loading ? 'Processing…' : mode === 'payment' ? 'Pay Now' : 'Save Card'}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="w-full py-2 text-gray-500 text-sm"
      >
        Cancel
      </button>
    </form>
  );
}

export default function PaymentModal({ clientSecret, mode, onSuccess, onClose }: Props) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">
          {mode === 'payment' ? 'Pay Invoice' : 'Set Up Auto Pay'}
        </h2>
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: 'stripe' } }}
        >
          <CheckoutForm mode={mode} onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}
