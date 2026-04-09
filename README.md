# Shop Ledger

Responsive income/expense tracking app for a small shop.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Firebase Firestore
- Recharts (monthly summary chart)

## Features

- Initial setup for starting `cash` and `bank` balances
- Daily transactions:
  - Income:
    - `cash` -> increases cash balance
    - `card` -> increases bank balance after 1.5% fee deduction
  - Expense:
    - `cash` or `bank` -> deducts from selected balance
  - Automatically stores current date
- Dashboard:
  - Current cash balance
  - Current bank balance
  - Total income and total expenses
  - Monthly summary chart
- Reports:
  - Expense rows by month
  - Month filter
  - Shows name, amount, payment method, date
- Bonus:
  - Edit and delete transactions

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill Firebase values in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

4. Run locally:

```bash
npm run dev
```

## Firestore Setup

Create a Firebase project and enable Firestore.

This app uses:

- Document: `settings/main`
  - `cashBalance` (number)
  - `bankBalance` (number)
  - `initialized` (boolean)
- Collection: `transactions`
  - `type` (`income` | `expense`)
  - `description` (string)
  - `amount` (number)
  - `method` (`cash` | `card` | `bank`)
  - `date` (YYYY-MM-DD)
  - timestamps (`createdAt`, `updatedAt`)

## Scripts

- `npm run dev` - start dev server
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Environment Variables

The app reads Firebase config from Vite env variables.

1. Copy `.env.example` to `.env`
2. Fill all `VITE_FIREBASE_*` values
3. Never commit `.env` to git

The project automatically falls back to local in-memory mode if Firebase variables are missing, but production deployment should always use real Firebase values.

## Verify Build Before Deploy

Run:

```bash
npm install
npm run lint
npm run build
```

If `npm run build` succeeds, the deploy artifact is in `dist/`.

## Deploy on Vercel

1. Push code to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Add all `VITE_FIREBASE_*` environment variables in Vercel Project Settings.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

`vercel.json` includes SPA rewrite support for React Router paths.

## Deploy on Netlify

1. Push code to your git provider.
2. Import project in Netlify.
3. Add all `VITE_FIREBASE_*` environment variables in Site settings.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy.

`netlify.toml` includes SPA redirect support for React Router paths.

## Deploy on Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login and initialize project:

```bash
firebase login
```

3. Create `.firebaserc` from template and set your project id:

```bash
cp .firebaserc.example .firebaserc
```

On Windows PowerShell:

```powershell
Copy-Item .firebaserc.example .firebaserc
```

4. Build the app:

```bash
npm run build
```

5. Deploy hosting:

```bash
firebase deploy --only hosting
```

`firebase.json` is preconfigured for SPA routing (all paths rewrite to `index.html`).

## Notes

- The app is modular: pages, components, services, and utilities are separated for easier extension.
- Firebase Auth can be added later if login-based access is needed.
