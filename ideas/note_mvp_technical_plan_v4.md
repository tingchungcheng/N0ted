# Nōted — MVP Product & Technical Plan (v4)

> **Tagline:** A little note, delivered every day.

Nōted is a free React Native (Expo, TypeScript) app whose iOS and Android
home-screen widgets show a little note each day. The note is either a quote
or a post from tingcc's own 小红书 (RedNote) account, chosen to match the
user's interests. For now it is for personal use only: dev builds installed
on tingcc's own phone, no Apple Developer account yet. A store launch comes
later.

## 0. What changed from v3

| Area | v3 | v4 |
| --- | --- | --- |
| Content | The latest 小红书 post only | Quotes plus 小红书 posts, tagged |
| Personalisation | None | Local onboarding (3–4 questions plus optional MBTI) gives tag weights |
| Table | `posts` | `items` (`type` = quote \| post), with `tags text[]` |
| Delivery | `GET /api/posts/latest` | Small published catalog, cached; today's item is **picked on device** |
| Post visibility | Everyone | Only users whose tags match the post's tags |
| Widget | Shows the latest post | Shows precomputed daily picks for the next few days |
| Privacy | — | Answers stay on the device; nothing is collected on the server |

Unchanged: admin-only compose, the xhs.share publish plus link-back flow (now
for `type = post` only), `小红书 · @handle` attribution, Supabase plus RLS,
Vercel, costs, widget tech, and the rejected options.

## 1. Product definition

### Core experience

1. First launch: a typography-styled splash, then 3–4 tap-only questions and
   an optional MBTI input. There is no login.
2. The answers become a weight for each of 5 tags, stored only on the device.
3. The app syncs a small catalog of published items and picks today's item
   on the device.
4. The widget and home screen show a quote (`— author, source`) or a matching
   小红书 post with its badge.
5. Tapping a post opens the real 小红书 post. Tapping a quote opens the
   detail screen in the app.

### MVP scope

- Onboarding with 5 tags: **historical, inspiring, calm** (gentle, slow
  living), **love** (relationships, kindness) and **wit** (funny, sharp
  one-liners).
- A quote catalog of about 20 per tag at launch (about 100 in total), growing
  to 50–100 per tag.
- Admin compose for quotes and posts, with xhs.share for posts.
- Settings for editing answers, MBTI and tags.
- iOS and Android widgets.

Not in the MVP: accounts, server-side profiles, archive or favourites (see
§12), likes or comments, analytics.

## 2. Onboarding and tag weights (on device)

### Questions (tap-only; each option adds points)

| # | Question | Options → tag points |
| --- | --- | --- |
| 1 | What do you want from your morning note? | A spark to get going → inspiring +2 · A moment of quiet → calm +2 · A smile → wit +2 · A warm thought → love +2 |
| 2 | Pick a place to spend an afternoon | A museum or old street → historical +2 · A café by the window → calm +1, love +1 · A comedy show → wit +2 · Somewhere new → inspiring +2 |
| 3 | Which line do you like best? | "Those who forget history…" → historical +2 · "Slow down, it's fine." → calm +2 · "Be kind; everyone is fighting…" → love +2 · "I can resist anything except temptation." → wit +2 |
| 4 (optional) | Choose up to 2 that sound like you | Curious about the past → historical +1 · Driven → inspiring +1 · Gentle → calm +1 · Romantic → love +1 · Playful → wit +1 |

The base weight is 1 per tag, so every tag stays possible. Add the points,
then normalise so the weights sum to 1.

### Optional MBTI nudge (skippable, 16 types)

MBTI adds +0.5 per matching letter, with a total cap of +1.5. It nudges the
weights but never overrides the answers.

| Letter / temperament | Nudge |
| --- | --- |
| I | calm +0.5 |
| E | wit +0.5 |
| N | inspiring +0.5 |
| S | historical +0.5 |
| F | love +0.5 |
| T | wit +0.5 |
| NF (idealists) | inspiring +0.5 |
| SJ (guardians) | historical +0.5 |

Example: answers give calm 5, love 3, wit 1, inspiring 1, historical 1. INFP
adds calm +0.5, inspiring +0.5 and love +0.5 (capped at +1.5). After
normalising, calm leads and love comes second, so the answers still dominate.

### Local storage

- App: MMKV (or AsyncStorage) holds `profile = { answers, mbti?, weights,
  matchTags, installId, lastSeenPostAt, recentIds[] }`.
- `matchTags` are the tags with weight ≥ about 0.2 (at least the top 2), and
  they decide post visibility.
- Widget-shared storage holds the precomputed picks plus images: an App Group
  container on iOS, and SharedPreferences plus files on Android.
- Answers can be edited in Settings, which triggers a recompute. Nothing is
  sent to the server.

## 3. Content flow (admin; unchanged from v3 except types)

### 3.1 Admin-only compose

- Next.js on Vercel behind Supabase Auth, limited to tingcc's account.
- The type selector chooses the fields:
  - **quote:** text, author (required), source (book, speech or work),
    source_url, tags, optional image.
  - **post:** title, text, photos, tags.
- Save writes `status = 'draft'`. Images are resized to about 600px wide, about
  50–80KB webp or jpg, in the public Storage bucket.
- Publishing a quote is a direct draft → published step.

### 3.2 "Post to 小红书" (type = post only)

```text
Admin ──POST /api/xhs/sign──▶ Vercel fn (appKey/appSecret in env)
      ◀── verifyConfig {appKey, nonce, timestamp, signature} ──
Admin ──xhs.share({shareInfo, verifyConfig})──▶ 小红书 publish page (prefilled) → 发布
```

- The signature is SHA-256 over the sorted `k=v&...` params plus the secret.
  The secret never reaches the client.
- `xhs.share({ shareInfo: { type: 'normal', title, content, images: publicUrls }, verifyConfig })`
- This needs a 小红书 分享开放平台 app, which goes through review. Interim
  fallback: copy the text and open the OS share sheet with the photos.

### 3.3 Link back → publish

- tingcc pastes the 小红书 URL. The server parses `xhs_note_id` and sets
  `published` with `published_at = now()`.
- A post cannot be published without `xhs_url`.
- Attribution: `小红书 · @handle`, and a tap opens the real post.
- Alternative order: post in 小红书 first, share the link into admin, then
  fill in the content.

### 3.4 Quote copyright and attribution

- Prefer public-domain quotes: authors who died more than about 70 years ago
  (rules vary by country), classical Chinese texts, and historical speeches.
- Always show `— author, source`. Avoid long excerpts from modern copyrighted
  works; keep them short or skip them.
- Check that each quote really is by that author before publishing, because
  misattributed quotes are common. Use `source_url` as the reference.

## 4. Rejected options (unchanged)

| Option | Why rejected |
| --- | --- |
| Scraping the 小红书 profile | Signed request headers, login walls, cloud IPs blocked, image URLs expire and are hotlink-protected, against ToS |
| In-app web login plus cookie capture | Against ToS, likely App Store rejection, account-ban risk |
| 小红书 OAuth (openaccount.xiaohongshu.com, docs updated 2026-03-29) | Grants only `basic_info` (nickname and avatar); cannot read notes |
| Browser automation (e.g. github.com/kirayoXkaki/xhs-mcp) | Unmaintained (0 stars, single commit), account-ban risk |
| Server-side personalisation | Needs user profiles on the server; on-device picking is simpler and private |

## 5. Architecture

```text
 tingcc ─▶ ADMIN (Next.js/Vercel, Supabase Auth) ─▶ xhs.share ─▶ 小红书
              │ quotes + posts (tagged), link-back
              ▼
      SUPABASE Postgres (items, RLS) + Storage
              │ anon: published only
              ▼
   GET /api/items?since=…  (ETag + CDN cache)  or Supabase anon select
              ▼
   Nōted APP: catalog cache ─▶ on-device picker (weights, seed, recent list)
              │ precompute next N days
              ▼
   Widget-shared storage ─▶ iOS WidgetKit timeline / Android widget
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Mobile app | Expo + RN + TypeScript (dev builds) | Onboarding, catalog cache, picker, settings |
| Local storage | MMKV / AsyncStorage plus App Group / SharedPreferences | Profile, catalog, precomputed picks |
| iOS widget | Swift WidgetKit target (`@bacons/apple-targets`) or Expo widgets if mature | Dated timeline entries |
| Android widget | `react-native-android-widget` (or Expo widgets) | Daily rotation from stored picks |
| Admin | Next.js on Vercel | Compose quotes and posts, share, link back |
| Signing | Vercel function | verifyConfig |
| Data | Supabase Postgres plus Storage | `items`, images, RLS |

## 6. Data model

### `items` (replaces `posts`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `type` | text: `quote` \| `post` | Check constraint |
| `text` | text | Quote text or post body |
| `title` | text, nullable | Posts mainly |
| `author` | text, nullable | **Required for quotes** |
| `source` | text, nullable | Book, speech or work |
| `source_url` | text, nullable | Reference |
| `tags` | text[] | Subset of the 5 tags, at least 1 |
| `image_path` | text, nullable | Storage path |
| `xhs_url` | text, nullable | **Required for published posts** |
| `xhs_note_id` | text, nullable, unique | Parsed from the URL |
| `status` | text: `draft` \| `published` | |
| `published_at` | timestamptz, nullable | |
| `created_at` / `updated_at` | timestamptz | `updated_at` set by a trigger |

```sql
alter table items add constraint tags_valid
  check (tags <@ array['historical','inspiring','calm','love','wit']
         and cardinality(tags) >= 1);
alter table items add constraint quote_needs_author
  check (type <> 'quote' or author is not null);
alter table items add constraint published_post_needs_link
  check (type <> 'post' or status = 'draft' or xhs_url is not null);

alter table items enable row level security;
create policy "public read published" on items
  for select to anon, authenticated using (status = 'published');
create policy "admin full access" on items
  for all to authenticated
  using (auth.uid() = '<ADMIN_UID>') with check (auth.uid() = '<ADMIN_UID>');
create index on items (status, updated_at);
```

The Storage rules are the same as v3: public read, and only the admin uid can
write.

## 7. API contract

```http
GET /api/items?since=2026-11-01T00:00:00Z
If-None-Match: "<etag>"
```

```json
{
  "schemaVersion": 2,
  "serverTime": "2026-11-02T09:00:00Z",
  "items": [
    {
      "id": "uuid",
      "type": "quote",
      "text": "The unexamined life is not worth living.",
      "author": "Socrates",
      "source": "Plato, Apology",
      "sourceUrl": null,
      "tags": ["historical", "inspiring"],
      "imageUrl": null,
      "publishedAt": "2026-11-01T00:00:00Z",
      "updatedAt": "2026-11-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "type": "post",
      "title": "Slow Sunday",
      "text": "…",
      "tags": ["calm"],
      "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/images/…webp",
      "xhsUrl": "https://www.xiaohongshu.com/explore/…",
      "attribution": { "platform": "小红书", "handle": "@handle" },
      "publishedAt": "2026-11-02T08:00:00Z",
      "updatedAt": "2026-11-02T08:00:00Z"
    }
  ],
  "removedIds": []
}
```

- Returns published items updated after `since`. With no `since`, it returns
  the full catalog (about 100–500 items, tens of KB of JSON).
- `ETag` plus `Cache-Control: s-maxage=300, stale-while-revalidate`, and `304`
  when nothing changed.
- `removedIds` covers items that were unpublished. Alternatively, the app can
  do an anon Supabase select with `updated_at > since`.
- Admin-only: `POST /api/xhs/sign`, `POST /api/items/:id/link` (posts),
  `POST /api/items/:id/publish` (quotes).

## 8. On-device picking

### Daily pick (deterministic)

```ts
function pickForDate(date: string, p: Profile, catalog: Item[]): Item {
  // 1. Matching post takes priority
  const post = catalog
    .filter(i => i.type === 'post'
      && i.tags.some(t => p.matchTags.includes(t))
      && i.publishedAt > p.lastSeenPostAt)
    .sort(byPublishedAtAsc)[0];          // oldest unseen first, one per day
  if (post) return post;

  // 2. Otherwise a weighted quote
  const pool = catalog.filter(i => i.type === 'quote' && !p.recentIds.includes(i.id));
  const rng = seededRandom(hash(date + p.installId));
  return weightedPick(pool, i => Math.max(...i.tags.map(t => p.weights[t])), rng);
}
```

- **Seed** = local date (`YYYY-MM-DD`) plus `installId`. The pick is stable
  all day and differs between devices.
- **No repeats:** `recentIds` holds the last N shown (e.g. 60, or catalog size
  minus 1). If the pool empties, clear the oldest half.
- **Posts:** shown only to users whose `matchTags` overlap the post's tags.
  When shown, `lastSeenPostAt` advances. Non-matching users never see the post
  and keep getting quotes.
- The pick runs in TypeScript in the app, not in the widget.

### Precompute for the widget

- On open, resume, background fetch (expo-background-fetch / WorkManager) or a
  settings change: compute the picks for today plus the next 6 days. Download
  their images, write `[{date, item, localImagePath}]` to shared storage, and
  reload the widgets.
- Precomputed future days assume no new posts. A new matching post replaces
  an entry at the next refresh.
- **iOS:** the timeline provider creates one entry per date at local midnight,
  with policy `.atEnd`.
- **Android:** the widget reads the entry for today's date on each update
  (`updatePeriodMillis` / WorkManager daily). If the dates run out, it
  falls back to the last entry.

## 9. Widget and home screen

| State | Shows | Tap |
| --- | --- | --- |
| Before onboarding or sync | Placeholder: "Nōted — open the app to set up your notes" | Opens the app |
| Quote | Quote text (typography-styled), `— author, source` | App detail screen |
| Post | Image, title, `小红书 · @handle` badge | Opens `xhs_url` (小红书 app or web) |
| Offline | Last good precomputed entry | As above |

Silent push on publish (APNs / FCM data message) remains a recommended M4
item. It can trigger the app to recompute, but the OS throttles it, so treat
it as best-effort.

## 10. Costs (approximate — check against current pricing)

| Item | Plan | Cost | Notes |
| --- | --- | --- | --- |
| Vercel | Hobby | US$0 | Non-commercial; revisit before public launch |
| Supabase | Free | US$0 | Pauses after about 1 week of inactivity; about 5GB/month egress |
| 小红书 share platform | — | US$0 (assumed) | App review |
| Apple / Google | — | US$0 now | About US$99/yr and about US$25 one-time later |

The catalog sync is mostly 304s and small deltas. Images are downloaded only
for picked items (about 60KB each, and quotes often have no image). The v3
estimate of about 2–3k daily users on the free tier still roughly holds, and
Cloudflare R2 for images extends it.

## 11. Security and privacy

- appSecret and the service-role key exist only in Vercel env vars. The app
  ships the anon key only.
- Onboarding answers, MBTI, weights and history never leave the device. There
  are no analytics in the MVP, which keeps future App Store privacy labels
  simple ("Data Not Collected").
- Validate `xhs_url` hosts (xiaohongshu.com / xhslink.com).

## 12. Risks and future work

| Risk / item | Impact | Mitigation |
| --- | --- | --- |
| App Store 4.2 minimum functionality | Rejection | Onboarding plus personalisation helps; add an archive or favourites before the store launch |
| Quote copyright or misattribution | Takedown, credibility | Public-domain first, verified sources, short excerpts |
| Small catalog leads to repeats | Boredom | About 20 per tag at launch, grow to 50–100; reset the recent list |
| Share-platform approval | No one-tap posting | Clipboard plus share-sheet fallback |
| Widget refresh throttling | Stale or wrong day | 7-day precompute, iOS dated timeline |
| Supabase pause / Vercel Hobby terms | Downtime / plan violation | Activity ping; upgrade at launch |
| iOS free provisioning (about 7 days, verify) | App stops launching | Rebuild; buy a dev account at launch |

Future: favourites or archive, push, more tags, opt-in analytics, R2.

## 13. Milestones and acceptance criteria

### M1 — Schema, RLS, admin compose, quote seed

- [ ] The `items` table, constraints, RLS and bucket are created by a migration.
- [ ] Anon reads only published rows and cannot write. A quote without an
      author, or a published post without `xhs_url`, is rejected.
- [ ] Admin (tingcc only) creates quotes and posts with tags; other accounts
      are rejected.
- [ ] About 20 verified quotes per tag (about 100) are seeded and published,
      each with an author and source.

### M2 — Onboarding, catalog, on-device pick, one widget

- [ ] The splash plus 3–4 tap questions plus optional MBTI can be skipped and
      edited in Settings, and are stored only locally.
- [ ] The weights follow §2. MBTI changes them by at most +1.5 in total.
- [ ] Catalog sync works with `since` and ETag, and the app works offline from
      the cache.
- [ ] The same date and install always give the same pick; no repeats within
      the recent window.
- [ ] One widget on tingcc's phone shows today's precomputed pick and rotates
      at midnight without opening the app (at least 3 days).

### M3 — xhs.share plus link-back plus post targeting

- [ ] The fallback share works before approval. After approval, `xhs.share`
      opens 小红书 prefilled.
- [ ] The link-back publishes the post. A matching user sees it as the next
      day's pick (or at the next refresh); a non-matching test profile never
      sees it.
- [ ] Tapping a post opens `xhs_url`; tapping a quote opens the app detail.

### M4 — Second-platform widget, push, polish

- [ ] Widgets work on both iOS and Android with all §9 states.
- [ ] A silent push on publish triggers a recompute when the OS allows it.
- [ ] Typography polish, icon, catalog grown toward 50+ per tag.
