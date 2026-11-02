# Nōted --- MVP Product & Technical Plan

> **Tagline:** A little note, delivered every day.

Nōted is a free mobile app that brings the latest post from one featured
creator's RedNote account to users' iOS and Android home-screen widgets.
The app also directs interested users to the original RedNote post and
creator profile.

## 1. Product definition

### Core experience

1.  The creator publishes a post on their RedNote account.
2.  The creator or an authorized integration synchronizes the post to
    Nōted.
3.  Nōted's backend validates and stores the post metadata and any image
    it is permitted to host.
4.  Every Nōted user fetches the same latest post from the central API.
5.  The app caches the image locally and updates its home-screen widget.
6.  Tapping the widget opens the original RedNote post or creator
    profile.

### MVP scope

- One centrally managed RedNote creator account.
- One shared latest-post feed for all users.
- Free app download.
- Latest-post screen with creator attribution.
- iOS and Android home-screen widgets.
- Link to the original RedNote post/profile.
- Basic ingestion error handling.

Not in the MVP: user accounts, personalized feeds, arbitrary creator
following, post archives, likes/comments, push notifications,
subscriptions.

## 2. Content acquisition: important constraint

The backend architecture does not itself solve how posts are obtained
from RedNote. Nōted should not depend on unauthorized scraping, automated
login, bypassing anti-bot protections, or a method that could put the
creator's account at risk.

First establish a permitted way to transfer the creator's own posts into
Nōted. Options to investigate:

1.  An official RedNote integration/API, if it supports the required
    content access.
2.  A creator-operated submission workflow: after publishing, the
    creator pastes the post URL and supplies the image/text through a
    protected admin page.
3.  An authorized third-party syndication/content provider, subject to
    its terms and RedNote's rules.

For the MVP, a manual creator submission page is a dependable fallback.
It still validates the complete backend-to-widget experience without
relying on scraping. Do not assume that publicly visible images may
automatically be copied, cached, or redistributed; confirm content
rights and platform terms.

## 3. Recommended architecture

```text
           YOUR REDNOTE ACCOUNT
                    |
      permitted creator-authorized sync
          (API / admin submission)
                    |
                    v
             VERCEL API
          - validate incoming post
          - normalize metadata
          - update latest-post pointer
                    |
                    v
       SUPABASE POSTGRESQL + STORAGE
          - post metadata
          - authorized image assets
          - current latest post
                    |
                    v
               Nōted APP
          - fetch latest-post API
          - cache image locally
          - update widget snapshot
                    |
             +------+------+
             |             |
             v             v
          iOS Widget   Android Widget
             |             |
             +------+------+
                    |
                    v
          ORIGINAL REDNOTE POST
             / CREATOR PROFILE
```

---

Layer Technology Responsibility

---

Mobile app React Native + TypeScript Screens, API
integration, local
cache

Widgets Expo Widgets, subject to iOS and Android
platform support home-screen display

Backend/API Vercel Functions Ingestion endpoint and
read API

Database Supabase PostgreSQL Post metadata and
latest-post record

Image storage Supabase Storage Images Nōted is
initially permitted to host

Admin security Protected Secure content
endpoint/authentication ingestion

Monitoring Vercel + Supabase logs Diagnose errors and
usage

---

No AWS, dedicated server, queue, or separate scheduler is required
initially.

## 4. Data model

A small relational schema is sufficient.

### `posts`

Field Type Purpose

---

`id` UUID Internal post ID
`rednote_post_id` TEXT, nullable Original RedNote ID
`title` TEXT Post title
`description` TEXT, nullable Short excerpt
`image_path` TEXT, nullable Authorized image path in storage
`rednote_url` TEXT Original post URL
`published_at` TIMESTAMPTZ, nullable Original publication time
`created_at` TIMESTAMPTZ Time received by Nōted

### `app_config`

A single-row configuration table can point to the latest post.

Field Type Purpose

---

`key` TEXT, primary key e.g. `latest_post`
`post_id` UUID Current post reference
`updated_at` TIMESTAMPTZ Last update time

Alternatively, query the newest post by timestamp. A pointer is useful
if the creator wants to control which post is featured.

No user table is needed for the shared-feed MVP.

## 5. API contract

### Public read endpoint

```http
GET /api/posts/latest
```

Example response:

```json
{
  "id": "post-uuid",
  "title": "A little inspiration for today",
  "description": "A short preview of the post.",
  "imageUrl": "https://storage.example.com/note-cover.jpg",
  "publishedAt": "2026-11-02T08:00:00+08:00",
  "creator": {
    "displayName": "Nōted Creator",
    "rednoteProfileUrl": "https://www.xiaohongshu.com/user/profile/..."
  },
  "originalPostUrl": "https://www.xiaohongshu.com/explore/..."
}
```

### Protected ingestion endpoint

```http
POST /api/admin/posts
```

It should require admin authentication or a server-side secret; validate
URLs, required fields, image types and payload size; prevent duplicates
where possible; store only authorized content; and update the
latest-post pointer only after a successful save. Never expose ingestion
secrets or Supabase service-role keys in the mobile app.

Optional admin endpoints:

```http
GET    /api/admin/posts
PATCH  /api/admin/posts/:postId
DELETE /api/admin/posts/:postId
```

These can be omitted if a simple protected admin interface is
sufficient.

## 6. Mobile app and widget behavior

### App screens

1.  **Home:** latest post, creator attribution, link to original post.
2.  **Creator:** explain the source and link to the RedNote profile.
3.  **Settings:** refresh status, cache controls, app information.

### Widget behavior

- Render the latest locally downloaded post snapshot.
- Display a locally cached image and creator attribution.
- Show a placeholder before the first successful sync.
- Continue displaying the last successful post while offline.
- Tap through to the original post, or open the app as a fallback.

### Refresh limitations

A backend update does not automatically refresh installed widgets. The
app must fetch the latest-post API and update its widget data. iOS
WidgetKit and Android impose their own background execution and refresh
policies, so exact update times cannot be guaranteed.

Recommended strategy:

1.  Fetch and update when the app opens or resumes.
2.  Compare the post ID/version with the local version.
3.  Download the image only when the post changes.
4.  Save it in the widget-accessible local directory.
5.  Update the widget snapshot.
6.  Attempt periodic background refresh where supported.

## 7. Caching and delivery

All users receive the same latest post, so the public API response can
be cached.

- Cache the latest-post response at the CDN for a short period,
  e.g. 1--5 minutes.
- Revalidate or invalidate after a new post is published.
- Serve authorized images from Supabase Storage or a suitable image
  CDN.
- Let each phone retain its own local image cache.
- Do not route image bytes through Vercel Functions.

The app should handle stale responses and expired image URLs gracefully.

## 8. Vercel plan and commercial-use considerations

Vercel can host the API, but plan selection is not purely a traffic
question.

- Hobby is intended for personal, non-commercial use.
- Nōted is intended to promote a creator account and acquire an
  audience. That promotional purpose may fall within Vercel Hobby's
  commercial-use restrictions even if the app is free.
- Confirm the intended use with Vercel or use a plan whose terms
  clearly permit it before public launch.
- Vercel Pro has historically started at US\$20/month, with included
  usage credits and additional usage-based charges. Confirm current
  pricing and quotas before budgeting.

Use Vercel for API requests and lightweight backend logic, not as a
scraper or image-hosting proxy. Keep image storage and delivery
separate.

## 9. Cost plan

### Initial planning budget

---

Component Initial budget Notes

---

Vercel Pro Approx. US\$20/month Confirm current
pricing and
commercial
eligibility

Supabase Free US\$0 Development/early
testing, subject to
quotas

Supabase paid upgrade As needed Database, storage,
egress or reliability
needs

Domain Existing / optional Renewal is separate

React Native / Expo No app-framework usage fee Build and
distribution
requirements still
apply

Apple Developer Separate annual fee Generally required
Program for App Store
distribution

Google Play Console Separate one-time fee Generally required
for Play Store
distribution

---

Do not promise a fixed monthly cost for 10,000 users until usage is
measured. Main cost variables are API request volume and execution,
database compute/storage, image storage and egress, CDN cache hit ratio,
background refresh frequency, and any authorized content synchronization
provider.

### Illustrative image bandwidth

If 10,000 users each download one 300 KB image per day:

```text
10,000 users × 300 KB × 30 days
= approximately 90 GB/month
```

This is a simple upper-bound illustration assuming every user downloads
the full image every day. Real bandwidth can be lower with local
caching, conditional requests and CDN caching.

### Cost controls

- Keep API responses small.
- Cache the latest-post endpoint.
- Use appropriately sized widget images.
- Download an image only when its post ID or version changes.
- Avoid serving image files through serverless functions.
- Monitor provider dashboards and configure spend alerts.
- Upgrade database/storage plans only when measured usage requires it.

## 10. Security and operations

- Protect all ingestion/admin endpoints.
- Never ship admin keys or service-role keys in the mobile app.
- Validate submitted URLs and image content.
- Rate-limit public endpoints where appropriate.
- Use database access policies and least-privilege credentials.
- Keep the last-known-good post if ingestion fails.
- Log ingestion timestamps and error states.
- Provide a way to remove content if rights or platform requirements
  demand it.
- Avoid collecting unnecessary user information.

## 11. MVP development roadmap

---

Phase Work Indicative estimate

---

1\. Content workflow Confirm permitted 2--4 days
validation sync method; test one
post end-to-end

2\. Backend Supabase schema, 3--5 days
foundation Vercel API, protected
ingestion

3\. Mobile app Latest-post screen, 3--5 days
attribution, deep  
 links, caching

4\. Widgets iOS and Android 5--8 days
widget implementation

5\. Testing and Offline behavior, 3--5 days
launch prep refresh, security,  
 device testing

---

These are solo-developer planning estimates, not guarantees. Native
widget testing and content workflow validation may extend the schedule.

## 12. MVP acceptance criteria

The MVP is ready for a small beta when:

- The creator can submit/synchronize a post through the protected
  workflow.
- The backend validates and stores the post.
- The public latest-post API returns the same post to all users.
- The app displays title, image, creator attribution and original
  link.
- The app caches the image locally.
- The iOS widget displays the latest successfully downloaded post.
- The Android widget displays the latest successfully downloaded post.
- Tapping the widget opens the original post or a reliable in-app
  fallback.
- A failed ingestion does not erase the previous valid post.
- No secret credentials are embedded in the mobile app.

## 13. Future enhancements

Only add these after the shared-feed MVP works:

- Creator dashboard and post-submission analytics.
- Click-through analytics for RedNote links.
- Multiple widget sizes and layouts.
- Push notifications for new posts.
- Post archive.
- Additional content channels.
- Multiple creators or personalized feeds.

## 14. First implementation milestone

Build the smallest complete path:

```text
Creator submits one authorized RedNote post
                    |
                    v
             Vercel ingestion API
                    |
                    v
          Supabase metadata + image
                    |
                    v
             GET /api/posts/latest
                    |
                    v
             React Native app
                    |
                    v
          Local image cache + widget
                    |
                    v
             Original RedNote post
```

**Guiding principle:** Nōted is a shared-content application. Synchronize
content once, store it centrally, and distribute the same latest post to
every user. Keep ingestion protected, mobile reads lightweight, images
cached, and infrastructure minimal until real usage justifies scaling.
