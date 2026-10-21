import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Eye, EyeOff, LogIn, AlertCircle, User, Lock, Cloud, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useStore } from '../useStore';
import ThemeToggle from './ThemeToggle';
import { CLOUD_ENABLED } from '../db/supabase';

function loadPw() { try { const s = localStorage.getItem('screentime_passwords'); const d: Record<string,any> = { admin: { display: 'Rahas' }, rahas: { display: 'Rahas Sharma' } }; if (s) return { ...d, ...JSON.parse(s) }; return d; } catch { return {}; } }
const loadPasswords = loadPw;

export default function LoginPage() {
  const { login, submitRequest, signUp, sendPasswordReset, needsNewPassword, completePasswordReset } = useAuth();
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const cloudConfigured = CLOUD_ENABLED;
  const { getBehaviorScore } = useStore('rahas');
  const behavior = getBehaviorScore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotPw, setForgotPw] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Create account / new password (cloud)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [info, setInfo] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [newPwError, setNewPwError] = useState('');

  const handleForgotSubmit = async () => {
    setForgotError('');
    if (cloudConfigured) {
      const email = forgotUser.trim();
      if (!email.includes('@')) { setForgotError('Enter the email on your account'); return; }
      const r = await sendPasswordReset(email);
      if (r.success) { setForgotSuccess(true); }
      else { setForgotError(r.error || 'Could not send the reset email'); }
      return;
    }
    const key = forgotUser.toLowerCase().trim();
    if (!key) { setForgotError('Enter your username'); return; }
    if (!forgotPw.trim() || forgotPw.length < 6) { setForgotError('Enter a password (min 6 chars)'); return; }
    const p = loadPasswords(); const result = await submitRequest({ type: 'password_reset', userKey: key, userDisplay: p[key]?.display || key, desiredPassword: forgotPw });
    if (result.success) { setForgotSuccess(true); }
    else { setForgotError(result.error || 'Failed'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    if (cloudConfigured && mode === 'signup') {
      const r = await signUp(username.trim(), password, displayName.trim());
      setLoading(false);
      if (!r.success) { setError(r.error || 'Could not create the account'); return; }
      if (r.needsConfirm) setInfo('Account created. Check your email and tap the confirmation link, then sign in.');
      else setInfo('Account created.');
      return;
    }
    const result = await login(username, password, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleNewPassword = async () => {
    setNewPwError('');
    if (newPw.length < 6) { setNewPwError('Use at least 6 characters'); return; }
    if (newPw !== newPwConfirm) { setNewPwError('The two passwords do not match'); return; }
    setLoading(true);
    const r = await completePasswordReset(newPw);
    setLoading(false);
    if (!r.success) setNewPwError(r.error || 'Could not save the new password');
  };

  const helperText = cloudConfigured
    ? 'Cloud login enabled — your account works across devices'
    : 'Local login only until cloud is configured';

  if (cloudConfigured && needsNewPassword) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>
        <div className="w-full max-w-[420px] rounded-[24px] border border-[#E7ECE7] p-10 bg-white">
          <h1 className="text-[24px] font-extrabold text-brevo-ink mb-1.5">Choose a new password</h1>
          <p className="text-[13.5px] text-[#7E8D83] mb-7">Set a new password for your Guardian account.</p>
          <div className="space-y-[16px]">
            <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setNewPwError(''); }} placeholder="New password (min 6 characters)"
              className="w-full px-4 py-[13px] border border-[#E6EEE0] rounded-[14px] bg-[#F6FAF2] text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal" />
            <input type="password" value={newPwConfirm} onChange={e => { setNewPwConfirm(e.target.value); setNewPwError(''); }} placeholder="Repeat new password"
              className="w-full px-4 py-[13px] border border-[#E6EEE0] rounded-[14px] bg-[#F6FAF2] text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal" />
            {newPwError && <p className="text-sm text-brevo-danger font-medium">{newPwError}</p>}
            <button type="button" onClick={handleNewPassword} disabled={loading} className="w-full py-[14px] rounded-full bg-brevo-ink text-white font-bold text-[14.5px] hover:bg-[#223830] disabled:opacity-60">
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Exact port of the WebLogin design reference: 1200x860 split card, 46/54 panels,
     56px/64px panel padding, plain (icon-less) inputs, and the Grade stat card in place
     of a cloud-status pill — wired to the real 7-day behavior score instead of the
     reference's placeholder "86". */
  if (!isGlass) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[1200px] min-h-[860px] rounded-[28px] overflow-hidden shadow-[0_1px_2px_rgba(21,36,29,0.04)] flex flex-col md:flex-row">

          {/* Brand panel */}
          <div className="flex-[1_1_46%] bg-brevo-lime p-14 flex flex-col justify-between gap-8 min-w-[320px]">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-extrabold tracking-tight text-brevo-teal">STLOG</span>
              <span className="text-xl font-extrabold tracking-tight text-brevo-ink">Track</span>
            </div>
            <div className="max-w-[380px]">
              <div className="text-[12px] font-extrabold tracking-[0.12em] text-brevo-teal mb-3.5 uppercase">Screen time, simplified</div>
              <h2 className="text-[34px] leading-[1.2] font-extrabold tracking-tight text-brevo-ink mb-3.5">Fair limits. Clear tracking. Zero arguments.</h2>
              <p className="text-[14.5px] leading-relaxed text-[#33493D]">Sign in to see today's usage, manage penalties, and stay in sync with the Guardian companion app.</p>
            </div>
            <div className="bg-white rounded-2xl px-5 py-[18px] flex items-center gap-3 shadow-[0_14px_34px_rgba(21,36,29,0.12)] max-w-[300px]">
              <div className="w-9 h-9 rounded-full bg-[#E8F7E0] text-brevo-teal flex items-center justify-center font-extrabold flex-shrink-0">{behavior.grade === 'N/A' ? '–' : behavior.score}</div>
              <div>
                <div className="text-[12.5px] font-extrabold text-brevo-ink">{behavior.grade === 'N/A' ? 'No usage data yet' : `Grade ${behavior.grade} behavior`}</div>
                <div className="text-[11px] text-[#7E8D83]">7-day average</div>
              </div>
            </div>
          </div>

          {/* Form panel */}
          <div className="flex-[1_1_54%] bg-white p-16 flex flex-col justify-center min-w-[340px]">
            <div className="w-full max-w-[360px] mx-auto">
              <h1 className="text-[26px] font-extrabold text-brevo-ink mb-1.5">Welcome back</h1>
              <p className="text-[13.5px] text-[#7E8D83] mb-8">Sign in to your dashboard</p>

              <form onSubmit={handleSubmit} className="space-y-[18px]">
                <div>
                  <label className="block text-xs font-bold text-[#4B5C53] mb-[7px]">{cloudConfigured ? 'Email' : 'Username'}</label>
                  <input type={cloudConfigured ? "email" : "text"} value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder={cloudConfigured ? "you@example.com" : "Enter username"} autoFocus
                    className="w-full px-4 py-[13px] border border-[#E6EEE0] rounded-[14px] bg-[#F6FAF2] text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,127,104,0.08)] transition-all placeholder:text-[#B7C2B9]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4B5C53] mb-[7px]">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Enter password"
                      className="w-full px-4 py-[13px] pr-12 border border-[#E6EEE0] rounded-[14px] bg-[#F6FAF2] text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,127,104,0.08)] transition-all placeholder:text-[#B7C2B9]" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA89E] hover:text-[#4B5C53]">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2 text-brevo-danger text-sm font-medium bg-brevo-danger-bg border border-brevo-danger/20 rounded-2xl px-4 py-3"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</motion.div>)}</AnimatePresence>
                <button type="submit" disabled={loading} className="w-full py-[14px] rounded-full bg-brevo-ink text-white font-bold text-[14.5px] hover:bg-[#223830] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
              </form>

              {info && <p className="text-sm text-brevo-teal font-medium mt-4">{info}</p>}
              {cloudConfigured && mode === 'signup' && (
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name (shown on your account)"
                  className="w-full mt-4 px-4 py-[13px] border border-[#E6EEE0] rounded-[14px] bg-[#F6FAF2] text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal" />
              )}
              {cloudConfigured ? (
                <p className="text-center text-[12.5px] text-[#9AA89E] mt-4">
                  <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setInfo(''); }} className="text-brevo-teal font-bold hover:underline">{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
                  {mode === 'signin' && <> · <button type="button" onClick={() => setShowForgot(true)} className="text-brevo-teal font-bold hover:underline">Forgot password?</button></>}
                </p>
              ) : (
                <p className="text-center text-[12.5px] text-[#9AA89E] mt-4">Forgot access? <button type="button" onClick={() => setShowForgot(true)} className="text-brevo-teal font-bold hover:underline">Contact your admin</button></p>
              )}

              {showForgot && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-brevo-field border border-brevo-border rounded-2xl p-6">
                  <button onClick={() => { setShowForgot(false); setForgotSuccess(false); setForgotError(''); }} className="flex items-center gap-2 text-sm text-[#4B5C53] hover:text-brevo-ink mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                  <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-brevo-ink" /><h3 className="text-base font-extrabold text-brevo-ink">Forgot password</h3></div>
                  {forgotSuccess ? (
                    <div className="flex items-center gap-2 text-brevo-teal bg-[#E8F7E0] border border-brevo-teal/20 rounded-2xl p-4"><CheckCircle2 className="w-5 h-5" /><div><p className="font-semibold text-sm">Request submitted!</p><p className="text-xs mt-0.5">{cloudConfigured ? 'Check your inbox for the reset link.' : 'Ask admin to check Requests tab in Settings.'}</p></div></div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-[#4B5C53]">{cloudConfigured ? 'Enter your account email and we will send you a reset link.' : 'Enter your username and your desired new password. Admin will approve it.'}</p>
                      <input type="text" value={forgotUser} onChange={e => { setForgotUser(e.target.value); setForgotError(''); }} placeholder={cloudConfigured ? "Your account email" : "Your username"} className="w-full px-3.5 py-3 border border-brevo-border rounded-2xl bg-white text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal" />
                      {!cloudConfigured && <input type="password" value={forgotPw} onChange={e => { setForgotPw(e.target.value); setForgotError(''); }} placeholder="Desired new password (min 6 chars)" className="w-full px-3.5 py-3 border border-brevo-border rounded-2xl bg-white text-brevo-ink font-medium focus:outline-none focus:border-brevo-teal" />}
                      {forgotError && <p className="text-xs text-brevo-danger font-medium flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{forgotError}</p>}
                      <button onClick={handleForgotSubmit} className="w-full py-3 rounded-full bg-brevo-ink text-white font-bold text-sm hover:bg-[#223830]">Submit reset request</button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none"><div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" /><div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl" /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-200/10 rounded-full blur-3xl" /></div>
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }} className="relative w-full max-w-md">
        <div className="glass-card p-8 md:p-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }} className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-gray-900/20"><Monitor className="w-7 h-7 text-white" /></motion.div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-gray-400 text-sm mt-1.5 font-medium">Sign in to Screen Time</p>
            <p className="text-[11px] mt-3 text-gray-400 font-medium flex items-center justify-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> {helperText}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cloudConfigured ? 'Email' : 'Username'}</label>
              <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={cloudConfigured ? "email" : "text"} value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder={cloudConfigured ? "you@example.com" : "Enter username"} autoFocus className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-300" /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Enter password" className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-300" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            </div>
            <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} className="flex items-center gap-2.5 text-red-600 text-sm font-medium bg-red-50 rounded-2xl px-4 py-3 border border-red-200/50"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</motion.div>)}</AnimatePresence>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/15 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" /> Sign In</>}</motion.button>
            <button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-2 flex items-center justify-center gap-1.5 mt-1"><KeyRound className="w-3 h-3" /> Forgot Password?</button>
          </form>

          {showForgot && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 bg-white/50 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6">
              <button onClick={() => { setShowForgot(false); setForgotSuccess(false); setForgotError(''); }} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
              <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-gray-900" /><h3 className="text-lg font-bold text-gray-900">Forgot Password</h3></div>
              {forgotSuccess ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-5"><CheckCircle2 className="w-6 h-6 text-green-500" /><div><p className="font-semibold text-sm text-green-700">Request submitted!</p><p className="text-xs text-green-600 mt-0.5">Ask admin to check Requests tab.</p></div></div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Enter your username and desired new password. Admin will approve.</p>
                  <input type="text" value={forgotUser} onChange={e => { setForgotUser(e.target.value); setForgotError(''); }} placeholder="Your username" className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-300" />
                  <input type="password" value={forgotPw} onChange={e => { setForgotPw(e.target.value); setForgotError(''); }} placeholder="Desired new password (min 6 chars)" className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-300" />
                  {forgotError && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{forgotError}</p>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleForgotSubmit} className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 shadow-lg shadow-gray-900/15"><KeyRound className="w-4 h-4 inline mr-2" />Submit Reset Request</motion.button>
                </div>
              )}
            </motion.div>
          )}

          <p className="text-center text-xs text-gray-400 font-medium mt-6">{cloudConfigured ? 'Passwords and data sync through the cloud' : 'Configure cloud to sync login across devices'}</p>
        </div>
      </motion.div>
    </div>
  );
}
