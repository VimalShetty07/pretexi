'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Nav.module.css'

const links = [
  { label: 'Features',  href: '#features' },
  { label: 'Pricing',   href: '#pricing' },
  { label: 'FAQ',       href: '#faq' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={`container ${styles.nav}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo} aria-label="Protexi home">
          <span className={styles.logoMark}>★</span>
          Protexi
        </Link>

        {/* Desktop links */}
        <ul className={styles.links}>
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} className={styles.link}>{l.label}</a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className={styles.ctaGroup}>
          <a href="/login" className={styles.signIn}>Sign In</a>
          <a href="/book-demo" className={styles.btnDemo}>Book a Demo</a>
        </div>

        {/* Hamburger */}
        <button
          className={styles.burger}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className={open ? styles.barOpen : styles.bar} />
          <span className={open ? styles.barOpen2 : styles.bar} />
          <span className={open ? styles.barOpen3 : styles.bar} />
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className={styles.drawer}>
          {links.map(l => (
            <a key={l.href} href={l.href} className={styles.drawerLink} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="/book-demo" className={styles.drawerCta} onClick={() => setOpen(false)}>Book a Demo</a>
        </div>
      )}
    </header>
  )
}
