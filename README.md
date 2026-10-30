# Family Task App

Installable PWA for household task assignment with deadline push reminders
and a tamper-proof, append-only audit log.

## Stack

- `web/` — React + Vite + TypeScript + Tailwind + vite-plugin-pwa
- `functions/` — Cloud Functions (TypeScript, Firebase Functions v2)
- Firebase Auth, Firestore, Cloud Messaging, Hosting
- Firebase Emulator Suite for local testing

## Tamper-proof design

- Clients can **never** write directly to `families`, `tasks` or
  `tasks/{id}/history` — Firestore rules deny all client writes to those
  paths (see `firestore.rules`).
- All mutations (create family, join family, create task, change status,
  change deadline, mark seen/accepted) go through Cloud Functions callables
  using the Admin SDK. Each callable writes the state change and its
  matching `history` entry in the same transaction, with a server timestamp.
- The only paths a client ever writes directly are its own
  `users/{uid}` profile and `users/{uid}/devices/{deviceId}` (FCM token
  registration) — neither affects task evidence.

## Project layout

```
firebase.json          Hosting/Firestore/Functions/Emulator config
firestore.rules         Security rules (read-only for families/tasks/history)
firestore.indexes.json  Firestore indexes
web/                    Frontend PWA
functions/              Cloud Functions
```

## Local setup

1. Install the root tooling (Firebase CLI) and each workspace's deps:
   ```
   npm install
   npm --prefix web install
   npm --prefix functions install
   ```
2. Create a Firebase project and update `.firebaserc` with its project ID.
3. Copy `web/.env.example` to `web/.env` and fill in your Firebase web app
   config (from Firebase console → Project settings → General). `.env` is
   gitignored — never commit real keys.
4. Enable Email/Password sign-in under Authentication → Sign-in method.
5. Run the emulators:
   ```
   npm run emulators
   ```
6. In another terminal, run the web app against the emulators:
   ```
   npm run web:dev
   ```

## Deploying

```
npm run deploy
```

This builds the web app and functions, then runs `firebase deploy`
(Hosting + Firestore rules/indexes + Functions).

## UI language

The app UI is in Bulgarian.
