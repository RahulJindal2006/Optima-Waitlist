import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './ConfirmedPage.css'

export default function ConfirmedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name, role } = location.state || {}
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 400)
    const t3 = setTimeout(() => setPhase(3), 700)
    const t4 = setTimeout(() => setPhase(4), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  // Graceful fallback if user reloads on this page (location.state is lost)
  const firstName = name ? name.split(' ')[0] : 'there'

  return (
    <div className="confirmed-page">
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
        <div className="aurora-blob a3" />
      </div>

      <nav className="confirmed-nav">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span className="nav-dot" />Optima
        </div>
      </nav>

      <div className="confirmed-center">
        {/* checkmark circle */}
        <div className={`confirmed-check ${phase >= 1 ? 'in' : ''}`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className={`confirmed-title ${phase >= 2 ? 'in' : ''}`}>
          {name ? `You're on the list, ${firstName}!` : "You're on the list!"}
        </h1>

        <p className={`confirmed-desc ${phase >= 3 ? 'in' : ''}`}>
          {role === 'company'
            ? "Thank you for your interest in Optima. We'll reach out as soon as early access opens for employers — you'll be among the first to post jobs and discover top candidates."
            : "Thank you for joining the Optima waitlist. We'll notify you as soon as early access opens — you'll be among the first to take AI-powered interviews and get matched to top companies."}
        </p>

        <div className={`confirmed-card ${phase >= 4 ? 'in' : ''}`}>
          <h3>What happens next?</h3>
          <div className="confirmed-steps">
            <div className="confirmed-step">
              <div className="confirmed-step-num">1</div>
              <div>
                <strong>Watch your inbox</strong>
                <p>We'll send you an email when your spot is ready.</p>
              </div>
            </div>
            <div className="confirmed-step">
              <div className="confirmed-step-num">2</div>
              <div>
                <strong>Set up your profile</strong>
                <p>Complete your profile to get the best matches from day one.</p>
              </div>
            </div>
            <div className="confirmed-step">
              <div className="confirmed-step-num">3</div>
              <div>
                <strong>{role === 'company' ? 'Start hiring smarter' : 'Take your first interview'}</strong>
                <p>{role === 'company'
                  ? 'Post jobs and receive AI-ranked candidates automatically.'
                  : 'Complete a connecting interview and let AI match you to opportunities.'}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          className={`confirmed-home-btn ${phase >= 4 ? 'in' : ''}`}
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
