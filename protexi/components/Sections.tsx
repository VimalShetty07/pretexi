'use client'
import styles from './Sections.module.css'
import { useState } from 'react'

/* ───────────────────────── TRUST STRIP ───────────────────────── */
const trustItems = [
  { icon: '🇬🇧', label: 'UK Data Hosting' },
  { icon: '🛡️', label: 'Audit Ready' },
  { icon: '🔐', label: 'Role-Based Security' },
  { icon: '✅', label: 'UKVI-Ready Operations' },
  { icon: '⚡', label: 'Trusted by Sponsor Licence Holders' },
]

export function TrustStrip() {
  return (
    <div className={styles.trust}>
      <div className={`container ${styles.trustInner}`}>
        {trustItems.map(t => (
          <div key={t.label} className={styles.trustItem}>
            <span className={styles.trustIcon}>{t.icon}</span>
            <span className={styles.trustLabel}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────── PROBLEM → SOLUTION ─────────────────── */
const problems = [
  {
    emoji: '😰',
    problem: 'Deadlines are missed across teams.',
    solution: 'Automated reminders and a compliance calendar with clear ownership.',
    color: '#fef9c3',
    border: '#fde047',
  },
  {
    emoji: '📁',
    problem: 'Document follow-ups are manual and inconsistent.',
    solution: 'Structured checklist workflows with full status tracking.',
    color: '#fce7f3',
    border: '#f9a8d4',
  },
  {
    emoji: '🚨',
    problem: 'Audit preparation is stressful and reactive.',
    solution: 'Real-time dashboards and exportable evidence trails — always ready.',
    color: '#dbeafe',
    border: '#93c5fd',
  },
]

export function ProblemSolution() {
  return (
    <section className={styles.ps}>
      <div className="container">
        <div className={styles.sectionTag}>The Problem</div>
        <h2 className={styles.sectionTitle}>
          Sound familiar?
        </h2>
        <p className={styles.sectionSub}>
          Most sponsor licence holders are one audit away from a serious headache.
          Protexi fixes the root causes.
        </p>

        <div className={styles.psGrid}>
          {problems.map((p, i) => (
            <div key={i} className={styles.psCard}
              style={{ '--card-bg': p.color, '--card-border': p.border } as React.CSSProperties}
            >
              <div className={styles.psEmoji}>{p.emoji}</div>
              <div className={styles.psProblem}>
                <span className={styles.psBadge}>Problem</span>
                <p>{p.problem}</p>
              </div>
              <div className={styles.psArrow}>→</div>
              <div className={styles.psSolution}>
                <span className={styles.psBadgeSolution}>Solution</span>
                <p>{p.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── FEATURES ───────────────────────── */
const features = [
  {
    icon: '📅',
    title: 'Visa Expiry Tracking',
    desc: 'Alerts at 90 / 60 / 30 / 7 days. Risk visibility by employee and team.',
    tag: 'Core',
  },
  {
    icon: '🔍',
    title: 'Background Verification',
    desc: 'Reference status tracking, reviewer actions and a full audit history.',
    tag: 'Add-on',
  },
  {
    icon: '📋',
    title: 'Document Checklist Automation',
    desc: 'Upload/re-upload lifecycle with verify/reject workflows and status tracking.',
    tag: 'Core',
  },
  {
    icon: '🔔',
    title: 'Smart Alerts & Escalation',
    desc: 'Action-focused reminders and escalation paths for overdue compliance items.',
    tag: 'Core',
  },
  {
    icon: '📊',
    title: 'CoS Planning Insights',
    desc: 'Allocation usage visibility and forward planning signals for HR leads.',
    tag: 'Core',
  },
  {
    icon: '🗓️',
    title: 'Compliance Calendar',
    desc: 'Holiday, leave, and visa milestones with date-level detail summaries.',
    tag: 'Core',
  },
  {
    icon: '✈️',
    title: 'Leave Approval Workflow',
    desc: 'Employee leave requests with HR/Admin approve and reject actions.',
    tag: 'Add-on',
  },
  {
    icon: '👤',
    title: 'Employee Portal',
    desc: 'Personal dashboard, document uploads, and profile management for each worker.',
    tag: 'Core',
  },
]

export function Features() {
  return (
    <section className={styles.features} id="features">
      <div className="container">
        <div className={styles.sectionTag}>Platform Modules</div>
        <h2 className={styles.sectionTitle}>
          Everything you need.<br />Nothing you don&apos;t.
        </h2>
        <p className={styles.sectionSub}>
          Eight purpose-built modules that cover every dimension of UK sponsor compliance.
        </p>

        <div className={styles.featGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featCard}>
              <div className={styles.featIcon}>{f.icon}</div>
              <div className={styles.featTag}
                style={{ background: f.tag === 'Add-on' ? '#fef9c3' : 'var(--blue-ghost)',
                          color: f.tag === 'Add-on' ? '#92400e' : 'var(--blue)' }}>
                {f.tag}
              </div>
              <h3 className={styles.featTitle}>{f.title}</h3>
              <p className={styles.featDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── USE CASES ───────────────────────── */
const roles = [
  {
    role: 'HR Teams',
    icon: '👥',
    points: ['Manage sponsored workers, documents, and deadlines', 'Run leave workflows end-to-end', 'Get notified before visa renewals become urgent'],
  },
  {
    role: 'Compliance Teams',
    icon: '⚖️',
    points: ['Track risk across the entire sponsored workforce', 'Build exportable evidence trails for audits', 'Stay ahead of UKVI reporting duties'],
  },
  {
    role: 'Leadership',
    icon: '📈',
    points: ['Org-level compliance health dashboard', 'Spot trends and risk patterns early', 'Demonstrate posture without operational noise'],
  },
]

export function UseCases() {
  const [active, setActive] = useState(0)

  return (
    <section className={styles.usecases}>
      <div className="container">
        <div className={styles.sectionTag}>Who It&apos;s For</div>
        <h2 className={styles.sectionTitle}>Built for your role.</h2>
        <p className={styles.sectionSub}>Switch between roles to see how Protexi fits your day-to-day.</p>

        <div className={styles.roleTabs}>
          {roles.map((r, i) => (
            <button key={i}
              className={`${styles.roleTab} ${active === i ? styles.roleTabActive : ''}`}
              onClick={() => setActive(i)}
            >
              <span>{r.icon}</span> {r.role}
            </button>
          ))}
        </div>

        <div className={styles.rolePanel}>
          <h3 className={styles.rolePanelTitle}>{roles[active].icon} {roles[active].role}</h3>
          <ul className={styles.rolePoints}>
            {roles[active].points.map((pt, i) => (
              <li key={i} className={styles.rolePoint}>
                <span className={styles.roleCheck}>✓</span>
                {pt}
              </li>
            ))}
          </ul>
          <a href="/book-demo" className={styles.roleCta}>
            See how it works for {roles[active].role} →
          </a>
        </div>
      </div>
    </section>
  )
}
