import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './JoinPage.css'

export default function JoinPage() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)
  const canvasRef = useRef(null)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const particles = useRef([])
  const animFrame = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  /* ── subtle particle canvas ── */
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w, h
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()

    const COUNT = 50
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.2 + 0.4, opacity: Math.random() * 0.3 + 0.05,
    }))

    window.addEventListener('resize', resize)

    const LINK_DIST = 90
    const LINK_DIST_SQ = LINK_DIST * LINK_DIST
    const ATTRACT_DIST_SQ = 200 * 200

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const mx = mouse.current.x * w, my = mouse.current.y * h

      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 350)
      g.addColorStop(0, 'rgba(99, 102, 241, 0.045)')
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const parts = particles.current
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const dx = mx - p.x, dy = my - p.y, distSq = dx * dx + dy * dy
        if (distSq < ATTRACT_DIST_SQ && distSq > 0) {
          const dist = Math.sqrt(distSq)
          p.vx += (dx / dist) * 0.008
          p.vy += (dy / dist) * 0.008
        }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99
        if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity * 0.6})`; ctx.fill()
      }

      for (let i = 0; i < parts.length; i++) {
        const a = parts[i]
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dSq = dx * dx + dy * dy
          if (dSq < LINK_DIST_SQ) {
            const d = Math.sqrt(dSq)
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.035 * (1 - d / LINK_DIST)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animFrame.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animFrame.current) }
  }, [])

  const handleMouseMove = useCallback((e) => {
    mouse.current.x = e.clientX / window.innerWidth
    mouse.current.y = e.clientY / window.innerHeight
  }, [])

  return (
    <div className={`join-page ${visible ? 'join-visible' : ''}`} onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="join-canvas" />

      <div className="join-bg-glow join-glow-1" />
      <div className="join-bg-glow join-glow-2" />

      {/* ── top bar ── */}
      <nav className="join-nav">
        <div className="join-nav-logo" onClick={() => navigate('/')}>
          <span className="join-nav-dot" />Optima
        </div>
        <span className="join-nav-tagline">AI-Powered Hiring Platform</span>
      </nav>

      {/* ── main content ── */}
      <div className="join-center">
        <div className="join-header">
          <div className="join-badge">
            <span className="join-badge-pulse" />
            Join the Waitlist
          </div>
          <h1 className="join-title">
            How will you use <span className="join-gradient">Optima</span>?
          </h1>
          <p className="join-subtitle">
            Choose your path to get started. You can always explore both sides later.
          </p>
        </div>

        <div className="join-cards">
          {/* ── CANDIDATE CARD ── */}
          <div
            className={`join-card ${hoveredCard === 'candidate' ? 'join-card-hover' : ''} ${hoveredCard && hoveredCard !== 'candidate' ? 'join-card-dim' : ''}`}
            onMouseEnter={() => setHoveredCard('candidate')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate('/register?role=candidate')}
          >
            <div className="join-card-shine" />
            <div className="join-card-icon join-card-icon-candidate">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            </div>
            <h2>I'm a Candidate</h2>
            <p>Take AI-powered interviews, get matched to opportunities, and let your skills speak for you.</p>
            <ul className="join-card-perks">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Weekly connecting interviews
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Auto-matched to top companies
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                AI feedback to improve
              </li>
            </ul>
            <div className="join-card-cta">
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </div>

          {/* ── divider ── */}
          <div className="join-divider">
            <div className="join-divider-line" />
            <span className="join-divider-or">or</span>
            <div className="join-divider-line" />
          </div>

          {/* ── EMPLOYER CARD ── */}
          <div
            className={`join-card ${hoveredCard === 'company' ? 'join-card-hover' : ''} ${hoveredCard && hoveredCard !== 'company' ? 'join-card-dim' : ''}`}
            onMouseEnter={() => setHoveredCard('company')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate('/register?role=company')}
          >
            <div className="join-card-shine" />
            <div className="join-card-icon join-card-icon-company">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <h2>I'm an Employer</h2>
            <p>Post jobs, set custom questions, and receive a ranked list of qualified candidates automatically.</p>
            <ul className="join-card-perks">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                AI-ranked applicant pipeline
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Custom interview questions
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                No more unqualified noise
              </li>
            </ul>
            <div className="join-card-cta">
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </div>
        </div>

        <p className="join-footer-note">
          Free to join. No credit card required.
        </p>
      </div>
    </div>
  )
}
