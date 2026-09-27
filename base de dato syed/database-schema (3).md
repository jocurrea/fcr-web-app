# Flight Crew Database Schema

This document describes the current Flight Crew database and its supporting
infrastructure. Update it whenever a table, view, function, trigger, storage
bucket, policy, webhook, or database-backed integration changes.

- **Tables documented:** 39
- **Views documented:** 1
- **Schema baseline:** Current through Migration 052
- **Scope:** Current tables, views, important constraints and access rules,
  database behavior, functions, triggers, storage, and external delivery
  boundaries. It intentionally does not preserve change history.

## Contents

- [Users and profiles](#users-and-profiles)
- [Licenses, skills, and ratings](#licenses-skills-and-ratings)
- [Companies](#companies)
- [Groups and posts](#groups-and-posts)
- [Notifications and moderation](#notifications-and-moderation)
- [Application content](#application-content)
- [Database views](#database-views)
- [Current database behavior](#current-database-behavior)
- [Database functions and triggers](#database-functions-and-triggers)
- [Storage and external integrations](#storage-and-external-integrations)

## Users and profiles

### `users`

| Column                   | Type                       |
| ------------------------ | -------------------------- |
| `id`                     | `uuid`                     |
| `created`                | `timestamp with time zone` |
| `username`               | `text`                     |
| `email`                  | `text`                     |
| `role`                   | `text`                     |
| `onboarded`              | `numeric`                  |
| `firstName`              | `text`                     |
| `middleName`             | `text`                     |
| `lastName`               | `text`                     |
| `nationalityCountry`     | `text`                     |
| `nationalityCountryCode` | `text`                     |
| `profileImage`           | `text`                     |
| `bio`                    | `text`                     |
| `workCountry`            | `text`                     |
| `workCountryCode`        | `text`                     |
| `flightHours`            | `text`                     |
| `industryYears`          | `text`                     |
| `medicalCert`            | `text`                     |
| `employer`               | `text`                     |
| `pilotStripe`            | `text`                     |
| `flightAttendantStripe`  | `text`                     |
| `employmentStatus`       | `text`                     |
| `hasCrossedOcean`        | `smallint`                 |
| `faceIdEnabled`          | `boolean`                  |
| `accessLevel`            | `text`                     |
| `isBanned`               | `smallint`                 |
| `hasAdminExp`            | `smallint`                 |
| `adminRole`              | `text`                     |
| `adminRoleDescription`   | `text`                     |
| `acceptedTermsAt`        | `timestamp with time zone` |
| `accountType`            | `text`                     |
| `professionalRole`       | `text`                     |
| `professionalTitleKey`   | `text`                     |
| `professionalTitleOther` | `text`                     |
| `platformRole`           | `text`                     |

`users` is the account and lightweight identity root. `professionalRole` is the
mutually exclusive individual category (`pilot`, `crew`, or
`aviation_professional`). Role-specific canonical data belongs in the extension
tables below. `bio`, professional-title columns, and the older work/profile
columns remain here only as compatibility mirrors for retained clients; they
are not the canonical source used by assembled-profile reads.

### `professional_titles`

| Column               | Type                       |
| -------------------- | -------------------------- |
| `key`                | `text`                     |
| `label`              | `text`                     |
| `professional_role`  | `text`                     |
| `sort_order`         | `integer`                  |
| `is_active`          | `boolean`                  |
| `allows_custom_text` | `boolean`                  |
| `created_at`         | `timestamp with time zone` |
| `updated_at`         | `timestamp with time zone` |

The catalogue is publicly readable and service-managed. Clients may select only
active titles, while inactive titles remain readable so existing profiles retain
a stable display label. Canonical Aviation Professional profiles reference this
catalogue; temporary `users` title fields mirror the selection for compatibility.
Validation triggers enforce catalogue availability and the `allows_custom_text`
rule on both paths. Database constraints prevent title data from being attached
to another profile category or to a Business account. An Aviation Professional
cannot be marked onboarded without an active selected title, first name, last
name, and profile image. Pilot, Crew, and Business onboarding rules are not
changed by these constraints.

### `user_profiles`

| Column                   | Type                       |
| ------------------------ | -------------------------- |
| `id`                     | `uuid`                     |
| `userId`                 | `uuid`                     |
| `nationalityCountry`     | `text`                     |
| `nationalityCountryCode` | `text`                     |
| `workCountry`            | `text`                     |
| `workCountryCode`        | `text`                     |
| `employer`               | `text`                     |
| `medicalCert`            | `text`                     |
| `flightHours`            | `numeric`                  |
| `industryYears`          | `numeric`                  |
| `pilotStripe`            | `text`                     |
| `flightAttendantStripe`  | `text`                     |
| `employmentStatus`       | `text`                     |
| `hasCrossedOcean`        | `integer`                  |
| `hasAdminExp`            | `integer`                  |
| `adminRole`              | `text`                     |
| `adminRoleDescription`   | `text`                     |
| `contactPhone`           | `text`                     |
| `contactEmail`           | `text`                     |
| `professionalCredentials` | `text[]`                  |
| `locationCity` | `text` |
| `locationCountry` | `text` |
| `locationCountryCode` | `text` |
| `spokenLanguages` | `text[]` |
| `professionalWorkExperiences` | `jsonb` |
| `workAvailabilityStatus` | `text`: `active` or `available_for_work` |
| `bio`                    | `text`                     |
| `contactAddress`         | `text`                     |
| `websites`               | `text[]`                   |
| `awards`                 | `text[]`                   |
| `created_at`             | `timestamp with time zone` |
| `updated_at`             | `timestamp with time zone` |

This is the canonical shared individual profile. Migration 036 intentionally
preserves its legacy columns and access contract so installed Mobile versions
continue to work. Clients read its public-safe fields through
`get_public_profile(uuid)`. `contactEmail` is a public professional contact
address and remains separate from the authentication email on `users`. Private
resume demographics (`dateOfBirth`, `maritalStatus`, and `children`) remain in
the legacy resume JSON until a later access-cutover migration can add them
without exposing them through the legacy profile-table path. Public profile RPC
reads reject banned profiles and relationships blocked in either direction.

The older Pilot/Crew work fields and Aviation Professional arrays/JSON remain
in this table temporarily for client compatibility. The role extensions and
structured collection tables below are canonical, while current retained
clients may still reach them through compatibility synchronization. The old
columns are removed only by a later, separately approved cleanup migration.

During the Mobile compatibility window, Migration 037 synchronizes legacy
`users`, `user_profiles`, and latest-resume writes into the canonical role and
collection tables in the same database transaction. The bridge validates that
the caller owns the affected profile or is a global platform administrator.
Migration 038 makes the bridge explicitly NULL-safe so a newly authenticated
user may exist before selecting Pilot, Crew, or Aviation Professional without
creating an invalid role-extension row.

### `flight_crew_profiles`

| Column | Type |
| ------ | ---- |
| `userId` | `uuid`, primary key and FK to `users.id` |
| `workCountry` | `text` |
| `workCountryCode` | `text` |
| `employer` | `text` |
| `medicalCert` | `text` |
| `flightHours` | `numeric` |
| `industryYears` | `numeric` |
| `pilotStripe` | `text` |
| `flightAttendantStripe` | `text` |
| `employmentStatus` | `text` |
| `hasCrossedOcean` | `boolean` |
| `hasAdminExp` | `boolean` |
| `adminRole` | `text` |
| `adminRoleDescription` | `text` |
| `englishProficiency` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

This one-to-one extension is available only to Pilot and Crew accounts. Pilot
rows cannot contain Crew-only fields (`industryYears` and
`flightAttendantStripe`), and Crew rows cannot contain Pilot-only fields
(`medicalCert`, `flightHours`, and `pilotStripe`). Its
administration-experience fields describe professional experience and do not
grant platform or company permissions.

### `aviation_professional_profiles`

| Column | Type |
| ------ | ---- |
| `userId` | `uuid`, primary key and FK to `users.id` |
| `professionalTitleKey` | `text`, FK to `professional_titles.key` |
| `professionalTitleOther` | `text` |
| `professionalCredentials` | `text[]` |
| `workAvailabilityStatus` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

This one-to-one extension is available only to Aviation Professional accounts.
Credentials remain bounded free text and do not reuse Pilot/Crew licences. An
onboarded Aviation Professional cannot clear the canonical title or work
availability after those values have been migrated.

### `user_languages`

| Column | Type |
| ------ | ---- |
| `id` | `uuid` |
| `userId` | `uuid`, FK to `users.id` |
| `name` | `text` |
| `proficiency` | `text` |
| `sortOrder` | `integer` |
| `sourceKey` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

Names are case-insensitively unique per user and each user is limited to 20
entries. `sourceKey` is temporary deterministic backfill metadata.

### `user_work_experiences`

| Column | Type |
| ------ | ---- |
| `id` | `uuid` |
| `userId` | `uuid`, FK to `users.id` |
| `companyId` | nullable `uuid`, FK to `companies.id` |
| `companyName` | `text` |
| `title`, `role` | `text` |
| `startDate`, `endDate` | `date` |
| `isCurrent` | `boolean` |
| `country`, `countryCode`, `city` | `text` |
| `aircraftTypes` | `text[]` |
| `sortOrder` | `integer` |
| `sourceKey` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

Work experience is a user-authored profile claim. A `companyId` reference does
not grant company membership or verified affiliation. Each user is limited to
50 entries; Aviation Professional UI policy remains limited to 20.

### `user_education`

| Column | Type |
| ------ | ---- |
| `id` | `uuid` |
| `userId` | `uuid`, FK to `users.id` |
| `institutionName` | `text` |
| `educationType` | `text` |
| `details` | `text` |
| `sortOrder` | `integer` |
| `sourceKey` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

Education/training is shared across professional roles and limited to 50 rows
per user.

### `sessions`

| Column     | Type                          |
| ---------- | ----------------------------- |
| `userId`   | `uuid`                        |
| `lastSeen` | `timestamp without time zone` |

### `resumes`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `userId`     | `uuid`                     |
| `data`       | `jsonb`                    |

`resumes.data` remains intact for compatibility during the foundation rollout,
but its shared profile fields and collections are backfilled into the canonical
tables. After client cutover it is compatibility/export data rather than an
independent source of truth.

## Licenses, skills, and ratings

### `licenses`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `name`       | `text`                     |

### `licenseTypes`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `name`       | `text`                     |

### `userLicenses`

| Column          | Type                       |
| --------------- | -------------------------- |
| `id`            | `bigint`                   |
| `created_at`    | `timestamp with time zone` |
| `userId`        | `uuid`                     |
| `licenseId`     | `bigint`                   |
| `licenseTypeId` | `bigint`                   |
| `licenseNumber` | `text`                     |
| `expiryDate`    | `date`                     |
| `frontImage`    | `text`                     |
| `backImage`     | `text`                     |
| `validityMode`  | `text`                     |
| `medicalClass`  | `text`                     |

Authenticated license deletion is routed through
`delete_user_license(bigint)`. The function verifies ownership, serializes
concurrent deletions per user, and refuses to delete the final license. Direct
client deletion is revoked, so a user must add a replacement before removing
their only license. License expiration remains warning-only and does not affect
whether the license satisfies this minimum-count rule.

### `userSkills`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `name`       | `text`                     |
| `userId`     | `uuid`                     |
| `skillKey`   | `text`, nullable FK to `skill_catalog.key` |

Legacy and custom Pilot/Crew skills may remain name-only. Standardized Pilot,
Crew, and Aviation Professional selections store a catalogue key and retain the
existing `name` column for compatibility with current profile, directory, and
Web readers.

### `skill_catalog`

| Column               | Type                       |
| -------------------- | -------------------------- |
| `key`                | `text`                     |
| `label`              | `text`                     |
| `professional_roles` | `text[]`                   |
| `sort_order`         | `integer`                  |
| `is_active`          | `boolean`                  |
| `created_at`         | `timestamp with time zone` |
| `updated_at`         | `timestamp with time zone` |

Authenticated clients may read active catalogue entries. Catalogue writes are
not granted to ordinary clients. `replace_standardized_user_skills(text[])`
atomically replaces any individual professional's role-compatible standardized
selections while leaving legacy name-only skills untouched.

### `ratings`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `code`       | `text`                     |
| `model`      | `text`                     |

### `userRatings`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `userId`     | `uuid`                     |
| `ratingId`   | `bigint`                   |

## Companies

### `companies`

| Column                | Type                       |
| --------------------- | -------------------------- |
| `id`                  | `uuid`                     |
| `owner_user_id`       | `uuid`                     |
| `name`                | `text`                     |
| `slug`                | `text`                     |
| `logo_url`            | `text`                     |
| `description`         | `text`                     |
| `contact_email`       | `text`                     |
| `phone`               | `text`                     |
| `website`             | `text`                     |
| `location`            | `text`                     |
| `founded_year`        | `integer`                  |
| `operating_areas`     | `text[]`                   |
| `status`              | `text`                     |
| `approved_at`         | `timestamp with time zone` |
| `approved_by_user_id` | `uuid`                     |
| `rejected_at`         | `timestamp with time zone` |
| `rejected_by_user_id` | `uuid`                     |
| `rejection_reason`    | `text`                     |
| `created_at`          | `timestamp with time zone` |
| `updated_at`          | `timestamp with time zone` |
| `services`            | `text[]`                   |
| `fleet_types`         | `text[]`                   |

### `company_members`

| Column       | Type                       |
| ------------ | -------------------------- |
| `company_id` | `uuid`                     |
| `user_id`    | `uuid`                     |
| `role`       | `text`                     |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

Company membership is an authorization relationship. Its roles determine who
may manage a company; membership does not make the user professionally
affiliated with that company.

### `company_affiliations`

| Column | Type |
| ------ | ---- |
| `id` | `uuid` |
| `user_id` | `uuid`, FK to `users.id` |
| `company_id` | nullable `uuid`, FK to `companies.id` |
| `company_name_snapshot` | `text` |
| `status` | `text` |
| `source` | `text` |
| `is_primary` | `boolean` |
| `requested_at` | `timestamp with time zone` |
| `reviewed_at` | nullable `timestamp with time zone` |
| `reviewed_by_user_id` | nullable `uuid`, FK to `users.id` |
| `rejection_reason` | nullable `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

This is the professional-to-company relationship and is deliberately separate
from company management membership and user-authored work history. Its complete
lifecycle supports `pending`, `verified`, `unverified`, `rejected`, and
`revoked`; sources are `self_request`, `self_reported`, and
`company_invitation`. Registered-company requests keep a company-name snapshot
for audit while displaying current joined company data. Unregistered employers
use a null `company_id` and remain visibly unverified. A user may have multiple
relationships but at most one active primary affiliation and at most one active
relationship to the same registered company.

Ordinary clients cannot mutate this table directly. Owner-derived RPCs enforce
the lifecycle, and eligible onboarded Pilot, Crew, and Aviation Professional
accounts can create a self-request. Pending registered-company requests may be listed
and reviewed only by the active company's owner or a non-banned member with the
`owner`/`admin` company role. Approval records reviewer audit data and changes
the relationship to verified; rejection records the decision, clears its
primary marker, and removes it from active profile display. Company invitations create relationships
for Pilot, Crew, or Aviation Professional accounts without changing their
professional role. Owner profile reads include the complete lifecycle; public
profile reads expose only verified registered-company and unverified
self-reported relationships, never pending or rejected claims.

### `company_invitations`

| Column | Type |
| ------ | ---- |
| `id` | `uuid` |
| `company_id` | `uuid`, FK to `companies.id` |
| `invited_email` | normalized lowercase `text` |
| `invited_by_user_id` | nullable `uuid`, FK to `users.id` |
| `invitation_type` | `text`; currently `affiliation` |
| `token_hash` | 64-character SHA-256 hex `text` |
| `status` | `text`: `pending`, `accepted`, `declined`, or `revoked` |
| `expires_at` | `timestamp with time zone` |
| `accepted_at`, `declined_at`, `revoked_at` | nullable `timestamp with time zone` |
| `accepted_by_user_id`, `declined_by_user_id`, `revoked_by_user_id` | nullable `uuid`, FK to `users.id` |
| `affiliation_id` | nullable `uuid`, FK to `company_affiliations.id` |
| `created_at`, `updated_at` | `timestamp with time zone` |

This private table stores the single-use, email-bound company invitation
lifecycle. Only a SHA-256 token hash is stored; the raw 256-bit token exists
only while the sending Edge Function builds the email and while the recipient
client processes the link. One company cannot have two simultaneous pending
affiliation invitations for the same normalized email.

Only active-company owners and non-banned `owner`/`admin` company members may
create, list, or revoke invitations. Creation rejects the inviter's own email,
an existing Business/ineligible account, and a professional already verified
with the company. Invitation creation and affiliation mutation take the same
company-plus-email advisory lock to prevent a send/verification race. Accepting
requires an authenticated, onboarded Pilot, Crew, or Aviation Professional
whose verified authentication email matches `invited_email`. Acceptance creates
or converts a `verified/company_invitation` affiliation; it never inserts a
`company_members` row or grants company-management permissions.

### `company_settings`

| Column                            | Type                       |
| --------------------------------- | -------------------------- |
| `company_id`                      | `uuid`                     |
| `interested_in_advertising`       | `boolean`                  |
| `interested_in_hiring_pilots`     | `boolean`                  |
| `interested_in_hiring_cabin_crew` | `boolean`                  |
| `offers_crew_discounts`           | `boolean`                  |
| `join_founding_partners`          | `boolean`                  |
| `allow_crew_direct_messages`      | `boolean`                  |
| `created_at`                      | `timestamp with time zone` |
| `updated_at`                      | `timestamp with time zone` |

### `company_type_selections`

| Column            | Type                       |
| ----------------- | -------------------------- |
| `company_id`      | `uuid`                     |
| `company_type_id` | `uuid`                     |
| `created_at`      | `timestamp with time zone` |

### `company_types`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `uuid`                     |
| `key`        | `text`                     |
| `label`      | `text`                     |
| `icon`       | `text`                     |
| `sort_order` | `integer`                  |
| `is_active`  | `boolean`                  |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

## Groups and posts

### `groups`

| Column        | Type                       |
| ------------- | -------------------------- |
| `id`          | `bigint`                   |
| `created_at`  | `timestamp with time zone` |
| `name`        | `text`                     |
| `description` | `text`                     |
| `image`       | `text`                     |
| `userId`      | `uuid`                     |
| `type`        | `text`                     |
| `isPublic`    | `numeric`                  |

### `groupMembers`

| Column          | Type                          |
| --------------- | ----------------------------- |
| `id`            | `bigint`                      |
| `created_at`    | `timestamp with time zone`    |
| `userId`        | `uuid`                        |
| `groupId`       | `bigint`                      |
| `joinedAt`      | `timestamp without time zone` |
| `role`          | `text`                        |
| `notifications` | `smallint`                    |

### `posts`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `body`       | `text`                     |
| `file`       | `text`                     |
| `userId`     | `uuid`                     |
| `groupId`    | `bigint`                   |

### `comments`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `body`       | `text`                     |
| `userId`     | `uuid`                     |
| `postId`     | `bigint`                   |

### `postLikes`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `postId`     | `bigint`                   |
| `userId`     | `uuid`                     |

## Notifications and moderation

### `notifications`

| Column                | Type                       |
| --------------------- | -------------------------- |
| `id`                  | `bigint`                   |
| `created_at`          | `timestamp with time zone` |
| `title`               | `text`                     |
| `senderId`            | `uuid`                     |
| `receiverId`          | `uuid`                     |
| `data`                | `text`                     |
| `read`                | `numeric`                  |
| `type`                | `text`                     |
| `latestSenderId`      | `uuid`                     |
| `targetType`          | `text`                     |
| `targetId`            | `text`                     |
| `groupKey`            | `text`                     |
| `activityCount`       | `integer`                  |
| `payload`             | `jsonb`                    |
| `readAt`              | `timestamp with time zone` |
| `lastActivityAt`      | `timestamp with time zone` |
| `lastPushAt`          | `timestamp with time zone` |
| `pushWindowStartedAt` | `timestamp with time zone` |
| `pushCountInWindow`   | `integer`                  |
| `bundleStartedAt`     | `timestamp with time zone` |
| `bundleExpiresAt`     | `timestamp with time zone` |
| `archivedAt`          | nullable `timestamp with time zone` |
| `deletedAt`           | nullable `timestamp with time zone` |
| `deleteAfter`         | nullable `timestamp with time zone` |
| `inAppVisible`        | `boolean`                  |

The structured notification contract coexists with `senderId`, `data`, and
`read`, which are still used by parts of the application. Grouped activity uses
a unique `receiverId`/`groupKey` pair, and `lastActivityAt` determines history
order. A compatibility trigger synchronizes `senderId` with `latestSenderId`
and `read` with `readAt`.

Comment and frequency-invitation notifications are derived from trusted
`comments` and `groupMembers` events. Authenticated clients can read only their
own notification rows and can update only `read` and `readAt`. Clients cannot
directly insert or delete notifications.

Post likes create grouped notification activity from trusted `postLikes`
events. A recipient/post bundle produces one canonical notification row for a
fixed 48-hour window. Likes inside the window update that row, restore its
unread state, and move it to the top. The first later like opens a new bundle.
The grouped count reflects current distinct likers, while independent group
and recipient limits reduce noisy phone alerts without dropping in-app
activity.

`archivedAt` moves a notification between the active and archived inboxes
without deleting history. New grouped activity clears `archivedAt` so the
updated notification returns to the active inbox. Deletion is a two-stage
server-owned lifecycle: `deletedAt` hides the row immediately, `deleteAfter`
opens a five-second undo window, and a client finalizer or scheduled `pg_cron`
fallback physically purges expired rows. Deleted rows are excluded by RLS.

`inAppVisible` records the recipient's in-app preference at event time. Rows
created while the relevant in-app category is disabled remain hidden even if
the preference is later re-enabled. Push delivery is independent: a recipient
may receive a self-contained Push while the matching in-app row is hidden.

### `profile_likes`

| Column            | Type                       |
| ----------------- | -------------------------- |
| `id`              | `bigint`                   |
| `created_at`      | `timestamp with time zone` |
| `liker_user_id`   | `uuid`                     |
| `profile_user_id` | `uuid`                     |

There is one unique like per liker/profile pair. Authenticated users can read
relationships they participate in, while a trusted mutation function rejects
self-likes, unavailable profiles, and blocked relationships. Blocking either
participant removes the pair. Profile likes use fixed 48-hour notification
bundles and the same adaptive social-push limits used by post likes.

### `profile_visits`

| Column                          | Type                       |
| ------------------------------- | -------------------------- |
| `id`                            | `bigint`                   |
| `visitor_user_id`               | `uuid`                     |
| `profile_user_id`               | `uuid`                     |
| `first_visited_at`              | `timestamp with time zone` |
| `last_visited_at`               | `timestamp with time zone` |
| `last_notification_activity_at` | `timestamp with time zone` |
| `visit_count`                   | `integer`                  |

There is one unique visitor/profile pair. A trusted recording function rejects
self-visits, unavailable profiles, and blocked relationships, then updates the
latest visit and count for repeated openings. Blocking either participant
removes the pair. Notification activity is created only for the first visit or
a later visit after a 24-hour absence. Eligible visits use fixed 48-hour
bundles and adaptive social-push limits.

### `notification_push_deliveries`

| Column               | Type                       |
| -------------------- | -------------------------- |
| `id`                 | `bigint`                   |
| `notification_id`    | `bigint`                   |
| `recipient_user_id`  | `uuid`                     |
| `status`             | `text`                     |
| `deduplication_key`  | `text`                     |
| `idempotency_key`    | `uuid`                     |
| `provider_message_id`| `text`                     |
| `attempt_count`      | `integer`                  |
| `last_error`         | `text`                     |
| `push_payload`       | `jsonb`                    |
| `created_at`         | `timestamp with time zone` |
| `updated_at`         | `timestamp with time zone` |
| `sent_at`            | `timestamp with time zone` |

This outbox is private to trusted database and Edge Function code. Clients have
no access to the table or its sequence. Immediately before sending, the push
function rechecks whether the sender and recipient have blocked one another and
skips the queued delivery if so.

### `notification_push_policies`

| Column                     | Type                       |
| -------------------------- | -------------------------- |
| `notification_type`        | `text`                     |
| `group_window_seconds`     | `integer`                  |
| `max_group_pushes`         | `integer`                  |
| `recipient_window_seconds` | `integer`                  |
| `max_recipient_pushes`     | `integer`                  |
| `updated_at`               | `timestamp with time zone` |

The policy table is private. Post likes and profile likes allow at most three
group pushes per ten minutes. Profile visits allow at most three group pushes
per thirty minutes. All social notification types allow at most five pushes per
recipient per ten minutes. Each queued delivery captures immutable sender,
count, and delivery metadata in `push_payload`. Approved progressive alerts are
not collapsed by the push provider because the database policy is responsible
for the noise limit.

### `notification_type_categories`

| Column | Type |
| ------ | ---- |
| `notification_type` | `text`, primary key |
| `category` | `text` |
| `created_at`, `updated_at` | `timestamp with time zone` |

This private server-managed catalogue maps every accepted canonical
notification type to one preference category. Unknown notification types are
rejected rather than silently bypassing preferences.

| Category | Current notification types |
| -------- | -------------------------- |
| `community_frequencies` | `comment`, `groupInvite`, `postLike` |
| `profile_activity` | `profileLike`, `profileVisit`, `affiliationRequest`, `affiliationApproved`, `affiliationRejected` |
| `direct_messages` | Reserved for future message notification types |
| `jobs` | Reserved for future job notification types |

### `user_notification_preferences`

| Column | Type |
| ------ | ---- |
| `user_id` | `uuid`, FK to `users.id` |
| `category` | `text` |
| `push_enabled` | `boolean` |
| `in_app_enabled` | `boolean` |
| `updated_at` | `timestamp with time zone` |

The `(user_id, category)` pair is the primary key. Missing rows intentionally
mean both channels are enabled, preserving behavior for existing users and
older clients. Clients cannot read or write the table directly; owner-scoped
RPCs always return the complete four-category effective preference set and
update one channel without overwriting the other.

### `blocked_users`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `blockerId`  | `uuid`                     |
| `blockedId`  | `uuid`                     |

### `reports`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `reporterId` | `uuid`                     |
| `targetId`   | `text`                     |
| `targetType` | `text`                     |
| `reason`     | `text`                     |
| `status`     | `text`                     |

## Application content

### `privacyPolicy`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `uuid`                     |
| `title`      | `text`                     |
| `content`    | `text`                     |
| `createdBy`  | `uuid`                     |
| `created_at` | `timestamp with time zone` |

## Database views

### `user_directory_v`

This internal read-only view supplies the protected admin directory function.
Migration 039 rebuilds its Dashboard search and filter contract from canonical
shared and role-specific profile tables. It provides normalized arrays and a
`tsvector` without reading Resume JSON or exposing private demographics and
license numbers.

| Output group | Important fields |
| ------------ | ---------------- |
| Identity and access | `user_id`, `email`, `username`, `first_name`, `middle_name`, `last_name`, `full_name`, `role`, `professional_role`, `access_level`, `platform_role`, `account_type`, `is_banned`, `profile_image`, `user_created_at` |
| Work profile | `nationality_country`, `nationality_country_code`, `work_country`, `work_country_code`, `employment_status`, `has_crossed_ocean`, `has_admin_exp`, `admin_role`, `admin_role_description`, `flight_hours_text`, `flight_hours_num`, `industry_years_text`, `industry_years_num` |
| Profile supplements | `resume_ratari_level`, `resume_languages`, `resume_experience_countries`, `resume_experience_roles`, `resume_plans_flown` (legacy-compatible names backed by canonical tables) |
| Skills and search | `skills`, `skills_ci`, normalized resume arrays ending in `_ci`, `search_tsv` |
| License summary | `has_valid_license`, `has_expired_license`, `next_license_expiry`, `last_license_expiry`, `license_ids`, `license_type_names`, `license_type_names_ci` |

Migration 039 temporarily retained direct `authenticated` view access while
the protected Dashboard RPC cutover was tested. After the compatible Dashboard
was accepted, Migration 040 revoked that temporary grant. Direct access is now
limited to `service_role`. Authenticated Dashboard clients must use
`get_admin_user_directory()`, which verifies the caller's global
`platformRole = 'admin'`; company membership does not grant RPC access. The
view's license calculations are described below.

## Current database behavior

### License validity

`userLicenses` uses explicit validity semantics.

- `validityMode` is required and defaults to `expires`, which preserves the
  behavior of existing licenses.
- `validityMode` accepts `expires`, `permanent`, or `faa_medical`.
- `expires` requires `expiryDate` and does not allow `medicalClass`.
- `permanent` requires both `expiryDate` and `medicalClass` to be null.
- `faa_medical` uses `expiryDate` as the medical certificate's Valid Until date
  and requires `medicalClass` to be `1st`, `2nd`, or `3rd`.
- `expiryDate` is nullable so permanent licenses can be stored without a date.
- An index on `validityMode` supports validity-mode filtering.

The `user_directory_v` license summary used by the admin dashboard follows the
same validity rules.

- Permanent licenses count as valid without an expiry date.
- Expiring licenses use their license expiry date.
- FAA licenses use the associated medical certificate's `Valid Until` date.
- Permanent licenses never count as expired.
- `next_license_expiry` contains only the nearest upcoming time-bound license
  or FAA medical validity date.

### Active company profile editing

The security-definer function `public.update_active_company_profile` is
executable by authenticated users and permits only the authenticated owner to
update an active company.

The function updates the company profile, its selected company types, and its
settings in one transaction. It returns:

| Property                 | Type      | Meaning                                              |
| ------------------------ | --------- | ---------------------------------------------------- |
| `companyId`              | `uuid`    | The updated company ID.                              |
| `identityReviewRequired` | `boolean` | Whether the edit moved the company to pending review. |

Changing the company name, logo, or selected company types is considered an
identity change. An identity change sets the company status to `pending` and
clears its approval metadata. Supported non-identity changes preserve the
company's active status.

Direct writes to `company_type_selections` and `company_settings` are limited
to platform administrators or owners of companies with `draft`, `pending`, or
`rejected` status. Active-company owners make those changes through the
function so the identity-review decision is applied atomically.

## Database functions and triggers

### Callable and shared functions

| Function | Used by | Purpose |
| -------- | ------- | ------- |
| `handle_new_user()` | Authentication signup hook | Creates the matching `public.users` row with safe default account and platform roles. |
| `is_platform_admin(uuid)` | RLS policies and company operations | Checks whether a user has `platformRole = 'admin'`. |
| `update_active_company_profile(...)` | Authenticated company owner RPC | Updates company data, types, and settings atomically; identity changes return the company to pending review. |
| `delete_user_license(bigint)` | Authenticated flight-crew RPC | Deletes an owned license while atomically preventing deletion of the user's final license. |
| `set_profile_like(uuid, boolean)` | Authenticated profile-like RPC | Adds or removes a profile like after checking self-like, profile availability, and blocking rules. |
| `record_profile_visit(uuid)` | Authenticated profile-visit RPC | Records an eligible visit by inserting or updating the visitor/profile relationship row. |
| `search_companies_for_affiliation(text, integer)` | Authenticated individual | Returns at most 20 active-company autocomplete matches with only public display fields. |
| `request_company_affiliation(uuid)` | Authenticated Pilot, Crew, or Aviation Professional | Creates an owner-derived pending request for an active registered company after eligibility and duplicate checks. |
| `create_unregistered_company_affiliation(text)` | Authenticated Pilot, Crew, or Aviation Professional | Saves a normalized free-text employer as an unverified self-reported affiliation without creating a Business approval request or notification. Exact active registered-company names must use the registered request flow. |
| `get_pending_company_affiliation_requests()` | Authenticated company owner/admin | Returns the public-safe details needed to review pending self-request affiliations for active companies the caller may manage. |
| `review_company_affiliation_request(uuid, text, text)` | Authenticated company owner/admin | Atomically approves or rejects one still-pending self-request, records reviewer audit fields, and rejects stale or unauthorized decisions. |
| `create_company_affiliation_invitation(uuid, text, text)` | `send-company-invitation` Edge Function using the caller's bearer session | Creates a seven-day pending invitation from a caller-provided SHA-256 token hash after company authorization, eligibility, duplicate, and concurrency checks. Web UI should invoke the Edge Function rather than this RPC directly. |
| `get_company_affiliation_invitations()` | Authenticated company owner/admin | Lists invitations for companies the caller may manage without returning raw tokens or token hashes. |
| `resolve_company_affiliation_invitation(text)` | Anonymous or authenticated invitation page | Resolves a raw bearer token to limited active-company display data, masked email hint, lifecycle state, and—only for an authenticated caller—a boolean recipient-email match. |
| `check_company_affiliation_invitation_email(text, text)` | Pre-authentication invitation guard | Compares a candidate login/registration email with the token-bound recipient and returns only a masked hint plus a match boolean. It never creates or modifies an account. |
| `accept_company_affiliation_invitation(text)` | Authenticated onboarded individual professional | Consumes a matching pending invitation and atomically creates or converts a verified `company_invitation` affiliation. It never grants company membership. |
| `decline_company_affiliation_invitation(text)` | Authenticated matching recipient | Marks a still-pending invitation declined without creating an affiliation. |
| `revoke_company_affiliation_invitation(uuid)` | Authenticated company owner/admin | Revokes a still-pending invitation for a company the caller may manage. |
| `get_profile_affiliations(uuid, boolean)` | Private assembled-profile helper | Returns complete owner lifecycle data or public-safe verified/unverified relationships; it is not directly client-callable. |
| `professional_credentials_are_valid(text[])` | Legacy shared and canonical Aviation Professional constraints | Validates the bounded free-text Aviation Professional credential list. |
| `spoken_languages_are_valid(text[])` | `user_profiles` check constraint | Validates the optional bounded Aviation Professional language list. |
| `professional_work_experiences_are_valid(jsonb)` | `user_profiles` check constraint | Validates the shape, length, required values, date order, and current-role state of Aviation Professional work history. |
| `profile_text_array_is_valid(text[], integer, integer)` | Canonical profile constraints | Validates bounded text arrays used by shared profile fields; ordinary UI should not call it as a lifecycle operation. |
| `replace_standardized_user_skills(text[])` | Authenticated individual skill editor | Atomically replaces role-compatible catalogue-backed `userSkills` rows after validating role, count, uniqueness, and active catalogue membership. |
| `get_my_profile()` | Authenticated profile owner | Returns the assembled owner profile, qualifications, and complete affiliation lifecycle. Private legacy resume demographics remain outside this RPC until the access cutover. |
| `get_public_profile(uuid)` | Authenticated profile reader | Returns an onboarded, unbanned profile with verified/unverified affiliations but without pending claims, authentication email, private demographics, moderation fields, licence numbers, or licence documents. |
| `get_admin_user_directory()` | Next.js Admin Dashboard | Returns the canonical directory only after verifying the caller is a global platform administrator. |
| `set_notifications_archived(bigint[], boolean)` | Authenticated notification recipient | Archives or restores 1–100 owned notifications. |
| `schedule_notifications_deletion(bigint[])` | Authenticated notification recipient | Immediately hides 1–100 owned notifications and opens the server-enforced five-second undo period. |
| `undo_notifications_deletion(bigint[])` | Authenticated notification recipient | Restores owned notifications while their undo deadline remains open. |
| `finalize_notifications_deletion(bigint[])` | Authenticated notification recipient | Physically deletes selected owned notifications after the undo deadline; the Cron fallback may already have completed the same purge. |
| `get_my_notification_preferences()` | Authenticated notification settings page | Returns all four categories with effective Push and In-App values; missing rows resolve to enabled. |
| `set_my_notification_preference(text, text, boolean)` | Authenticated notification settings page | Atomically updates one `push` or `in_app` channel for one allowed category without overwriting the other channel. |
| `notification_channel_is_enabled(uuid, text, text)` | Trusted database/`service_role` notification delivery | Resolves the effective Push or In-App preference for a canonical notification type; missing owner overrides default to enabled. It is not browser-callable. |
| `store_notification_event(...)` | Trusted notification functions | Creates or updates the canonical in-app notification after self-notification and blocking checks. It is not callable by normal clients. |

### Internal trigger functions

| Function | Purpose |
| -------- | ------- |
| `sync_notification_compatibility_fields()` | Keeps legacy notification fields (`senderId`, `read`) synchronized with `latestSenderId` and `readAt`. |
| `notify_post_owner_after_comment()` | Creates a trusted comment notification for the post owner. |
| `notify_user_after_group_invitation()` | Creates a trusted frequency invitation notification after validating the inviter. |
| `enqueue_notification_push_delivery()` | Adds the initial delivery-outbox row for a newly inserted notification. |
| `notify_post_owner_after_like()` | Creates or updates a 48-hour grouped post-like notification and applies push limits. |
| `sync_grouped_post_like_count()` | Recalculates grouped post-like wording/counts after likes change. |
| `notify_profile_owner_after_like()` | Creates or updates a grouped profile-like notification and applies push limits. |
| `sync_grouped_profile_like_count()` | Recalculates grouped profile-like wording/counts after likes change. |
| `remove_profile_likes_after_block()` | Removes an existing profile-like relationship when either user blocks the other. |
| `notify_profile_owner_after_visit()` | Creates or updates an eligible grouped profile-visit notification. |
| `sync_grouped_profile_visit_count()` | Recalculates grouped profile-visit wording/counts as visit rows change. |
| `remove_profile_visits_after_block()` | Removes an existing profile-visit relationship when either user blocks the other. |
| `validate_aviation_professional_title()` | Enforces whether the selected professional title requires or forbids custom title text. |
| `validate_role_profile_owner()` | Prevents role-extension rows from being assigned to the wrong account category and prevents Pilot/Crew subtype fields from crossing roles. |
| `validate_aviation_professional_profile()` | Validates the canonical title catalogue/custom-text relationship and prevents onboarded Aviation Professionals from clearing their title or availability. |
| `validate_shared_profile_role_values()` | Applies role-dependent limits to shared fields such as Aviation Professional About Me. |
| `enforce_profile_collection_limit()` | Serializes inserts and enforces per-user language, experience, and education limits. |
| `set_profile_domain_updated_at()` | Maintains `updated_at` values for canonical profile tables. |
| `validate_company_affiliation_owner()` | Restricts affiliation owners to Pilot, Crew, or Aviation Professional accounts and validates source/status shapes. |
| `lock_company_affiliation_email_identity()` | Serializes pending/verified affiliation mutations with invitation creation for the same company and authentication email. |
| `hash_company_invitation_token(text)` | Hashes a raw invitation bearer token for private lookup; no browser role has execution permission. |
| `notify_company_reviewers_after_affiliation_request()` | Creates trusted in-app notifications for the active company's non-banned owner and owner/admin members after a self-request. |
| `notify_professional_after_affiliation_review()` | Notifies the professional after an authorized approval or rejection decision. |
| `reactivate_archived_notification_on_activity()` | Clears archive and pending-deletion state when newer grouped activity updates a notification. |
| `apply_notification_in_app_preference()` | Records the event-time In-App channel decision and separates grouped rows whose visibility differs. |
| `enforce_notification_push_preference()` | Suppresses outbox insertion when the recipient has disabled Push for the notification category. |
| `touch_notification_preference_updated_at()` | Maintains preference catalogue/override audit timestamps. |
| `purge_expired_notification_deletions()` | Cron-only fallback that physically deletes expired pending-deletion rows in bounded batches. |
| `sync_legacy_user_to_canonical()` | Keeps profile category, title, and legacy `users.bio` changes synchronized during the Mobile compatibility window. |
| `sync_legacy_user_profile_to_canonical()` | Copies legacy role fields and Aviation Professional collections from `user_profiles` into their canonical owners. |
| `sync_legacy_resume_to_canonical()` | Replaces canonical Pilot/Crew shared and structured resume data from the latest legacy resume row. |

Trusted notification functions use the deterministic `pg_catalog, public`
search path and are not directly callable by clients unless explicitly listed
as an authenticated RPC above.

### Active triggers

| Trigger | Event | Result |
| ------- | ----- | ------ |
| `validate_company_affiliation_owner_trigger` | Before affiliation insert or owner/source change | Enforces the professional-account and source ownership rules. |
| `set_company_affiliations_updated_at` | Before affiliation update | Maintains the relationship audit timestamp. |
| `lock_company_affiliation_email_identity_trigger` | Before pending/verified affiliation insert or identity/status update | Takes the shared company/email transaction lock used by invitation creation. |
| `notify_company_reviewers_after_affiliation_request_trigger` | After affiliation insert | Notifies eligible company reviewers about a new pending self-request. |
| `notify_professional_after_affiliation_review_trigger` | After affiliation status update | Notifies the professional after a pending self-request becomes verified or rejected. |
| `set_company_invitations_updated_at` | Before invitation update | Maintains invitation audit time. |
| `sync_notification_compatibility_fields_trigger` | Before insert or update on `notifications` | Synchronizes legacy and structured notification fields. |
| `reactivate_archived_notification_on_activity_trigger` | Before grouped notification activity time update | Returns updated history to the active inbox and cancels pending deletion. |
| `apply_notification_in_app_preference_trigger` | Before notification insert | Records In-App visibility from the recipient's category preference. |
| `enforce_notification_push_preference_trigger` | Before push-outbox insert | Cancels queue creation when Push is disabled for the mapped category. |
| `touch_notification_preference_updated_at_trigger` | Before user preference update | Maintains preference audit time. |
| `touch_notification_type_category_updated_at_trigger` | Before notification-type category update | Maintains catalogue audit time. |
| `notify_post_owner_after_comment_trigger` | After insert on `comments` | Derives the post-owner comment notification. |
| `notify_user_after_group_invitation_trigger` | After insert on `groupMembers` | Derives an invitation notification for an unjoined member. |
| `enqueue_notification_push_delivery_trigger` | After insert on `notifications` | Queues the initial push delivery. |
| `notify_post_owner_after_like_trigger` | After insert on `postLikes` | Builds or updates the grouped post-like activity. |
| `sync_grouped_post_like_count_trigger` | After insert or delete on `postLikes` | Keeps the grouped post-like count accurate. |
| `notify_profile_owner_after_like_trigger` | After insert on `profile_likes` | Builds or updates grouped profile-like activity. |
| `sync_grouped_profile_like_count_trigger` | After insert or delete on `profile_likes` | Keeps the grouped profile-like count accurate. |
| `remove_profile_likes_after_block_trigger` | After insert on `blocked_users` | Deletes profile likes between the blocked pair. |
| `notify_profile_owner_after_visit_trigger` | After insert or update on `profile_visits` | Builds or updates eligible grouped visit activity. |
| `sync_grouped_profile_visit_count_trigger` | After insert, update, or delete on `profile_visits` | Keeps the grouped profile-visit count accurate. |
| `remove_profile_visits_after_block_trigger` | After insert on `blocked_users` | Deletes recorded visits between the blocked pair. |
| `validate_aviation_professional_title_trigger` | Before a professional identity insert or update on `users` | Validates custom title text against the selected catalogue entry. |
| `validate_flight_crew_profile_owner` | Before insert or update on `flight_crew_profiles` | Requires a Pilot or Crew individual account and validates subtype fields. |
| `validate_aviation_professional_profile_owner` | Before insert or owner change on `aviation_professional_profiles` | Requires an Aviation Professional individual account. |
| `validate_aviation_professional_profile_trigger` | Before canonical Aviation Professional profile changes | Enforces active catalogue/custom-title rules and onboarded required fields. |
| `validate_shared_profile_role_values_trigger` | Before shared profile role-sensitive changes | Enforces the Aviation Professional About Me limit. |
| `enforce_user_languages_limit` | Before insert on `user_languages` | Enforces the per-user language limit. |
| `enforce_user_work_experiences_limit` | Before insert on `user_work_experiences` | Enforces the per-user experience limit. |
| `enforce_user_education_limit` | Before insert on `user_education` | Enforces the per-user education limit. |
| `sync_legacy_user_to_canonical_trigger` | After compatible identity/profile-category writes on `users` | Reconciles the user's canonical role row. |
| `sync_legacy_user_profile_to_canonical_trigger` | After insert or update on `user_profiles` | Synchronizes role fields and Aviation Professional collections. |
| `sync_legacy_resume_to_canonical_trigger` | After latest resume JSON insert or update | Synchronizes Pilot/Crew shared fields and structured collections. |

## Storage and external integrations

### Supabase Storage

| Bucket | Access and purpose | Object prefixes currently used |
| ------ | ------------------ | ------------------------------ |
| `uploads` | Public media bucket. Authenticated application sessions upload objects, and public object URLs are stored in database records. | `profiles/`, `licenses/`, `posts/`, `groups/`, `companies/` |

Object names use the selected prefix plus a generated timestamp/random name.
Files are validated by the shared upload flow before upload and have a default
maximum size of 3 MiB per file. Post videos are the only exception, with a
maximum size of 200 MiB and resumable TUS uploads when appropriate. Stored
media URLs may be served through the normal public object endpoint or Supabase
image rendering endpoint.

Storage bucket policies are managed in Supabase and must continue to allow only
the intended authenticated writes. Any bucket, object-prefix, upload-policy, or
size-limit change must be reflected here.

### Edge Function registry

| Edge Function | Caller | Purpose and contract |
| ------------- | ------ | -------------------- |
| `send-company-invitation` | Authenticated Web/Mobile company owner or owner/admin member | Accepts `{ companyId, email }`, verifies the bearer session, creates the invitation through the caller-scoped RPC, builds the environment-owned HTTPS fragment link, and sends through Resend. Returns the invitation ID, expiry, and `sent` or delivery-`unknown` status. Confirmed provider rejection revokes the new invitation; an uncertain provider result preserves it for inspection/revocation. The function maps self-invite, ineligible-account, and already-affiliated cases to safe HTTP 409 responses and never sends after an eligibility failure. |
| `send-notification-push` | Supabase Database Webhook on `notification_push_deliveries` inserts | Validates the trusted webhook boundary, reloads the canonical notification/outbox state, rechecks block and current Push preference state, sends a self-contained OneSignal payload, and updates delivery status/idempotency metadata. It is infrastructure-only and must not be invoked directly by Web UI. |

`send-company-invitation` uses server-only `EMAIL_PROVIDER`, `RESEND_API_KEY`,
`INVITATION_FROM_EMAIL`, and `AUTH_WEB_URL`. Both functions use their own
server-only Supabase/provider/webhook secrets. Secret values must never be
placed in browser bundles, Expo public variables, source control, or this
document.

### Push-delivery boundary

Database triggers create in-app notifications and rows in
`notification_push_deliveries`. A Supabase Database Webhook watches **INSERT**
events on that delivery table and calls the `send-notification-push` Edge
Function. The Edge Function performs the final block check, resolves eligible
OneSignal subscriptions, rechecks the recipient's current Push category,
sends the self-contained push, and updates the delivery status. In
addition to the existing social and frequency types, the delivery boundary
supports `affiliationRequest`, `affiliationApproved`, and
`affiliationRejected` as transactional push types.
Webhook and OneSignal secrets belong in Supabase project secrets, never in this
document or committed source files.

The Push payload carries validated `notificationId`, `type`, `targetType`, and
`targetId` routing data. Clients must navigate from that payload after fetching
the authorized destination resource; they must not depend on reading an in-app
notification row because `inAppVisible` may intentionally be false.
