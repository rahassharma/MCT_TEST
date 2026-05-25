import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Settings2, Clock, AlertTriangle, Shield, Database,
  Download, Upload, Trash2, RefreshCw, Cloud, Eye, EyeOff,
  Code2, RotateCcw, Save, CheckCircle2, AlertCircle, Wrench,
  UserPlus, ChevronDown, Inbox, Check,
  XCircle, KeyRound, MessageSquare, Bell, UserMinus, Send,
  Info, Users, Smartphone,
} from 'lucide-react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import type { UserRole } from '../AuthContext';
import { CLOUD_ENABLED } from '../db/supabase';
import { saveCloudRequest } from '../db/sync';
import { isSupabaseConfigured } from '../db/config';

interface SettingsPanelProps {
  isOpen: boolean;
  settings: AppSettings;
  cloudEnabled: boolean;
  lastSynced: Date | null;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  onResetData: () => void;
  onReplaceData: (data: any) => void;
  onForceSync: () => void;
  onReconfigureCloud: () => void;
}

type AdminTab = 'time' | 'security' | 'requests' | 'notifications' | 'data' | 'cloud' | 'advanced';
type UserTab = 'my-requests' | 'suggest' | 'rules' | 'notifications' | 'data';
type SecuritySection = 'passwords' | 'addUser' | 'changeUsername' | 'changeRole' | 'removeUser';

export default function SettingsPanel({
  isOpen, settings, cloudEnabled, lastSynced,
  onClose, onSaveSettings, onResetData, onReplaceData, onForceSync, onReconfigureCloud
}: SettingsPanelProps) {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const {
    isAdmin, user, changePassword, getAllUsers, addUser, changeUsername, changeUserRole, removeUser,
    getPendingRequests, getAllRequests, getUserRequests, submitRequest, updateRequestStatus, appealRequest,
    
    sendNotification, getNotificationsForUser, getUnreadCount, markAsRead, getAllNotifications,
    dataVersion,
  } = useAuth();

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('time');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('rules');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [securitySection, setSecuritySection] = useState<SecuritySection>('passwords');
  const [ver, setVer] = useState(0);
  const cloud = isSupabaseConfigured();
  const bump = () => setVer(v => v + 1);

  // Password states
  const [adminPw, setAdminPw] = useState('');
  const [adminPwConfirm, setAdminPwConfirm] = useState('');
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Add/Edit user states
  const [newKey, setNewKey] = useState(''); const [newDisplay, setNewDisplay] = useState('');
  const [newPw, setNewPw] = useState(''); const [newRole, setNewRole] = useState<UserRole>('user');
  const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editNameKey, setEditNameKey] = useState(''); const [editNameVal, setEditNameVal] = useState('');
  const [editRoleKey, setEditRoleKey] = useState(''); const [editRoleVal, setEditRoleVal] = useState<UserRole>('user');
  const [removeKey, setRemoveKey] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Request states
  const [editPw, setEditPw] = useState<Record<string, string>>({});
  const [editReply, setEditReply] = useState<Record<string, string>>({});

  // User recommend states
  const [recKey, setRecKey] = useState(''); const [recDisplay, setRecDisplay] = useState('');
  const [recPw, setRecPw] = useState(''); const [recMsg, setRecMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Suggestion states
  const [sugText, setSugText] = useState('');
  const [editInputs, setEditInputs] = useState<Record<string, string>>({}); const [sugMsg, setSugMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification states
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifType, setNotifType] = useState<'warning' | 'info' | 'success'>('warning');

  const [showDebug, setShowDebug] = useState(false);
  const [debugText, setDebugText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const users = useMemo(() => getAllUsers(), [getAllUsers, ver, dataVersion]);
  const pendingReqs = useMemo(() => getPendingRequests(), [getPendingRequests, ver, dataVersion]);
  const userReqs = useMemo(() => user ? getUserRequests(user.key) : [], [user, getUserRequests, ver, dataVersion]);
  const userNotifs = useMemo(() => user ? getNotificationsForUser(user.key) : [], [user, getNotificationsForUser, ver, dataVersion]);
  const unreadCount = useMemo(() => user ? getUnreadCount(user.key) : 0, [user, getUnreadCount, ver, dataVersion]);

  // Style helpers
  const cardCls = isGlass ? 'p-4 rounded-xl bg-gray-900/5 border border-gray-200/50' : 'p-4 rounded-xl bg-[#fafafa] border border-[#e5e5e5]';
  const inputCls = isGlass
    ? 'w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200/80 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all text-sm'
    : 'w-full px-3 py-2.5 border border-[#e5e5e5] rounded-lg bg-[#fafafa] text-[#0f0f0f] font-semibold focus:outline-none focus:border-[#0f0f0f] transition-all text-sm';
  const selectCls = inputCls + ' appearance-none cursor-pointer';
  const btnPrimary = isGlass ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-[#0f0f0f] text-white hover:bg-[#333]';
  const btnSecondary = isGlass ? 'bg-white/60 hover:bg-white border border-gray-200/50 text-gray-700' : 'bg-white border border-[#e5e5e5] text-[#0f0f0f] hover:bg-[#f5f5f5]';
  const labelCls = isGlass ? 'text-gray-500' : 'text-[#666]';
  const headCls = isGlass ? 'text-gray-900' : 'text-[#0f0f0f]';
  const subTabCls = (a: boolean) => isGlass
    ? `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${a ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`
    : `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${a ? 'bg-[#0f0f0f] text-white' : 'bg-[#f5f5f5] text-[#999] hover:bg-[#eee]'}`;

  const handleSave = () => { onSaveSettings(draft); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const handleResetSettings = () => { setDraft(DEFAULT_SETTINGS); onSaveSettings(DEFAULT_SETTINGS); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const handleExport = () => { const d = localStorage.getItem(`screentime_state_${user?.key}`) || '{}'; const b = new Blob([d], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `screentime-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u); };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const p = JSON.parse(ev.target?.result as string); if (!p.dailyData) throw 0; onReplaceData(p); setImportMsg({ type: 'success', text: 'Imported' }); } catch { setImportMsg({ type: 'error', text: 'Invalid' }); } setTimeout(() => setImportMsg(null), 2500); }; r.readAsText(f); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleResetData = () => { if (confirm('Delete ALL data?')) onResetData(); };
  const handleClose = () => { setDraft(settings); onClose(); };
  const fmtTime = (ts: string) => { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };

  const Msg = ({ m }: { m: { type: 'success' | 'error'; text: string } }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${m.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      {m.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{m.text}
    </motion.div>
  );

  // ═══════════════════════════════════
  //  ADMIN CONTENT
  // ═══════════════════════════════════
  const adminTabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'time', label: 'Time', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'requests', label: 'Requests', icon: Inbox, badge: pendingReqs.length },
    { id: 'notifications', label: 'Notify', icon: Bell },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'cloud', label: 'Cloud', icon: Cloud },
    { id: 'advanced', label: 'Advanced', icon: Wrench },
  ];

  const adminContent = (
    <>
      {activeAdminTab === 'time' && (
        <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <Field label="Max Daily Time" hint="Minutes/day" icon={Clock}><input type="number" min={1} max={480} value={draft.maxTime} onChange={e => setDraft({ ...draft, maxTime: Math.max(1, parseInt(e.target.value) || 1) })} className={inputCls} /></Field>
          <Field label="Penalty Multiplier" hint="Excess × ratio" icon={AlertTriangle}><input type="number" min={0} max={10} step={0.1} value={draft.penaltyRatio} onChange={e => setDraft({ ...draft, penaltyRatio: Math.max(0, parseFloat(e.target.value) || 0) })} className={inputCls} /></Field>
          <Field label="Block Threshold" hint="Penalty >= this = full block" icon={AlertTriangle}><input type="number" min={1} max={480} value={draft.fullBlockThreshold} onChange={e => setDraft({ ...draft, fullBlockThreshold: Math.max(1, parseInt(e.target.value) || 1) })} className={inputCls} /></Field>
          <Field label="Carry Forward" hint="Carry penalty to next days" icon={AlertTriangle}><button onClick={() => setDraft({ ...draft, carryForwardEnabled: !draft.carryForwardEnabled })} className={`relative w-12 h-7 rounded-full transition-colors ${draft.carryForwardEnabled ? 'bg-green-500' : 'bg-gray-300'}`}><motion.div animate={{ x: draft.carryForwardEnabled ? 22 : 2 }} className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md" /></button></Field>
          <Field label="Mobile Sync" hint="Fetch screen time from phone" icon={Smartphone}><button onClick={() => setDraft({ ...draft, mobileSync: !draft.mobileSync })} className={`relative w-12 h-7 rounded-full transition-colors ${draft.mobileSync ? 'bg-purple-500' : 'bg-gray-300'}`}><motion.div animate={{ x: draft.mobileSync ? 22 : 2 }} className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md" /></button></Field>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${btnPrimary}`}>{saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save</>}</button>
            <button onClick={handleResetSettings} className={`py-2.5 px-4 rounded-lg font-semibold text-sm ${btnSecondary}`}><RotateCcw className="w-4 h-4" /></button>
          </div>
        </motion.div>
      )}

      {activeAdminTab === 'security' && (
        <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['passwords', 'addUser', 'changeUsername', 'changeRole', 'removeUser'] as SecuritySection[]).map(s => (
              <button key={s} onClick={() => setSecuritySection(s)} className={subTabCls(securitySection === s)}>
                {s === 'passwords' && '🔒 Passwords'}
                {s === 'addUser' && '➕ Add'}
                {s === 'changeUsername' && '✏️ Name'}
                {s === 'changeRole' && '🛡️ Role'}
                {s === 'removeUser' && '🗑️ Remove'}
              </button>
            ))}
          </div>

          {securitySection === 'passwords' && (
            <div className="space-y-3">
              <div className={cardCls}><h3 className={`text-sm font-bold mb-2 ${headCls}`}>Admin Password</h3><div className="space-y-2"><PwInput label="New" value={adminPw} onChange={setAdminPw} show={showPasswords['a1']} onToggle={() => setShowPasswords(p => ({...p, 'a1': !p['a1']}))} /><PwInput label="Confirm" value={adminPwConfirm} onChange={setAdminPwConfirm} show={showPasswords['a2']} onToggle={() => setShowPasswords(p => ({...p, 'a2': !p['a2']}))} /><button onClick={async () => { if (!adminPw.trim() || adminPw.length < 6) { setPwMessage({ type:'error', text:'Min 6 chars' }); return; } if (adminPw !== adminPwConfirm) { setPwMessage({ type:'error', text:'No match' }); return; } setBusyKey('admin'); const ok = await changePassword('admin', adminPw); setBusyKey(null); setPwMessage(ok ? { type:'success', text:'Updated' } : { type:'error', text:'Failed' }); if (ok) { setAdminPw(''); setAdminPwConfirm(''); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}>{busyKey === 'admin' ? '...' : 'Update'}</button></div></div>
              {users.filter(u => u.role === 'user').map(u => (
                <div key={u.key} className={cardCls}><h3 className={`text-sm font-bold mb-2 ${headCls}`}>{u.display}</h3><div className="space-y-2"><PwInput label="New password" value={userPasswords[u.key] || ''} onChange={v => setUserPasswords(p => ({...p, [u.key]: v}))} show={showPasswords[u.key]} onToggle={() => setShowPasswords(p => ({...p, [u.key]: !p[u.key]}))} /><button onClick={async () => { const pw = userPasswords[u.key]; if (!pw?.trim() || pw.length < 6) { setPwMessage({ type:'error', text:'Min 6 chars' }); return; } setBusyKey(u.key); const ok = await changePassword(u.key, pw); setBusyKey(null); setPwMessage(ok ? { type:'success', text:'Updated' } : { type:'error', text:'Failed' }); if (ok) setUserPasswords(p => ({...p, [u.key]: ''})); }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}>{busyKey === u.key ? '...' : 'Update'}</button></div></div>
              ))}
              {pwMessage && <Msg m={pwMessage} />}
            </div>
          )}

          {securitySection === 'addUser' && (
            <div className="space-y-3">
              <div className={cardCls}><h3 className={`text-sm font-bold mb-2 ${headCls}`}><UserPlus className="w-4 h-4 inline mr-1" />Add User</h3><div className="space-y-2"><input placeholder="Login key" value={newKey} onChange={e => setNewKey(e.target.value)} className={inputCls} /><input placeholder="Display name" value={newDisplay} onChange={e => setNewDisplay(e.target.value)} className={inputCls} /><PwInput label="" value={newPw} onChange={setNewPw} show={showPasswords['new']} onToggle={() => setShowPasswords(p => ({...p, 'new': !p['new']}))} /><div className="relative"><select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className={selectCls}><option value="user">User</option><option value="admin">Admin</option></select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelCls}`} /></div><button onClick={async () => { const r = await addUser(newKey, newDisplay, newPw, newRole); setAddMsg(r.success ? { type:'success', text:'Added' } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setNewKey(''); setNewDisplay(''); setNewPw(''); bump(); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}>Add User</button></div></div>
              {addMsg && <Msg m={addMsg} />}
              <UsersList users={users} headCls={headCls} labelCls={labelCls} cardCls={cardCls} isGlass={isGlass} />
            </div>
          )}

          {securitySection === 'changeUsername' && (
            <div className="space-y-3">
              <div className={cardCls}><div className="space-y-2"><div className="relative"><select value={editNameKey} onChange={e => { setEditNameKey(e.target.value); setEditNameVal(users.find(u => u.key === e.target.value)?.display || ''); }} className={selectCls}><option value="">Choose user...</option>{users.map(u => <option key={u.key} value={u.key}>{u.display} ({u.key})</option>)}</select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelCls}`} /></div>{editNameKey && <><input value={editNameVal} onChange={e => setEditNameVal(e.target.value)} className={inputCls} placeholder="New name" /><button onClick={async () => { const r = await changeUsername(editNameKey, editNameVal); setSecMsg(r.success ? { type:'success', text:'Updated' } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setEditNameKey(''); bump(); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}>Update</button></>}</div></div>
              {secMsg && <Msg m={secMsg} />}
            </div>
          )}

          {securitySection === 'changeRole' && (
            <div className="space-y-3">
              <div className={cardCls}><div className="space-y-2"><div className="relative"><select value={editRoleKey} onChange={e => { setEditRoleKey(e.target.value); setEditRoleVal(users.find(u => u.key === e.target.value)?.role || 'user'); }} className={selectCls}><option value="">Choose user...</option>{users.filter(u => u.key !== 'admin').map(u => <option key={u.key} value={u.key}>{u.display} — {u.role}</option>)}</select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelCls}`} /></div>{editRoleKey && <><div className="flex gap-2"><button onClick={() => setEditRoleVal('user')} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${editRoleVal === 'user' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>User</button><button onClick={() => setEditRoleVal('admin')} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${editRoleVal === 'admin' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-400'}`}>Admin</button></div><button onClick={async () => { const r = await changeUserRole(editRoleKey, editRoleVal); setSecMsg(r.success ? { type:'success', text:'Updated' } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setEditRoleKey(''); bump(); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}>Update</button></>}</div></div>
              {secMsg && <Msg m={secMsg} />}
            </div>
          )}

          {securitySection === 'removeUser' && (
            <div className="space-y-3">
              <div className={cardCls}><h3 className={`text-sm font-bold mb-2 text-red-600`}><UserMinus className="w-4 h-4 inline mr-1" />Remove User</h3><div className="space-y-2"><div className="relative"><select value={removeKey} onChange={e => setRemoveKey(e.target.value)} className={selectCls}><option value="">Choose user to remove...</option>{users.filter(u => u.key !== 'admin').map(u => <option key={u.key} value={u.key}>{u.display} ({u.key})</option>)}</select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelCls}`} /></div>{removeKey && <><input placeholder="Reason for removal (shown to user)" value={removeReason} onChange={e => setRemoveReason(e.target.value)} className={inputCls + ' mb-2'} /><button onClick={async () => { if (!confirm(`Delete ${removeKey}?`)) return; const r = await removeUser(removeKey, removeReason || undefined); setSecMsg(r.success ? { type:'success', text:'Removed' } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setRemoveKey(''); setRemoveReason(''); bump(); } }} className="w-full py-2 rounded-lg font-semibold text-sm bg-red-500 text-white hover:bg-red-600">Remove User</button></>}</div></div>
              {secMsg && <Msg m={secMsg} />}
              <UsersList users={users} headCls={headCls} labelCls={labelCls} cardCls={cardCls} isGlass={isGlass} />
            </div>
          )}
        </motion.div>
      )}

      {activeAdminTab === 'requests' && (
        <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          {pendingReqs.length === 0 && <div className={`${cardCls} text-center py-8`}><Inbox className={`w-10 h-10 mx-auto mb-3 ${isGlass ? 'text-gray-300' : 'text-[#ccc]'}`} /><p className={`text-sm font-semibold ${headCls}`}>No pending requests</p></div>}
          {pendingReqs.map(req => (
            <div key={req.id} className={cardCls}>
              <div className="flex items-center gap-2 mb-2">
                {req.type === 'password_reset' && <KeyRound className="w-4 h-4 text-amber-500" />}
                {req.type === 'recommend_user' && <Users className="w-4 h-4 text-blue-500" />}
                {req.type === 'suggestion' && <MessageSquare className="w-4 h-4 text-purple-500" />}
                {req.type === 'appeal' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <div><p className={`text-sm font-bold ${headCls}`}>{req.type === 'password_reset' ? 'Password Reset' : req.type === 'recommend_user' ? 'New User Recommendation' : req.type === 'appeal' ? '🔴 Account Appeal' : 'Suggestion'}</p><p className={`text-[10px] ${labelCls}`}>{req.userDisplay} • {fmtTime(req.timestamp)}</p></div>
              </div>
              <div className={`rounded-lg p-3 text-xs mb-3 ${isGlass ? 'bg-white/50' : 'bg-white'}`}>
                {req.type === 'password_reset' && <><p className={labelCls}>Desired password: <code className="px-1 py-0.5 rounded bg-gray-100 font-mono">{req.desiredPassword}</code></p><div className="mt-2"><label className={`text-[10px] font-semibold ${labelCls}`}>Edit password:</label><input value={editPw[req.id] || ''} onChange={e => setEditPw(p => ({...p, [req.id]: e.target.value}))} placeholder="Leave empty for their password" className={inputCls + ' mt-1'} /></div></>}
                {req.type === 'recommend_user' && <><p className={labelCls}>Key: <strong className={headCls}>{req.recommendedKey}</strong></p><p className={labelCls}>Name: <strong className={headCls}>{req.recommendedDisplay}</strong></p></>}
                {req.type === 'appeal' && <><p className={`${headCls} font-semibold`}>User wants their account reinstated:</p><p className={headCls + ' mt-1'}>{req.message}</p><p className={`text-[10px] mt-2 ${labelCls}`}>Approving will reinstate the user's account</p></>}
                {req.type === 'suggestion' && <><p className={headCls}>{req.message}</p><div className="mt-2"><label className={`text-[10px] font-semibold ${labelCls}`}>Reply:</label><input value={editReply[req.id] || ''} onChange={e => setEditReply(p => ({...p, [req.id]: e.target.value}))} placeholder="Optional reply" className={inputCls + ' mt-1'} /></div></>}
              </div>
              <div className="space-y-2">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${labelCls}`}>Status: <span className={req.status === 'submitted' ? 'text-amber-600' : req.status === 'received' ? 'text-blue-600' : req.status === 'reviewing' ? 'text-purple-600' : req.status === 'appealed' ? 'text-orange-600' : 'text-gray-500'}>{req.status}</span></div>
                <div className="flex gap-1.5 flex-wrap">
                  {req.status === 'submitted' && <button onClick={async () => { await updateRequestStatus(req.id, 'received', 'Received by admin'); bump(); }} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">📥 Receive</button>}
                  {(req.status === 'received' || req.status === 'appealed') && <button onClick={async () => { await updateRequestStatus(req.id, 'reviewing', 'Under review'); bump(); }} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">🔍 Review</button>}
                  {req.status === 'reviewing' && <><button onClick={async () => { await updateRequestStatus(req.id, 'approved', editReply[req.id] || undefined, editPw[req.id] ? { finalPassword: editPw[req.id] } : undefined); bump(); }} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"><Check className="w-3 h-3 inline" /> {req.type === 'appeal' ? 'Reinstate' : 'Approve'}</button><button onClick={async () => { const note = prompt('Reason for rejection:'); await updateRequestStatus(req.id, 'rejected', note || undefined); bump(); }} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"><XCircle className="w-3 h-3 inline" /> Reject</button><button onClick={async () => { const note = prompt('What changes needed?'); if (note) { await updateRequestStatus(req.id, 'editing', note); bump(); } }} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">✏️ Edit</button></>}
                  {req.status === 'editing' && <p className={`text-xs ${labelCls}`}>Waiting for user to resubmit...</p>}
                </div>
                {req.history && req.history.length > 0 && <div className={`mt-2 text-[10px] space-y-0.5 ${labelCls}`}>{req.history.map((h, i) => <div key={i}>• {h.status} — {new Date(h.timestamp).toLocaleString()}{h.note ? `: ${h.note}` : ''}</div>)}</div>}
              </div>
            </div>
          ))}
          {getAllRequests().filter(r => !['submitted','received','reviewing','editing','appealed'].includes(r.status)).length > 0 && (
            <div className={cardCls}><h3 className={`text-xs font-bold mb-2 ${headCls}`}>History</h3><div className="space-y-1 max-h-40 overflow-y-auto">{getAllRequests().filter(r => !['submitted','received','reviewing','editing','appealed'].includes(r.status)).slice(-15).reverse().map(r => (<div key={r.id} className={`flex items-center justify-between px-3 py-1.5 rounded text-[11px] ${isGlass ? 'bg-white/50' : 'bg-white'}`}><span className={labelCls}>{r.userDisplay} — {r.type.replace('_', ' ')}</span><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span></div>))}</div></div>
          )}
        </motion.div>
      )}

      {activeAdminTab === 'notifications' && (
        <motion.div key="notifs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <div className={cardCls}>
            <h3 className={`text-sm font-bold mb-3 ${headCls}`}><Bell className="w-4 h-4 inline mr-1" />Send Notification</h3>
            <div className="space-y-2">
              <div className="relative"><select value={notifTarget} onChange={e => setNotifTarget(e.target.value)} className={selectCls}><option value="all">All Users</option>{users.filter(u => u.role === 'user').map(u => <option key={u.key} value={u.key}>{u.display}</option>)}</select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelCls}`} /></div>
              <div className="flex gap-2">{(['warning', 'info', 'success'] as const).map(t => <button key={t} onClick={() => setNotifType(t)} className={`flex-1 py-1.5 rounded text-xs font-semibold border ${notifType === t ? (t === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-700' : t === 'info' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-green-50 border-green-300 text-green-700') : 'bg-white border-gray-200 text-gray-400'}`}>{t === 'warning' ? '⚠️' : t === 'info' ? 'ℹ️' : '✅'} {t}</button>)}</div>
              <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Message..." rows={3} className={inputCls} />
              <button onClick={() => { if (!notifMsg.trim()) return; sendNotification(notifTarget, notifMsg, notifType); setNotifMsg(''); bump(); }} className={`w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${btnPrimary}`}><Send className="w-4 h-4" /> Send</button>
            </div>
          </div>
          {getAllNotifications().length > 0 && <div className={cardCls}><h3 className={`text-xs font-bold mb-2 ${headCls}`}>Sent</h3><div className="space-y-1 max-h-40 overflow-y-auto">{getAllNotifications().slice(0, 15).map(n => (<div key={n.id} className={`px-3 py-2 rounded text-xs ${isGlass ? 'bg-white/50' : 'bg-white'}`}><p className={`font-semibold ${headCls}`}>{n.type === 'warning' ? '⚠️' : n.type === 'info' ? 'ℹ️' : '✅'} {n.message}</p><p className={`text-[10px] ${labelCls}`}>To: {n.targetUserKey === 'all' ? 'Everyone' : n.targetUserKey} • {fmtTime(n.timestamp)}</p></div>))}</div></div>}
        </motion.div>
      )}

      {activeAdminTab === 'data' && <DataTab />}
      {activeAdminTab === 'cloud' && <CloudTab />}
      {activeAdminTab === 'advanced' && <AdvancedTab />}
    </>
  );

  // ═══════════════════════════════════
  //  USER CONTENT
  // ═══════════════════════════════════
  const userTabs: Array<{ id: UserTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'rules', label: 'Rules', icon: Info },
    { id: 'my-requests', label: 'Requests', icon: Inbox },
    { id: 'suggest', label: 'Suggest', icon: MessageSquare },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
    { id: 'data', label: 'Data', icon: Database },
  ];

  const userContent = (
    <>
      {activeUserTab === 'rules' && (
        <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <div className={cardCls}>
            <h3 className={`text-sm font-bold mb-3 ${headCls}`}><Clock className="w-4 h-4 inline mr-1" />Current Rules</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className={labelCls}>Daily Limit</span><span className={`font-bold ${headCls}`}>{settings.maxTime} min</span></div>
              <div className="flex justify-between"><span className={labelCls}>Penalty Multiplier</span><span className={`font-bold ${headCls}`}>{settings.penaltyRatio}×</span></div>
              <div className="flex justify-between"><span className={labelCls}>Full Block Threshold</span><span className={`font-bold ${headCls}`}>{settings.fullBlockThreshold} min</span></div>
              <div className="flex justify-between"><span className={labelCls}>Carry Forward</span><span className={`font-bold ${headCls}`}>{settings.carryForwardEnabled ? '✅ On' : '❌ Off'}</span></div>
              <div className="flex justify-between"><span className={labelCls}>Mobile Sync</span><span className={`font-bold ${headCls}`}>{settings.mobileSync ? '📱 On' : '❌ Off'}</span></div>
            </div>
          </div>
          <p className={`text-xs ${labelCls} text-center`}>Only admin can change these settings</p>
        </motion.div>
      )}

      {activeUserTab === 'my-requests' && (
        <motion.div key="myreqs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          {/* Recommend new user */}
          <div className={cardCls}>
            <h3 className={`text-sm font-bold mb-2 ${headCls}`}><Users className="w-4 h-4 inline mr-1" />Recommend New User</h3>
            <div className="space-y-2">
              <input placeholder="Login key (e.g. john)" value={recKey} onChange={e => setRecKey(e.target.value)} className={inputCls} />
              <input placeholder="Display name" value={recDisplay} onChange={e => setRecDisplay(e.target.value)} className={inputCls} />
              <PwInput label="" value={recPw} onChange={setRecPw} show={showPasswords['rec']} onToggle={() => setShowPasswords(p => ({...p, 'rec': !p['rec']}))} />
              <button onClick={async () => { const r = await submitRequest({ type: 'recommend_user', recommendedKey: recKey, recommendedDisplay: recDisplay, recommendedPassword: recPw }); setRecMsg(r.success ? { type:'success', text:`Sent! Tracking: ${r.trackingNo}` } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setRecKey(''); setRecDisplay(''); setRecPw(''); bump(); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}><Send className="w-4 h-4 inline mr-1" />Recommend</button>
            </div>
            {recMsg && <div className="mt-2"><Msg m={recMsg} /></div>}
          </div>

          {/* My requests history */}
          <div className={cardCls}>
            <h3 className={`text-xs font-bold mb-2 ${headCls}`}>My Requests</h3>
            {/* Role upgrade button */}
            <button onClick={async () => { const r = await submitRequest({ type: 'role_upgrade', message: 'Requesting admin access', desiredRole: 'admin' }); if (r.success) bump(); }} className={`w-full py-2 rounded-lg text-xs font-semibold mb-3 ${btnSecondary}`}>🛡️ Request Role Upgrade</button>
            {userReqs.length === 0 && <p className={`text-xs ${labelCls}`}>No requests yet</p>}
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {userReqs.slice().reverse().map(r => (
                <div key={r.id} className={`px-3 py-3 rounded-lg text-xs ${isGlass ? 'bg-white/50' : 'bg-white'} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${headCls}`}>{r.type === 'password_reset' ? '🔑 Password' : r.type === 'recommend_user' ? '👤 New User' : r.type === 'appeal' ? '🔴 Appeal' : r.type === 'role_upgrade' ? '🛡️ Role Upgrade' : '💡 Suggestion'}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${r.status === 'submitted' ? 'bg-gray-100 text-gray-600' : r.status === 'received' ? 'bg-blue-100 text-blue-700' : r.status === 'reviewing' ? 'bg-purple-100 text-purple-700' : r.status === 'editing' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-600' : r.status === 'appealed' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                  </div>
                  <p className={`text-[10px] ${labelCls}`}>#{r.trackingNo} • {fmtTime(r.timestamp)}</p>
                  {r.adminNote && <p className="text-xs text-blue-600 font-medium">Admin: {r.adminNote}</p>}
                  {r.editRequest && r.status === 'editing' && (
                    <div className="space-y-2 mt-1">
                      <div className={`px-3 py-2 rounded-lg text-xs ${isGlass ? 'bg-amber-50 border border-amber-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <p className="text-amber-700 font-semibold">✏️ Admin requested changes:</p>
                        <p className="text-amber-600 mt-0.5">{r.editRequest}</p>
                      </div>
                      <input
                        placeholder={r.type === 'password_reset' ? 'Updated password...' : r.type === 'suggestion' ? 'Updated message...' : 'Your updated response...'}
                        value={editInputs[r.id] || ''}
                        onChange={e => setEditInputs(p => ({...p, [r.id]: e.target.value}))}
                        className={inputCls}
                      />
                      <button onClick={async () => {
                        const val = editInputs[r.id];
                        if (!val?.trim()) return;
                        // Update the request with new data and resubmit
                        if (r.type === 'password_reset') r.desiredPassword = val;
                        else if (r.type === 'suggestion') r.message = val;
                        else if (r.type === 'recommend_user') r.recommendedPassword = val;
                        r.status = 'submitted';
                        r.editRequest = undefined;
                        r.history.push({ status: 'submitted', timestamp: new Date().toISOString(), by: user?.key || '', note: 'Resubmitted after edit' });
                        if (cloud) await saveCloudRequest(r);
                        setEditInputs(p => ({...p, [r.id]: ''}));
                        bump();
                      }} className={`w-full py-1.5 rounded-lg text-[11px] font-semibold ${btnPrimary}`}>
                        📤 Resubmit
                      </button>
                    </div>
                  )}
                  {r.status === 'rejected' && <button onClick={async () => { const msg = prompt('Your appeal message:'); if (msg) { await appealRequest(r.id, msg); bump(); } }} className="mt-1 w-full py-1.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100">⚖️ Appeal Decision</button>}
                  {r.history && <div className={`text-[9px] space-y-0.5 ${labelCls} mt-1`}>{r.history.slice(-3).map((h, i) => <div key={i}>• {h.status}{h.note ? `: ${h.note}` : ''}</div>)}</div>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeUserTab === 'suggest' && (
        <motion.div key="suggest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <div className={cardCls}>
            <h3 className={`text-sm font-bold mb-2 ${headCls}`}><MessageSquare className="w-4 h-4 inline mr-1" />Send a Suggestion</h3>
            <div className="space-y-2">
              <textarea value={sugText} onChange={e => setSugText(e.target.value)} placeholder="Your suggestion or feedback..." rows={4} className={inputCls} />
              <button onClick={async () => { const r = await submitRequest({ type: 'suggestion', message: sugText }); setSugMsg(r.success ? { type:'success', text:`Sent! Tracking: ${r.trackingNo}` } : { type:'error', text: r.error || 'Failed' }); if (r.success) { setSugText(''); bump(); } }} className={`w-full py-2 rounded-lg font-semibold text-sm ${btnPrimary}`}><Send className="w-4 h-4 inline mr-1" />Submit</button>
            </div>
            {sugMsg && <div className="mt-2"><Msg m={sugMsg} /></div>}
          </div>
        </motion.div>
      )}

      {activeUserTab === 'notifications' && (
        <motion.div key="notifs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          {userNotifs.length === 0 && <div className={`${cardCls} text-center py-8`}><Bell className={`w-10 h-10 mx-auto mb-3 ${isGlass ? 'text-gray-300' : 'text-[#ccc]'}`} /><p className={`text-sm ${labelCls}`}>No notifications</p></div>}
          {userNotifs.map(n => {
            const isUnread = user ? !n.readBy.includes(user.key) : false;
            return (
              <div key={n.id} className={`${cardCls} ${isUnread ? 'border-l-4 border-l-amber-400' : ''}`} onClick={() => { if (user && isUnread) { markAsRead(n.id, user.key); bump(); } }}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{n.type === 'warning' ? '⚠️' : n.type === 'info' ? 'ℹ️' : '✅'}</span>
                  <div><p className={`text-sm font-semibold ${headCls}`}>{n.message}</p><p className={`text-[10px] ${labelCls}`}>{fmtTime(n.timestamp)}{isUnread && <span className="ml-2 text-amber-600 font-bold">NEW</span>}</p></div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {activeUserTab === 'data' && <DataTab />}
    </>
  );

  // ── Shared tabs ──
  function DataTab() {
    return (
      <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
        <button onClick={handleExport} className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${btnSecondary}`}><Download className="w-4 h-4" /> Export JSON</button>
        {isAdmin && <><button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${btnSecondary}`}><Upload className="w-4 h-4" /> Import JSON</button><input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />{importMsg && <Msg m={importMsg} />}<button onClick={handleResetData} className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/50"><Trash2 className="w-4 h-4" /> Reset All Data</button></>}
      </motion.div>
    );
  }

  function CloudTab() {
    return (
      <motion.div key="cloud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
        <div className={cardCls}><div className="flex items-center gap-2 mb-2"><Cloud className={`w-4 h-4 ${cloudEnabled ? 'text-green-500' : 'text-gray-400'}`} /><span className={`text-sm font-bold ${headCls}`}>{cloudEnabled ? 'Connected' : 'Not configured'}</span></div>{lastSynced && <p className={`text-xs ${labelCls}`}>Last: {lastSynced.toLocaleString()}</p>}</div>
        <button onClick={onForceSync} disabled={!cloudEnabled} className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${btnSecondary}`}><RefreshCw className="w-4 h-4" /> Force Sync</button>
        <button onClick={() => { localStorage.removeItem('screentime_setup_skipped'); onReconfigureCloud(); }} className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${btnSecondary}`}><Settings2 className="w-4 h-4" /> {CLOUD_ENABLED ? 'View Setup' : 'Set up'}</button>
      </motion.div>
    );
  }

  function AdvancedTab() {
    return (
      <motion.div key="advanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
        <button onClick={() => { const d = localStorage.getItem(`screentime_state_${user?.key}`) || '{}'; try { setDebugText(JSON.stringify(JSON.parse(d), null, 2)); } catch { setDebugText(d); } setShowDebug(!showDebug); }} className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${btnSecondary}`}><Code2 className="w-4 h-4" /> {showDebug ? 'Hide' : 'Show'} Debug</button>
        {showDebug && <pre className={`text-[10px] p-3 rounded-lg overflow-auto max-h-60 font-mono ${isGlass ? 'bg-gray-900 text-gray-100' : 'bg-[#0f0f0f] text-gray-100'}`}>{debugText}</pre>}
      </motion.div>
    );
  }

  // ── Modal ──
  const tabs = isAdmin ? adminTabs : userTabs;
  const activeTab = isAdmin ? activeAdminTab : activeUserTab;
  const setTab = isAdmin ? (t: string) => setActiveAdminTab(t as AdminTab) : (t: string) => setActiveUserTab(t as UserTab);
  const content = isAdmin ? adminContent : userContent;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 ${isGlass ? 'bg-black/30 backdrop-blur-md' : 'bg-black/50'}`} onClick={handleClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className={`relative w-full max-w-lg rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden ${isGlass ? 'bg-white/95 backdrop-blur-2xl' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isGlass ? 'border-gray-200/50' : 'border-[#e5e5e5]'}`}>
              <div className="flex items-center gap-2"><Settings2 className={`w-5 h-5 ${headCls}`} /><h2 className={`text-lg font-bold ${headCls}`}>Settings</h2></div>
              <button onClick={handleClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isGlass ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' : 'text-[#999] hover:text-[#0f0f0f]'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className={`flex border-b overflow-x-auto ${isGlass ? 'border-gray-200/50 bg-gray-50/50' : 'border-[#e5e5e5]'}`}>
              {tabs.map(t => { const Icon = t.icon; const a = activeTab === t.id; return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1 px-3 py-3 text-xs font-semibold whitespace-nowrap relative ${a ? (isGlass ? 'text-gray-900 border-b-2 border-gray-900' : 'text-[#0f0f0f] border-b-2 border-[#0f0f0f]') : (isGlass ? 'text-gray-500 hover:text-gray-700' : 'text-[#999] hover:text-[#666]')}`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                  {t.badge && t.badge > 0 ? <span className="ml-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{t.badge}</span> : null}
                </button>
              ); })}
            </div>
            <div className="p-5 overflow-y-auto"><AnimatePresence mode="wait">{content}</AnimatePresence></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Helper Components ──

function Field({ label, hint, icon: Icon, children }: { label: string; hint: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  const { theme } = useTheme();
  const g = theme === 'glass';
  return <div className={`p-4 rounded-xl ${g ? 'bg-gray-900/5 border border-gray-200/50' : 'bg-[#fafafa] border border-[#e5e5e5]'}`}><div className="flex items-center justify-between gap-3"><div className="flex-1"><div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${g ? 'text-gray-400' : 'text-[#999]'}`} /><label className={`text-sm font-bold ${g ? 'text-gray-900' : 'text-[#0f0f0f]'}`}>{label}</label></div><p className={`text-xs mt-0.5 ml-5 ${g ? 'text-gray-400' : 'text-[#999]'}`}>{hint}</p></div><div className="w-32">{children}</div></div></div>;
}

function PwInput({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  const { theme } = useTheme();
  const g = theme === 'glass';
  const cls = g ? 'w-full pl-3 pr-10 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10' : 'w-full pl-3 pr-10 py-2 border border-[#e5e5e5] rounded-lg bg-white text-sm focus:outline-none focus:border-[#0f0f0f]';
  return <div>{label && <label className={`block text-xs font-semibold mb-1 ${g ? 'text-gray-500' : 'text-[#666]'}`}>{label}</label>}<div className="relative"><input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={label || 'Password'} className={cls} /><button type="button" onClick={onToggle} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${g ? 'text-gray-400' : 'text-[#999]'}`}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>;
}

function UsersList({ users, headCls, labelCls, cardCls, isGlass }: { users: Array<{ key: string; display: string; role: UserRole }>; headCls: string; labelCls: string; cardCls: string; isGlass: boolean }) {
  return <div className={cardCls}><h3 className={`text-xs font-bold mb-2 ${headCls}`}>Users</h3><div className="space-y-1">{users.map(u => (<div key={u.key} className={`flex items-center justify-between px-3 py-2 rounded text-xs ${isGlass ? 'bg-white/50' : 'bg-white'}`}><div><span className={`font-semibold ${headCls}`}>{u.display}</span><span className={`ml-1.5 ${labelCls}`}>({u.key})</span></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></div>))}</div></div>;
}
