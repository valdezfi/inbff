"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4 10h10.2M10.4 5.6 15.2 10l-4.8 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Logo() {
  return (
    <a href="#" aria-label="Referly" className="logo" style={{ display: "inline-block", lineHeight: 0 }}>
      <svg
        viewBox="0 0 42 34"
        aria-hidden="true"
        style={{ width: "clamp(30px, 3.2vw, 38px)", fill: "currentColor", color: "#0a0a0a" }}
      >
        <polygon className="logo-p logo-p1" points="12,0 30,0 33.2,3.2 15.2,3.2" />
        <polygon className="logo-p logo-p2" points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
        <polygon className="logo-p logo-p3" points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
        <polygon className="logo-p logo-p4" points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
        <polygon className="logo-p logo-p5" points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
        <polygon className="logo-p logo-p6" points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
      </svg>
    </a>
  );
}

export default function LandingHero({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  function toggleMenu() {
    setMenuOpen(o => !o);
  }

  const navLinks = [
    { label: "Platform", href: "#" },
    { label: "How it Works", href: "#" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Pricing", href: "#" },
  ];

  return (
    <>
      <style>{`
        :root {
          --blue: #006cd2;
          --blue-dark: #0053a3;
          --pad-x: clamp(20px, 3.52vw, 64px);
          --nav-top: clamp(16px, 2.05vw, 28px);
        }
        html.landing-page, html.landing-page body {
          height: 100%;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        @media (max-width: 820px) {
          html.landing-page, html.landing-page body {
            overflow: auto;
          }
        }
        .lp-page {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: var(--nav-top) var(--pad-x) clamp(28px, 4.9vw, 48px);
          box-sizing: border-box;
          font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #0a0a0a;
          background: #fff;
        }
        .lp-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: #ffffff;
          pointer-events: none;
          overflow: hidden;
        }
        .lp-bg video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        /* nav */
        .lp-nav {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
        }
        .lp-nav__links {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: clamp(22px, 2.6vw, 32px);
          justify-self: start;
          padding: 24px 34px;
          background: rgba(0,0,0,0.13);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 0;
        }
        .lp-nav__links a {
          font-size: clamp(13px, 1.37vw, 15px);
          font-weight: 500;
          letter-spacing: -0.01em;
          color: #0a0a0a;
          line-height: 1;
          white-space: nowrap;
          padding-bottom: 2px;
          text-decoration: none;
          position: relative;
          transition: color 0.22s cubic-bezier(0.16,1,0.3,1), transform 0.22s cubic-bezier(0.16,1,0.3,1);
          display: inline-block;
        }
        .lp-nav__links a::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 0;
          width: 100%;
          height: 3px;
          background: #006cd2;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.28s cubic-bezier(0.16,1,0.3,1);
        }
        .lp-nav__links a:hover { color: #006cd2; transform: translateY(-2px); }
        .lp-nav__links a:hover::after { transform: scaleX(1); }
        .lp-logo-wrap { justify-self: center; }
        .lp-logo-wrap svg { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); }
        .lp-logo-wrap:hover svg { transform: scale(1.1); }
        .logo-p { transform-box: fill-box; transform-origin: left center; }
        .logo-p1 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.04s backwards; }
        .logo-p2 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.09s backwards; }
        .logo-p3 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.14s backwards; }
        .logo-p4 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.19s backwards; }
        .logo-p5 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.24s backwards; }
        .logo-p6 { animation: mark-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s backwards; }
        @keyframes mark-in {
          from { opacity: 0; transform: translate3d(-12px, 8px, 0); }
          to   { opacity: 1; transform: translate3d(0,0,0); }
        }
        /* buttons */
        .lp-btn {
          display: inline-flex;
          align-items: center;
          height: 58px;
          border-radius: 0;
          padding: 12px 10px 12px 22px;
          gap: 18px;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -0.015em;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
          border: none;
          font-family: inherit;
          position: relative;
          overflow: hidden;
          text-decoration: none;
        }
        .lp-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
          z-index: 0;
        }
        .lp-btn:hover::before { transform: scaleX(1); }
        .lp-btn__label, .lp-btn__icon { position: relative; z-index: 1; }
        .lp-btn__icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        /* nav button */
        .lp-btn--nav {
          background: #006cd2;
          color: #fff;
          justify-self: end;
        }
        .lp-btn--nav::before { background: #004a96; }
        .lp-btn--nav .lp-btn__icon { background: #0053a3; color: #fff; }
        .lp-btn--nav:hover .lp-btn__icon { background: #fff; color: #006cd2; }
        /* light button */
        .lp-btn--light {
          background: #ffffff;
          color: #006cd2;
        }
        .lp-btn--light::before { background: #e8f2fb; }
        .lp-btn--light .lp-btn__icon { background: #006cd2; color: #fff; }
        .lp-btn--light:hover .lp-btn__icon { background: #006cd2; color: #fff; }
        /* ghost button */
        .lp-btn--ghost {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          color: #0a0a0a;
          padding: 12px 26px;
          gap: 0;
        }
        .lp-btn--ghost::before { background: rgba(255,255,255,0.78); z-index: 0; }
        /* nav btn entrance */
        .lp-btn--nav { animation: wipe-right 0.65s cubic-bezier(0.16,1,0.3,1) 0.16s backwards; }
        @keyframes wipe-right {
          from { clip-path: inset(0 0 0 100%); }
          to   { clip-path: inset(0 0 0 0); }
        }
        /* burger */
        .lp-burger {
          display: none;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          justify-self: end;
          animation: link-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.16s backwards;
        }
        .lp-burger span {
          display: block;
          height: 1.5px;
          background: #0a0a0a;
          transition: width 0.22s, background 0.22s, transform 0.22s;
        }
        .lp-burger span:nth-child(1), .lp-burger span:nth-child(3) { width: 18px; }
        .lp-burger span:nth-child(2) { width: 18px; }
        .lp-burger:hover span { background: #006cd2; }
        .lp-burger:hover span:nth-child(1), .lp-burger:hover span:nth-child(3) { width: 14px; }
        /* mobile menu */
        .lp-mobile-menu {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          padding: 1.25rem 0 0.5rem;
        }
        .lp-mobile-menu a {
          font-size: 1.05rem;
          font-weight: 500;
          color: #0a0a0a;
          text-decoration: none;
          padding: 16px 20px;
          background: rgba(0,0,0,0.13);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        /* hero */
        .lp-hero {
          position: relative;
          z-index: 1;
          margin-top: clamp(52px, 10.15vh, 92px);
        }
        /* badge */
        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: clamp(34px, 3.6vw, 42px);
          padding: 0 18px 0 14px;
          background: rgba(255,255,255,0.28);
          border: 1px solid rgba(0,108,210,0.2);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          color: #1a1a1a;
          font-size: clamp(13px, 1.35vw, 15px);
          font-weight: 500;
          letter-spacing: -0.01em;
          animation: wipe-left 0.7s cubic-bezier(0.16,1,0.3,1) 0.18s backwards;
        }
        .lp-badge__dot {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          background: #fff;
          border: 2px solid #006cd2;
        }
        @keyframes wipe-left {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
        /* headline */
        .lp-headline {
          font-size: calc(clamp(2.9rem, 5.9vw, 5rem) + 3px);
          font-weight: 600;
          line-height: 1.18;
          letter-spacing: -0.038em;
          margin-top: clamp(22px, 2.8vw, 36px);
          margin-bottom: 0;
        }
        .lp-headline__mask {
          display: block;
          overflow: hidden;
        }
        .lp-headline__rise {
          display: block;
          animation: type-rise 0.85s cubic-bezier(0.16,1,0.3,1) var(--d, 0s) backwards;
        }
        @keyframes type-rise {
          from { transform: translate3d(0, 118%, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        .lp-headline__line1 { color: #0a0a0a; }
        .lp-headline__muted { color: #6b7378; font-weight: 600; }
        .lp-headline__accent {
          color: #6b7378;
          position: relative;
        }
        .lp-headline__accent::before,
        .lp-headline__accent::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-size: 0% 100%;
          mask-size: 0% 100%;
          -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 calc(100% - 72px), transparent 100%);
          mask-image: linear-gradient(90deg, #000 0%, #000 calc(100% - 72px), transparent 100%);
          animation: accent-fill 1.05s cubic-bezier(0.4,0,0.2,1) backwards;
        }
        .lp-headline__accent::before {
          color: #7eb6ee;
          animation-delay: 0.7s;
        }
        .lp-headline__accent::after {
          color: #006cd2;
          animation-delay: 1.08s;
        }
        @keyframes accent-fill {
          from { -webkit-mask-size: 0% 100%; mask-size: 0% 100%; }
          to   { -webkit-mask-size: calc(100% + 72px) 100%; mask-size: calc(100% + 72px) 100%; }
        }
        /* actions */
        .lp-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: clamp(28px, 3.4vw, 42px);
          flex-wrap: wrap;
        }
        .lp-actions .lp-btn--light  { animation: wipe-left 0.7s cubic-bezier(0.16,1,0.3,1) 0.56s backwards; }
        .lp-actions .lp-btn--ghost  { animation: wipe-left 0.7s cubic-bezier(0.16,1,0.3,1) 0.66s backwards; }
        /* lede */
        .lp-lede {
          position: relative;
          z-index: 1;
          margin-top: auto;
          max-width: 700px;
          overflow: hidden;
          color: #ffffff;
          font-size: clamp(17px, 1.8vw, 20px);
          font-weight: 300;
          line-height: 1.5;
          letter-spacing: -0.01em;
        }
        .lp-lede__rise {
          display: block;
          animation: type-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.78s backwards;
        }
        /* link-in */
        @keyframes link-in {
          from { opacity: 0; transform: translate3d(-16px, 0, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .lp-link-p { animation: link-in 0.55s cubic-bezier(0.16,1,0.3,1) var(--ld, 0s) backwards; }
        /* reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .logo-p1,.logo-p2,.logo-p3,.logo-p4,.logo-p5,.logo-p6,
          .lp-badge,.lp-btn--nav,.lp-burger,
          .lp-headline__rise,.lp-lede__rise,
          .lp-actions .lp-btn--light,.lp-actions .lp-btn--ghost,
          .lp-link-p {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            clip-path: none !important;
          }
          .lp-headline__accent { color: #006cd2; }
          .lp-headline__accent::before, .lp-headline__accent::after { content: none; }
        }
        /* responsive */
        @media (max-width: 820px) {
          .lp-page { height: auto; min-height: 100vh; min-height: 100dvh; }
          .lp-nav { grid-template-columns: auto 1fr auto; }
          .lp-logo-wrap { justify-self: start; }
          .lp-nav__links, .lp-btn--nav { display: none; }
          .lp-burger { display: flex; }
          .lp-hero { margin-top: 48px; }
          .lp-headline { font-size: calc(clamp(2.75rem, 10vw, 3.85rem) + 3px); }
          .lp-actions { flex-wrap: wrap; }
          .lp-lede { width: 100%; max-width: 700px; margin-top: 64px; }
        }
        @media (max-height: 700px) and (min-width: 821px) {
          .lp-hero { margin-top: 36px; }
          .lp-headline { font-size: calc(clamp(2.75rem, 7.2vh, 4.15rem) + 3px); }
        }
      `}</style>

      <div className="lp-page">
        {/* Background video */}
        <div className="lp-bg">
          <video autoPlay muted loop playsInline>
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_075824_7c8a2ef3-826c-43ca-81a1-162429faa306.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Nav */}
        <nav className="lp-nav">
          {/* Left: links */}
          <nav className="lp-nav__links" aria-label="Primary">
            {navLinks.map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                className="lp-link-p"
                style={{ "--ld": `${[0.02, 0.08, 0.14, 0.20][i]}s` } as React.CSSProperties}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Center: logo */}
          <div className="lp-logo-wrap">
            <Logo />
          </div>

          {/* Right: CTA */}
          {isLoggedIn ? (
            <Link href="/dashboard" className="lp-btn lp-btn--nav" style={{ justifySelf: "end" }}>
              <span className="lp-btn__label">Dashboard</span>
              <span className="lp-btn__icon"><ArrowIcon /></span>
            </Link>
          ) : (
            <Link href="/login" className="lp-btn lp-btn--nav" style={{ justifySelf: "end" }}>
              <span className="lp-btn__label">Get Started</span>
              <span className="lp-btn__icon"><ArrowIcon /></span>
            </Link>
          )}

          {/* Burger */}
          <button
            className="lp-burger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="lp-mobile-menu"
            ref={burgerRef}
            onClick={toggleMenu}
          >
            <span /><span /><span />
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="lp-mobile-menu" className="lp-mobile-menu" ref={menuRef}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <Link href={isLoggedIn ? "/dashboard" : "/login"} className="lp-btn lp-btn--light" onClick={() => setMenuOpen(false)}>
              <span className="lp-btn__label">{isLoggedIn ? "Dashboard" : "Get Started"}</span>
              <span className="lp-btn__icon"><ArrowIcon /></span>
            </Link>
          </div>
        )}

        {/* Hero */}
        <section className="lp-hero">
          {/* Badge */}
          <div className="lp-badge">
            <span className="lp-badge__dot" aria-hidden="true" />
            Affiliate Platform for Shopify Brands
          </div>

          {/* Headline */}
          <h1 className="lp-headline">
            <span className="lp-headline__mask">
              <span className="lp-headline__rise lp-headline__line1" style={{ "--d": "0.26s" } as React.CSSProperties}>
                Turn customers into
              </span>
            </span>
            <span className="lp-headline__mask">
              <span className="lp-headline__rise" style={{ "--d": "0.4s" } as React.CSSProperties}>
                <span className="lp-headline__muted">your best </span>
                <span className="lp-headline__accent" data-text="sales channel.">sales channel.</span>
              </span>
            </span>
          </h1>

          {/* Actions */}
          <div className="lp-actions">
            <Link href="/signup" className="lp-btn lp-btn--light">
              <span className="lp-btn__label">Start Free</span>
              <span className="lp-btn__icon"><ArrowIcon /></span>
            </Link>
            <Link href="/marketplace" className="lp-btn lp-btn--ghost">
              <span className="lp-btn__label">Browse Programs</span>
            </Link>
          </div>
        </section>

        {/* Lede */}
        <p className="lp-lede">
          <span className="lp-lede__rise">
            Referly lets any Shopify brand launch a fully automated affiliate program in minutes — connect your store, set your commission rate, and let creators drive sales while you track every click, order, and payout in one dashboard.
          </span>
        </p>
      </div>
    </>
  );
}
