# Flight Crew Database Schema

This document describes the current Flight Crew database and its supporting
infrastructure. Update it whenever a table, view, function, trigger, storage
bucket, policy, webhook, or database-backed integration changes.

- **Tables documented:** 28
- **Views documented:** 1
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
| `platformRole`           | `text`                     |

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
| `created_at`             | `timestamp with time zone` |
| `updated_at`             | `timestamp with time zone` |

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

This read-only view supplies the admin dashboard's user directory. It combines
the main `users` row with normalized profile fields, the latest resume JSON,
skills, and a summary of the user's licenses. It also provides normalized
arrays and a `tsvector` so the dashboard can search and filter without
repeating the joins and JSON extraction in application code.

| Output group | Important fields |
| ------------ | ---------------- |
| Identity and access | `user_id`, `email`, `username`, `first_name`, `middle_name`, `last_name`, `full_name`, `role`, `professional_role`, `access_level`, `platform_role`, `account_type`, `is_banned`, `profile_image`, `user_created_at` |
| Work profile | `nationality_country`, `nationality_country_code`, `work_country`, `work_country_code`, `employment_status`, `has_crossed_ocean`, `has_admin_exp`, `admin_role`, `admin_role_description`, `flight_hours_text`, `flight_hours_num`, `industry_years_text`, `industry_years_num` |
| Resume | `resume_created_at`, `resume_ratari_level`, `resume_summary`, `resume_dob`, `resume_children`, `resume_marital_status`, `resume_languages`, `resume_experience_countries`, `resume_experience_roles`, `resume_plans_flown`, `resume_awards` |
| Skills and search | `skills`, `skills_ci`, normalized resume arrays ending in `_ci`, `search_tsv` |
| License summary | `has_valid_license`, `has_expired_license`, `next_license_expiry`, `last_license_expiry`, `license_ids`, `license_numbers`, `license_type_names`, `license_type_names_ci` |

The view is granted to `anon`, `authenticated`, and `service_role`. Its license
calculations are described below.

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

Trusted notification functions use the deterministic `pg_catalog, public`
search path and are not directly callable by clients unless explicitly listed
as an authenticated RPC above.

### Active triggers

| Trigger | Event | Result |
| ------- | ----- | ------ |
| `sync_notification_compatibility_fields_trigger` | Before insert or update on `notifications` | Synchronizes legacy and structured notification fields. |
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

## Storage and external integrations

### Supabase Storage

| Bucket | Access and purpose | Object prefixes currently used |
| ------ | ------------------ | ------------------------------ |
| `uploads` | Public media bucket. Authenticated application sessions upload objects, and public object URLs are stored in database records. | `profiles/`, `licenses/`, `posts/`, `groups/`, `companies/` |

Object names use the selected prefix plus a generated timestamp/random name.
Images are validated by the shared upload service before upload and have a
default maximum size of 2 MiB per image. Posts can also upload supported video
files, using resumable TUS uploads when appropriate. Stored media URLs may be
served through the normal public object endpoint or Supabase image rendering
endpoint.

Storage bucket policies are managed in Supabase and must continue to allow only
the intended authenticated writes. Any bucket, object-prefix, upload-policy, or
size-limit change must be reflected here.

### Push-delivery boundary

Database triggers create in-app notifications and rows in
`notification_push_deliveries`. A Supabase Database Webhook watches **INSERT**
events on that delivery table and calls the `send-notification-push` Edge
Function. The Edge Function performs the final block check, resolves eligible
OneSignal subscriptions, sends the push, and updates the delivery status.
Webhook and OneSignal secrets belong in Supabase project secrets, never in this
document or committed source files.
