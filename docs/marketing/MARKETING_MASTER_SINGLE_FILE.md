## Marketing Page Content Requirements (Current Live Homepage)

This document lists **exactly what data/content you need to provide** for the marketing page that is currently served at `/`.

Important: the homepage is currently rendered from:
- `src/app/page.tsx`
- `protexi/components/Nav.tsx`
- `protexi/components/Hero.tsx`
- `protexi/components/Sections.tsx`
- `protexi/components/Pricing.tsx`
- `protexi/components/Bottom.tsx`

Most content is hardcoded in those files today. This checklist tells you what should be supplied by marketing/product so the page can be kept accurate.

---

## 1) Global Brand Data

Provide:
- Brand name (current: `Protexi`)
- Brand short tagline
- Primary CTA labels (e.g. `Book a Demo`, `View Pricing`, `Sign In`)
- Primary routes:
  - `/book-demo`
  - `/login`
- Legal entity text for footer (e.g. `Protexi Ltd`, company registration text)

Optional but recommended:
- Social links (LinkedIn/X/GitHub or remove those icons)
- Public pages for footer links (`/about`, `/blog`, `/careers`, `/contact`, `/privacy`, `/terms`, `/gdpr`, `/security`)

---

## 2) Navigation Data

From `protexi/components/Nav.tsx`.

Provide:
- Nav links:
  - label
  - hash/path destination
- Desktop CTA text
- Mobile CTA text

Current keys:
- `Features` -> `#features`
- `Pricing` -> `#pricing`
- `FAQ` -> `#faq`

---

## 3) Hero Section Data

From `protexi/components/Hero.tsx`.

Provide:
- Badge text
- Headline lines (3-line hero)
- Supporting paragraph
- 3 bullet pills
- Primary CTA text + href
- Secondary CTA text + href

Also provide mock dashboard content shown in hero card:
- Card title + badge (`Live`)
- 3 KPI metrics (`label`, `value`)
- 3 progress bars (`label`, `percent`)
- 3 alert rows (`severity`, `message`)

---

## 4) Trust Strip Data

From `protexi/components/Sections.tsx` (`trustItems`).

Provide list of trust badges:
- icon/emoji (or icon id)
- label

Example labels used now:
- UK Data Hosting
- Audit Ready
- Role-Based Security
- UKVI-Ready Operations
- Trusted by Sponsor Licence Holders

---

## 5) Problem -> Solution Data

From `protexi/components/Sections.tsx` (`problems`).

Provide for each card:
- emoji/icon
- `problem` sentence
- `solution` sentence
- optional brand color token

Recommended count: 3 cards.

---

## 6) Features Grid Data

From `protexi/components/Sections.tsx` (`features`).

Provide for each feature:
- icon/emoji
- title
- short description
- tag (`Core` or `Add-on`)

Current page expects 8 features.

---

## 7) Role-Based Use Cases Data

From `protexi/components/Sections.tsx` (`roles`).

Provide per role tab:
- role name
- icon
- 3 bullet points
- CTA sentence

Current roles:
- HR Teams
- Compliance Teams
- Leadership

---

## 8) Pricing Engine Data

From `protexi/components/Pricing.tsx`.

Provide plan configuration:
- `id` (`starter`, `growth`, `enterprise`)
- `name`
- `base` monthly price
- `included` worker count
- `extra` per-worker overage
- `tagline`
- `highlight` flag

Provide add-ons:
- `id`
- `label`
- `price` monthly

Provide feature matrix rows:
- `feature`
- per-plan availability (`true`, `false`, or `"add"`)

Business rules currently used:
- Recommended plan:
  - <=25 users: Starter
  - <=100 users: Growth
  - >100 users: Enterprise
- Total = `base + overage + selected_addons`

---

## 9) Testimonials Data

From `protexi/components/Bottom.tsx` (`testimonials`).

Provide for each testimonial:
- quote
- person title/name
- organisation
- initials/avatar text

Current count: 3 testimonials.

---

## 10) FAQ Data

From `protexi/components/Bottom.tsx` (`faqs`).

Provide list of:
- question
- answer

Current count: 6 FAQs.

---

## 11) Mid CTA + Final CTA Data

From `protexi/components/Bottom.tsx`.

Provide:
- Mid CTA title + subtitle
- Mid CTA primary/secondary button labels + href
- Final CTA eyebrow
- Final CTA title (can be multiline)
- Final CTA primary/secondary button labels + href

---

## 12) Footer Data

From `protexi/components/Bottom.tsx`.

Provide:
- Footer brand line
- Footer tagline
- Footer columns:
  - heading
  - links (`label`, `href`)
- Footer compliance badges
- Copyright text

---

## 13) Assets You Must Supply

For the current homepage style, provide:
- Logo variants (light and dark)
- Favicon/app icon
- Optional customer logos for trust strip (if replacing emojis)
- Optional real dashboard screenshot (if replacing synthetic card visuals)

Suggested formats:
- SVG for logos/icons
- WebP/PNG for screenshots/illustrations

---

## 14) Optional SEO/Metadata Inputs (Recommended)

If you want better indexing and ad landing quality, also provide:
- Page title
- Meta description
- Open Graph image
- Canonical URL
- Target keywords

---

## 15) Suggested Content JSON Shape

If you want this page to be fully data-driven later, this is a practical structure:

```json
{
  "brand": {
    "name": "Protexi",
    "tagline": "UK Sponsor Compliance, Simplified"
  },
  "nav": {
    "links": [
      { "label": "Features", "href": "#features" },
      { "label": "Pricing", "href": "#pricing" },
      { "label": "FAQ", "href": "#faq" }
    ],
    "primaryCta": { "label": "Book a Demo", "href": "/book-demo" },
    "secondaryCta": { "label": "Sign In", "href": "/login" }
  },
  "hero": {
    "badge": "UK Sponsor Compliance SaaS",
    "headline": ["UK Sponsor", "Compliance,", "Simplified."],
    "subtext": "Keep every sponsored worker record current...",
    "pills": [
      "Visa expiry tracking",
      "Document checklist automation",
      "UKVI-ready audit records"
    ]
  },
  "pricing": {
    "plans": [],
    "addons": [],
    "matrix": []
  },
  "faq": [],
  "footer": {
    "columns": []
  }
}
```

---

## 16) Quick Action for Your Team

To keep the currently served page accurate, gather and finalize:
- Pricing + add-on amounts
- Final copy for Hero, Features, Use Cases
- Verified FAQ/legal statements
- Footer legal/company info + real links
- Testimonials with approval to publish

Once you provide this data, the page can be updated section-by-section in under 1 sprint.
