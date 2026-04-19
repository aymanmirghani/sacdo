# Google Play Deployment Guide

## Prerequisites
- Google Play Developer account created
- EAS CLI installed (`npm install -g eas-cli`)
- Production build completed

---

## Step 1 — Build Production AAB

```bash
cd sacdo-app
eas build --platform android --profile production
```

This produces an `.aab` (Android App Bundle) required by Google Play.

---

## Step 2 — Add SHA Fingerprints to Firebase

After the build, get fingerprints via:
```bash
eas credentials --platform android
```

Add both SHA-1 and SHA-256 to:
**Firebase Console → Project Settings → Your Android app → Add fingerprint**

Re-download `google-services.json` if updated, then rebuild.

> This also fixes the `auth/missing-client-identifier` error on real devices.

---

## Step 3 — Create Google Play Service Account

Required for EAS to upload the AAB to Google Play automatically.

1. **Google Play Console → Setup → API access**
2. Link to a Google Cloud Project (or confirm it's already linked)
3. Click **"Create new service account"** (opens Google Cloud Console)
4. Name it (e.g. `eas-submit`), click through, click **Done**
5. Find the service account → three dots → **Manage keys**
6. **Add Key → Create new key → JSON** → download the `.json` file
7. Back in Play Console → **API access** → find the service account → **Grant access**
8. Set role to **"Release manager"** → **Invite user → Send invite**

> Keep the `.json` key file out of git — it's in `.gitignore`.

---

## Step 4 — Configure EAS Submit

Add the service account path to `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "../service-account.json"
    }
  }
}
```

Then submit:
```bash
cd sacdo-app
eas submit --platform android --profile production
```

---

## Step 5 — Google Play Console Listing

Required before public release:
- App description, screenshots, feature graphic
- Privacy policy URL (required — app handles auth + invoices)
- Content rating questionnaire
- Target audience settings

**Use Internal Testing track first** to verify everything works before promoting to production.

---

## Files
| File | Purpose |
|------|---------|
| `sacdo-app/google-services.json` | Firebase Android config — re-download after adding SHA fingerprints |
| `service-account.json` | Google Play API key — never commit to git |
| `sacdo-app/eas.json` | EAS build/submit configuration |
