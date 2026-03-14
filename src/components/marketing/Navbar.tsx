"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4">
      <div
        className={`relative max-w-7xl mx-auto rounded-2xl transition-all duration-500 ${
          scrolled
            ? "bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
            : "bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_10px_30px_rgba(22,87,173,0.1)]"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto max-w-7xl h-16 rounded-2xl bg-gradient-to-r from-blue-200/30 via-blue-300/20 to-blue-200/30 blur-2xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <a href="#" className="flex items-center">
            <div className="relative w-32 h-9 sm:w-36 sm:h-10 rounded-xl bg-white/70 ring-1 ring-blue-100/80 px-2">
              <Image src="/logo.png" alt="Protexi" fill className="object-contain" priority />
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1.5 bg-white/55 ring-1 ring-white/80 rounded-xl px-2 py-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:text-[#1657ad] rounded-lg hover:bg-white/80 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:text-[#1657ad] rounded-lg hover:bg-white/70 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/book-demo"
              className="text-sm py-2.5 px-5 rounded-xl font-bold text-white inline-flex items-center gap-2 bg-gradient-to-r from-[#1657ad] via-blue-600 to-blue-800 shadow-[0_10px_24px_rgba(22,87,173,0.35)] hover:shadow-[0_14px_30px_rgba(22,87,173,0.45)] transition-all"
            >
              Book a Demo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <button
            className="md:hidden p-2.5 text-slate-700 bg-white/70 ring-1 ring-white/80 rounded-xl"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-1 mx-2 mb-2 rounded-xl bg-white/80 backdrop-blur-xl border border-white/85 shadow-[0_12px_30px_rgba(15,23,42,0.12)] px-4 pb-4">
            <nav className="flex flex-col gap-1 mt-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-[#1657ad] rounded-lg hover:bg-white transition-all"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/book-demo"
                onClick={() => setMobileOpen(false)}
                className="text-sm mt-3 justify-center rounded-xl font-bold text-white inline-flex items-center gap-2 bg-gradient-to-r from-[#1657ad] via-blue-600 to-blue-800 px-5 py-2.5 shadow-[0_10px_24px_rgba(22,87,173,0.35)]"
              >
                Book a Demo
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
