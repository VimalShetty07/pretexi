import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background mesh */}
      <div className={styles.mesh} aria-hidden />

      <div className={`container ${styles.inner}`}>
        {/* Left: copy */}
        <div className={styles.copy}>
          <div className={`${styles.badge} anim-fade-up`}>
            <span className={styles.badgeDot} />
            UK Sponsor Compliance SaaS
          </div>

          <h1 className={`${styles.headline} anim-fade-up delay-1`}>
            UK Sponsor<br />
            Compliance,{' '}
            <span className={styles.accent}>Simplified.</span>
          </h1>

          <p className={`${styles.sub} anim-fade-up delay-2`}>
            Keep every sponsored worker record current, catch visa and document
            deadlines early, and stay audit-ready — without spreadsheet chaos.
          </p>

          {/* Bullet pills */}
          <ul className={`${styles.pills} anim-fade-up delay-3`}>
            {[
              '✓  Visa expiry tracking',
              '✓  Document checklist automation',
              '✓  UKVI-ready audit records',
            ].map(p => (
              <li key={p} className={styles.pill}>{p}</li>
            ))}
          </ul>

          <div className={`${styles.ctaRow} anim-fade-up delay-4`}>
            <a href="/book-demo" className={styles.btnPrimary}>Book a Demo →</a>
            <a href="#pricing"   className={styles.btnGhost}>View Pricing</a>
          </div>
        </div>

        {/* Right: floating UI card */}
        <div className={`${styles.visual} anim-scale-in delay-2`}>
          <DashCard />
        </div>
      </div>
    </section>
  )
}

function DashCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Compliance Overview</span>
        <span className={styles.cardBadgeGreen}>Live</span>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        {[
          { label: 'Sponsored Workers', val: '142' },
          { label: 'Compliance Rate',   val: '98%' },
          { label: 'Open Actions',      val: '3'   },
        ].map(k => (
          <div key={k.label} className={styles.kpi}>
            <span className={styles.kpiVal}>{k.val}</span>
            <span className={styles.kpiLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      {[
        { label: 'Docs Complete',   pct: 91 },
        { label: 'Visas Current',   pct: 97 },
        { label: 'BG Checks Done',  pct: 84 },
      ].map(b => (
        <div key={b.label} className={styles.barWrap}>
          <div className={styles.barMeta}>
            <span>{b.label}</span>
            <span>{b.pct}%</span>
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${b.pct}%` }} />
          </div>
        </div>
      ))}

      {/* Alert rows */}
      <div className={styles.alerts}>
        <div className={styles.alert}>
          <span className={styles.alertAmber}>⚠</span>
          <span>Priya Sharma — visa expiring in <strong>28d</strong></span>
        </div>
        <div className={styles.alert}>
          <span className={styles.alertAmber}>⚠</span>
          <span>Tomasz W. — CoS renewal due <strong>Apr 12</strong></span>
        </div>
        <div className={styles.alert}>
          <span className={styles.alertGreen}>✓</span>
          <span>Ahmed Al-Rashid — all docs verified</span>
        </div>
      </div>
    </div>
  )
}
