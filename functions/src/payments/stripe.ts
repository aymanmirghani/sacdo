import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const user = userDoc.data();
  if (!user) throw new HttpsError('not-found', 'User not found.');

  const stripe = getStripe();

  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch (err: any) {
      const isMissing = err?.code === 'resource_missing' || err?.statusCode === 404 || err?.raw?.code === 'resource_missing';
      if (!isMissing) throw err;
      // Customer doesn't exist in this Stripe environment (e.g. switching test/live).
      // Fall through to create a new one.
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { userId },
  });

  await userRef.update({ stripeCustomerId: customer.id, stripePaymentMethodId: admin.firestore.FieldValue.delete() });
  return customer.id;
}

export const createPaymentIntent = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const { invoiceId } = request.data as { invoiceId: string };
    if (!invoiceId) throw new HttpsError('invalid-argument', 'invoiceId is required.');

    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) throw new HttpsError('not-found', 'Invoice not found.');
    const invoice = invoiceDoc.data()!;

    if (invoice.memberId !== request.auth.uid) throw new HttpsError('permission-denied', 'Access denied.');
    if (invoice.status === 'paid') throw new HttpsError('failed-precondition', 'Invoice is already paid.');

    const customerId = await getOrCreateStripeCustomer(request.auth.uid);
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(invoice.amount * 100), // dollars → cents
        currency: 'usd',
        customer: customerId,
        metadata: { invoiceId },
      },
      { idempotencyKey: invoiceId }
    );

    return { clientSecret: paymentIntent.client_secret };
  }
);

export const createSetupIntent = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const customerId = await getOrCreateStripeCustomer(request.auth.uid);
    const stripe = getStripe();

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      metadata: { userId: request.auth.uid },
    });

    return { setupIntentClientSecret: setupIntent.client_secret };
  }
);

export const handleStripeWebhook = onRequest(
  { secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      res.status(500).send('Webhook secret not configured.');
      return;
    }

    const stripe = getStripe();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          const invoiceId = pi.metadata?.invoiceId;
          if (invoiceId) {
            await db.collection('invoices').doc(invoiceId).update({
              status: 'paid',
              paidDate: admin.firestore.FieldValue.serverTimestamp(),
              paymentMethod: 'Credit Card',
              stripePaymentIntentId: pi.id,
            });
          }
          break;
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          console.error('Payment failed:', pi.id, 'Invoice:', pi.metadata?.invoiceId);
          break;
        }
        case 'setup_intent.succeeded': {
          const si = event.data.object;
          const userId = si.metadata?.userId;
          const paymentMethodId: string | null = si.payment_method
            ? (typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id)
            : null;
          if (userId && paymentMethodId) {
            await db.collection('users').doc(userId).update({ stripePaymentMethodId: paymentMethodId });
          }
          break;
        }
      }
    } catch (err: any) {
      console.error('Webhook handler error:', err.message);
      res.status(500).send('Internal error');
      return;
    }

    res.json({ received: true });
  }
);

// Called from invoice generation after new invoices are created.
// Charges all pending/overdue invoices that have autoPayEnabled=true
// for members with a saved payment method.
export async function processAutoPayInvoices(): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('Stripe not configured, skipping auto-pay processing.');
    return;
  }

  const stripe = getStripe();

  const snap = await db
    .collection('invoices')
    .where('status', 'in', ['pending', 'overdue'])
    .where('autoPayEnabled', '==', true)
    .get();

  if (snap.empty) return;

  for (const invoiceDoc of snap.docs) {
    const invoice = invoiceDoc.data();
    const invoiceId = invoiceDoc.id;

    const userDoc = await db.collection('users').doc(invoice.memberId).get();
    if (!userDoc.exists) continue;
    const user = userDoc.data()!;
    if (!user.stripePaymentMethodId || !user.stripeCustomerId) continue;

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: Math.round(invoice.amount * 100),
          currency: 'usd',
          customer: user.stripeCustomerId,
          payment_method: user.stripePaymentMethodId,
          confirm: true,
          off_session: true,
          metadata: { invoiceId },
        },
        { idempotencyKey: `autopay-${invoiceId}` }
      );

      if (pi.status === 'succeeded') {
        await db.collection('invoices').doc(invoiceId).update({
          status: 'paid',
          paidDate: admin.firestore.FieldValue.serverTimestamp(),
          paymentMethod: 'Credit Card (Auto Pay)',
          stripePaymentIntentId: pi.id,
        });
      }
    } catch (err: any) {
      console.error(`Auto-pay failed for invoice ${invoiceId}:`, err.message);
      if (user.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: {
            title: 'Auto Pay Failed',
            body: `Your auto-payment for ${invoice.period} could not be processed. Please pay manually.`,
          },
          data: { type: 'autopay_failed', invoiceId },
        }).catch(() => {});
      }
    }
  }
}
