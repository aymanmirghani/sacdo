# Stripe Payment Processing Integration Plan

## Recommended Provider: Stripe

Stripe is the best fit for this app: it has a first-class React Native SDK (`@stripe/stripe-react-native`) that handles card UI natively and keeps sensitive card data off the server entirely, excellent Firebase Cloud Functions integration, built-in support for saved cards (needed for auto-pay), and strong webhook reliability.

---

## Architecture

```
Member app (React Native)
  └─ @stripe/stripe-react-native
       └─ Stripe PaymentSheet (native UI, PCI-compliant)
            │
            ├─ 1. App calls Firebase Function → createPaymentIntent
            ├─ 2. Function creates PaymentIntent on Stripe → returns clientSecret
            ├─ 3. App presents Stripe PaymentSheet with clientSecret
            ├─ 4. Member completes payment inside Stripe's UI
            └─ 5. Stripe sends webhook → Firebase Function → marks invoice paid
```

Card details **never touch the server or Firestore** — Stripe's SDK handles them entirely.

---

## Data Model Changes

### `users` collection — add two optional fields:
| Field | Type | Purpose |
|---|---|---|
| `stripeCustomerId` | `string` | Created on first payment |
| `stripePaymentMethodId` | `string` | Saved card for auto-pay |

### `invoices` collection — add:
| Field | Type | Purpose |
|---|---|---|
| `stripePaymentIntentId` | `string` | For reconciliation and idempotency |

---

## Phase 1 — Setup

1. Create a Stripe account at stripe.com
2. Obtain **Publishable Key** (goes in the app) and **Secret Key** (stays server-side only)
3. Store keys as Firebase secrets:
   ```
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
4. Install Stripe packages:
   - Mobile app: `npm install @stripe/stripe-react-native`
   - Cloud Functions: `npm install stripe` (in `/functions`)
5. Configure native setup for `@stripe/stripe-react-native` (iOS Podfile + Android build.gradle — documented in the Stripe React Native setup guide)
6. Wrap the app's root component with `<StripeProvider publishableKey="pk_live_...">` in `sacdo-app/App.tsx`

---

## Phase 2 — Cloud Functions

**New file: `functions/src/payments/stripe.ts`**

| Function | Type | Purpose |
|---|---|---|
| `createPaymentIntent` | `onCall` | Creates a Stripe PaymentIntent for an invoice; returns `clientSecret` to the app |
| `createSetupIntent` | `onCall` | Creates a SetupIntent so a member can save their card for auto-pay |
| `handleStripeWebhook` | `onRequest` (HTTP) | Receives Stripe webhook events; validates signature; marks invoices paid |
| `processAutoPayInvoices` | Scheduled / `onCall` | Charges saved cards for members with auto-pay enabled when invoices are generated |

### `createPaymentIntent` logic:
1. Verify caller is an active member
2. Load the invoice — verify it belongs to the caller and is unpaid
3. Call `getOrCreateStripeCustomer` (creates Stripe Customer if first time, stores `stripeCustomerId` in Firestore)
4. Create `PaymentIntent` on Stripe with `amount`, `currency: 'usd'`, `customer`, `metadata: { invoiceId }`
5. Return `{ clientSecret }` to the app

### `handleStripeWebhook` logic:
1. Validate the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`
2. On `payment_intent.succeeded`:
   - Extract `invoiceId` from metadata
   - Mark invoice as paid with `paymentMethod: 'Credit Card'` and `stripePaymentIntentId`
3. On `payment_intent.payment_failed`: log the failure (future: notify member via push notification)

### `processAutoPayInvoices` logic (called from `generateMonthlyInvoices` after invoice creation):
1. Find all newly created invoices where the member has `autoPayEnabled: true` and `stripePaymentMethodId` set
2. For each, create a PaymentIntent with `confirm: true`, `payment_method: stripePaymentMethodId`, `off_session: true`
3. On success, mark invoice paid
4. On failure, send push notification to member

---

## Phase 3 — Mobile App Changes

### `InvoicesScreen.tsx` — Replace card form with Stripe PaymentSheet

**One-time payment flow:**
```
1. Member taps "Pay Now"
2. App calls createPaymentIntent Cloud Function → receives clientSecret
3. App calls initPaymentSheet({ paymentIntentClientSecret: clientSecret })
4. App calls presentPaymentSheet()
5. Stripe presents native payment UI (handles 3D Secure automatically)
6. On success → show confirmation; refresh invoices list
   (invoice is marked paid by the webhook, not the client)
```

**Auto-pay setup flow** (triggered when member toggles Auto Pay on):
```
1. App calls createSetupIntent Cloud Function → receives setupIntentClientSecret
2. App calls initPaymentSheet({ setupIntentClientSecret })
3. App calls presentPaymentSheet() — member enters and saves their card
4. Stripe webhook fires → stores stripePaymentMethodId on user's Firestore doc
5. autoPayEnabled flag already saved on the invoice
```

### New service functions in `sacdo-app/src/services/invoices.ts`:
- `createPaymentIntent(invoiceId)` → calls Cloud Function, returns `clientSecret`
- `createSetupIntent()` → calls Cloud Function, returns `setupIntentClientSecret`

---

## Phase 4 — Webhook Registration

1. Deploy the `handleStripeWebhook` HTTP function — it gets a public URL:
   `https://us-central1-sacdo-app-prod.cloudfunctions.net/handleStripeWebhook`
2. In the Stripe Dashboard → Developers → Webhooks → Add endpoint
3. Register that URL and subscribe to these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `setup_intent.succeeded` (for auto-pay card saves)
4. Copy the **Webhook Signing Secret** → store as `STRIPE_WEBHOOK_SECRET` Firebase secret

---

## Phase 5 — Testing

1. Use Stripe **test mode** keys during development (`pk_test_...` / `sk_test_...`)
2. Test card numbers:
   - `4242 4242 4242 4242` — always succeeds
   - `4000 0000 0000 9995` — always declines
   - `4000 0025 0000 3155` — requires 3D Secure authentication
3. Use the Stripe CLI to forward webhooks locally during development:
   ```
   stripe listen --forward-to localhost:5001/sacdo-app-prod/us-central1/handleStripeWebhook
   ```
4. Switch to live keys (`pk_live_...` / `sk_live_...`) before going to production

---

## File Change Summary

| File | Action |
|---|---|
| `sacdo-app/App.tsx` | Wrap root with `<StripeProvider publishableKey="...">` |
| `sacdo-app/src/services/invoices.ts` | Add `createPaymentIntent`, `createSetupIntent` |
| `sacdo-app/src/screens/member/InvoicesScreen.tsx` | Replace card form with `PaymentSheet` |
| `sacdo-app/src/types/index.ts` | Add `stripeCustomerId`, `stripePaymentMethodId` to `User`; `stripePaymentIntentId` to `Invoice` |
| `functions/src/payments/stripe.ts` | **New** — all Stripe Cloud Functions |
| `functions/src/invoices/invoices.ts` | Call `processAutoPayInvoices` after invoice generation |
| `functions/src/index.ts` | Export new Stripe functions |
| `functions/package.json` | Add `stripe` dependency |

---

## Key Security Notes

- The Stripe **Secret Key** must never be in the mobile app — only in Cloud Functions via Firebase secrets
- Always validate the webhook signature before trusting webhook payloads
- Never log or store full card numbers — Stripe handles all sensitive data
- Use `invoiceId` as the idempotency key on PaymentIntent creation to prevent double charges on network retries

---

## Prerequisites Before Implementation

- [ ] Stripe account created
- [ ] Publishable Key and Secret Key obtained
- [ ] Live mode enabled (requires Stripe account verification/activation)
- [ ] Firebase secrets configured (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
