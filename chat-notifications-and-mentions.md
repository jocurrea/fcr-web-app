# Chat, notifications and mentions

Updated 16 November 2026. Contract snapshot: `f69ca0d` on `staging`.

## 1. Shared access and identifiers

Use a Supabase client authenticated as the acting user. Server-rendered reads and server actions must preserve that user's session and RLS context. **Do not use a service-role client for user actions, conversation history, suggestions, receipt acknowledgements or notification opens.** The database derives the actor and checks consent, membership and eligibility.

- Chat conversation, request, message and user IDs are UUIDs. Use `crypto.randomUUID()` for new operation/message identities.
- `message_order` is a PostgreSQL bigint returned by chat RPCs as a **decimal string**. Compare with `BigInt`, not lexical order or `Number`.
- Post, comment, Frequency and general notification IDs are bigints. Mention RPCs return content IDs as strings. Preserve precision; use text projections such as `groupId::text` for direct reads where needed. Convert JavaScript bigint values to decimal strings before JSON serialization.
- Pass pagination timestamps/IDs back verbatim; do not round timestamps or regenerate cursor values. Mutating chat/mention RPCs require Read Committed isolation; ordinary independent Supabase RPC calls use the intended transaction boundary.
- Chat tables have authenticated read/RLS boundaries and restricted client writes. Use the RPCs below for mutations. Private mention/save-operation registries are not directly accessible.
- A null authorized result is different from a network failure. Failed reads show Retry; they must not become false blocked/read-only states or empty lists.
- Scope caches, subscriptions, optimistic operations and banner deduplication to the account **and sign-in generation**. Cancel/ignore late responses after logout, account switching or same-account re-login. Clear sensitive runtime content and banners.
- Chat uses migrations `072`, `074`–`083`; mentions use `084`–`087`. Clients use the shared schema rather than recreating tables/policies. Server triggers and the existing notification worker own notification/outbox creation.

## 2. Chat data structure

These are the current names. There are no `client_message_id`, `sender_slot`, participant `slot`, or consent-generation fields.

| Table | Fields and meaning |
| --- | --- |
| `chat_conversations` | `id` UUID; `type` (`direct`; `group` is reserved); nullable `user_a_id` / `user_b_id` UUIDs; nullable `request_id` current consent pointer; `next_message_order` bigint allocated by the server; `created_at`. Direct pairs are sorted by UUID and unique. |
| `chat_participants` | `conversation_id`, `user_id`, `created_at`. Primary key `(conversation_id, user_id)`. Participation, not invitation status or a read cursor. |
| `chat_requests` | `id`, `conversation_id`, nullable `sender_id` / `recipient_id`, `status` (`pending` / `accepted` / `declined` / `revoked`), `created_at`, `responded_at`, `revoked_at`. Separate row per attempt; at most one pending attempt per conversation. |
| `chat_messages` | `id` UUID; `conversation_id`; `message_order` bigint unique within the conversation; nullable `sender_id`; nullable `request_id`; `body`; `created_at`. An intro has `id = request.id` and `request_id = request.id`. Normal messages have `request_id = null`. |
| `chat_message_receipts` | `id`, `message_id`, `conversation_id`, nullable `recipient_id`, `delivered_at`, `read_at`. Unique `(message_id, recipient_id)`. Read implies Delivered. |
| `blocked_users` | Existing `blockerId` / `blockedId` relationship plus existing identity/timestamp fields. Its triggers revoke current consent and pending requests. |
| `company_settings` | Existing `allow_crew_direct_messages` permission for Business ↔ individual contact. |
| `chat_delivery_credentials` | Private native-background infrastructure: session/user binding, credential hash, expiry and exact delivery-batch state. Not a client-queryable conversation table. |

`chat_conversations.request_id` identifies the **current** consent attempt, not the conversation's permanent identity. An old accepted request does not grant sending permission after the pointer is cleared/replaced. Never infer permission from accepted history alone.

One-to-one APIs are implemented. The reserved group type/participant structure does not mean group chat creation or sending is available.

Account deletion anonymizes nullable authors/request identities, removes the deleted participant, withdraws current consent and retains authorized history for the surviving participant. Show **Deleted account**, not a replacement identity; no sends to a null peer.

## 3. Request RPCs and entry flow

Call with the acting user's authenticated Supabase client; check `error` before using `data`.

~~~ts
const requestId = crypto.randomUUID(); // Generate once for this intended send.
await supabase.rpc('chat_create_request', {
  p_recipient_id: recipientId,
  p_text: text,
  p_request_id: requestId,
});

await supabase.rpc('chat_respond_request', {
  p_request_id: requestId, // Exact attempt opened, never just the user pair.
  p_decision: 'accepted',  // or 'declined'
});

await supabase.rpc('chat_get_request', { p_request_id: requestId });
await supabase.rpc('chat_resolve_peer', { p_peer_id: peerId });
~~~

Request projections have this shape:

~~~ts
type RequestView = {
  request: {
    id: string;
    conversation_id: string;
    sender_id: string | null;
    recipient_id: string | null;
    status: 'pending' | 'accepted' | 'declined' | 'revoked';
    created_at: string;
    responded_at: string | null;
    revoked_at: string | null;
  };
  has_history: boolean; // Accepted history exists, not proof of current consent.
  conversation_status: 'pending' | 'active' | 'read_only';
  intro_text: string | null;
  auto_blocked?: boolean; // Decision response only; not every request read.
};
~~~

`intro_text` is exposed for pending/accepted attempts only. Declined/revoked introductory content is hidden; do not restore it from a stale cache. Previously accepted conversation messages remain available through history APIs.

`chat_resolve_peer` is the profile-message entry API: read the caller's canonical pair without creating rows or consent. It returns the current request, the latest historical attempt if the pointer was cleared, or null when no accessible pair exists. A null result permits a new-request UI **after eligibility checks**, not an assumption of active chat. Accepted/active results open the same thread view as inbox entry.

Private helpers such as `chat_request_result`, `chat_conversation_summary`, lock functions and service dispatch functions are not client RPCs.

## 4. Inbox, Requests and message APIs

### Lists and cursors

| RPC | Parameters | Result / next cursor |
| --- | --- | --- |
| `chat_list_conversations` | `p_limit` default 25, max 50; `p_before_created_at` / `p_before_id` both null initially | Inbox summary array; newest last-message time then conversation ID descending. Cursor is last row's **`last_message.created_at` + conversation `id`**, not conversation creation time. |
| `chat_list_request_threads` | Same limit/cursor parameter names | Received `RequestView` thread array. Cursor is last `request.created_at` + `request.id`. Preferred Requests-screen API. |
| `chat_list_requests` | `p_direction` (`received` / `sent`), same limit/cursors | Lower-level attempt listing; not the preferred latest-thread screen. Cursor uses request creation time/ID. |
| `chat_get_conversation` | `p_conversation_id` | Authorized summary or null. Requires accepted history; a first-time pending request uses `chat_get_request` instead. |

Inbox summaries contain `id`, `type`, `peer_id`, `request_id`, `request_status`, `status`, `blocked_by_me`, `blocked_by_peer`, `send_disabled_reason`, `last_message`. An outgoing pending/declined item can also include `request`. `last_message` may be null; a declined placeholder can have a null message ID and no order. Do not ACK placeholders.

`send_disabled_reason` values: `CHAT_BLOCKED`, `CHAT_ACCOUNT_DELETED`, `CHAT_REQUEST_PENDING`, `CHAT_MESSAGING_PAUSED`, `CHAT_READ_ONLY`, or null when active.

The listing APIs implement the separation; do not merge raw tables and guess:

- **Messages:** accepted conversations plus outgoing pending/declined requests. Sending a request puts it in the sender's Messages list.
- **Requests:** latest eligible received pending/declined threads only. Accepted requests move to Messages; superseded/revoked/blocked no-history attempts are excluded. This is not a list of every historical decision.
- Previously accepted blocked histories remain in Messages. A first-contact pending attempt may disappear from Requests after block/revocation because there is no accepted history.
- Requests have a separate pending indicator. Count authenticated `chat_requests` with `recipient_id = currentUserId` and `status = 'pending'`.

### History, catch-up and send

~~~ts
await supabase.rpc('chat_list_messages', {
  p_conversation_id: conversationId,
  p_limit: 30, // 1–50
  p_before_order: null,
  p_after_order: null,
});
// { conversation: summary, messages: Message[], has_more: boolean }

const messageId = crypto.randomUUID(); // Once per intended normal message.
await supabase.rpc('chat_send_message', {
  p_conversation_id: conversationId,
  p_message_id: messageId,
  p_text: text,
});
// Canonical Message; message_order is a decimal string.
~~~

Pages are always returned **ascending** by message order for display:

- Both cursors null: newest page, oldest-to-newest within that page.
- Before cursor = smallest loaded order: earlier history.
- After cursor = greatest loaded order: forward catch-up. Drain further forward pages while `has_more`.
- Do not set both cursors. `"0"` is allowed for after/catch-up, not before-history.

An accepted intro remains in history under its original UUID. Pending/declined/revoked intros do not appear as normal accepted-history messages. A pending intro can be rendered separately from authorized `intro_text`; after acceptance, merge by UUID to avoid duplicating it.

Introductory and ordinary messages are **2,000 Unicode code points**, nonblank. Use `Array.from(text).length`, not UTF-16 `text.length`. The implemented accepted-chat API is text-only; image/PDF/private chat attachments are not implemented.

Add an optimistic bubble immediately, clear input, and show a small clock until confirmation. Merge the response by the same UUID, then show timestamp/ticks. Failed bubbles have Retry. On an ambiguous timeout keep the exact UUID/body/conversation or recipient; the server may already have saved it. Never silently generate another ID or auto-send on page mount. Definitive request restrictions withdraw the unsent optimistic request and show the restriction instead of endless Retry.

## 5. Eligibility, decline, block and Business rules

| State | Behavior |
| --- | --- |
| First contact | One text intro; hide composer once sent. Recipient sees Accept/Decline in the same thread view. |
| Pending attempt | Neither side can create another request for that pair. No additional message until acceptance. |
| First decline | Sender → recipient cooldown is **72 hours from declined `responded_at`**, not original send time. Opposite-direction eligibility is evaluated independently. |
| Second same-direction decline | Permanent further-request limit in that direction; recipient → sender block is inserted atomically with the decision. |
| Unblock | Removes only that person's block. Does not restore old consent, reset decline history or reset cooldown. A permitted first message becomes a new request. |
| Accepted active | Normal composer; ordinary message API. Do not create another request. |
| Business DM disabled | Business ↔ individual chats pause across all individual professional roles; history remains. Re-enabling resumes accepted-chat eligibility. **Business ↔ Business remains enabled.** |
| Deleted/banned/unavailable | No new contact; show only retained history authorized by the current APIs. |

Before showing a new-request composer after decline/unblock/read-only entry, read the actor's own directional restriction under RLS:

~~~ts
await supabase.from('chat_requests').select('responded_at')
  .eq('sender_id', currentUserId)
  .eq('recipient_id', peerId)
  .eq('status', 'declined')
  .order('responded_at', { ascending: false })
  .limit(2);
~~~

Two rows mean permanently limited in that direction. One row gives `retryAt = responded_at + 72 hours`. Zero rows means no decline limit, but pending/block/Business/account guards still apply. The server remains authoritative if the UI races a change. Recheck at expiry and on foreground resume. A failed restriction lookup shows Retry and no send action, never “allowed.” Do not apply these new-request restrictions to an already-active accepted chat.

Use neutral permanent-limit copy: **“You can’t send a message request to this person.”** Do not explain how many declines occurred or advertise that the recipient should contact the sender. Cooldown UI shows its deadline; unblocking does not reset it.

Blocking uses the existing table:

~~~ts
await supabase.from('blocked_users')
  .insert({ blockerId: currentUserId, blockedId: peerId });
await supabase.from('blocked_users').delete()
  .eq('blockerId', currentUserId).eq('blockedId', peerId);
~~~

Read both directions; either participant's block prevents sending. Refresh block, authorized thread/request and profile state after changes. Do not restore avatars/names from an old cache before bilateral block clearance is confirmed. Triggers clear current consent and revoke pending attempts.

Both participants retain authorized pre-block **accepted history**. Mask peer profile/avatar and show **Blocked user** while blocked. Hide composer. Only the blocker gets a full-width Unblock action with confirmation. After unblock, re-evaluate request eligibility before allowing typing; no misleading permanent read-only label under the inbox preview.

On `auto_blocked: true`, show a human-friendly confirmation and **Report spam / Close**. The user is already blocked; reporting is optional. Existing `reports` INSERT is:
`{ reporterId: currentUserId, targetId: senderId, targetType: 'user', reason: 'Spam', status: 'pending' }`.
Bind the reporter session. Do not automatically report every declined request.

### Error handling

Map known codes to reviewed copy, refresh the relevant state, and do not expose raw SQL details:

| Code | Action |
| --- | --- |
| `CHAT_ALREADY_ACTIVE` | Resolve/open existing active chat rather than creating another request. |
| `CHAT_REQUEST_PENDING` | Refresh and use the current pending attempt; do not send another intro. |
| `CHAT_COOLDOWN` / `CHAT_REQUEST_LIMIT` | Hide new-request composer; show deadline/neutral restriction. These are definitive denials, not transport Retry loops. |
| `CHAT_BUSINESS_DISABLED` | Show messaging pause and retain authorized history. |
| `CHAT_READ_ONLY` | Reconcile consent/eligibility; a new eligible request is required before normal sends. |
| `CHAT_REQUEST_EXPIRED` | Refresh the exact attempt/current state; never silently apply a decision to a replacement request. |
| `CHAT_RETRY_MISMATCH` | Operation ID was rebound to different content/context; do not auto-generate a new ID and resend. |
| `CHAT_UNAVAILABLE` | Reconcile access/account/block state with safe unavailable copy. |
| `CHAT_INVALID_REQUEST`, `CHAT_INVALID_MESSAGE`, `CHAT_INVALID_DECISION`, `CHAT_INVALID_PAGE`, `CHAT_INVALID_ACK`, `CHAT_INVALID_UNREAD_PAGE` | Correct input/parameters; no blind retries. |

Transport timeouts are uncertain outcomes, unlike those definitive rules. Retain the original operation identity and distinguish a failed refresh from a confirmed server restriction.

## 6. Realtime and delivery acknowledgements

### Private invalidation channel

Keep one authenticated synchronization owner active throughout application use, including outside Messages.

~~~ts
await supabase.realtime.setAuth();
const channel = supabase.channel('chat:user:' + currentUserId, {
  config: { private: true },
});
channel.on('broadcast', { event: 'chat_changed' }, () => {
  // Coalesce authorized list/thread/receipt/unread refreshes.
}).subscribe(status => {
  if (status === 'SUBSCRIBED') {
    // Reconcile missed state and drain delivery batches.
  }
});
~~~

Signals are **content-free invalidations**, not message payloads or delivery/access evidence. Re-fetch authorized state. Clients cannot publish authoritative signals; raw chat table publication is not the contract.

Reconcile on browser visibility/focus/reconnection. A socket is not a durable log: Mobile also reconciles delivery approximately every 30 seconds with bounded exponential reconnect backoff. Remove only channels owned by this feature.

### Delivered

~~~ts
const { data: batch, error } = await supabase.rpc('chat_list_delivery_batch', {
  p_limit: 50, // API 1–100; Mobile uses bounded pages of 50.
});
// Full incoming Message[] not yet acknowledged as delivered.

// After payloads are received/processed, group IDs by conversation:
await supabase.rpc('chat_acknowledge_messages', {
  p_conversation_id: conversationId,
  p_message_ids: receivedMessageIds, // 1–100, this conversation only.
  p_read: false,
});
// Receipt[]: { message_id, recipient_id, delivered_at, read_at }
~~~

Presence, internet connectivity, an inbox snippet, Broadcast receipt and provider acceptance are **not** Delivered. The recipient must receive the actual authorized payload. Missing ACKs remain eligible for later batches; retry keeps first server timestamps. For an introductory payload, the message ID is the request UUID and the conversation ID comes from that exact request; do not ACK the conversation ID as if it were a message.

### Read

~~~ts
await supabase.rpc('chat_acknowledge_messages', {
  p_conversation_id: conversationId,
  p_message_ids: visibleIncomingMessageIds,
  p_read: true,
});
await supabase.rpc('chat_get_message_receipts', {
  p_conversation_id: conversationId,
  p_message_ids: displayedMessageIds, // 1–100
});
~~~

Read applies to incoming messages actually visible in a focused foreground **accepted** conversation. There is **no 400 ms dwell delay**; event-loop batching is sufficient. Network completion still takes time. Stop/ignore stale view ACKs after navigation, hidden tabs, logout or account change.

A pending intro can be Delivered, but previewing an unaccepted request must not produce blue ticks. After acceptance, Read requires opening the active conversation and visible content. Background history fetch is not Read. Blocked/paused/read-only/deleted-account threads cannot emit new ACK activity merely because history remains readable.

| Display | Meaning |
| --- | --- |
| Clock | Local send not confirmed. |
| One gray check | Canonical message stored; no confirmed recipient delivery. |
| Two gray checks | `delivered_at` exists and `read_at` is null. |
| Two blue checks | `read_at` exists. |

Merge receipts monotonically; an older response must not regress Read to Delivered/Sent. Read implies Delivered and timestamps obey `read_at >= delivered_at`. Multiple devices update one recipient-user receipt per message.

### Background delivery boundary

Native notification handlers use a session-bound, delivery-only credential to fetch an exact authorized batch and ACK Delivered. It does not grant general account access or mark Read; it is revocable/expiring and is not a refresh token.

Native background execution is best effort. Permissions, scheduling, force-stop or network failures can leave one tick until a real client fetches/ACKs, even if a notification appeared. Never use a successful push response/display as proof of delivery.

Normal browser clients use the authenticated APIs above. The browser background-session module is a no-op; Mobile's native extension flow is not an automatic browser background guarantee. Do not expose service-role secrets, native delivery credentials or full refresh tokens in pages, URLs, logs or notification data. `chat_delivery_credentials` and private service receipt/dispatch helpers are not browser read/write APIs.

## 7. Unread state and conversation UI

~~~ts
await supabase.rpc('chat_get_unread_state', {
  p_conversation_ids: loadedConversationIds, // <=200; [] is valid.
});
// Array with one row:
// { actor_id, conversation_count, unread_ids: UUID[] }
~~~

`conversation_count` covers **all eligible unread conversations**, including unloaded inbox pages. `unread_ids` is restricted to supplied IDs. This is a conversation count, not a message count. Pending requests have their separate indicator; blocked/paused/ineligible threads are excluded.

There is no client-written last-open/read cursor or separate mark-open RPC. The server derives a watermark from the highest-order incoming Read receipt; eligible incoming messages above it make the conversation unread. Reading a visible latest message can clear a conversation badge even if an earlier offscreen message has no individual Read receipt. Do not fabricate blue receipts for earlier messages from that watermark.

After successful visible Read ACK, refresh unread state promptly. Route mounting before content/visibility is established is not enough. Preserve confirmed state on network failure and reconcile on recovery.

Implemented UI behavior:

- One Messages entry with a Requests link/red pending indicator; one shared thread screen. Accept becomes normal composer **in place**, without another navigation.
- Show restriction text only after request/block/eligibility snapshots settle. Use a composer-shaped skeleton while uncertain rather than flashing stale declined/read-only copy.
- Initial load uses matching skeletons. Previously loaded runtime lists/history reappear immediately and refresh silently; Back does not start another skeleton/pull-refresh spinner. Draft/uncertain-send persistence across screen destruction is not promised.
- Open at latest loaded messages without an animated trip down history. Follow new messages smoothly when already at the latest; while reading older messages retain position and show New messages/jump-to-latest.
- No visible chat scrollbars. Composer placeholder **Message**, ordinary circular send control, no always-visible limit counter; warn on overflow.
- Multiline input is bounded to approximately four lines and scrolls internally, then resets to one line on clear/send.
- Bubble time aligns to its side, without redundant Sent text. Today shows time; older days use consistent `D Mon · time` (for example `10 Nov · 4:19 PM`), adding the year when it differs. Compare local calendar days, not elapsed 24-hour windows.
- “Beginning of conversation” belongs only to genuinely empty eligible threads, not sent/declined requests or retained history.

## 8. Chat notifications and preferences

Chat alerts do **not** create ordinary `notifications` inbox rows. Requests/history/receipts/unread RPCs are authoritative. The private `notification_push_deliveries` queue has exactly one source: ordinary activity uses `notification_id`; chat uses `chat_message_id` with `notification_id = null`, plus `recipient_user_id`. Delivery identity, deduplication/provider idempotency, status/attempt/lease/recovery fields are server-managed by triggers, the existing worker and recovery scheduling. Do not insert duplicate client alerts/deliveries or run a second sender.

| Recipient state | Presentation |
| --- | --- |
| Active elsewhere in application | Tappable in-app banner when `direct_messages.in_app_enabled`. Accepted chat can show sanitized preview, one line with tail ellipsis (Mobile bounds to 160 code points). |
| Pending request banner | Sender identity + **Sent you a message request**, never introductory-text preview. |
| Focused on same conversation/request | Suppress its foreground chat banner; delivery/visible Read processing continues. |
| Background/closed native app | Sender name title + **New message** or **Sent you a message request**. No message-text push preview. |
| Foreground presenter covered/unavailable | Native code retains OS fallback so a modal does not silently hide the alert. |

Native pushes have a stable opaque key per recipient/conversation (`collapse_id` / `thread_id`), independent of per-message provider idempotency. Native code updates/groups that conversation's card, prevents duplicate/out-of-order display and applies a **15-second sound cooldown per conversation** while still updating content. It is a presentation policy, not a message-send limit or database delay; other conversations are independent.

Dismissal is not Read. A later message can create a new visible card after dismissal; do not resurrect the dismissed card or mark the chat read. Native read cleanup removes acknowledged presentation. Logout/account switching clears local account cards/state; login reconciles current unread data rather than replaying historical banners.

Browser UI can use bounded/deduplicated banners, but native collapse/sound/background behavior is not implemented merely by copying those banners.

### Routing data

~~~ts
{
  type: 'chatMessage',
  recipientId: 'recipient-uuid',
  conversationId: 'conversation-uuid',
  messageId: 'message-uuid',
  messageOrder: '42',
  requestId: 'request-uuid' // Only for an introduction.
}
~~~

Check recipient against the signed-in user. An introduction opens the **exact request ID**; a normal message opens the conversation. Re-resolve current access. Never bind an old request push to the latest attempt or infer accepted state from payloads. Malformed/other-account data goes to the current Messages list, not that thread. Deduplicate repeated click callbacks to avoid double navigation.

### Preference RPCs

~~~ts
await supabase.rpc('get_my_notification_preferences');
// Rows: { category, push_enabled, in_app_enabled }
await supabase.rpc('set_my_notification_preference', {
  p_category: 'direct_messages',
  p_channel: 'in_app', // or 'push'
  p_enabled: true,
});
~~~

Categories: `direct_messages`, `community_frequencies`, `profile_activity`, `jobs`. Channels are independent. Storage is `user_notification_preferences` (`user_id`, `category`, `push_enabled`, `in_app_enabled`, `updated_at`), keyed by user/category; use these RPCs rather than reimplementing preference writes. `notification_type_categories` is server-owned type-to-category mapping.

Chat alert preferences do not disable messaging, delivery ACKs, requests or unread-state calculations. Business messaging permission is a different setting.

## 9. Mention tables and audience rules

Mentions cover global posts/comments and public/private Frequency posts/comments.

| Context | Suggestions and publication |
| --- | --- |
| Global post/comment | Eligible platform profiles; name-only search. |
| Public Frequency post/comment | Current joined members of that exact Frequency, despite public post readership. |
| Private Frequency post/comment | Current joined members only; external accounts get no private mention context. |

Membership is `groupMembers`, not invitation history. Pending/declined/revoked invitees are not members. Frequency search callers must themselves be current members. Server eligibility filters blocked/banned/incomplete profiles and inactive Business identities.

| Table | Fields and meaning |
| --- | --- |
| `content_mentions` | `id` bigint; exactly one of nullable `post_id` / `comment_id`; `recipient_id`; `occurrences` JSON array; `first_mentioned_at`. Unique source/recipient. Occurrences have `start`, `end`, `label`. Empty occurrences retain the lifetime claim after removal. Private registry. |
| `post_publish_requests` | `request_id` UUID PK, `actor_id`, nullable `post_id`, `request_hash`, `created_at`. Immutable save identity; deleted sources leave retry tombstones. |
| `comment_publish_requests` | Same operation contract with `comment_id`. Private; no content snapshot or general edit-history API. |
| `posts` / `comments` | Existing body/source/Frequency/parent fields. References are separate; do not store HTML links or serialized mention objects in body. |

Limits: **20,000 body code points**, **20 distinct selected recipients**, **40 occurrences**. Editor revisions are computed opaque fingerprints, not public source-table revision columns.

## 10. Suggestions, selection and positions

~~~ts
await supabase.rpc('search_mention_candidates', {
  p_group_id: groupId ?? null, // Exact Frequency; null only for global context.
  p_query: query,             // '' immediately after @; name only.
  p_limit: 20,                // 1–20
  p_after_name: cursor?.name ?? null,
  p_after_user_id: cursor?.id ?? null,
});
// { items: [{ id: UUID, name, avatar }], next_cursor: { name, id } | null }
~~~

Typing @ opens the list. Typing narrows normalized name/word-prefix; clearing restores initial suggestions. No email/role/biography search. Query max 80 code points, no controls. Use returned name/UUID cursor, not offsets. Self is excluded from suggestions.

Debounce approximately 250 ms; cancel/ignore obsolete requests. Include account/session, Frequency, query and cursor in request ownership. Old Frequency results/taps cannot populate a new audience. Reuse four visible rows/four matching loading rows, a bounded scrolling overlay around 10 px below the typing line, stable horizontal placement and keyboard-safe focus. It must not resize the input. Empty: **No users found**.

Selection inserts raw @Name and a UUID entity:

~~~ts
// Body: '😀 @John'
const mentions = [{
  user_id: 'selected-user-uuid',
  start: 2,
  end: 7,
  label: '@John',
}];
~~~

Offsets are **zero-based Unicode code points**, end-exclusive, in the exact raw body. DOM/TextInput selection positions use UTF-16 and require conversion. Here the emoji counts as one point. `Array.from(body).slice(start, end).join('')` must equal `label`. Sort entities, disallow overlap, and send exactly `user_id` / `start` / `end` / `label` per occurrence.

Typed/pasted @Name has no identity unless selected. Never parse published text and guess a profile by name/handle. Manual outsiders remain plain and do not alert. Shift references for surrounding edits; invalidate tokens changed internally. Trimming/HTML transformation after calculating offsets corrupts them.

Selected editor tokens are styled; published names are **blue/bold without @**, with actual UUID profile links. Keep raw @ in stored body/positions. Render safe text segments, not injected HTML. Invalid/unselected tokens remain plain, including their literal @.

## 11. Atomic mention publishing and editing

### Snapshots

~~~ts
await supabase.rpc('get_post_mention_editor_state', { p_post_id: postId });
// { id, body, file, revision, mentions: Entity[] }
await supabase.rpc('get_comment_mention_editor_state', { p_comment_id: commentId });
// { id, postId, userId, body, created_at, revision, mentions: Entity[] }
~~~

These require current authorship/source access, plus membership for Frequency editing. Load body/references/revision from the snapshot rather than URL text or a stale card. Withhold editing behind matching skeletons until authorized data is ready.

The post snapshot has no Frequency field. Read current audience under the same authenticated owner before enabling suggestions:

~~~ts
await supabase.from('posts').select('groupId::text')
  .eq('id', postId).eq('userId', currentUserId).maybeSingle();
~~~

Comment audience comes from its canonically loaded parent. Missing/failed context does not fall back to global suggestions. Server revision/scope checks remain authoritative across concurrent changes.

### Saves

~~~ts
await supabase.rpc('save_post_with_mentions', {
  p_body: body,
  p_file: storedFileReference ?? null,
  p_mentions: mentions,
  p_request_id: operationId,
  p_post_id: editingPostId ?? null,
  p_expected_revision: editingRevision ?? null,
});

await supabase.rpc('save_frequency_post_with_mentions', {
  p_group_id: groupId, // Public OR private Frequency.
  p_body: body,
  p_file: storedFileReference ?? null,
  p_mentions: mentions,
  p_request_id: operationId,
  p_post_id: editingPostId ?? null,
  p_expected_revision: editingRevision ?? null,
});

await supabase.rpc('save_comment_with_mentions', {
  p_post_id: parentPostId, // Backend derives Frequency from this source.
  p_body: body,
  p_mentions: mentions,
  p_request_id: operationId,
  p_comment_id: editingCommentId ?? null,
  p_expected_revision: editingRevision ?? null,
});
~~~

Returns the corresponding editor snapshot. Create: source ID and revision both null. Edit: both supplied. Posts can be media-only; comments require nonblank text.

Source mutation, reference replacement, first-recipient claim, notification and outbox are atomic. Sender/recipient eligibility is server-derived, not supplied as a client notification list. Stale/blocked/departed/otherwise ineligible selections are sanitized to plain text; malformed entity structure is an input error.

Retain the **whole immutable operation** (UUID, body/file/entities/source/context/revision) until confirmed. Retry identical payload/UUID after ambiguous failure. Do not reuse an operation with new text or a refreshed revision. New intentional save = new UUID. Do not bypass deleted-source tombstones by creating replacement content after a retry denial.

Errors: `MENTION_EDIT_CONFLICT` → reload canonical editor; `MENTION_UNAVAILABLE` → source/access unavailable; `MENTION_RETRY_MISMATCH` → changed retry binding; `MENTION_INVALID_POST` / `MENTION_INVALID_COMMENT` / `MENTION_INVALID_REFERENCES` → input error. Unknown transport errors can be uncertain. Show reviewed user-facing text, not raw SQL internals.

New drafts can change audience, clearing selected identities/search state while keeping text plain for reselection. Atomic APIs do not move existing posts between feeds/Frequencies; editing audience is fixed. Frequency save events retain their actual group ID, never enter global caches as `groupId: null`.

Media uses existing storage: global `uploads/public-posts/<userId>/...`; Frequency private bucket `frequency-media` and stored `frequency-media://<groupId>/<userId>/<filename>` references. Do not store signed display URLs in `posts.file`. Retain a completed upload during uncertain save to avoid uploading again on Retry. Protected-media guards remain; no comment/chat attachment API is introduced.

## 12. Reading and rendering mentions

~~~ts
await supabase.rpc('get_content_mentions', {
  p_post_ids: postIds,
  p_comment_ids: commentIds, // Combined total <=50 per call.
});
// [{ post_id: string|null, comment_id: string|null, user_id: UUID,
//    occurrences: [{ start, end, label }] }]
~~~

Batch by loaded page, not per mounted card. Flatten occurrences with their `user_id`, sort, and validate against the source body. The RPC authorizes source readability, block relationships and current recipient eligibility/membership. A private pending invite is not post/comment access.

Hydrate global AND Frequency feeds/details/realtime changes. Failed metadata becomes plain body text, not stale links. Account changes discard late data; deleted/newer comments must not be resurrected/overwritten by older lookups. Use canonical save entities immediately, then reconcile.

Private registries are not read directly. Legacy plaintext writes still work but body/scope changes invalidate stale references. @ text from an old writer does not automatically trigger mention processing.

## 13. Mention/comment notifications and exact opens

### Lifetime first-mention identity

The dedupe identity is **source + recipient**:

- Multiple occurrences in a source → one first alert.
- Unchanged edits → no alert.
- New eligible recipient on edit → one first alert.
- Remove/re-add → no repeat alert.
- Read/archive/delete/purge/retry → does not reset the claim.
- A post and separate comment are separate sources and can each alert the same recipient once.
- Preferences suppressing the first alert do not erase the claim or cause replay on later enablement.
- Self-mentions and manually typed/pasted unselected handles do not create self/external alerts.

A new comment mentioning its post owner generates one eligible comment-mention alert, suppressing the duplicate ordinary owner-comment alert. Ordinary comments keep existing owner alerts. That trigger runs at transaction end after final refs are known; do not duplicate it on the client or assume the alert row exists before commit.

Mention alerts use `community_frequencies` preferences. Frequency alerts also require current membership and `groupMembers.notifications = 1`. Muting does not remove valid name links but suppresses alerts. Leaving/blocking/removal/ineligibility can invalidate old notification opens/dispatch. An OS/local card never grants private source access.

### Types and canonical resolution

| Type | Target and payload |
| --- | --- |
| `postMention` | `targetType: 'post'`, `targetId: postId`, `payload: { postId }`; string IDs. |
| `commentMention` | `targetType: 'comment'`, `targetId: commentId`, `payload: { postId, commentId }`; string IDs. |
| `comment` | Ordinary owner alert; post target plus `postId` / `commentId` in payload or legacy `data`. Older IDs may be numeric. |

~~~ts
await supabase.rpc('resolve_post_mention_notification', {
  p_notification_id: notificationId,
});
// { id, type: 'postMention', targetType: 'post', targetId } | null

await supabase.rpc('resolve_comment_mention_notification', {
  p_notification_id: notificationId,
});
// { id, type: 'commentMention', targetType: 'comment', targetId,
//   postId, commentId } | null
~~~

Recipient-scoped resolvers work independently of in-app-channel visibility. Null means unavailable: **no fallback to raw push target** for a mention that failed authorization. Source reads still apply RLS.

Resolve and fetch on one post-detail screen with continuous post/composer/four-comment skeletons. Avoid duplicate navigation or remounting the loading skeleton between authorization and fetch.

Both comment mentions **and ordinary owner-comment alerts** position/highlight the exact comment. If missing from the initial nested page, query by **comment ID AND parent post ID** under RLS. Missing/deleted targets show an unavailable-comment notice, not another comment. Old ordinary alerts with no comment ID can open the authorized post without invented highlighting.

Ordinary push envelopes can lack comment ID; receiver-scope the stored notification lookup to recover it, preserving post-only behavior when no readable ordinary identity exists. Mention pushes always use their canonical resolver, including push-only alerts. `notificationId` / `type` / `targetType` / `targetId` are routing hints, not sender/content/permission evidence.

### Foreground activity banners

Fresh eligible `comment`, `postMention`, `commentMention` events show sender identity plus:

- **Commented on your post**
- **Mentioned you in a post**
- **Mentioned you in a comment**

No post/comment body preview. Tap uses the same canonical open path and comment highlight. These can appear while browsing another page.

Use authenticated notification INSERT events as hints, canonical receiver fetches and mention reauthorization. Deduplicate native foreground-push and realtime hints by notification ID. Do not replay initial snapshots or banner read/archive UPDATEs. Filter disabled in-app/read/archived/deleted/blocked alerts; clear account-specific presentation on logout/background. Shared presenter has at most three visible cards with bounded runtime deduplication. Banners/bell dots are UI effects of the same event, not extra database rows.

Background mention push is sender/activity only (for example **Sarah mentioned you in a comment**); no source excerpt or private Frequency metadata. The existing worker rechecks canonical dispatch eligibility. Clients do not call service-only context functions or send their own push for that event.

## 14. General notification inbox lifecycle

Relevant `notifications` fields: `id`, `receiverId`, `senderId`, `latestSenderId`, `type`, `title`, `targetType`, `targetId`, `payload`, legacy `data`, `created_at`, `lastActivityAt`, `activityCount`, `read`, `readAt`, `inAppVisible`, `archivedAt`, `deletedAt`, `deleteAfter` and existing grouping fields. Structured payload takes precedence over legacy JSON; old rows may have older shapes.

- Active: receiver-scoped SELECT, `inAppVisible = true`, `deletedAt IS NULL`, `archivedAt IS NULL`, newest `lastActivityAt`; bounded list (Mobile 50).
- Archive: same guards, `archivedAt IS NOT NULL`, newest archive/activity.
- Canonical sender relation is `latestSenderId`; Business uses active company identity. Respect block/profile RLS; no email/private fallback.
- Read marker: authenticated UPDATE `{ read: 1, readAt: ISO timestamp }` filtered by ID and receiver. Check affected rows if confirmation matters: a push-only/RLS-hidden row can update zero rows without SQL error. Never use service role/widen policies to force a read marker.
- Subscribe to receiver-filtered INSERT/UPDATE/DELETE; re-fetch identity if sender changes. Older refreshes must not erase newer events.

| RPC | Parameters |
| --- | --- |
| `set_notifications_archived` | `p_notification_ids` array (1–100), `p_archived` boolean |
| `schedule_notifications_deletion` | `p_notification_ids` array (1–100) |
| `undo_notifications_deletion` | Same IDs; server undo window applies |
| `finalize_notifications_deletion` | Same IDs; server cleanup may already have purged them |

Reconcile returned rows. Archiving/deleting notifications does not delete chat messages, change consent, reset mention claims or grant access. General read markers are separate from chat receipts/unread threads.

## 15. Functional checks

### Chat

1. First profile contact: sender Messages, recipient Requests, one nonblank ≤2,000-code-point intro; neither side sends an extra pending message/request.
2. Pending preview can become Delivered but never Read. Accept in place; intro occurs once in accepted history.
3. Optimistic normal send/Retry; lost response with same UUID/body creates no duplicate. Check bigint orders and older/forward pages.
4. First decline → hidden composer/deadline before send; second eligible decline → atomic block/report option/permanent same-direction limit. Unblock resets neither history nor cooldown.
5. Block accepted peers: both retain authorized masked history; only blocker unblocks. Both clients refresh names/avatars/eligibility without a whole-app reload.
6. Business DM pause/resume, Business ↔ Business exception, deleted-account history; no composer flashes during eligibility loading/failure.
7. Active receiver elsewhere fetches/ACKs payload → gray double checks. Focused visible accepted chat → blue without dwell; hidden tab/background fetch never Read.
8. Missed-signal reconnect, multiple clients, in-flight logout/account change, duplicate push clicks and stale requests.
9. Unread conversation count versus pending-request dot, unread beyond loaded page, exact receipts versus conversation watermark.
10. Accepted one-line preview/request name-only banner, same-thread suppression, background name-only push, grouping/dismissal/sound policy and independent notification preferences. Do not claim Delivered without payload ACK.

### Mentions

1. Global post/comment @ filtering/selection; four-row loading overlay; emoji and edits before/inside/after tokens preserve offsets.
2. Both public/private Frequency posts/comments: only current members; pending invitees/outsiders excluded; typed/pasted handles plain/no alert.
3. Duplicate/unchanged/remove-readd no re-alert; new eligible recipient on edit one alert; independent post/comment claims; notification purge does not reset them.
4. Mention post owner in a new comment → one alert. Ordinary owner-comment notification also opens/highlights exact comment.
5. Leave/block/mute between selection, save, dispatch and open: no stale private access/alerts; valid muted links can remain.
6. Inbox/push/banner open with one skeleton transition, correct source/comment/profile, removed-target handling and target beyond initial comment page.
7. New-draft audience change clears selected refs/stale taps; stale edit links load canonical audience/body/revision; conflict requires Reload.
8. In-app-only/push-only/both-disabled and account changes; no duplicate client events, historical snapshot banners or private text in push data.

## 16. Implementation references

Source snapshot `f69ca0d`. Paths identify implementations; local controller/store names are not database fields or RPC parameters.

| Area | Files |
| --- | --- |
| Requests and restrictions | `services/chatRequestService.js`, `hooks/useChatRequest.js`, `constants/chat.js` |
| Messages and mutation identity | `services/chatService.js`, `services/chatMutation.js`, `hooks/useChatConversation.js`, `hooks/useChatOutbox.js` |
| Realtime, exact receipts, unread | `services/chatRealtime.js`, `services/chatReceiptService.js`, `services/chatUnread.js`, `hooks/useChatReceipts.js` |
| Block / optional Spam | `services/blockService.js`, `hooks/useChatBlocking.js`, `services/chatSpamReport.js` |
| Chat presentation/routing | `services/chatForegroundNotifications.js`, `services/chatNotificationService.js`, `utils/chatPushNavigation.js`, `modules/chat-notifications/` |
| Mention editor/reference API | `services/mentionService.js`, `utils/mentionReferences.js`, `components/mentions/` |
| Source hydration | `services/postMentionPresentation.js`, `services/postService.js`, `hooks/usePostRealtime.js` |
| Notification opening/activity | `utils/notifications.js`, `components/notification-open-resolver.tsx`, `components/post-details-screen.jsx`, `services/activityForegroundNotifications.js` |
| Notification lifecycle/settings | `services/notificationService.js`, `components/NotificationLifecycle.jsx`, `components/OneSignalLifecycle.jsx` |
| Dispatch/recovery | `supabase/functions/send-notification-push/index.ts`, migrations `078`–`081` |
| Chat schema/state/receipts | Migrations `072`, `074`–`077`, `082`, `083` |
| Mentions and Frequency guards | Migrations `084`–`087` and corresponding manual validation scripts |

Private chat attachment APIs, group-chat operations and feed polls are not part of this implemented contract. Production migration execution is separate from client integration; never apply migrations or recreate shared policies as part of a page request.

