# LinkFinder

**Explore the web, organized.**

A curated directory of useful websites, tools and resources. Every entry links
straight to its official home, and the link state is stated honestly.

Live at **https://linkfinder.xyz**

---

## What's in it

- **206 websites** across **18 categories**, each with an original description,
  pricing model, tags and official URL
- Full-text search across names, descriptions, categories, tags and domains
- Filter by category, pricing and link state; sort A–Z
- Per-site detail pages with related sites and share links
- Bookmarks (localStorage), light/dark themes, submission form with
  duplicate-URL and protocol validation
- Admin overview with counts computed from the dataset

## Stack

Deliberately dependency-free — no build step, no framework:

| File | Purpose |
| --- | --- |
| `index.html` | Document shell, nav, footer, mobile drawer |
| `styles.css` | Design system (845 lines, documented in 10 sections) |
| `data.js` | The dataset: 18 categories, 206 entries |
| `app.js` | Hash router, search/filter logic, rendering, SEO metadata |
| `render.test.js` | Headless test harness (235 routes + interactions) |
| `load-app.js` | Test-only loader that exposes internal state |

Routing is hash-based (`/#website/figma`), so it deploys to any static host
with no server config or SPA rewrite rules.

## Local development

```bash
python -m http.server 4175
# → http://127.0.0.1:4175
```

Any static server works. Opening `index.html` via `file://` also works, but
`localStorage` is partitioned differently there.

## Tests

```bash
node render.test.js
```

Stubs a minimal DOM, then walks all 235 routes plus the interaction paths
(bookmarks, filters, sort, theme, search, submission validation, per-route
metadata) and asserts on the rendered output.

## Trust model

This distinction is the point of the project:

- **URL not checked** — no automated request has confirmed this link. This is
  the current state of every entry.
- **URL checked** — a crawler confirmed the URL resolves to the site the
  listing claims.

A check is a statement about a URL, never an endorsement or a recommendation.
No entry claims to be checked until a check has actually run, and no traffic
or popularity figures are invented.

## Deploy

Static site — Cloudflare Pages, GitHub Pages, Netlify, or any file host.

### Cloudflare Pages (dashboard)

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select `sanjaysaini1952/linkfinder`
3. Build command: *(leave empty)* · Output directory: `/`
4. Deploy, then **Custom domains** → add `linkfinder.xyz`

### Cloudflare Pages (CLI)

```bash
npm i -g wrangler
wrangler login
wrangler pages deploy . --project-name linkfinder
```

## Adding entries

Append a row to the `S` array in `data.js`:

```js
['Name', 'Category', 'Description', 'https://example.com', ['tag'], 'Free', ''],
```

The final field is an optional logo tint: `''`, `purple`, `amber`, `green`,
`blue`, `red`, `orange`. Slugs and letters are derived automatically, and
`linkStatus` is always `unchecked` — set it to `checked` only once a real
crawler has verified the URL.

## Data

Descriptions are original work, written for this project. Listed sites belong
to their respective owners; LinkFinder is an independent directory and is not
affiliated with any site in the index.
