import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import JoinPage from './pages/JoinPage'
import ConfirmedPage from './pages/ConfirmedPage'
import './App.css'


/* ──────────────────────────────────────────────
   WELCOME SCREEN — cinematic entrance
   ────────────────────────────────────────────── */
function WelcomeScreen({ onEnter }) {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const particles = useRef([])
  const animFrame = useRef(null)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w, h
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()

    const COUNT = 70
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.4 + 0.1,
    }))

    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const mx = mouse.current.x * w, my = mouse.current.y * h

      const g1 = ctx.createRadialGradient(mx * 0.8 + w * 0.1, my * 0.6, 0, mx * 0.8 + w * 0.1, my * 0.6, 600)
      g1.addColorStop(0, 'rgba(100, 60, 255, 0.07)'); g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h)

      const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 400)
      g2.addColorStop(0, 'rgba(0, 212, 255, 0.1)'); g2.addColorStop(0.5, 'rgba(100, 60, 255, 0.04)'); g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h)

      const g3 = ctx.createRadialGradient(w - mx * 0.5, h - my * 0.3, 0, w - mx * 0.5, h - my * 0.3, 500)
      g3.addColorStop(0, 'rgba(255, 50, 120, 0.04)'); g3.addColorStop(1, 'transparent')
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'; ctx.lineWidth = 0.5
      const gs = 80
      for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

      particles.current.forEach((p) => {
        const dx = mx - p.x, dy = my - p.y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 250) { p.vx += (dx / dist) * 0.015; p.vy += (dy / dist) * 0.015 }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(150, 130, 255, ${p.opacity})`; ctx.fill()
      })

      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i], b = particles.current[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(150, 130, 255, ${0.06 * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke()
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

  const handleClick = () => {
    setPhase(-1)
    setTimeout(onEnter, 700)
  }

  return (
    <div className={`welcome ${phase === -1 ? 'exit' : ''}`} onMouseMove={handleMouseMove} onClick={handleClick}>
      <canvas ref={canvasRef} className="welcome-canvas" />
      <div className="noise-overlay" />

      <div className="welcome-content">
        <div className={`welcome-badge ${phase >= 1 ? 'in' : ''}`}>
          Optima
        </div>
        <h1 className={`welcome-title ${phase >= 2 ? 'in' : ''}`}>
          <span className="title-line">Welcome to the future</span>
          <span className="title-line title-gradient">of hiring</span>
        </h1>
        <p className={`welcome-sub ${phase >= 2 ? 'in' : ''}`}>AI-powered interviews. Real connections.</p>
        <div className={`welcome-cta ${phase >= 3 ? 'in' : ''}`}>
          <div className="cta-ring"><span className="cta-dot" /></div>
          <span>Click anywhere to begin</span>
        </div>
      </div>

      <div className="corners">
        <span className="c tl" /><span className="c tr" />
        <span className="c bl" /><span className="c br" />
      </div>
      <div className="scanline" />
    </div>
  )
}


/* ──────────────────────────────────────────────
   LANDING PAGE
   ────────────────────────────────────────────── */
function LandingPage() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [visible])

  const handleCardMouse = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    card.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  const features = [
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></svg>,
      title: 'Smart Interview Matching',
      desc: 'Complete a weekly connecting interview and get matched to companies whose job postings fit your answers and skills.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
      title: 'Mock Interview Practice',
      desc: 'Practice with AI-generated questions tailored to your target role. Get instant feedback and a score to track your progress.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
      title: 'AI-Powered Scoring',
      desc: 'Claude AI evaluates every answer for key points, depth, and relevance — providing constructive feedback to help you improve.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>,
      title: 'Compatibility Rankings',
      desc: 'Companies see candidates ranked by a multi-factor compatibility score — interview performance, answer relevance, skills, and resume.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
      title: 'Browse & Save Job Postings',
      desc: 'Explore open roles from companies actively hiring on Optima. Save favourites to focus your next connecting interview on the jobs that excite you most.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
      title: 'Employer Hiring Dashboard',
      desc: 'Post jobs, set required skills, and receive a ranked list of matched candidates automatically — no inbox flooded with unqualified applications.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m10 13 2 2 4-4" /></svg>,
      title: 'Resume Intelligence',
      desc: 'Upload your resume and AI extracts your skills, highlights strengths, and flags gaps — so every match reflects your real capabilities.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /></svg>,
      title: 'Custom Interview Questions',
      desc: 'Employers add role-specific questions to every connecting interview, so candidates are evaluated on exactly the criteria that matter to them.',
    },
  ]

  const steps = [
    { num: '01', title: 'Build Your Profile', desc: 'Add your skills, resume, and desired roles. The more complete your profile, the better your matches.' },
    { num: '02', title: 'Take a Connecting Interview', desc: 'Once a week, complete an 8-question AI interview tailored to your favourite job postings.' },
    { num: '03', title: 'Get Connected', desc: 'Top candidates are automatically surfaced to matching companies. No applications. No wasted time.' },
  ]

  if (!visible) return null

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" /><div className="aurora-blob a2" /><div className="aurora-blob a3" />
      </div>

      <nav className="nav">
        <div className="nav-logo"><span className="nav-dot" />Optima</div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#cta">For Companies</a>
        </div>
        <div className="nav-right">
          <span className="nav-waitlist-count">
            <span className="nav-live-dot" />
            Early Access
          </span>
          <button className="btn-waitlist-nav" onClick={() => navigate('/join')}>
            Join the Waitlist
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid" /><div className="hero-spotlight" />
        <div className="hero-content">
          <div className="hero-badge reveal"><span className="badge-pulse" />AI-Powered Hiring Platform</div>
          <h1 className="hero-title reveal" style={{ '--d': '0.1s' }}>Better interviews.<br /><span className="gradient-text">Real connections.</span></h1>
          <p className="hero-desc reveal" style={{ '--d': '0.2s' }}>Optima connects qualified candidates directly to the right companies through AI-scored interviews that replace the noise of traditional job applications.</p>
          <div className="hero-btns reveal" style={{ '--d': '0.3s' }}>
            <button className="btn-waitlist" onClick={() => navigate('/join')}>
              <span className="btn-waitlist-glow" />
              Join the Waitlist
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="stats reveal" style={{ '--d': '0.4s' }}>
          <div className="stat"><span className="stat-num stat-text">Weekly</span><span className="stat-label">Connecting Interviews</span></div>
          <div className="stat-div" />
          <div className="stat"><span className="stat-num stat-text">Multi-Factor</span><span className="stat-label">Compatibility Score</span></div>
          <div className="stat-div" />
          <div className="stat"><span className="stat-num stat-text">Anthropic AI</span><span className="stat-label">Answer Evaluation</span></div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-head reveal"><span className="tag">Features</span><h2>Everything you need to <span className="gradient-text">find the right fit</span></h2><p>AI-driven interviews and matching that saves time for both candidates and companies.</p></div>
        <div className="feat-grid">
          {features.map((f, i) => (
            <div className="feat-card reveal" key={i} style={{ '--d': `${i * 0.08}s` }} onMouseMove={handleCardMouse}>
              <div className="feat-card-glow" /><div className="feat-icon">{f.icon}</div><h3>{f.title}</h3><p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-head reveal"><span className="tag">How It Works</span><h2>Three steps to <span className="gradient-text">your next opportunity</span></h2><p>No endless applications. Just one weekly interview and AI handles the matching.</p></div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step reveal" key={i} style={{ '--d': `${i * 0.1}s` }}>
              <div className="step-num">{s.num}</div><h3>{s.title}</h3><p>{s.desc}</p>
              {i < steps.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section" id="cta">
        <div className="cta-glow" />
        <h2 className="reveal">Ready to find your next opportunity?</h2>
        <p className="reveal" style={{ '--d': '0.1s' }}>Join the waitlist today — it's free, no credit card required.</p>
        <div className="hero-btns reveal" style={{ '--d': '0.2s' }}>
          <button className="btn-waitlist" onClick={() => navigate('/join')}>
            <span className="btn-waitlist-glow" />
            Join the Waitlist
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="nav-logo"><span className="nav-dot" />Optima</div>
          <p>Built for the future of hiring.</p>
        </div>
      </footer>
    </div>
  )
}


/* ──────────────────────────────────────────────
   HOME
   ────────────────────────────────────────────── */
function Home() {
  const [entered, setEntered] = useState(false)
  return entered ? <LandingPage /> : <WelcomeScreen onEnter={() => setEntered(true)} />
}


/* ──────────────────────────────────────────────
   APP — Routes (waitlist-only mode)
   ────────────────────────────────────────────── */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/confirmed" element={<ConfirmedPage />} />

      {/* Everything else redirects to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
