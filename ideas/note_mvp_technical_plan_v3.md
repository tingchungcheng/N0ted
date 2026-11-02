# Nōted — MVP Product & Technical Plan (v3)

> **Tagline:** A little note, delivered every day.

Nōted is a free React Native (Expo, TypeScript) app whose iOS and Android
home-screen widgets show the latest post from tingcc's own 小红书 (RedNote)
account. For now it is for personal use only: dev builds installed on
tingcc's own phone, no Apple Developer account yet. A store launch comes later.

**What changed since v2:** the content-acquisition question is now decided.
There is no scraping, no automated login and no browser automation. Posts are
written once in a small admin page, pushed into 小红书 through the official
share SDK, then linked back.

## 1. Product definition

### Core experience

1. tingcc writes a post (title, body, photos) in the Nōted admin page.
2. The admin page hands the post to the 小红书 app through the official share
   SDK, and tingcc presses 发布 there.
3. tingcc pastes the published 小红书 URL back into admin, and the post goes live.
4. The app and widgets fetch the latest published post, cache it, and render it.
5. Tapping the widget opens the real 小红书 post.

### MVP scope

- One author (tingcc), one shared latest-post feed.
- Admin compose page (web, tingcc only).
- Public app: latest-post screen, no sign-in, no compose.
- iOS and Android home-screen widgets with 小红书 attribution.
- Deep link to the original 小红书 post.

Not in the MVP: user accounts, multiple creators, archive, likes or comments,
analytics, subscriptions. Push refresh is a stretch goal (M4).

## 2. Content flow (decided)

### 2.1 Admin-only compose

- Next.js admin page on Vercel, protected by Supabase Auth. Only tingcc's
  account is allowed (checked in middleware and enforced again by RLS).
- Fields: title, body, photos.
- **Save draft** writes a `posts` row with `status = 'draft'` to Supabase.
- Images are resized client- or server-side to about 600px wide, about
  50–80KB webp or jpg, and uploaded to a public Supabase Storage bucket.

### 2.2 "Post to 小红书" button

```text
Admin page ──POST /api/xhs/sign──▶ Vercel function (holds appKey/appSecret)
     ◀── verifyConfig {appKey, nonce, timestamp, signature} ──
Admin page ──xhs.share({shareInfo, verifyConfig})──▶ 小红书 app publish page (prefilled)
                                                         └─ tingcc presses 发布
```

- The Vercel function signs the request: SHA-256 over the sorted
  `k=v&...` params plus the app secret. It returns
  `{ appKey, nonce, timestamp, signature }`.
- The page calls the official JS SDK:

```js
xhs.share({
  shareInfo: {
    type: 'normal',
    title,
    content: body,
    images: publicImageUrls,
  },
  verifyConfig,
});
```

- Requirements: register an app on the 小红书 分享开放平台 (share open
  platform), which goes through review. The secret lives only in Vercel env
  vars and never reaches the client.
- **Interim fallback (before approval):** copy the text to the clipboard and
  open the OS share sheet with the photos (Web Share API on the phone), then
  paste in 小红书.

### 2.3 Link back → publish

- tingcc pastes the published 小红书 URL into admin.
- The server extracts `xhs_note_id`, sets `xhs_url`, and sets
  `status = 'published'` with `published_at = now()`.
- A post never goes live without `xhs_url`.
- **Attribution is required.** The widget shows `小红书 · @handle`, and tapping
  opens the real 小红书 post, so it reads as a 小红书 post.

### 2.4 Alternative order

Post in 小红书 first, share the link into admin (paste or the share sheet),
then fill in title, body and photos and publish. This uses the same table and
the same status rules.

## 3. Rejected options

| Option | Why rejected |
| --- | --- |
| Scraping the 小红书 profile | Signed request headers, login walls, cloud IPs blocked, image URLs expire and are hotlink-protected, against ToS |
| In-app web login plus cookie capture | Against ToS, likely App Store rejection, account-ban risk |
| 小红书 OAuth (openaccount.xiaohongshu.com, docs updated 2026-03-29) | Grants only `basic_info` (nickname and avatar); cannot read notes |
| Browser automation (e.g. github.com/kirayoXkaki/xhs-mcp, go-rod plus cookies) | Unmaintained (0 stars, single commit), fragile, account-ban risk |

## 4. Architecture

```text
   tingcc ──▶ ADMIN (Next.js on Vercel, Supabase Auth)
                │  save draft / upload images
                │  /api/xhs/sign ──▶ xhs.share ──▶ 小红书 app (发布)
                │  paste xhs_url ──▶ status = published
                ▼
        SUPABASE (Postgres + Storage, RLS)
                │  anon: select published only
                ▼
   (optional) Vercel GET /api/posts/latest  (CDN-cached)
                │
                ▼
          Nōted APP (Expo RN)
          - fetch latest, cache image by post id
          - write widget snapshot
                │
        ┌───────┴────────┐
        ▼                ▼
   iOS WidgetKit    Android widget
        └───────┬────────┘
                ▼
       Real 小红书 post (deep link)
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Mobile app | Expo + React Native + TypeScript (dev builds) | Latest-post screen, cache, widget snapshot |
| iOS widget | Swift WidgetKit target (e.g. `@bacons/apple-targets`) or Expo widgets if mature | Home-screen display, timeline refresh |
| Android widget | `react-native-android-widget` (or Expo widgets if mature) | Home-screen display |
| Admin | Next.js on Vercel | Compose, share to 小红书, link back |
| Signing | Vercel serverless function | Holds appKey/appSecret, returns verifyConfig |
| Database | Supabase Postgres | `posts` table, RLS |
| Images | Supabase Storage (public bucket) | Resized images at public URLs |
| Auth | Supabase Auth | Admin login (tingcc only) |

No AWS, dedicated server, queue or scheduler is needed.

## 5. Data model

### `posts`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid, PK, default `gen_random_uuid()` | Internal ID |
| `status` | text, `draft` \| `published` | Check constraint |
| `title` | text | |
| `body` | text | |
| `image_paths` | jsonb | Array of storage paths, in order |
| `cover_path` | text | Widget image (usually first image) |
| `xhs_url` | text, nullable | Required before publish |
| `xhs_note_id` | text, nullable, unique | Parsed from URL |
| `published_at` | timestamptz, nullable | Set on publish |
| `created_at` | timestamptz, default `now()` | |
| `updated_at` | timestamptz | Trigger-maintained |

### RLS

```sql
alter table posts enable row level security;

create policy "public read published" on posts
  for select to anon, authenticated
  using (status = 'published');

create policy "admin full access" on posts
  for all to authenticated
  using (auth.uid() = '<ADMIN_UID>')
  with check (auth.uid() = '<ADMIN_UID>');

alter table posts add constraint published_needs_link
  check (status = 'draft' or xhs_url is not null);
```

Storage: public read on the images bucket; only the admin uid may write.

### Latest post

```sql
create view latest_post as
  select * from posts
  where status = 'published'
  order by published_at desc
  limit 1;
```

Or query directly: `order=published_at.desc&limit=1`.

## 6. API contract

Option A: the app reads Supabase directly (anon key plus RLS).
Option B: a cached Vercel endpoint (`Cache-Control: s-maxage=300`).

```http
GET /api/posts/latest
```

```json
{
  "schemaVersion": 1,
  "post": {
    "id": "uuid",
    "title": "A little note",
    "body": "Short body…",
    "coverUrl": "https://<project>.supabase.co/storage/v1/object/public/images/…/cover.webp",
    "publishedAt": "2026-11-02T08:00:00+08:00",
    "xhsUrl": "https://www.xiaohongshu.com/explore/…",
    "attribution": { "platform": "小红书", "handle": "@handle" }
  }
}
```

Admin-only (Supabase session required):

```http
POST /api/xhs/sign        -> { appKey, nonce, timestamp, signature }
POST /api/posts/:id/link  -> { xhsUrl } sets published
```

Clients must ignore unknown fields and check `schemaVersion`.

## 7. Mobile app and widgets

### App

- No sign-in and no compose.
- On open or resume: fetch latest. If `post.id` changed, download the cover,
  save it locally, and write a widget snapshot (JSON plus image path) to
  shared storage (iOS App Group / Android SharedPreferences plus files).
- If the id is unchanged, nothing is downloaded.

### Widget states

| State | Shows |
| --- | --- |
| Before first sync | Placeholder: "Nōted — open the app to load today's note" |
| Normal | Cover image, title, `小红书 · @handle` |
| Offline / fetch error | Last good snapshot |
| Tap | Opens `xhsUrl` (小红书 app if installed, else web) |

### Refresh strategy

1. App open/resume writes the snapshot and reloads widgets
   (`WidgetCenter.reloadAllTimelines`, Android widget update).
2. Background refresh: an iOS timeline provider can fetch the JSON itself
   (e.g. policy `.after(+1h)`); Android uses WorkManager or `updatePeriodMillis`.
3. Recommended (M4): a silent push (APNs background / FCM data message) sent
   on publish triggers a widget reload. The OS throttles these, so treat them
   as best-effort.

### Widget tech decision

- First check the current maturity of Expo widget support (expo-widgets or
  similar) for both platforms.
- Fallback: `react-native-android-widget` plus a Swift WidgetKit target via
  `@bacons/apple-targets`.
- Personal phone: install with `expo run:ios` / dev build. Without a paid
  Apple account, free provisioning expires after about 7 days and needs
  rebuilding (approximate; verify).

## 8. Costs (approximate — check against current pricing)

| Item | Plan | Cost | Notes |
| --- | --- | --- | --- |
| Vercel | Hobby | US$0 | Non-commercial only; revisit before public launch |
| Supabase | Free | US$0 | Pauses after about 1 week of inactivity; about 5GB/month egress |
| 小红书 share platform | — | US$0 (assumed) | Requires app review |
| Apple Developer | — | US$0 now | About US$99/yr later for store and push |
| Google Play | — | US$0 now | About US$25 one-time later |

Capacity, roughly: about 60KB/day per user across 5GB/month gives about
2–3k daily users on Supabase Free. Moving images to Cloudflare R2 (no egress
fees) extends this. Keep the project active, e.g. with a weekly ping, to
avoid the pause.

## 9. Security

- appSecret and the Supabase service-role key exist only in Vercel env vars.
- The app ships only the anon key; RLS limits anon to published rows.
- The admin uid is hard-checked both in RLS and in the API routes.
- Validate `xhs_url` (xiaohongshu.com / xhslink.com hosts only).

## 10. Risks and future work

| Risk / item | Impact | Mitigation |
| --- | --- | --- |
| App Store guideline 4.2 (minimum functionality) | Store rejection | Add an archive or saved notes before the store launch |
| Share-platform approval delayed or denied | No one-tap posting | Clipboard plus share-sheet fallback |
| Widget refresh throttling | Stale widget | Open/resume refresh, timeline fetch, silent push |
| Supabase free pause | API down | Activity ping; upgrade if needed |
| Vercel Hobby non-commercial | Plan violation at launch | Move to Pro or another host |
| Free provisioning expiry (iOS) | App stops launching | Rebuild weekly; buy a dev account at launch |

Future: push notifications, archive, analytics, R2 images, store launch.

## 11. Milestones and acceptance criteria

### M1 — Supabase schema, RLS, admin compose (draft)

- [ ] `posts` table, constraint, view and storage bucket are created by a migration.
- [ ] Anon cannot read drafts and cannot write (verified by a test query).
- [ ] tingcc can log in to admin; any other account is rejected.
- [ ] A draft is saved with images resized to about 600px wide and ≤ about 80KB.

### M2 — Public app plus one widget on tingcc's phone

- [ ] A dev build runs on tingcc's phone.
- [ ] The app shows the latest published post, with no sign-in.
- [ ] The image re-downloads only when the post id changes.
- [ ] One widget (the platform of tingcc's phone) shows the placeholder, then
      the post with `小红书 · @handle`, and stays on last-good content offline.
- [ ] Tapping the widget opens the 小红书 post.

### M3 — xhs.share integration plus link-back

- [ ] The fallback (clipboard plus share sheet) works before approval.
- [ ] After appKey approval: `/api/xhs/sign` returns a valid verifyConfig, and
      `xhs.share` opens 小红书 with the title, text and images prefilled.
- [ ] Pasting the URL sets `published`; publishing without a URL is rejected.
- [ ] The alternative order (link first, then content) works.

### M4 — Second-platform widget, push refresh, polish

- [ ] The widget works on both iOS and Android.
- [ ] Publishing sends a silent push; the widget updates within minutes when
      the OS allows it.
- [ ] Polish: empty and error states, app icon, Nōted branding.
