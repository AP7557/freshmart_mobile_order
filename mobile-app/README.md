# FreshMart Mobile App — Expo 56

## Setup

```bash
cd mobile-app
npm install
cp .env.example .env.local
# Fill in EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

## Development

```bash
npx expo start          # Expo Go / dev build
npx expo start --android
npx expo start --ios
```

## Build for stores (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android   # APK / AAB
eas build --platform ios       # IPA
```

## Key version pins (Expo 56)

| Package | Version |
|---------|---------|
| expo | ~56.0.12 |
| expo-router | ~56.2.11 |
| react-native | 0.85.3 |
| react | 19.2.3 |
| typescript | ~6.0.3 |
| @stripe/stripe-react-native | ^0.67.0 |
| @tanstack/react-query | ^5.101.0 |
| zustand | ^5.0.14 |
| react-native-reanimated | ~3.17.4 |

> Expo 56 requires the **New Architecture** (Fabric + Turbo Modules).  
> `newArchEnabled: true` is already set in `app.json`.
