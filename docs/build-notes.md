# VidMetrics Build Notes

## Goal

VidMetrics was built as a focused YouTube competitor analysis app for public data. The product goal was not to recreate YouTube Studio or private creator analytics. The goal was to make public competitor research faster, easier to scan, and easier to explain in a demo.

The app is intentionally centered around one workflow:

1. paste a public YouTube channel or video URL
2. resolve that input into a channel
3. analyze a recent pool of uploads
4. turn that pool into a clear research dashboard

## Product Shape

The app was kept to two primary surfaces:

- a landing page that explains the value quickly and gets the user into the workflow
- a single analysis dashboard that keeps all research in one place

I chose that structure because it keeps the product easier to demo and easier to review. A multi-page app would have added navigation overhead without improving the core competitor-research workflow.

## Input Handling

The app accepts several public YouTube URL types:

- channel URLs
- handle URLs
- video URLs
- Shorts URLs
- `youtu.be` links

If the user pastes a video URL, the app resolves that video back to its parent channel before running the full analysis. That makes the input flow more forgiving and better for real usage.

## Data Source Strategy

The app uses public YouTube Data API v3 fields only. That was a deliberate constraint.

This gives access to:

- titles
- views
- likes
- comments
- publish dates
- durations
- tags
- categories
- some channel metadata

This does not give access to:

- retention
- watch time
- impressions
- CTR
- day-by-day growth history
- private audience demographics

Because of that, the app is explicit about using relative product signals rather than pretending to expose private creator analytics.

## Dashboard Structure

The dashboard is organized in the order a researcher would usually scan a competitor:

1. channel information
2. top videos
3. content analysis
4. keyword analysis
5. performance chart
6. competitor takeaways

That order moves from factual summary, to exact video list, to pattern-finding, to quick synthesized conclusions.

## Analysis Philosophy

The app tries to answer a few practical competitor questions:

- what is winning right now
- which uploads are moving fast
- are Shorts or long videos carrying performance
- what lengths appear most often
- what words repeat in titles and tags
- which public YouTube categories appear most often

The important design choice here was to avoid cluttering the dashboard with too many weak metrics. A small set of clear signals is more useful than a long table of low-value numbers.

## Why These Metrics

### Views

Raw views still matter because they show scale.

### Views per day

This is one of the strongest public signals for competitor research because it shows pace, not just absolute size. A smaller recent video can be more relevant than a large old one if it is moving faster right now.

### Engagement rate

The app uses:

`(likes + comments) / views * 100`

This is a public-data proxy for audience response. It is not a full engagement truth, but it is more useful than showing likes or comments in isolation.

### Upload pace

Upload pace is derived from the average gap in days between analyzed publish dates. This gives a practical sense of how often the competitor is publishing in the selected mode.

### Standing out here

This metric is derived by comparing analyzed videos against the median board level for views and views per day. The wording in the UI was deliberately softened so the app does not overclaim precision.

### Score

The score is an internal weighted ranking signal. It is not an official YouTube metric.

It combines:

- views per day
- engagement rate
- total views
- recency

The purpose of the score is to help sort and compare public competitor videos, not to represent an external source of truth.

## Trend Labels

The app uses labels such as:

- Breakout
- Surging
- High engagement
- Steady

These are relative product labels, not official YouTube status labels.

They are based on the analyzed board and used to help the user scan the top-video list quickly. The labels were kept because they add scanning value, but the surrounding copy and tooltips were simplified so they remain honest and understandable.

## Content Analysis

The content-analysis section focuses on publishing and packaging patterns rather than raw performance.

It currently emphasizes:

- video length
- publish timing

This section exists to answer pattern questions such as:

- what lengths show up most often
- which lengths are performing best on average pace
- what days this channel tends to post

The format breakdown was intentionally removed from this section because it became redundant once the channel summary already communicated the Shorts split.

## Keyword Analysis

The keyword-analysis section is designed to be useful, not just visually interesting.

It focuses on:

- repeated title words
- repeated public tag words when needed as a fallback
- YouTube category mix

One important refinement was reducing tag spam. Some channels reuse the same public tag set across many uploads, which can produce misleading repeated-word charts. The logic was tightened so title words are prioritized and repeated tags only help when the title data is too sparse.

## Section-Level Controls

The main board mode is chosen at the top:

- All
- Shorts
- Long video

Lower sections follow that mode initially, but can be overridden locally when comparison is useful. That balance was chosen to preserve consistency while still letting the user explore without re-running the whole board for every small comparison.

## Export Logic

CSV export is based on the currently filtered `Top videos` list. That means it respects:

- current window
- local top-videos mode
- title search
- sort order

This behavior makes export match what the user is looking at instead of exporting an unrelated full dataset.

## Mobile and Responsive Approach

The app was built to stay usable across phone, tablet, laptop, and desktop widths.

The main responsive principles were:

- stack dense content earlier on narrow screens
- allow table overflow only where necessary
- convert cramped side-by-side blocks into vertical card layouts on mobile
- keep key controls reachable without making the dashboard feel like a different product on smaller screens

The landing page and dashboard both went through manual responsive QA on narrow mobile widths. The narrow-width home hero and mobile top-video cards were both tightened to avoid overflow and crowding.

## SEO Approach

The SEO setup is intentionally simple and honest.

- the landing page is indexable
- `/analyze` is `noindex`
- metadata is defined in the app router
- `robots.txt` and `sitemap.xml` are provided

This fits the product shape well because the marketing surface is the landing page, while the analysis workspace is user-specific and should not be indexed.

## Design Direction

The design direction aims for a compact SaaS-style research interface:

- soft glass and surface layering
- clear typography hierarchy
- compact controls
- restrained accent usage
- dashboard-first layout instead of decorative marketing sections

The visual goal was to feel product-led rather than portfolio-like.

## Tradeoffs and Limitations

Some parts of the app are heuristics by design.

Examples:

- score
- standing out logic
- trend labels
- repeated-word usefulness

These are still valid product decisions, but they are not official YouTube formulas. The app is stronger when these are presented as relative research signals instead of as universal truth.

The public YouTube API also limits what can be claimed. The app does not attempt to fake:

- retention
- watch time
- impressions
- CTR
- historical growth curves

## What I Optimized For

The build was optimized for:

- speed to understand
- clarity of analysis
- honesty about what public data can and cannot show
- a polished single-product workflow that is easy to demo

That is why the app favors a clear dashboard with a few strong sections over a larger but noisier feature set.

## Future Improvements

If this were extended beyond the current scope, the highest-value next steps would be:

- persistent historical snapshots for true trend lines over time
- stronger title-pattern clustering
- more robust category and topic grouping
- saved boards and side-by-side competitor comparison
- stronger chart interactivity with pinned comparisons

Those would improve depth, but the current version already covers the strongest public-data workflow for the intended use case.
