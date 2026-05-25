import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Eye, EyeOff, LogIn, AlertCircle, User, Lock, Cloud, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import ThemeToggle from './ThemeToggle';
import { CLOUD_ENABLED } from '../db/supabase';

export default function LoginPage() {
  const { login, submitPasswordReset } = useAuth();
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const cloudConfigured = CLOUD_ENABLED;

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

  const handleForgotSubmit = async () => {
    setForgotError('');
    const key = forgotUser.toLowerCase().trim();
    if (!key) { setForgotError('Enter your username'); return; }
    if (!forgotPw.trim() || forgotPw.length < 6) { setForgotError('Enter a password (min 6 chars)'); return; }
    const result = await submitPasswordReset(key, forgotPw);
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
    const result = await login(username, password, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const helperText = cloudConfigured
    ? 'Cloud login enabled — your account works across devices'
    : 'Local login only until cloud is configured';

  if (!isGlass) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="fixed top-6 right-6 z-50"><ThemeToggle /></div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#0f0f0f] rounded-2xl flex items-center justify-center mx-auto mb-5"><Monitor className="w-8 h-8 text-white" /></div>
            <h1 className="text-3xl font-bold text-[#0f0f0f] tracking-tight">Screen Time</h1>
            <p className="text-[#666] text-sm mt-2">Sign in to continue</p>
            <p className="text-xs mt-3 text-[#999] flex items-center justify-center gap-1.5"><Cloud className="w-3 h-3" /> {helperText}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#0f0f0f] mb-2">Username</label>
              <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" /><input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="Enter username" autoFocus className="w-full pl-11 pr-4 py-3 border border-[#e5e5e5] rounded-lg bg-[#fafafa] text-[#0f0f0f] font-medium focus:outline-none focus:border-[#0f0f0f] focus:bg-white focus:shadow-[0_0_0_3px_rgba(15,15,15,0.05)] transition-all placeholder:text-[#bbb]" /></div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0f0f0f] mb-2">Password</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" /><input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Enter password" className="w-full pl-11 pr-12 py-3 border border-[#e5e5e5] rounded-lg bg-[#fafafa] text-[#0f0f0f] font-medium focus:outline-none focus:border-[#0f0f0f] focus:bg-white focus:shadow-[0_0_0_3px_rgba(15,15,15,0.05)] transition-all placeholder:text-[#bbb]" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            </div>
            <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2 text-[#ef4444] text-sm font-medium bg-[#fee2e2] border border-[#ef4444]/20 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</motion.div>)}</AnimatePresence>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-[#0f0f0f] text-white font-semibold text-sm hover:bg-[#333] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" /> Sign In</>}</button>
            <button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-xs text-[#999] hover:text-[#666] transition-colors py-2 flex items-center justify-center gap-1.5 mt-2"><KeyRound className="w-3 h-3" /> Forgot Password?</button>
          </form>

          {showForgot && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-6">
              <button onClick={() => { setShowForgot(false); setForgotSuccess(false); setForgotError(''); }} className="flex items-center gap-2 text-sm text-[#666] hover:text-[#0f0f0f] mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
              <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-[#0f0f0f]" /><h3 className="text-lg font-bold text-[#0f0f0f]">Forgot Password</h3></div>
              {forgotSuccess ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4"><CheckCircle2 className="w-5 h-5" /><div><p className="font-semibold text-sm">Request submitted!</p><p className="text-xs mt-0.5">Ask admin to check Requests tab in Settings.</p></div></div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#666]">Enter your username and your desired new password. Admin will approve it.</p>
                  <input type="text" value={forgotUser} onChange={e => { setForgotUser(e.target.value); setForgotError(''); }} placeholder="Your username" className="w-full px-3.5 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#0f0f0f] font-medium focus:outline-none focus:border-[#0f0f0f]" />
                  <input type="password" value={forgotPw} onChange={e => { setForgotPw(e.target.value); setForgotError(''); }} placeholder="Desired new password (min 6 chars)" className="w-full px-3.5 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#0f0f0f] font-medium focus:outline-none focus:border-[#0f0f0f]" />
                  {forgotError && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{forgotError}</p>}
                  <button onClick={handleForgotSubmit} className="w-full py-2.5 rounded-lg bg-[#0f0f0f] text-white font-semibold text-sm hover:bg-[#333]">Submit Reset Request</button>
                </div>
              )}
            </motion.div>
          )}

          <p className="text-center text-xs text-[#999] mt-8">{cloudConfigured ? 'Passwords and data sync through the cloud' : 'Configure cloud to sync login across devices'}</p>
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="Enter username" autoFocus className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-300" /></div>
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
