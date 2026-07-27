# Flight Crew Database Schema

This document lists the tables and column types in the `public` database schema.

- **Tables documented:** 24
- **Scope:** Column names and data types only; constraints, indexes, policies, and table data are not included.

## Contents

- [Users and profiles](#users-and-profiles)
- [Licenses, skills, and ratings](#licenses-skills-and-ratings)
- [Companies](#companies)
- [Groups and posts](#groups-and-posts)
- [Notifications and moderation](#notifications-and-moderation)
- [Application content](#application-content)

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

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `title`      | `text`                     |
| `senderId`   | `uuid`                     |
| `receiverId` | `uuid`                     |
| `data`       | `text`                     |
| `read`       | `numeric`                  |
| `type`       | `text`                     |

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

### `profile_visits`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `visitor_id` | `uuid`                     |
| `visited_id` | `uuid`                     |

### `profile_likes`

| Column       | Type                       |
| ------------ | -------------------------- |
| `id`         | `bigint`                   |
| `created_at` | `timestamp with time zone` |
| `liker_id`   | `uuid`                     |
| `liked_id`   | `uuid`                     |
