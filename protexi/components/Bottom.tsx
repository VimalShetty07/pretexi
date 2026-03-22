'use client'
import { useState } from 'react'
import styles from './Bottom.module.css'

/* ─────────────── TESTIMONIALS ─────────────── */
const testimonials = [
  {
    quote: 'Protexi cut our compliance follow-up time dramatically. We now track everything in one place.',
    name: 'Head of HR',
    org: 'UK Healthcare Group',
    initials: 'HH',
  },
  {
    quote: 'The visa and document alerts helped us avoid last-minute risks. It\'s the safety net our team needed.',
    name: 'Compliance Manager',
    org: 'Sponsor Licence Holder',
    initials: 'CM',
  },
  {
    quote: 'The platform gives leadership clear risk visibility without operational noise.',
    name: 'COO',
    org: 'Mid-size UK Employer',
    initials: 'CO',
  },
]

export function Testimonials() {
  return (
    <section className={styles.testimonials}>
      <div className="container">
        <div className={styles.sectionTag}>What Clients Say</div>
        <h2 className={styles.sectionTitle}>Compliance teams love Protexi.</h2>

        <div className={styles.testGrid}>
          {testimonials.map((t, i) => (
            <div key={i} className={styles.testCard}>
              <div className={styles.stars}>★★★★★</div>
              <p className={styles.testQuote}>&ldquo;{t.quote}&rdquo;</p>
              <div className={styles.testAuthor}>
                <div className={styles.testAvatar}>{t.initials}</div>
                <div>
                  <div className={styles.testName}>{t.name}</div>
                  <div className={styles.testOrg}>{t.org}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────── FAQ ─────────────── */
const faqs = [
  { q: 'How long does setup take?',            a: 'Most teams are live within 48 hours. Our onboarding team handles the heavy lifting.' },
  { q: 'Is this aligned with UKVI workflows?', a: 'Yes — Protexi is designed specifically for UK sponsor compliance operations and follows UKVI guidance.' },
  { q: 'Can we upgrade later?',                a: 'Absolutely. Plans can be upgraded at any time as your team or compliance needs grow.' },
  { q: 'Is data secure?',                      a: 'Yes. We use role-based access controls, encrypted storage, and secure UK-based infrastructure.' },
  { q: 'Are premium features optional?',       a: 'Yes. Background Verification and Leave Approval are fully optional add-ons on any plan.' },
  { q: 'Do you support larger organisations?', a: 'Yes. Enterprise is built for high-scale and multi-entity teams, with custom onboarding available.' },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className={styles.faq} id="faq">
      <div className="container">
        <div className={styles.sectionTag}>FAQ</div>
        <h2 className={styles.sectionTitle}>Questions answered.</h2>

        <div className={styles.faqList}>
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`${styles.faqItem} ${open === i ? styles.faqOpen : ''}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className={styles.faqQ}>
                <span>{f.q}</span>
                <span className={styles.faqIcon}>{open === i ? '−' : '+'}</span>
              </div>
              {open === i && <p className={styles.faqA}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────── MID CTA ─────────────── */
export function MidCTA() {
  return (
    <section className={styles.midCta}>
      <div className="container">
        <div className={styles.midCtaInner}>
          <div className={styles.midCtaText}>
            <h2 className={styles.midCtaTitle}>Ready to modernize sponsor compliance?</h2>
            <p className={styles.midCtaSub}>Join hundreds of UK organisations staying audit-ready with Protexi.</p>
          </div>
          <div className={styles.midCtaBtns}>
            <a href="/book-demo" className={styles.btnWhite}>Book a Demo</a>
            <a href="#pricing"   className={styles.btnOutlineWhite}>View Pricing</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── FINAL CTA ─────────────── */
export function FinalCTA() {
  return (
    <section className={styles.finalCta}>
      <div className="container">
        <div className={styles.finalCtaWrap}>
          <p className={styles.finalEyebrow}>Start your compliance transformation today.</p>
          <h2 className={styles.finalTitle}>
            Book a personalised demo and get<br />a tailored rollout plan.
          </h2>
          <div className={styles.finalBtns}>
            <a href="/book-demo" className={styles.btnPrimary}>Book a Demo →</a>
            <a href="/login"     className={styles.btnGhost}>Sign In</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── FOOTER ─────────────── */
const footerLinks = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing',  href: '#pricing' },
      { label: 'Book Demo',href: '/book-demo' },
      { label: 'Sign In',  href: '/login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',    href: '/about' },
      { label: 'Blog',     href: '/blog' },
      { label: 'Careers',  href: '/careers' },
      { label: 'Contact',  href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use',   href: '/terms' },
      { label: 'GDPR',           href: '/gdpr' },
      { label: 'Security',       href: '/security' },
    ],
  },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>★ Protexi</div>
            <p className={styles.footerTagline}>
              UK Sponsor Compliance — built by immigration professionals,
              trusted by HR and compliance teams nationwide.
            </p>
          </div>

          {footerLinks.map(col => (
            <div key={col.heading} className={styles.footerCol}>
              <h4 className={styles.footerColHeading}>{col.heading}</h4>
              <ul className={styles.footerColLinks}>
                {col.links.map(l => (
                  <li key={l.label}><a href={l.href} className={styles.footerLink}>{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Protexi Ltd. All rights reserved.</span>
          <div className={styles.footerBadges}>
            <span className={styles.footerBadge}>🇬🇧 UK Hosted</span>
            <span className={styles.footerBadge}>🔐 GDPR Compliant</span>
            <span className={styles.footerBadge}>✅ Audit Ready</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
