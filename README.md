# Ordering System Monorepo

## Structure
```
ordering-system/
├── next-app/      # Backend API + Admin + Kitchen (Next.js)
└── mobile-app/    # Customer app (Expo + React Native)
```

## Prerequisites
- Node.js 20+
- A Neon Postgres project (get connection strings from neon.tech)
- Stripe account (get keys from dashboard.stripe.com)
- Expo account + EAS CLI for mobile builds

## Setup

### 1. Next.js App
```bash
cd next-app
cp .env.example .env.local
# Fill in all values in .env.local
npm install
```

### 2. Run Migrations
```bash
cd next-app
npm run db:generate   # generates SQL from schema
npm run db:migrate    # applies migrations to Neon
```

### 3. Seed Default Settings
After migration, insert a default setting row:
```sql
INSERT INTO settings (key, value) VALUES ('DEFAULT_PREP_TIME_MINUTES', '30')
ON CONFLICT (key) DO NOTHING;
```

### 4. Start Next.js Dev Server
```bash
cd next-app
npm run dev
# Runs at http://localhost:3000
```

### 5. Mobile App Setup
```bash
cd mobile-app
cp .env.example .env
# Fill in EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
npm install
npx expo start
```

### 6. Build for App Stores with EAS
```bash
cd mobile-app
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile production
```

## Admin Access
Navigate to `http://localhost:3000/admin` and use the seeded admin credentials.

## Kitchen Access
Navigate to `http://localhost:3000/kitchen` and use kitchen credentials.

## Stripe Webhooks (local dev)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
