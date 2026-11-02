# RedNote Daily --- MVP Technical Plan

## 1. Product overview

Build a cross-platform React Native application that displays the
**latest post from a selected public RedNote (小红书) creator** in an
iOS or Android home-screen widget.

The product follows selection model **A**:

> Always show the creator's latest available post, even if that post was
> already shown yesterday.

The MVP does not need a post history, daily selection algorithm, user
accounts, or a persistent application database.

## 2. MVP goals

-   Let a user configure a public RedNote creator.
-   Retrieve that creator's latest available post once per day.
-   Publish the post's metadata as a small JSON document.
-   Let the mobile app fetch the JSON.
-   Cache the post image locally so the widget can render it.
-   Display the latest post in an iOS and Android home-screen widget.
-   Open the original RedNote post when the user taps the widget.

### Out of scope for the MVP

-   Historical post browsing.
-   Preventing previously displayed posts from repeating.
-   Multiple creators per widget (can be added later).
-   User accounts and cloud-based preferences.
-   Push notifications.
-   Guaranteed exact-time widget refreshes.

## 3. Lean, no-cost-first architecture

``` text
                  Daily scheduled workflow
                           |
                           v
                    GitHub Actions
                           |
                           v
                    Python scraper
                           |
                           v
                 Retrieve latest RedNote post
                           |
                           v
                  Generate latest-post.json
                           |
                           v
                    GitHub Pages
                           |
                           v
                  Static JSON endpoint
                           |
                           v
              React Native app (Expo)
                           |
               +-----------+-----------+
               |                       |
               v                       v
        Download/cache image      Read post metadata
               |                       |
               +-----------+-----------+
                           |
                           v
                  Expo home-screen widget
                     iOS + Android
```

### Components

  ------------------------------------------------------------------------
  Component             Responsibility                 Initial cost target
  --------------------- --------------------- ----------------------------
  Python                Retrieve and                                   \$0
                        normalize the latest  
                        post                  

  GitHub Actions        Run the scraper on a               Free-tier usage
                        daily schedule        

  GitHub Pages          Host the generated          \$0 for eligible usage
                        JSON file             

  React Native + Expo   Mobile application                             \$0

  Expo Widgets          Home-screen widgets            No widget usage fee

  Local device storage  Cache the widget                               \$0
                        image and snapshot    
                        data                  
  ------------------------------------------------------------------------

This is a **no-cost-first** design, not a guarantee that every usage
pattern or third-party scraper will remain free. Check current GitHub
plan limits and the applicable terms before publishing.

## 4. Daily content workflow

1.  GitHub Actions starts the scheduled workflow.
2.  The Python scraper requests the configured public RedNote creator
    profile.
3.  It attempts to identify the latest available post.
4.  The scraper normalizes the result into a predictable JSON schema.
5.  The workflow publishes the updated JSON file to GitHub Pages.
6.  The mobile app fetches the JSON when opened and attempts background
    refreshes where supported.
7.  The app downloads the cover image and stores it in a location
    accessible to the widget.
8.  The app updates the widget snapshot.
9.  Tapping the widget opens the original RedNote post.

If scraping fails, the workflow should keep the last successfully
published JSON rather than replacing it with an empty or invalid
response.

## 5. JSON contract

Example `latest-post.json`:

``` json
{
  "creator": {
    "id": "example_creator",
    "nickname": "Daily Inspiration",
    "profileUrl": "https://www.xiaohongshu.com/user/profile/example"
  },
  "fetchedAt": "2026-11-02T00:00:00Z",
  "post": {
    "id": "note_123",
    "title": "Today's inspiration",
    "coverImageUrl": "https://example.com/cover.jpg",
    "publishedAt": "2026-11-01T10:30:00Z",
    "originalUrl": "https://www.xiaohongshu.com/explore/note_123"
  }
}
```

The schema should be versioned if it is likely to change. The mobile app
should handle missing titles, missing images, malformed JSON, expired
image URLs, and stale content gracefully.

## 6. Suggested repository structure

``` text
rednote-daily/
├── scraper/
│   ├── main.py
│   ├── rednote_provider.py
│   ├── normalize_post.py
│   └── requirements.txt
├── public/
│   └── latest-post.json
├── .github/
│   └── workflows/
│       └── daily-scrape.yml
├── mobile/
│   ├── app/
│   ├── components/
│   ├── services/
│   │   └── latestPost.ts
│   └── widgets/
└── README.md
```

The mobile app can live in a separate repository if that makes
deployment and access control easier. Avoid committing secrets, cookies,
session tokens, or private account data to the repository.

## 7. Scheduling

Use a GitHub Actions scheduled workflow.

Malaysia time is UTC+8, so **08:00 Malaysia time corresponds to 00:00
UTC**.

Example workflow:

``` yaml
name: Daily RedNote scrape

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r scraper/requirements.txt

      - name: Retrieve latest post
        run: python scraper/main.py
        env:
          REDNOTE_CREATOR_URL: ${{ vars.REDNOTE_CREATOR_URL }}

      - name: Commit updated JSON
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/latest-post.json
          git diff --cached --quiet || git commit -m "Update latest RedNote post"
          git push
```

The workflow is an implementation starting point. Configure GitHub Pages
to publish the `public` directory (or use a dedicated deployment
workflow) and verify repository permissions. GitHub scheduled workflows
can be delayed during periods of high load; do not treat the cron time
as an exact execution guarantee.

For production, pin third-party GitHub Actions to reviewed commit SHAs
and use least-privilege permissions.

## 8. Mobile and widget implementation

### App responsibilities

-   Store the selected creator URL locally for the MVP.
-   Fetch `latest-post.json`.
-   Validate the response and handle network failures.
-   Download the cover image.
-   Save the image in the shared widget-accessible directory required by
    the widget library.
-   Update the widget snapshot with title, creator, image path, post
    URL, and fetch timestamp.
-   Deep-link to the original RedNote post when tapped.

### Widget responsibilities

-   Render only locally available snapshot data.
-   Display a placeholder if no post has been downloaded yet.
-   Display cached content when the phone is offline.
-   Open the app or original post through a supported link action.

### Refresh limitations

A backend publishing a new JSON file does **not** automatically update
an already-installed home-screen widget.

The app needs to fetch the new JSON and update its widget data. iOS
WidgetKit and Android impose their own refresh and background-execution
policies. The operating system may delay background work, so exact daily
refresh at 08:00 cannot be guaranteed.

Recommended MVP refresh strategy:

1.  Fetch and update when the app is opened.
2.  Attempt periodic background refresh using supported platform
    mechanisms.
3.  Keep the last successful image and snapshot for offline display.
4.  Show the content's fetched/published time so users can recognize
    stale data.

Build and test with native development builds; Expo Go is not a
substitute for testing native home-screen widgets.

## 9. RedNote scraping risk and validation

The scraper is the largest technical uncertainty.

An unofficial scraper may stop working because of website changes,
authentication requirements, rate limits, CAPTCHA, anti-bot measures, or
changes to the page's data format. A public profile being viewable does
not automatically mean automated collection or image redistribution is
permitted.

Before building the full app, run a **7-day proof of concept** against
one public creator.

Validate:

-   The profile can be accessed consistently.
-   The latest available post can be identified correctly.
-   A stable post ID and original post URL are returned.
-   The title and cover image are usable.
-   The workflow can run without storing personal login credentials.
-   Failures do not overwrite the last good JSON.
-   The proposed collection and display comply with RedNote's terms and
    applicable content rights.

Prefer official or authorized access where available. If automated
retrieval is not viable, a manual "paste a post URL" workflow is a
practical fallback.

## 10. Development milestones

  ------------------------------------------------------------------------
  Phase                 Tasks                                     Estimate
  --------------------- --------------------- ----------------------------
  1\. Scraper proof of  Test one public        3--5 days, plus observation
  concept               creator for seven                             time
                        days; validate        
                        metadata and image    
                        retrieval             

  2\. Static publishing GitHub Actions                           1--2 days
                        schedule, JSON        
                        generation, GitHub    
                        Pages deployment      

  3\. Mobile app        Creator setup,                           3--5 days
                        latest-post screen,   
                        JSON fetching, error  
                        states                

  4\. Widgets           iOS and Android                          5--8 days
                        widget layouts, local 
                        image cache, tap      
                        action                

  5\. Testing           Background refresh,                      3--5 days
                        offline behavior,     
                        stale data, device    
                        testing               
  ------------------------------------------------------------------------

A reasonable solo-developer estimate is approximately **3--5 weeks of
implementation**, plus the seven-day scraper observation period. Native
widget debugging and scraping reliability can change the schedule.

## 11. Cost plan

### Target recurring infrastructure cost

  -----------------------------------------------------------------------
  Item                                                        Target cost
  ------------------------------ ----------------------------------------
  GitHub Actions                     \$0 within applicable free allowance

  GitHub Pages                       \$0 within applicable plan and usage
                                                                    terms

  Python scraper                      \$0 for self-hosted code running on
                                                    GitHub-hosted runners

  React Native / Expo             \$0 in software usage fees for this MVP

  Database                                                   Not required

  API server                                                 Not required

  Object storage                                   Not required initially

  Paid scraping provider             \$0 if a viable permitted DIY method
                                                                    works
  -----------------------------------------------------------------------

**Target: \$0/month for the MVP infrastructure.**

Potential separate costs:

-   Apple Developer Program membership is generally required for App
    Store distribution.
-   Google Play Console registration is generally required for Play
    Store distribution.
-   A paid scraper, proxy, or authorized data provider may introduce
    recurring costs.
-   Domain registration is optional; GitHub Pages can provide a hosted
    URL.

Free-tier limits and platform pricing can change. Confirm current terms
before launch.

## 12. Future scaling options

Only add infrastructure when a real requirement appears.

  -----------------------------------------------------------------------
  New requirement                     Possible addition
  ----------------------------------- -----------------------------------
  Multiple creators configured        Small database or configuration
  centrally                           service

  Post history                        D1, Supabase, or another database

  User accounts and sync across       Authentication and database
  devices                             

  Hosted image copies                 Object storage such as R2 or S3,
                                      subject to image rights

  More reliable scheduled collection  Managed scheduler or paid workflow
                                      service

  High traffic                        CDN, caching, and rate limiting
  -----------------------------------------------------------------------

Do not add these services pre-emptively.

## 13. First milestone: prove the end-to-end path

Build only this first:

``` text
One public RedNote creator
          |
          v
Python scraper
          |
          v
latest-post.json
          |
          v
GitHub Pages
          |
          v
React Native app fetches JSON
          |
          v
One working home-screen widget
```

The first milestone is complete when a real post from the test creator
can be retrieved, published as JSON, downloaded by the app, cached
locally, and displayed in a working iOS or Android widget.

**Guiding principle:** Keep the backend stateless and minimal. The
server publishes the latest post; the phone handles its own image cache
and widget snapshot. Add persistent storage only when product
requirements actually need it.
