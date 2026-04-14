# Stripe Test vs Live Mode

## Stripe environments

Stripe has three environments — make sure all keys and the webhook come from the **same one**:

| Environment | When to use |
|---|---|
| **Sandbox** | Testing — use this. Keys look like `sk_test_...` but are scoped to the Sandbox |
| **Test mode** | Legacy test toggle — exists but is separate from Sandbox; don't mix with Sandbox keys |
| **Live mode** | Production |

All keys are found in **Stripe Dashboard → Developers → API keys**.  
Switch to the correct environment in the dashboard before copying any key or creating a webhook.

---

## Keys at a glance

| | Sandbox / Test | Live |
|---|---|---|
| Publishable key | `pk_test_...` | `pk_live_...` |
| Secret key | `sk_test_...` | `sk_live_...` |
| Webhook secret | `whsec_...` (sandbox endpoint) | `whsec_...` (live endpoint) |

---

## Steps to switch modes

### 1. App — `sacdo-app/.env`

Replace the publishable key (must come from the same environment as the secret key):

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # sandbox
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # live
```

Rebuild the app after changing this file.

### 2. Firebase — Secret Manager

Update both secrets via the Firebase CLI:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# paste sk_test_... (sandbox) or sk_live_... (live)

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# paste the whsec_... from the matching webhook endpoint (see step 3)
```

Redeploy functions after updating secrets:

```bash
firebase deploy --only functions
```

### 3. Stripe Dashboard — Webhook endpoint

The webhook URL is the same in all environments:
```
https://us-central1-sacdo-app-prod.cloudfunctions.net/handleStripeWebhook
```

What changes is which Stripe environment the endpoint is registered in — the signing secret is different per environment.

**To create/find each endpoint:**
1. Open Stripe Dashboard and switch to the correct environment (Sandbox or Live)
2. Go to **Developers → Webhooks**
3. Create the endpoint if it doesn't exist — select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `setup_intent.succeeded`
4. Click the endpoint → **Reveal signing secret** → copy the `whsec_...` value
5. Set it as `STRIPE_WEBHOOK_SECRET` (step 2 above)

### 4. Firestore — clear stale customer data

When switching from live → sandbox (or vice versa), Stripe customer IDs from the previous environment are invalid. Clear them from the user's Firestore document:

1. **Firebase Console → Firestore → `users` collection → user doc**
2. Delete the `stripeCustomerId` field
3. Delete the `stripePaymentMethodId` field if present

The app will create a fresh customer in the new environment on the next payment attempt.

---

## Test card numbers

Use these in Sandbox (any future expiry, any 3-digit CVC):

| Scenario | Card number |
|---|---|
| Payment succeeds | `4242 4242 4242 4242` |
| Payment declined | `4000 0000 0000 0002` |
| Requires 3D Secure auth | `4000 0025 0000 3155` |

---

## Checklist

Switch **all of these** together — mismatched keys will cause failures:

- [ ] `sacdo-app/.env` publishable key updated (from the correct environment)
- [ ] `STRIPE_SECRET_KEY` Firebase secret updated
- [ ] `STRIPE_WEBHOOK_SECRET` Firebase secret updated (from the webhook in the correct environment)
- [ ] Functions redeployed (`firebase deploy --only functions`)
- [ ] App rebuilt (`npx expo run:android --device` or EAS build)
- [ ] Stale `stripeCustomerId` cleared from Firestore (if switching environments)
