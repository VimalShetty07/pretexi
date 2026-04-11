"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const TICKER_ITEMS = [
  "UK-hosted data",
  "UKVI-ready audit trail",
  "Role-based access controls",
  "Automated SMS & email alerts",
  "Real-time compliance dashboard",
  "CoS tracking & management",
  "Document checklist automation",
];

export default function MarketingLanding() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState<"hr" | "compliance" | "leadership">("hr");

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = document.querySelector(".protexi-marketing");
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { root: null, threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq((prev) => (prev === i ? null : i));
  }, []);

  const tickerDup = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="protexi-marketing">
      <nav id="nav" className={navScrolled ? "scrolled" : ""}>
        <Link href="/" className="nav-logo" aria-label="Protexi home">
          <Image src="/logo.png" alt="Protexi" width={56} height={56} className="nav-logo-img" priority />
        </Link>
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <div className="nav-cta">
          <Link href="/login" className="btn-outline">
            Sign In
          </Link>
          <Link href="/book-demo" className="btn-fill">
            Book a Demo
          </Link>
        </div>
      </nav>

      <div className="ticker">
        <div className="marquee-wrap">
          <div className="marquee-track">
            {tickerDup.map((t, i) => (
              <span key={`${t}-${i}`} className="ticker-item">
                {t}
                <span className="ticker-sep"> · </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="hero" id="home">
        <div>
          <div className="hero-badge">
            <span className="badge-dot" />
            UK Sponsor Compliance SaaS
          </div>
          <h1 className="hero-h1">
            UK Sponsor
            <br />
            <em>Compliance,</em>
            <br />
            <span className="line-accent">Simplified.</span>
          </h1>
          <p className="hero-sub">
            Stop drowning in spreadsheets and manual checklists. Protexi keeps every sponsored worker record current, every
            visa expiry tracked, and every audit ready — automatically.
          </p>
          <div className="hero-pills">
            <span className="pill">Visa expiry tracking</span>
            <span className="pill">Document automation</span>
            <span className="pill">UKVI-ready records</span>
          </div>
          <div className="hero-ctas">
            <Link href="/book-demo" className="btn-hero">
              Book a Demo →
            </Link>
            <a href="#pricing" className="btn-ghost">
              View Pricing ↓
            </a>
          </div>
        </div>
        <div>
          <div className="dashboard-card">
            <div className="dc-header">
              <span className="dc-title">Compliance Overview</span>
              <span className="dc-live">Live</span>
            </div>
            <div className="dc-metrics">
              <div className="dc-metric">
                <div className="dc-metric-val">94%</div>
                <div className="dc-metric-label">Compliant</div>
              </div>
              <div className="dc-metric">
                <div className="dc-metric-val">3</div>
                <div className="dc-metric-label">Expiring soon</div>
              </div>
              <div className="dc-metric">
                <div className="dc-metric-val">12</div>
                <div className="dc-metric-label">Actions due</div>
              </div>
            </div>
            <div className="dc-bars">
              <div>
                <div className="dc-bar-top">
                  <span className="dc-bar-label">Documents verified</span>
                  <span className="dc-bar-pct">87%</span>
                </div>
                <div className="dc-bar-track">
                  <div className="dc-bar-fill" style={{ width: "87%" }} />
                </div>
              </div>
              <div>
                <div className="dc-bar-top">
                  <span className="dc-bar-label">Visas within validity</span>
                  <span className="dc-bar-pct">94%</span>
                </div>
                <div className="dc-bar-track">
                  <div className="dc-bar-fill" style={{ width: "94%" }} />
                </div>
              </div>
              <div>
                <div className="dc-bar-top">
                  <span className="dc-bar-label">Audit readiness</span>
                  <span className="dc-bar-pct">100%</span>
                </div>
                <div className="dc-bar-track">
                  <div className="dc-bar-fill" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
            <div className="dc-alerts">
              <div className="dc-alert">
                <span className="dc-alert-dot dot-red" />
                Ahmad R. — Visa expires in 14 days
              </div>
              <div className="dc-alert">
                <span className="dc-alert-dot dot-yellow" />
                Missing: Right to Work doc — Priya S.
              </div>
              <div className="dc-alert">
                <span className="dc-alert-dot dot-green" />
                CoS assigned — Marcus T., Skilled Worker
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="trust">
        <div className="marquee-wrap">
          <div className="marquee-track trust-marquee">
            <TrustMarqueeItems />
            <TrustMarqueeItems />
          </div>
        </div>
      </div>

      <div className="number-strip">
        <div className="num-item reveal">
          <div className="num-val">100%</div>
          <div className="num-label">UK data sovereignty</div>
        </div>
        <div className="num-item reveal">
          <div className="num-val">0</div>
          <div className="num-label">Manual spreadsheets needed</div>
        </div>
        <div className="num-item reveal">
          <div className="num-val">24/7</div>
          <div className="num-label">Automated monitoring</div>
        </div>
        <div className="num-item reveal">
          <div className="num-val">48hr</div>
          <div className="num-label">Average onboarding</div>
        </div>
      </div>

      <section className="problems" id="problems">
        <div className="section-label">The Problem</div>
        <h2 className="section-h2">
          Compliance is <em>broken.</em>
          <br />
          We fixed it.
        </h2>
        <div className="problems-grid">
          <ProblemCard
            delay=""
            img="https://images.pexels.com/photos/7821684/pexels-photo-7821684.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop"
            alt="Professional reviewing compliance documents"
            label="Problem 01"
            title="Visa expiries catch you off guard"
            text="HR teams juggle expiry dates in spreadsheets, calendar reminders, and email chains — hoping nothing slips before an audit."
            solution="Protexi tracks every expiry automatically and fires alerts at 90, 60, and 30 days out."
          />
          <ProblemCard
            delay="0.1s"
            img="https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop"
            alt="Stacks of business documents, folders, and paperwork on a desk"
            label="Problem 02"
            title="Document chaos before every UKVI audit"
            text="Hunting Right to Work docs, CoS letters, and salary evidence across email threads costs your team days of avoidable work."
            solution="Checklists ensure every record is collected, stored, and one-click retrievable when UKVI arrives."
          />
          <ProblemCard
            delay="0.2s"
            img="https://images.pexels.com/photos/3861957/pexels-photo-3861957.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop"
            alt="Compliance analytics on laptop screen"
            label="Problem 03"
            title="Your sponsor licence is at risk"
            text="A single missed duty or lapsed record can trigger curtailment, a civil penalty, or suspension of your sponsor licence."
            solution="Real-time compliance score — always know where you stand and what to fix first."
          />
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="features-intro">
          <div className="section-label">Features</div>
          <h2 className="section-h2">
            Everything you need.
            <br />
            <em>Nothing you don&apos;t.</em>
          </h2>
          <p>
            Built specifically for UK Sponsor Licence holders. Every feature is designed around the UKVI compliance framework.
          </p>
        </div>
        <FeaturesGrid />
      </section>

      <div className="img-callout">
        <div className="img-callout-photo">
          <Image
            src="https://images.pexels.com/photos/3688761/pexels-photo-3688761.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop"
            alt="Diverse HR team working together"
            width={900}
            height={700}
          />
        </div>
        <div className="img-callout-text">
          <div className="section-label">Why Protexi</div>
          <h2 className="section-h2">
            Built for teams who <em>can&apos;t afford</em> to get it wrong.
          </h2>
          <p>
            UK Sponsor Licence compliance has zero tolerance for error. A single missed record or lapsed duty can cost you your
            licence, your workforce, and your business continuity.
          </p>
          <Link href="/book-demo" className="btn-accent">
            See How It Works →
          </Link>
        </div>
      </div>

      <div className="team-strip">
        <TeamImg
          src="https://images.pexels.com/photos/4344114/pexels-photo-4344114.jpeg?auto=compress&cs=tinysrgb&w=700&h=400&fit=crop"
          cap="HR Teams"
          alt="HR team in a compliance meeting"
        />
        <TeamImg
          src="https://images.pexels.com/photos/5466238/pexels-photo-5466238.jpeg?auto=compress&cs=tinysrgb&w=700&h=400&fit=crop"
          cap="Compliance Teams"
          alt="Compliance team reviewing documents"
        />
        <TeamImg
          src="https://images.pexels.com/photos/9301252/pexels-photo-9301252.jpeg?auto=compress&cs=tinysrgb&w=700&h=400&fit=crop"
          cap="Leadership"
          alt="Leadership team reviewing analytics"
        />
      </div>

      <section className="roles-section" id="use-cases">
        <div className="section-label">Use Cases</div>
        <h2 className="section-h2">
          Built for the <em>whole team.</em>
        </h2>
        <div className="roles-tabs">
          {(
            [
              { id: "hr" as const, label: "HR Teams" },
              { id: "compliance" as const, label: "Compliance Teams" },
              { id: "leadership" as const, label: "Leadership" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`role-tab ${activeRole === t.id ? "active" : ""}`}
              onClick={() => setActiveRole(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <RolePanel
          visible={activeRole === "hr"}
          bullets={[
            "Manage all sponsored worker records in one place — no more spreadsheets or folder hunts.",
            "Auto-generated document checklists mean you always know exactly what is missing per worker.",
            "Expiry alerts fire automatically, so visa renewals are handled proactively, not reactively.",
          ]}
          ctaHtml={
            <>
              HR teams cut compliance admin by <em>up to 70%.</em>
            </>
          }
          ctaLabel="See it in action →"
        />
        <RolePanel
          visible={activeRole === "compliance"}
          bullets={[
            "Real-time compliance score shows exactly where your organisation stands at any moment.",
            "UKVI-ready audit export packs everything inspectors need in one organised download.",
            "Full activity log and change history ensures your duty-of-care records are watertight.",
          ]}
          ctaHtml={
            <>
              Stay <em>inspection-ready,</em> every single day.
            </>
          }
          ctaLabel="Book a Demo →"
        />
        <RolePanel
          visible={activeRole === "leadership"}
          bullets={[
            "Executive dashboard gives leadership a live view of organisational compliance health.",
            "Proactive risk alerts mean no licence-threatening surprises ever reach the board.",
            "Understand the true cost of sponsorship with per-worker cost tracking and reporting.",
          ]}
          ctaHtml={
            <>
              Lead with <em>confidence,</em> not uncertainty.
            </>
          }
          ctaLabel="Talk to Sales →"
        />
      </section>

      <PricingSection />

      <TestimonialsSection />

      <FaqSection openFaq={openFaq} toggleFaq={toggleFaq} />

      <div className="mid-cta">
        <div className="mid-cta-text">
          <div className="mid-cta-eyebrow">Ready to fix compliance?</div>
          <h2>
            Stop reacting.
            <br />
            Start <em>protecting.</em>
          </h2>
          <p>Join sponsor licence holders across the UK who have made compliance stress-free with Protexi.</p>
          <div className="mid-cta-btns">
            <Link href="/book-demo" className="btn-wh">
              Book a Demo
            </Link>
            <a href="#pricing" className="btn-wh-outline">
              View Pricing
            </a>
          </div>
        </div>
        <div className="mid-cta-img">
          <Image
            src="https://images.pexels.com/photos/9034249/pexels-photo-9034249.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop"
            alt="Compliance team in office meeting"
            width={900}
            height={700}
          />
        </div>
      </div>

      <footer>
        <div className="footer-top">
          <div>
            <div className="footer-logo-text">Protexi</div>
            <div className="footer-tagline">
              UK Sponsor Compliance, Simplified. Built exclusively for UK Sponsor Licence holders.
            </div>
            <div className="footer-badges">
              <span className="footer-badge">UK Hosted</span>
              <span className="footer-badge">GDPR</span>
              <span className="footer-badge">UKVI Ready</span>
            </div>
          </div>
          <div className="footer-col">
            <div className="footer-col-head">Product</div>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <Link href="/book-demo">Book a Demo</Link>
              </li>
              <li>
                <Link href="/login">Sign In</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-head">Company</div>
            <ul>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <Link href="/careers">Careers</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-head">Resources</div>
            <ul>
              <li>
                <a href="#">Help Centre</a>
              </li>
              <li>
                <a href="#">Documentation</a>
              </li>
              <li>
                <a href="#">Status</a>
              </li>
              <li>
                <a href="#">Changelog</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <div className="footer-col-head">Legal</div>
            <ul>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of Use</Link>
              </li>
              <li>
                <Link href="/gdpr">GDPR</Link>
              </li>
              <li>
                <Link href="/security">Security</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© {new Date().getFullYear()} Protexi Ltd. All rights reserved.</span>
          <div className="footer-legal-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustMarqueeItems() {
  const items = [
    { icon: "star", label: "UK Data Hosting" },
    { icon: "check", label: "Audit Ready" },
    { icon: "lock", label: "Role-Based Security" },
    { icon: "clock", label: "UKVI-Ready" },
    { icon: "globe", label: "Licence Holder Trusted" },
  ];
  return (
    <>
      {items.map((t) => (
        <span key={t.label} className="trust-item">
          <span className="trust-icon" aria-hidden>
            <TrustIcon name={t.icon} />
          </span>
          {t.label}
          <span className="trust-sep"> | </span>
        </span>
      ))}
    </>
  );
}

function TrustIcon({ name }: { name: string }) {
  if (name === "star")
    return (
      <svg viewBox="0 0 14 14" fill="none">
        <path d="M7 1l1.7 4H13l-3.4 2.5 1.3 4L7 9.3 3.1 11.5l1.3-4L1 5h4.3z" fill="rgba(255,255,255,0.6)" />
      </svg>
    );
  if (name === "check")
    return (
      <svg viewBox="0 0 14 14" fill="none">
        <path d="M2 7l3.5 4L12 3" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (name === "lock")
    return (
      <svg viewBox="0 0 14 14" fill="none">
        <rect x="2" y="6" width="10" height="7" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" />
        <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" />
        <path d="M7 4v3.5l2 1.2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"
        fill="rgba(255,255,255,0.6)"
      />
    </svg>
  );
}

function ProblemCard({
  img,
  alt,
  label,
  title,
  text,
  solution,
  delay,
}: {
  img: string;
  alt: string;
  label: string;
  title: string;
  text: string;
  solution: string;
  delay: string;
}) {
  return (
    <div className="prob-card reveal" style={delay ? { transitionDelay: delay } : undefined}>
      <Image className="prob-img" src={img} alt={alt} width={600} height={300} />
      <div className="prob-body">
        <div className="prob-label">{label}</div>
        <div className="prob-title">{title}</div>
        <p className="prob-text">{text}</p>
        <div className="sol-label">{solution}</div>
      </div>
    </div>
  );
}

function FeaturesGrid() {
  const feats = [
    {
      icon: "cal",
      tag: "Core",
      title: "Visa Expiry Tracking",
      desc: "Automated alerts at 90, 60, 30, and 14 days. Never miss a renewal deadline again.",
    },
    {
      icon: "doc",
      tag: "Core",
      title: "Document Checklist Automation",
      desc: "Auto-generated per-worker checklists based on visa type and role requirements.",
    },
    {
      icon: "chart",
      tag: "Core",
      title: "Compliance Dashboard",
      desc: "Real-time compliance score across your entire sponsored workforce. Always audit-ready.",
    },
    {
      icon: "check",
      tag: "Core",
      title: "CoS Management",
      desc: "Track Certificate of Sponsorship assignments, statuses, and expiry across all workers.",
    },
    {
      icon: "lock",
      tag: "Core",
      title: "Role-Based Access",
      desc: "Granular permissions for HR, compliance, and leadership. Right data, right people.",
    },
    {
      icon: "bell",
      tag: "Core",
      title: "Smart Notifications",
      desc: "SMS and email alerts for upcoming deadlines, missing documents, and compliance gaps.",
    },
    {
      icon: "down",
      tag: "Add-on",
      title: "Audit Export Pack",
      desc: "One-click export of all worker records in UKVI-ready format for inspections.",
    },
    {
      icon: "link",
      tag: "Add-on",
      title: "HRIS Integration",
      desc: "Connect to your existing HR system. Data flows automatically — zero double entry.",
    },
  ];
  return (
    <div className="features-grid">
      {feats.map((f, i) => (
        <div key={f.title} className="feat-cell reveal" style={{ transitionDelay: `${i * 0.05}s` }}>
          <div className="feat-icon">
            <FeatSvg name={f.icon} />
          </div>
          <span className="feat-tag">{f.tag}</span>
          <div className="feat-title">{f.title}</div>
          <p className="feat-desc">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function FeatSvg({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24" as const };
  if (name === "cal")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  if (name === "doc")
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="12" y2="17" />
      </svg>
    );
  if (name === "chart")
    return (
      <svg {...common}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...common}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    );
  if (name === "lock")
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    );
  if (name === "bell")
    return (
      <svg {...common}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    );
  if (name === "down")
    return (
      <svg {...common}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TeamImg({ src, cap, alt }: { src: string; cap: string; alt: string }) {
  return (
    <div className="team-strip-img">
      <Image src={src} alt={alt} width={700} height={400} />
      <div className="team-strip-cap">{cap}</div>
    </div>
  );
}

function RolePanel({
  visible,
  bullets,
  ctaHtml,
  ctaLabel,
}: {
  visible: boolean;
  bullets: string[];
  ctaHtml: ReactNode;
  ctaLabel: string;
}) {
  if (!visible) return null;
  return (
    <div className="roles-panel active">
      <ul className="roles-bullets">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div>
        <div className="roles-cta-text">{ctaHtml}</div>
        <Link href="/book-demo" className="btn-accent">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-intro">
        <div className="section-label">Pricing</div>
        <h2 className="section-h2">
          Transparent.
          <br />
          <em>Scalable.</em> Fair.
        </h2>
        <p>Pay for what you use. Every plan includes the core compliance toolkit — scale up as your team grows.</p>
      </div>
      <div className="pricing-grid">
        <div className="price-card reveal">
          <div className="price-name">Starter</div>
          <div className="price-amount">
            £149<span className="price-mo">/mo</span>
          </div>
          <div className="price-sub">Up to 25 workers · £6 per extra worker</div>
          <div className="price-tagline">
            Perfect for growing businesses sponsoring their first international hires. Everything you need to stay compliant from day one.
          </div>
          <ul className="price-feats">
            <li>
              <span className="pf-check">✓</span> Visa expiry tracking
            </li>
            <li>
              <span className="pf-check">✓</span> Document checklists
            </li>
            <li>
              <span className="pf-check">✓</span> Email alerts
            </li>
            <li>
              <span className="pf-check">✓</span> CoS management
            </li>
            <li>
              <span className="pf-no">—</span> SMS alerts
            </li>
            <li>
              <span className="pf-no">—</span> HRIS integration
            </li>
            <li>
              <span className="pf-no">—</span> Audit export pack
            </li>
          </ul>
          <Link href="/book-demo" className="btn-price">
            Get Started
          </Link>
        </div>
        <div className="price-card highlight reveal" style={{ transitionDelay: "0.1s" }}>
          <div className="price-badge">Most Popular</div>
          <div className="price-name">Growth</div>
          <div className="price-amount">
            £349<span className="price-mo">/mo</span>
          </div>
          <div className="price-sub">Up to 100 workers · £4 per extra worker</div>
          <div className="price-tagline">
            For established businesses with an active sponsored workforce. Advanced alerts, integrations, and audit tooling included.
          </div>
          <ul className="price-feats">
            <li>
              <span className="pf-check">✓</span> Everything in Starter
            </li>
            <li>
              <span className="pf-check">✓</span> SMS + email alerts
            </li>
            <li>
              <span className="pf-check">✓</span> Role-based access
            </li>
            <li>
              <span className="pf-check">✓</span> Audit export pack
            </li>
            <li>
              <span className="pf-check">✓</span> HRIS integration
            </li>
            <li>
              <span className="pf-check">✓</span> Priority support
            </li>
          </ul>
          <Link href="/book-demo" className="btn-price">
            Book a Demo
          </Link>
        </div>
        <div className="price-card reveal" style={{ transitionDelay: "0.2s" }}>
          <div className="price-name">Enterprise</div>
          <div className="price-amount">Custom</div>
          <div className="price-sub">Unlimited workers · Volume pricing</div>
          <div className="price-tagline">
            For large organisations with complex multi-site operations and dedicated compliance teams. Bespoke setup and SLAs.
          </div>
          <ul className="price-feats">
            <li>
              <span className="pf-check">✓</span> Everything in Growth
            </li>
            <li>
              <span className="pf-check">✓</span> Custom integrations
            </li>
            <li>
              <span className="pf-check">✓</span> Dedicated CSM
            </li>
            <li>
              <span className="pf-check">✓</span> SLA guarantees
            </li>
            <li>
              <span className="pf-check">✓</span> White-label option
            </li>
            <li>
              <span className="pf-check">✓</span> Custom reporting
            </li>
          </ul>
          <Link href="/book-demo" className="btn-price">
            Talk to Sales
          </Link>
        </div>
      </div>
      <div style={{ marginTop: 36 }}>
        <div className="section-label" style={{ marginBottom: 18 }}>
          Add-ons
        </div>
        <div className="addons">
          <AddonCell label="SMS Alerts" hint="per month" price="£29" delay="" />
          <AddonCell label="Audit Export Pack" hint="UKVI-ready format" price="£49" delay="0.05s" />
          <AddonCell label="HRIS Integration" hint="Connect your HR system" price="£79" delay="0.1s" />
          <AddonCell label="Custom Reporting" hint="Advanced analytics" price="£59" delay="0.15s" />
        </div>
      </div>
    </section>
  );
}

function AddonCell({ label, hint, price, delay }: { label: string; hint: string; price: string; delay: string }) {
  return (
    <div className="addon-cell reveal" style={delay ? { transitionDelay: delay } : undefined}>
      <div>
        <div className="addon-label">{label}</div>
        <div className="addon-hint">{hint}</div>
      </div>
      <div>
        <span className="addon-price">{price}</span>
        <span className="addon-mo">/mo</span>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  const items = [
    {
      quote:
        "Before Protexi, we had three separate spreadsheets and still managed to miss a visa expiry. Now our whole team runs off one dashboard and we have not had a compliance gap since.",
      name: "Sarah B., Head of HR",
      org: "UK Logistics Group",
      initials: "SB",
    },
    {
      quote:
        "The audit export feature alone is worth every penny. UKVI visited us with 48 hours notice. We had everything ready in under 20 minutes. That has never happened before.",
      name: "David M., Compliance Manager",
      org: "Nationwide Care Provider",
      initials: "DM",
    },
    {
      quote:
        "We sponsor 60 plus workers across two sites. Protexi gives me a live compliance score every morning. I sleep better knowing our licence is not at risk from a forgotten document.",
      name: "Priya K., Operations Director",
      org: "Tech Scale-up, London",
      initials: "PK",
    },
  ];
  return (
    <section className="testimonials">
      <div className="section-label">What people say</div>
      <h2 className="section-h2 testi-h2">
        Real results from <em>real teams.</em>
      </h2>
      <div className="testi-grid">
        {items.map((t, i) => (
          <div key={t.initials} className="testi-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
            <div className="testi-bigquote">&ldquo;</div>
            <div className="testi-quote">{t.quote}</div>
            <div className="testi-person">
              <div className="testi-avatar">{t.initials}</div>
              <div>
                <div className="testi-name">{t.name}</div>
                <div className="testi-org">{t.org}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Is Protexi suitable for small businesses just starting to sponsor workers?",
    a: "Absolutely. Our Starter plan is built for businesses with up to 25 sponsored workers and is priced to be accessible from your very first CoS. You will have the same compliance rigour that large enterprises rely on, without the enterprise price tag.",
  },
  {
    q: "Where is our data hosted? Is it GDPR compliant?",
    a: "All data is hosted exclusively within the UK. Protexi is built to comply with UK GDPR requirements. We never transfer data outside UK jurisdiction, and our infrastructure meets the standards expected for sensitive HR and immigration records.",
  },
  {
    q: "How long does onboarding take?",
    a: "Most customers are fully live within 48 hours. We guide you through importing your existing worker records, setting up your team's access, and configuring alerts. For Enterprise customers, we assign a dedicated onboarding manager.",
  },
  {
    q: "Does Protexi replace our HRMS or work alongside it?",
    a: "Protexi is a compliance-first tool that complements your existing HR system. Our Growth and Enterprise plans include HRIS integration so worker data stays in sync automatically. We do not replace your HRMS — we make it compliance-aware.",
  },
  {
    q: "What happens if UKVI audits us while we are using Protexi?",
    a: "You will be ready. Protexi maintains a continuously updated audit trail for every worker. The Audit Export Pack generates a UKVI-formatted evidence pack in one click. Our customers have navigated unannounced UKVI visits with zero compliance findings.",
  },
  {
    q: "Can I cancel anytime? Are there long-term contracts?",
    a: "Starter and Growth plans are monthly with no long-term commitment. You can cancel at any time. Enterprise plans may include annual terms depending on your configuration, but these are discussed transparently before you sign anything.",
  },
];

function FaqSection({ openFaq, toggleFaq }: { openFaq: number | null; toggleFaq: (i: number) => void }) {
  return (
    <section className="faq-section" id="faq">
      <div className="faq-layout">
        <div className="faq-sidebar reveal">
          <div className="section-label">FAQ</div>
          <h2 className="section-h2 faq-sidebar-h2">
            Got <em>questions?</em>
          </h2>
          <p className="faq-sidebar-text">
            Everything you need to know about getting started with Protexi and keeping your sponsor licence safe.
          </p>
          <div className="faq-sidebar-cta">
            <Link href="/book-demo" className="btn-fill faq-cta-fill">
              Book a Demo
            </Link>
            <Link href="/contact" className="btn-outline faq-cta-outline">
              Contact Us
            </Link>
          </div>
        </div>
        <div className="faq-list reveal" style={{ transitionDelay: "0.1s" }}>
          {FAQ_ITEMS.map((f, i) => (
            <div key={f.q} className={`faq-item ${openFaq === i ? "open" : ""}`}>
              <button type="button" className="faq-q" onClick={() => toggleFaq(i)}>
                <span>{f.q}</span>
                <span className="faq-arrow">+</span>
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
