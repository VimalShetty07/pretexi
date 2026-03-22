'use client'
import { useState, useMemo } from 'react'
import styles from './Pricing.module.css'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    base: 99,
    included: 25,
    extra: 2,
    tagline: 'Perfect for small HR teams',
    color: '#f8fafc',
    border: '#e2e8f0',
  },
  {
    id: 'growth',
    name: 'Growth',
    base: 249,
    included: 100,
    extra: 1.5,
    tagline: 'Best for growing organisations',
    color: 'var(--blue)',
    border: 'var(--blue)',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    base: 599,
    included: Infinity,
    extra: 0,
    tagline: 'Large & multi-entity teams',
    color: '#0f172a',
    border: '#0f172a',
  },
]

const ADDONS = [
  { id: 'bgv', label: 'Background Verification', price: 49 },
  { id: 'leave', label: 'Leave Approval Workflow', price: 29 },
]

const MATRIX_ROWS = [
  { feature: 'Visa Expiry Tracking',         starter: true,  growth: true,  enterprise: true  },
  { feature: 'Document Checklist Automation', starter: true,  growth: true,  enterprise: true  },
  { feature: 'Smart Alerts',                  starter: true,  growth: true,  enterprise: true  },
  { feature: 'Compliance Calendar',           starter: true,  growth: true,  enterprise: true  },
  { feature: 'CoS Planning Insights',         starter: false, growth: true,  enterprise: true  },
  { feature: 'Employee Portal',               starter: false, growth: true,  enterprise: true  },
  { feature: 'Background Verification',       starter: false, growth: 'add', enterprise: 'add' },
  { feature: 'Leave Approval Workflow',        starter: false, growth: 'add', enterprise: 'add' },
  { feature: 'Custom Onboarding',             starter: false, growth: false, enterprise: true  },
  { feature: 'Dedicated Account Manager',     starter: false, growth: false, enterprise: true  },
]

function getRecommended(users: number) {
  if (users <= 25)  return 'starter'
  if (users <= 100) return 'growth'
  return 'enterprise'
}

function calcTotal(plan: typeof PLANS[0], users: number, addons: string[]) {
  const extra = plan.included === Infinity ? 0 : Math.max(0, users - plan.included) * plan.extra
  const addonTotal = ADDONS.filter(a => addons.includes(a.id)).reduce((s, a) => s + a.price, 0)
  return plan.base + extra + addonTotal
}

export default function Pricing() {
  const [users, setUsers]   = useState(40)
  const [addons, setAddons] = useState<string[]>([])

  const recommended = useMemo(() => getRecommended(users), [users])

  const toggleAddon = (id: string) =>
    setAddons(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])

  return (
    <section className={styles.pricing} id="pricing">
      <div className="container">
        <div className={styles.sectionTag}>Pricing</div>
        <h2 className={styles.sectionTitle}>Transparent pricing.<br />No surprises.</h2>
        <p className={styles.sectionSub}>All plans include core compliance tools. Scale as your team grows.</p>

        {/* ── ESTIMATOR ── */}
        <div className={styles.estimator}>
          <div className={styles.estimatorHeader}>
            <h3 className={styles.estimatorTitle}>💡 Estimate your monthly cost</h3>
            <span className={styles.estimatorNote}>Adjust below — prices update live across all plans</span>
          </div>

          <div className={styles.estimatorControls}>
            {/* User count */}
            <div className={styles.control}>
              <label className={styles.controlLabel}>Sponsored workers</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min={1} max={300}
                  value={users}
                  onChange={e => setUsers(Number(e.target.value))}
                  className={styles.slider}
                />
                <div className={styles.sliderVal}>{users} workers</div>
              </div>
            </div>

            {/* Add-ons */}
            <div className={styles.control}>
              <label className={styles.controlLabel}>Optional add-ons</label>
              <div className={styles.checkboxGroup}>
                {ADDONS.map(a => (
                  <label key={a.id} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={addons.includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                    />
                    <span className={styles.checkboxBox} />
                    <span>{a.label} <strong>+£{a.price}/mo</strong></span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── PLAN CARDS ── */}
        <div className={styles.planGrid}>
          {PLANS.map(plan => {
            const total   = calcTotal(plan, users, addons)
            const isRec   = plan.id === recommended
            const isDark  = plan.id === 'enterprise'
            const isBlue  = plan.id === 'growth'

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${isBlue ? styles.planCardBlue : ''} ${isDark ? styles.planCardDark : ''}`}
              >
                {isRec && <div className={styles.recBadge}>✦ Recommended for you</div>}

                <div className={styles.planTop}>
                  <span className={styles.planName}>{plan.name}</span>
                  <p className={styles.planTagline}>{plan.tagline}</p>
                </div>

                <div className={styles.planPrice}>
                  <span className={styles.planCurrency}>£</span>
                  <span className={styles.planAmount}>{total}</span>
                  <span className={styles.planPer}>/month</span>
                </div>

                {plan.included !== Infinity ? (
                  <p className={styles.planMeta}>
                    Includes {plan.included} workers · £{plan.extra}/extra worker
                  </p>
                ) : (
                  <p className={styles.planMeta}>Unlimited workers included</p>
                )}

                <a
                  href="/book-demo"
                  className={`${styles.planCta} ${isBlue || isDark ? styles.planCtaLight : ''}`}
                >
                  Get started with {plan.name}
                </a>
              </div>
            )
          })}
        </div>

        {/* ── FEATURE MATRIX ── */}
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.matrixFeatureCol}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} className={`${styles.matrixPlanCol} ${p.id === 'growth' ? styles.matrixHighlight : ''}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? styles.matrixEven : ''}>
                  <td className={styles.matrixFeature}>{row.feature}</td>
                  {(['starter', 'growth', 'enterprise'] as const).map(col => (
                    <td key={col} className={`${styles.matrixCell} ${col === 'growth' ? styles.matrixHighlight : ''}`}>
                      {row[col] === true   && <span className={styles.matrixYes}>✓</span>}
                      {row[col] === false  && <span className={styles.matrixNo}>–</span>}
                      {row[col] === 'add'  && <span className={styles.matrixAdd}>Add-on</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
