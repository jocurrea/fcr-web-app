# Application Architecture and Flows

This defines the shared Supabase behavior that Mobile and Web must follow. The
database contract is current through Migration 052; exact columns, policies,
triggers, and functions are in [`database-schema.md`](./database-schema.md).

## Core rules

1. Supabase is the shared source of truth. Use its RPCs and Edge Functions;
   never recreate lifecycle or authorization decisions in browser code.
2. `accountType`, `professionalRole`, `platformRole`, company membership,
   affiliation, and work experience are separate concepts.
3. A user has one top-level account type: `flight_crew` or `business`.
4. An individual `flight_crew` account has one mutually exclusive professional
   role: `pilot`, `crew`, or `aviation_professional`.
5. Business accounts manage companies but have no individual professional
   extension. Professionals may separately hold a future company-member role.
6. Membership grants company access; affiliation states employment; work
   experience is user-authored resume data. Neither affiliation nor experience
   grants company permissions.
7. Use direct writes only where RLS expressly permits them; use RPCs/Edge
   Functions for lifecycle operations.

## Identity and profile architecture

### Account layers

| Layer | Purpose |
| ----- | ------- |
| `auth.users` | Supabase authentication identity, provider identities, and verified login email. |
| `public.users` | Application account root: names, image, account type, professional role, onboarding state, platform role, and temporary compatibility mirrors. |
| `user_profiles` | Shared individual profile fields such as bio, nationality, professional contact details, and location. |
| `flight_crew_profiles` | Pilot/Crew-only work fields. Role guards prevent Pilot-only and Crew-only data from crossing subtypes. |
| `aviation_professional_profiles` | Aviation Professional title, credentials, and work availability. |
| `user_languages`, `user_work_experiences`, `user_education`, `userSkills` | Structured reusable profile collections. |
| `companies`, `company_settings`, `company_type_selections` | Business/company profile and onboarding data. |
| `company_members` | Company authorization roles such as owner/admin/editor/viewer/recruiter. |
| `company_affiliations` | Professional-to-company relationship and verification lifecycle. |

`handle_new_user()` creates `public.users` after Auth signup. Compatibility
triggers mirror retained legacy writes for older installed clients. New clients
read assembled profiles rather than independently joining legacy tables.

### Canonical profile reads

Use `get_my_profile()` for the complete owner profile and
`get_public_profile(target_user_id)` for public profiles. The public RPC removes
auth/moderation/private fields, licence numbers/documents, non-public
affiliations, and blocked, banned, or incomplete profiles.

Do not use `user_directory_v` for public People Search. It is an internal Admin
Dashboard view. Only `service_role` may select it directly, and authenticated
global platform administrators use `get_admin_user_directory()`.

### Current profile write boundary

Until the separately approved legacy cleanup, preserve this write boundary:

- identity/category: owner-authorized `public.users` plus matching Auth metadata
  where routing requires it;
- shared individual fields: owner-authorized `user_profiles` upserts;
- retained Pilot/Crew resume data: latest owned `resumes.data`;
- catalogue skills: `replace_standardized_user_skills(text[])`;
- Migration 037/038 triggers: one-way legacy-to-canonical sync;
- after writes: refresh through `get_my_profile()`.

Do not dual-write legacy and canonical copies or bypass the compatibility
source. These rules are the complete cross-platform contract; no Mobile source
file is required to understand or implement it.

For optional implementation comparison, consult the Mobile repository:
`services/userService.js` and `services/profileRepository.ts` for profile
access, `app/(auth)/onboarding/` for orchestration, and
`components/onboarding/` for role UI. These are references, not Web dependencies.

## Registration and onboarding

### Shared registration sequence

1. Select before signup: Flight Crew (`flight_crew`, role during onboarding),
   Aviation Professional (`flight_crew` + `aviation_professional`), or Business
   (`business`, no professional role).
2. Preserve that selection through email/password, Google, or Apple auth; the
   Auth hook creates `public.users`, then save the selected metadata.
3. Route from persisted server state: Business → Business onboarding;
   Aviation Professional → its dedicated flow; otherwise → Pilot/Crew.
4. Resume interrupted onboarding from stored completion state.

### Pilot and Crew flow

Pilot and Crew share one role-aware flow: personal details/role followed by at
least one owned licence with required document and validity data. Pilot work
uses employer, flight hours, medical certificate, and Pilot stripe; Crew uses
industry years and Flight Attendant stripe. Existing licence, rating,
qualification, resume, and flight-hour rules remain unchanged.

### Aviation Professional flow

The seven steps are:

1. **Professional Type** — choose one active title from
   `professional_titles`. `other_aviation_professional` requires free-text
   `professionalTitleOther`; normal titles forbid custom text.
2. **Personal Details** — first name, last name, and profile photo.
3. **About Me** — required professional summary, maximum 500 characters.
4. **Credentials** — required public contact phone, public contact email, and
   at least one free-text licence/certification. Credentials are not Pilot/Crew
   licence records.
5. **Optional Details** — city/country, languages, and work experience.
   Current employment has `isCurrent = true` and no end date.
6. **Skills & Expertise** — catalogue-backed skills from `skill_catalog`.
   Optional during onboarding, but contributes to 100% profile completion.
7. **Availability** — required `active` or `available_for_work`.

The database will not allow an Aviation Professional to be marked onboarded
without title, first name, last name, profile image, and work availability.
Web validation must also require About Me, contact phone/email, and at least
one credential to match the accepted application flow.

Profile completion is real-time and weighted:

| Section | Weight | Onboarding requirement |
| ------- | -----: | ---------------------- |
| Professional type | 10% | Required |
| Personal details | 15% | Required |
| About Me | 10% | Required |
| Contact and credentials | 15% | Required |
| Work availability | 10% | Required |
| Location | 10% | Optional |
| Languages | 10% | Optional |
| Work experience | 10% | Optional |
| Skills | 10% | Optional |

Skipping all optional sections therefore completes onboarding at 60%, while
the profile remains valid and can later reach 100% through profile editing.

### Business Associate flow

Business onboarding creates a company draft and owner membership:

1. Company Type — select one or more active `company_types`.
2. Company Profile — required logo/name plus validated contact, location,
   website, founded year, description, operating areas, services, and fleet.
3. Community & Visibility — save `company_settings`.
4. Review & Confirm — change `draft` to `pending` and mark onboarding complete.

Company lifecycle:

```text
draft → pending → active
                  ↘ rejected → edited/resubmitted → pending
```

Use `update_active_company_profile(...)` for active-company edits. Name, logo,
or type changes return it to `pending`; other edits preserve `active`.

## Company affiliations

### Relationship meanings

| Relationship | Meaning | Grants company access? | Public display |
| ------------ | ------- | ---------------------- | -------------- |
| `company_members` | A user may manage or work inside a company account with a management role. | Yes, according to role | Not the professional verification badge |
| `company_affiliations` | A Pilot, Crew member, or Aviation Professional is professionally connected to a company. | No | Verified or self-reported state only |
| `user_work_experiences` | User-authored resume history. | No | Normal profile/resume content |

### Registered-company self-request

1. Search active companies with
   `search_companies_for_affiliation(search_text, result_limit)` (minimum two
   characters; maximum 20 results), then call
   `request_company_affiliation(target_company_id)`.
2. The server creates `pending/self_request`, notifies eligible reviewers, and
   keeps it private to the professional and authorized company reviewers.
3. Owner/admin loads `get_pending_company_affiliation_requests()` and calls
   `review_company_affiliation_request(id, decision, rejection_reason)`.
4. Approval becomes public `verified`; rejection becomes `rejected`. Both are
   audited and notify the professional.

### Unregistered-company self-report

When no applicable registered match exists, call
`create_unregistered_company_affiliation(company_name)`. Exact active names are
rejected. Success creates a public `unverified/self_reported` row with no
`company_id`, approval, or reviewer notification.

### Affiliation invitations

A company may instead invite a professional. Explicit acceptance immediately
creates a verified affiliation. It never creates `company_members` or chooses
the recipient's role; new recipients choose and finish their own onboarding.

## Sending a company invitation

Company invitation sender interfaces call the Edge Function; they never
construct tokens, insert invitations, or send email directly:

```ts
const { data, error } = await supabase.functions.invoke(
  "send-company-invitation",
  { body: { companyId, email: email.trim().toLowerCase() } },
);
```

Caller must be an authenticated active-company owner or non-banned
`owner`/`admin`. The function:

1. Verifies the bearer session and request/CORS limits.
2. Generates a 256-bit opaque token and computes its SHA-256 hash.
3. Calls `create_company_affiliation_invitation(...)` with the caller session;
   the RPC authorizes/limits/locks creation and rejects self-invites
   (`SELF_INVITATION`), ineligible/Business recipients (`INELIGIBLE_INVITEE`),
   verified affiliates (`ALREADY_AFFILIATED`), and duplicate pending invites.
4. Stores only the token hash and creates a seven-day pending lifecycle row.
5. Builds `${AUTH_WEB_URL}/invitations/accept#token=<raw-token>`.
6. Sends the email through Resend using the verified sender domain.

Success returns `invitationId`, `pending`, `expiresAt`, and `deliveryStatus`.
Confirmed provider rejection revokes; uncertain delivery remains pending with
`unknown` so a possibly delivered link stays valid.

Use `get_company_affiliation_invitations()` for the management list and
`revoke_company_affiliation_invitation(invitation_id)` for an explicit pending
revoke. Never select `company_invitations` directly from a browser.

## `/invitations/accept` Web page

Invitation email origin comes from the environment's `AUTH_WEB_URL` secret:

| Environment | Origin | Required route |
| ----------- | ------ | -------------- |
| Staging | Stable staging origin to be supplied by the Web application owner and then configured in the staging Supabase secret | `/invitations/accept` |
| Production | `https://webapp.fcranked.com` (already configured) | `/invitations/accept` |

Staging must use a stable, non-preview origin across QA deployments.

This must be client-capable: URL fragments do not reach Next.js middleware,
server components, access logs, or normal HTTP requests.

### Token capture and privacy

On the first client render:

1. Read exactly `window.location.hash` in the shape `#token=<value>`.
2. Decode once and accept only `/^[A-Za-z0-9_-]{40,128}$/`.
3. Keep it only in same-tab `sessionStorage` through auth/onboarding.
4. Immediately remove the fragment with `history.replaceState` before any
   analytics, third-party resource, logging, or outbound navigation.
5. Never place it in query/cache keys, persistent state, logs, analytics,
   errors, cookies, server actions, query parameters, or database rows.
6. Clear it after completion, invalid/expired resolution, or **Continue without
   invitation**. A closed tab must reopen the original email; do not use
   long-lived `localStorage`.

### App-opening behavior

The current native app registers the `flightcrew` custom scheme and accepts:

```text
flightcrew://invitations/accept?token=<encoded-token>
```

Provide **Open in app** while retaining the Web flow. Browsers cannot reliably
detect a successful custom-scheme launch, so never discard Web continuation
based on a timeout.

Automatic HTTPS opening later requires a Mobile release with iOS Universal Links
and associated domains plus Android App Links/intent filters, with each host's
`apple-app-site-association` and `.well-known/assetlinks.json`. Limit association
to `/invitations/accept`; use the actual iOS identifier
`GGF98M7KGN.com.flightcrew.app` and real Android package/signing fingerprints.
This is not yet configured, so the custom-scheme button is the current bridge.

### Invitation state machine

Resolve the token first:

```ts
await supabase.rpc("resolve_company_affiliation_invitation", {
  raw_token: token,
});
```

Response is valid pending (safe company fields, masked email, expiry, and
nullable `recipientEmailMatches`), invalid, expired, or unavailable.

Render these cases:

| User state | Required action |
| ---------- | --------------- |
| Signed out | Show company information plus Sign in and Create professional account. Business registration must not be offered as an invitation acceptance path. |
| Candidate email known before email/password or provider authentication | Call `check_company_affiliation_invitation_email(raw_token, candidate_email)`. On mismatch, offer **Use another email/account** or an explicit **Continue without invitation** that clears the token. |
| Signed in with wrong email | Do not accept. Offer account switching or continue without invitation. |
| Signed in as Business | Explain that only Pilot, Crew, or Aviation Professional accounts may accept; allow decline/account switching. |
| Individual role not selected | Preserve the token and route to professional role selection/onboarding. |
| Eligible individual but onboarding incomplete | Preserve the token and resume the correct role-aware onboarding. |
| Eligible onboarded recipient with matching email | Show explicit Accept and Decline actions. |

Preserve the token across same-tab auth/onboarding routes. Recheck it before the
normal dashboard; resume incomplete onboarding, then return for explicit
acceptance. Registration or onboarding must never auto-accept.

Accept:

```ts
await supabase.rpc("accept_company_affiliation_invitation", {
  raw_token: token,
});
```

The RPC rechecks email, role/account/onboarding eligibility, all lifecycle
states, expiry, concurrency, and existing affiliations. Success consumes the
token; refresh `get_my_profile()` immediately.

Decline:

```ts
await supabase.rpc("decline_company_affiliation_invitation", {
  raw_token: token,
});
```

Decline is final: clear token state and show completion. Retain it on retryable
network errors.

## Notification system

### Server pipeline

```text
trusted application event
  → database trigger/function
  → canonical notifications row (grouped when applicable)
  → event-time In-App preference
  → private notification_push_deliveries outbox (only if Push enabled)
  → Supabase Database Webhook
  → send-notification-push Edge Function
  → current preference/block recheck
  → OneSignal
```

Clients never insert notifications or call `send-notification-push`; trusted
database operations derive every supported event.

### Types, categories, and destinations

| Type | Category | Grouping | Destination |
| ---- | -------- | -------- | ----------- |
| `comment` | `community_frequencies` | Individual event | Authorized post details |
| `postLike` | `community_frequencies` | Fixed 48-hour recipient/post bundle; current distinct liker count | Authorized post details |
| `groupInvite` | `community_frequencies` | Individual invitation | Frequency invitation/details |
| `profileLike` | `profile_activity` | Fixed 48-hour profile bundle | Profile Likes |
| `profileVisit` | `profile_activity` | First visit or new activity after 24-hour absence; fixed 48-hour bundle | Profile Visitors |
| `affiliationRequest` | `profile_activity` | Individual request | Company Pending Affiliation Requests |
| `affiliationApproved` | `profile_activity` | Individual decision | Recipient's own profile |
| `affiliationRejected` | `profile_activity` | Individual decision | Recipient's own profile |

`direct_messages` and `jobs` are reserved categories. Register new types in
`notification_type_categories` before emitting them; unknown types fail.

Grouped activity uses `groupKey`, sorts by `lastActivityAt`, refreshes
sender/count/copy/unread state, and reactivates archived or pending-deletion
rows. Server Push limits never remove in-app history.

### Inbox reads and actions

Read only owned visible, non-deleted rows. Active has `archivedAt = null`; sort
active by `lastActivityAt DESC` and archived by `archivedAt DESC`, then activity.

Allowed client changes:

- read/unread: update owned visible `read`/`readAt` fields;
- archive/unarchive: `set_notifications_archived(bigint[], boolean)`;
- begin delete: `schedule_notifications_deletion(bigint[])`;
- undo within five seconds: `undo_notifications_deletion(bigint[])`;
- finalize after the deadline: `finalize_notifications_deletion(bigint[])`.

One-minute `pg_cron` runs private `purge_expired_notification_deletions()` so
deletion finishes after app closure. Never delete notification rows directly.

### Preferences

```ts
await supabase.rpc("get_my_notification_preferences");
await supabase.rpc("set_my_notification_preference", {
  p_category: "profile_activity",
  p_channel: "in_app", // or "push"
  p_enabled: false,
});
```

Missing rows mean enabled. `in_app = false` hides only future inbox events;
`push = false` suppresses future queueing and is rechecked before delivery.
Channels remain independent.

### Push navigation

```text
notificationId, type, targetType, targetId
```

Never locate a Push through the inbox because its row may be hidden. Validate
type/IDs, map them to a fixed route, fetch through normal RLS, and navigate
directly; malformed payloads fall back safely. Mark-read is best-effort. Web
Push/service-worker handling must preserve these fields and use the same fixed
destination mapping, never provider-controlled arbitrary routes.

## Application-facing RPC reference

| RPC | Authentication | When to call |
| --- | -------------- | ------------ |
| `get_my_profile()` | Authenticated owner | Initial own-profile hydration and refresh after profile/affiliation changes. |
| `get_public_profile(uuid)` | Authenticated | Public profile screen. |
| `replace_standardized_user_skills(text[])` | Authenticated individual | Replace catalogue-backed professional skills. |
| `search_companies_for_affiliation(text, integer)` | Authenticated professional | Registered-company autocomplete. |
| `request_company_affiliation(uuid)` | Authenticated onboarded professional | Request registered-company verification. |
| `create_unregistered_company_affiliation(text)` | Authenticated onboarded professional | Save an unverified employer after registered search returns no applicable match. |
| `get_pending_company_affiliation_requests()` | Authorized company owner/admin | Company review queue. |
| `review_company_affiliation_request(uuid, text, text)` | Authorized company owner/admin | Approve/reject a pending self-request. |
| `get_company_affiliation_invitations()` | Authorized company owner/admin | Sent invitation management. |
| `resolve_company_affiliation_invitation(text)` | Anonymous/authenticated | Invitation landing page resolution. |
| `check_company_affiliation_invitation_email(text, text)` | Anonymous/authenticated | Pre-auth candidate-email guard. |
| `accept_company_affiliation_invitation(text)` | Matching onboarded professional | Explicit invitation acceptance. |
| `decline_company_affiliation_invitation(text)` | Matching authenticated recipient | Explicit invitation decline. |
| `revoke_company_affiliation_invitation(uuid)` | Authorized company owner/admin | Revoke pending invitation. |
| `set_notifications_archived(bigint[], boolean)` | Authenticated recipient | Active/archive lifecycle. |
| `schedule_notifications_deletion(bigint[])` | Authenticated recipient | Start delete/undo lifecycle. |
| `undo_notifications_deletion(bigint[])` | Authenticated recipient | Undo before server deadline. |
| `finalize_notifications_deletion(bigint[])` | Authenticated recipient | Finalize after server deadline. |
| `get_my_notification_preferences()` | Authenticated recipient | Notification settings load. |
| `set_my_notification_preference(text, text, boolean)` | Authenticated recipient | Change one Push/In-App category channel. |
| `update_active_company_profile(...)` | Active company owner | Transactional company edit with identity-review decision. |

## Edge Function reference

| Function | Browser use |
| -------- | ----------- |
| `send-company-invitation` | Invoke with the authenticated Supabase client and `{ companyId, email }`. It owns token creation, database invitation creation, HTTPS URL generation, and Resend delivery. |
| `send-notification-push` | Never call from UI. It is invoked by the trusted database webhook/outbox pipeline. |

## Implementation verification

- All three individual roles and Business registration route from persisted
  `accountType`/`professionalRole` and resume correctly after interruption.
- Own/public profiles use assembled RPCs and expose the correct affiliation
  lifecycle privacy.
- Registered requests remain private until approval; unregistered companies
  display as self-reported; company invitations become verified only after an
  explicit matching-email acceptance.
- Company invitation sender UI uses the Edge Function, handles eligibility and
  delivery-unknown states, lists sent invitations, and supports revoke.
- `/invitations/accept` strips the fragment before third-party code, persists
  only for the active session, supports app opening plus full Web continuation,
  guards wrong-email auth, survives onboarding, and handles every lifecycle
  state without exposing the raw token.
- Notification active/archive/read/delete/undo states persist after refresh.
- Push and In-App preferences work independently for every category.
- Push navigation uses self-contained routing data and authoritative destination
  fetches rather than an in-app notification lookup.
- No browser code reads private invitation, preference, Push outbox, or Admin
  directory tables directly.
