import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sendWaitlistCode, verifyWaitlistCode } from '../api/client'
import './AuthPage.css'

const LOCATIONS = [
  'Calgary, AB', 'Edmonton, AB', 'Red Deer, AB',
  'Vancouver, BC', 'Burnaby, BC', 'Kelowna, BC', 'Richmond, BC', 'Surrey, BC', 'Victoria, BC',
  'Winnipeg, MB',
  'Fredericton, NB', 'Moncton, NB', 'Saint John, NB',
  "St. John's, NL",
  'Halifax, NS',
  'Brampton, ON', 'Hamilton, ON', 'Kitchener, ON', 'London, ON', 'Markham, ON',
  'Mississauga, ON', 'Ottawa, ON', 'Toronto, ON', 'Vaughan, ON', 'Windsor, ON',
  'Charlottetown, PE',
  'Gatineau, QC', 'Laval, QC', 'Montreal, QC', 'Quebec City, QC',
  'Regina, SK', 'Saskatoon, SK',
  'Atlanta, GA', 'Austin, TX', 'Boston, MA', 'Charlotte, NC', 'Chicago, IL',
  'Columbus, OH', 'Dallas, TX', 'Denver, CO', 'Detroit, MI', 'Fort Worth, TX',
  'Houston, TX', 'Indianapolis, IN', 'Jacksonville, FL', 'Las Vegas, NV',
  'Los Angeles, CA', 'Memphis, TN', 'Miami, FL', 'Minneapolis, MN', 'Nashville, TN',
  'New Orleans, LA', 'New York, NY', 'Oklahoma City, OK', 'Orlando, FL',
  'Philadelphia, PA', 'Phoenix, AZ', 'Portland, OR', 'Sacramento, CA',
  'San Antonio, TX', 'San Diego, CA', 'San Francisco, CA', 'San Jose, CA',
  'Seattle, WA', 'Tampa, FL', 'Washington, DC',
  'Remote', 'Hybrid',
]

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const urlRole = new URLSearchParams(location.search).get('role') || 'candidate'

  // ── Step: "form" or "verify" ──
  const [step, setStep] = useState('form')

  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    company_location: '',
    email: '',
    confirm_email: '',
    age: '',
    role: urlRole,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationRef = useRef(null)

  // Verification code (6 individual digits)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    setForm((f) => ({ ...f, role: urlRole }))
  }, [urlRole])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleLocationInput = (e) => {
    const val = e.target.value
    setForm((f) => ({ ...f, company_location: val }))
    if (val.length >= 1) {
      const filtered = LOCATIONS.filter((l) =>
        l.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8)
      setLocationSuggestions(filtered)
      setShowLocationDropdown(filtered.length > 0)
    } else {
      setLocationSuggestions([])
      setShowLocationDropdown(false)
    }
  }

  const selectLocation = (loc) => {
    setForm((f) => ({ ...f, company_location: loc }))
    setShowLocationDropdown(false)
  }

  // ── Build payload ──
  const buildPayload = () => {
    const payload = {
      role: form.role,
      full_name: form.full_name.trim(),
      email: form.email.toLowerCase().trim(),
    }
    if (form.role === 'candidate') {
      payload.age = parseInt(form.age, 10)
    }
    if (form.role === 'company') {
      payload.company_name = form.company_name.trim()
      payload.company_location = form.company_location.trim() || null
    }
    return payload
  }

  // ── Step 1: Submit form → send verification code ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.full_name.trim()) {
      setError('Please enter your full name')
      return
    }
    if (form.role === 'company' && !form.company_name.trim()) {
      setError('Please enter your company name')
      return
    }
    if (form.email.toLowerCase().trim() !== form.confirm_email.toLowerCase().trim()) {
      setError('Email addresses do not match')
      return
    }
    if (form.role === 'candidate') {
      const age = parseInt(form.age, 10)
      if (!form.age || isNaN(age) || age < 16 || age > 120) {
        setError('Please enter a valid age (16–120)')
        return
      }
    }

    setLoading(true)
    try {
      await sendWaitlistCode(buildPayload())
      setStep('verify')
      setResendCooldown(60)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify the code ──
  const handleVerify = async () => {
    setError('')
    const codeStr = code.join('')
    if (codeStr.length !== 6) {
      setError('Please enter the full 6-digit code')
      return
    }

    setLoading(true)
    try {
      await verifyWaitlistCode({
        email: form.email.toLowerCase().trim(),
        code: codeStr,
      })
      navigate('/confirmed', { state: { name: form.full_name.trim(), role: form.role } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend code ──
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await sendWaitlistCode(buildPayload())
      setResendCooldown(60)
      setCode(['', '', '', '', '', ''])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Code input handlers ──
  const handleCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const handleCodePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...code]
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || ''
    }
    setCode(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>

      <nav className="nav">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span className="nav-dot" />Optima
        </div>
        <div className="nav-right" />
      </nav>

      <div className="auth-page">
        <div className="auth-card">

          {/* ═══════════ STEP 1: FORM ═══════════ */}
          {step === 'form' && (
            <>
              <h1>Join the Waitlist</h1>
              <p className="auth-sub">
                {form.role === 'company'
                  ? 'Get early access to post jobs and discover top candidates'
                  : 'Be the first to know when Optima launches'}
              </p>

              <form onSubmit={handleSubmit} className="auth-form">
                <label>
                  <span>I am a...</span>
                  <div className="role-toggle">
                    <button
                      type="button"
                      className={`role-btn ${form.role === 'candidate' ? 'active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, role: 'candidate' }))}
                    >
                      Candidate
                    </button>
                    <button
                      type="button"
                      className={`role-btn ${form.role === 'company' ? 'active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, role: 'company' }))}
                    >
                      Employer
                    </button>
                  </div>
                </label>

                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={set('full_name')}
                    placeholder="Jane Smith"
                    required
                  />
                </label>

                {form.role === 'candidate' && (
                  <label>
                    <span>Age</span>
                    <input
                      type="number"
                      value={form.age}
                      onChange={set('age')}
                      placeholder="25"
                      min="16"
                      max="120"
                      required
                    />
                  </label>
                )}

                {form.role === 'company' && (
                  <>
                    <label>
                      <span>Company Name</span>
                      <input
                        type="text"
                        value={form.company_name}
                        onChange={set('company_name')}
                        placeholder="Acme Corp"
                        required
                      />
                    </label>
                    <label>
                      <span>Location</span>
                      <div className="location-wrap" ref={locationRef}>
                        <input
                          type="text"
                          value={form.company_location}
                          onChange={handleLocationInput}
                          placeholder="Toronto, ON"
                          autoComplete="off"
                        />
                        {showLocationDropdown && locationSuggestions.length > 0 && (
                          <ul className="location-dropdown">
                            {locationSuggestions.map((loc) => (
                              <li
                                key={loc}
                                className="location-option"
                                onMouseDown={() => selectLocation(loc)}
                              >
                                {loc}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                  </>
                )}

                <label>
                  <span>{form.role === 'company' ? 'Company Email' : 'Email'}</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label>
                  <span>Confirm Email</span>
                  <input
                    type="email"
                    value={form.confirm_email}
                    onChange={set('confirm_email')}
                    placeholder="you@example.com"
                    required
                    onPaste={(e) => e.preventDefault()}
                  />
                  <span className="field-hint">Type it again — paste is disabled to catch typos.</span>
                </label>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? 'Sending code...' : 'Join the Waitlist'}
                  <span className="btn-shimmer" />
                </button>
              </form>

              <p className="auth-switch">
                {form.role === 'candidate' ? 'Want to hire instead?' : 'Looking for a job?'}{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setForm((f) => ({ ...f, role: f.role === 'candidate' ? 'company' : 'candidate' }))
                  }}
                >
                  {form.role === 'candidate' ? 'Join as an employer' : 'Join as a candidate'}
                </a>
              </p>
            </>
          )}

          {/* ═══════════ STEP 2: VERIFY CODE ═══════════ */}
          {step === 'verify' && (
            <div className="verify-step">
              <div className="verify-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h1>Check your email</h1>
              <p className="auth-sub">
                We sent a 6-digit code to <strong>{form.email}</strong>
              </p>

              <div className="code-inputs" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="code-digit"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                className="btn-primary auth-submit"
                onClick={handleVerify}
                disabled={loading || code.join('').length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Join'}
                <span className="btn-shimmer" />
              </button>

              <div className="verify-footer">
                <p className="verify-resend">
                  Didn't get the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="resend-timer">Resend in {resendCooldown}s</span>
                  ) : (
                    <a href="#" onClick={(e) => { e.preventDefault(); handleResend() }}>
                      Resend code
                    </a>
                  )}
                </p>
                <p className="verify-back">
                  <a href="#" onClick={(e) => { e.preventDefault(); setStep('form'); setError(''); setCode(['', '', '', '', '', '']) }}>
                    Go back and edit
                  </a>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
