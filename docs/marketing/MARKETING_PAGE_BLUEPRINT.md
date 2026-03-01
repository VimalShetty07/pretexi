# Protexi Marketing Page Blueprint

## Goal
Build a high-converting marketing website for Protexi that clearly communicates value, segments pricing by plan, and shows feature access by plan.

This document explains **what to build**, **how to structure it**, and **when to launch each part**.

## Audience
- HR teams sponsoring international workers
- Compliance managers
- Operations leaders in UK sponsor-licensed companies

## Core Value Message
"Protexi helps UK sponsors stay audit-ready with less manual effort."

## Information Architecture (Recommended Sections)
1. Hero
2. Trust strip (logos / social proof)
3. Problem -> Solution
4. Feature highlights
5. Pricing plans + feature matrix
6. Use cases by role (HR, Compliance, Leadership)
7. Testimonials / case studies
8. FAQ
9. Final CTA

## Page Routes (Recommended)
- `/` -> Main marketing homepage
- `/pricing` -> Detailed plans and features
- `/features` -> Full feature breakdown
- `/contact` or `/book-demo` -> Lead capture

## Section-by-Section Requirements

### 1) Hero
Must include:
- Clear headline: "UK Sponsor Compliance, Simplified"
- 1-line subheadline with outcome
- Primary CTA: `Book a Demo`
- Secondary CTA: `View Pricing`
- Product screenshot or visual

### 2) Trust Strip
Show:
- "Trusted by UK sponsor licence holders"
- Optional: client logos, compliance badges, review snippets

### 3) Problem -> Solution
3 cards:
- Missing deadlines
- Manual document checks
- Audit stress

Each card maps to how Protexi solves it.

### 4) Features
At least 6 feature cards:
- Visa expiry tracking
- Background verification workflows
- Document checklist automation
- Alerts and notifications
- CoS planning insights
- Calendar for compliance events

### 5) Pricing (Most Important)
Plans to show:
- Starter
- Growth
- Enterprise

Each plan should include:
- Price / month
- Suitable team size
- Included modules
- CTA button

Add feature matrix to compare what is included per plan.

### 6) Role-based Use Cases
Tabs/cards:
- HR Teams
- Compliance Teams
- Leadership

### 7) Testimonials
Add 2-3 realistic testimonials or placeholders.

### 8) FAQ
6-8 questions around:
- setup time
- data security
- UKVI readiness
- plan upgrades

### 9) Final CTA
Repeat strong CTA:
- Book Demo
- Start Free Trial (if applicable)

## Design Direction
- Keep brand color foundation around `#1657ad`
- Use lighter neutrals for readability (`#f8fafc`, `#e2e8f0`, `#0f172a`)
- Use large whitespace and clear typography
- Avoid overusing heavy gradients
- Focus on conversion-first layout

## UX Rules
- Keep nav simple: Home, Features, Pricing, FAQ, Contact
- Sticky header with CTA button
- Pricing cards should be easy to compare
- Always keep a visible conversion action above and below fold

## Conversion Events to Track
- Click Book Demo
- Click View Pricing
- Submit contact form
- Plan selection clicks

## MVP vs Phase 2
### MVP (Week 1)
- Hero
- Features
- Pricing cards
- FAQ
- Contact CTA

### Phase 2 (Week 2)
- Full feature matrix
- Testimonials
- Case studies
- Analytics events

## Technical Fit (Current Project)
- Framework: Next.js App Router
- Styling: current project Tailwind/CSS utilities
- Recommended location:
  - `src/app/(marketing)/page.tsx`
  - `src/app/(marketing)/pricing/page.tsx`
  - shared components in `src/components/marketing/*`

