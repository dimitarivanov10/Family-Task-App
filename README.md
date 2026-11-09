# Family Task App

Installable PWA for household task assignment with a tamper-proof,
append-only audit log. Runs entirely on Firebase's free Spark plan: no
Cloud Functions, no billing account.

## Stack

- `web/` — React + Vite + TypeScript + Tailwind + vite-plugin-pwa
- Firebase Auth, Firestore, Cloud Messaging, Hosting (Spark/free plan only)
- Firebase Emulator Suite for local testing
- `functions/` — kept in the repo but **not deployed**. See "Why no Cloud
  Functions" below.

## Tamper-proof design

Every write to `families`, `tasks` and `tasks/{id}/history` is made
directly by the client and validated entirely by `firestore.rules`:

- **Family**: created directly by the client; the rule requires
  `createdBy == auth.uid` and `members == [auth.uid]`. The family
  document's own auto-generated id *is* the invite code — share it
  directly, there's no separate code or lookup query. Joining updates
  `members` to append exactly the caller's own uid (checked field-by-field
  by the rule) and nothing else; leaving removes exactly the caller's own
  uid and nothing else (`memberNames` is never removed, so former
  members still show up by name in old tasks/history instead of a bare
  uid). A user can belong to multiple families at once — `users/{uid}`
  stores `familyIds: string[]`, and the dashboard has a switcher when
  there's more than one.
- **Tasks**: `title`, `description`, `createdBy`, `createdAt`, `assignees`
  and `deadline` can never change after creation. Only the creator and
  the assignees can even read a task (the list query filters with
  `where(assignees array-contains uid) OR where(createdBy == uid)`,
  matching the read rule exactly). The status lifecycle fields
  (`status`, `nextReminderAt`, `remindersSent`, `declineReason`,
  `declinedBy`, `lastHistoryEventId`) can only be changed by an assignee
  (seen/accepted/done/declined), or by the creator to reopen a done or
  declined task. Deadline renegotiation is separate and stricter: either
  party may *propose* (`proposedDeadline`/`proposedBy`), but only the
  *other* party may confirm it into `effectiveDeadline` — the rule
  explicitly rejects the proposer trying to confirm their own proposal.
  Deleting a task is never allowed.
- **History**: append-only (`update`/`delete` always denied), with
  `byUid == auth.uid` and `at == request.time` enforced by the rule.
- **Pairing**: a task write and its history entry are written in the same
  `writeBatch` from the client, and the rules enforce that pairing using
  `getAfter()`/`existsAfter()` — a task document's `lastHistoryEventId`
  must point at a history document created in the *same* batch with a
  matching `byUid`/`at`, and that history document's own rule requires the
  task's after-state to point back at it. A task change with no
  accompanying history entry (or vice versa) is rejected outright.
- The only paths a client ever writes without this pairing are its own
  `users/{uid}` profile and `users/{uid}/devices/{deviceId}` (FCM token
  registration) — neither affects task evidence.

See `web/src/context/FamilyContext.tsx` and `TaskContext.tsx` for the
client side of every one of these writes, and `firestore.rules` for what
actually enforces them.

## Why no Cloud Functions (and no automated reminders)

Cloud Functions, Cloud Scheduler and server-side FCM sending all require
Firebase's paid Blaze plan (even though typical usage for a small family
app would stay within the perpetual free tier, Blaze still requires
attaching a billing account, which this project avoids entirely).
Everything that previously ran as a Cloud Function now runs as a direct,
rules-validated client write instead.

**Consequence: there is currently no way to actually send the 5h/1h/
30min/10min push reminders.** Sending a push notification to *another
user's* device requires a server holding FCM credentials — there's no
secure way to do that from the browser. The schema still has
`nextReminderAt`/`remindersSent` fields (computed client-side at task
creation, in `web/src/lib/offsets.ts`) so it's ready if a server
component is added later, but nothing currently advances them or sends
anything. `functions/` is kept in the repo for that future option but is
not part of the deploy.

## Project layout

```
firebase.json          Hosting/Firestore/Emulator config
firestore.rules         Security rules enforcing the model above
firestore.indexes.json  Firestore indexes
web/                    Frontend PWA (all writes happen here)
functions/              Unused/undeployed — kept for a possible future Blaze upgrade
```

## Push notification registration (no sending yet)

The app still registers each device's FCM token to
`users/{uid}/devices/{deviceId}` via the "Включи известия" banner, since
that's a direct, non-tamper-sensitive self-write. To test token
registration:

1. Generate a Web Push certificate under Firebase console → Project
   settings → Cloud Messaging → Web configuration, and put it in
   `web/.env` as `VITE_FIREBASE_VAPID_KEY`. Without this set,
   `enablePushNotifications()` throws immediately — registration can't
   work at all without it.
2. Push notifications require HTTPS (or `localhost`) and browser
   permission.
3. **iOS only delivers web push to a PWA added to the home screen** —
   never to a tab open in regular Safari, even with permission granted.
   The in-app banner detects this and shows install instructions instead
   of a non-functional "Включи" button.

## Local setup

1. Install the web app's deps:
   ```
   npm --prefix web install
   ```
2. Create a Firebase project (Spark/free plan) and update `.firebaserc`
   with its project ID.
3. Copy `web/.env.example` to `web/.env` and fill in your Firebase web app
   config (from Firebase console → Project settings → General). `.env` is
   gitignored — never commit real keys.
4. Enable Email/Password sign-in under Authentication → Sign-in method,
   and create the Firestore database.
5. The Firestore/Auth emulators require a JDK (11+) on PATH. Then run:
   ```
   npm run emulators
   ```
6. In another terminal, run the web app against the emulators:
   ```
   npm run web:dev
   ```

## Deploying

```
npx firebase login
npm --prefix web run build
npx firebase deploy --only "hosting,firestore:rules,firestore:indexes"
```

(In PowerShell, the comma-separated `--only` list must be quoted or it
gets split into separate, unrecognized arguments.)

Nothing under `functions/` is deployed — the above is the full deploy.
`firestore:indexes` matters here specifically because the per-user task
list query needs the composite indexes in `firestore.indexes.json`.

## UI language

The app UI is in Bulgarian.
