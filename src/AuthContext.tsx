import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { isSupabaseConfigured } from './db/config';
import {
  fetchCloudUsers, saveCloudPassword, saveCloudUser,
  updateCloudUsername, updateCloudUserRole, deleteCloudUser,
  fetchCloudRequests, saveCloudRequest,
  fetchCloudNotifications, saveCloudNotification, updateNotifReadBy,
  fetchDeletedUsers, addDeletedUser, removeDeletedUser,
} from './db/sync';
import type { UserRequest, RequestStatus, AdminNotification } from './types';
import { signInWithEmail, signUpWithEmail, sendPasswordReset, setNewPassword, signOutCloud, getCurrentSession, getCurrentAccount, resendConfirmation } from './db/auth';
import { fetchPeople, createPerson, personDataKey, type Person } from './db/people';
import { getSupabaseClient } from './db/client';

export type UserRole = 'admin' | 'user';
export interface User { username: string; role: UserRole; key: string; }

interface AuthContextValue {
  user: User | null;
  isDeleted: boolean;
  deletedMessage: string;
  login: (username: string, password: string, confirm: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  verifyPassword: (password: string) => boolean;
  changePassword: (userKey: string, newPassword: string) => Promise<boolean>;
  getUserDisplay: (userKey: string) => string;
  getAllUsers: () => Array<{ key: string; display: string; role: UserRole }>;
  addUser: (key: string, display: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  changeUsername: (userKey: string, newDisplay: string) => Promise<{ success: boolean; error?: string }>;
  changeUserRole: (userKey: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  removeUser: (userKey: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  // Requests
  submitRequest: (data: Partial<UserRequest>) => Promise<{ success: boolean; error?: string; trackingNo?: string }>;
  updateRequestStatus: (id: string, status: RequestStatus, note?: string, extra?: Record<string, string>) => Promise<boolean>;
  appealRequest: (id: string, message: string) => Promise<boolean>;
  getPendingRequests: () => UserRequest[];
  getAllRequests: () => UserRequest[];
  getUserRequests: (userKey: string) => UserRequest[];
  // Notifications
  sendNotification: (targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => Promise<void>;
  getNotificationsForUser: (userKey: string) => AdminNotification[];
  getUnreadCount: (userKey: string) => number;
  markAsRead: (notifId: string, userKey: string) => Promise<void>;
  getAllNotifications: () => AdminNotification[];
  dataVersion: number;
  // Supabase accounts (cloud)
  people: Person[];
  selectPerson: (personId: string) => void;
  signUp: (email: string, password: string, display: string) => Promise<{ success: boolean; needsConfirm?: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  needsNewPassword: boolean;
  completePasswordReset: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  justVerified: boolean;
  continueAfterVerification: () => Promise<{ success: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_USERS: Record<string, { password: string; role: UserRole; display: string }> = {
  admin: { password: 'Rahas@2010', role: 'admin', display: 'Rahas' },
  rahas: { password: '452010', role: 'user', display: 'Rahas Sharma' },
};

const PASSWORDS_KEY = 'screentime_passwords';
function loadPasswords(): Record<string, { password: string; role: UserRole; display: string }> {
  try { const s = localStorage.getItem(PASSWORDS_KEY); if (s) return { ...DEFAULT_USERS, ...JSON.parse(s) }; } catch {} return { ...DEFAULT_USERS };
}
function savePasswords(p: Record<string, { password: string; role: UserRole; display: string }>) {
  try { localStorage.setItem(PASSWORDS_KEY, JSON.stringify(p)); } catch {}
}
export function verifyAdminPassword(pw: string): boolean { return loadPasswords().admin?.password === pw; }
function loadUser(): User | null { try { const s = localStorage.getItem('screentime_user'); if (s) return JSON.parse(s); } catch {} return null; }
function saveUser(u: User | null) { try { if (u) localStorage.setItem('screentime_user', JSON.stringify(u)); else localStorage.removeItem('screentime_user'); } catch {} }

// Supabase clears the auth tokens from the address once it has read them, so capture the hash
// as soon as this module loads (before any Supabase call) to know whether this visit came from
// a confirmation or password-reset link.
const LAUNCH_HASH = typeof window !== 'undefined' ? window.location.hash : '';

const mkId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const AuthContext = createContext<AuthContextValue>({
  user: null, isDeleted: false, deletedMessage: '', login: async () => ({ success: false }), logout: () => {},
  isAdmin: false, verifyPassword: () => false, changePassword: async () => false, getUserDisplay: () => '', getAllUsers: () => [],
  addUser: async () => ({ success: false }), changeUsername: async () => ({ success: false }),
  changeUserRole: async () => ({ success: false }), removeUser: async () => ({ success: false }),
  submitRequest: async () => ({ success: false }), updateRequestStatus: async () => false,
  appealRequest: async () => false,
  getPendingRequests: () => [], getAllRequests: () => [], getUserRequests: () => [],
  sendNotification: async () => {}, getNotificationsForUser: () => [], getUnreadCount: () => 0,
  markAsRead: async () => {}, getAllNotifications: () => [], dataVersion: 0,
  people: [], selectPerson: () => {}, signUp: async () => ({ success: false }),
  sendPasswordReset: async () => ({ success: false }), needsNewPassword: false,
  completePasswordReset: async () => ({ success: false }), justVerified: false,
  continueAfterVerification: async () => ({ success: false }), resendConfirmation: async () => ({ success: false }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (isSupabaseConfigured() ? null : loadUser()));
  const [dataVersion, setDataVersion] = useState(0);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState('');
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const bump = () => setDataVersion(v => v + 1);
  const cloud = isSupabaseConfigured();

  // Tracking number counter
  const getNextTrackingNo = useCallback(() => {
    const count = requests.length + 1;
    return `REQ-${String(count).padStart(3, '0')}`;
  }, [requests]);

  // Cloud sync
  useEffect(() => {
    const sync = async () => {
      if (!cloud) return;
      try {
        const [reqs, notifs, del] = await Promise.all([fetchCloudRequests(), fetchCloudNotifications(), fetchDeletedUsers()]);
        setRequests(reqs); setNotifications(notifs); setDeletedUsers(del);
      } catch {}
    };
    sync();
    const i = setInterval(sync, 5000);
    return () => clearInterval(i);
  }, [cloud]);

  useEffect(() => {
    if (!user) return;
    if (deletedUsers[user.key]) { setIsDeleted(true); setDeletedMessage(deletedUsers[user.key]); }
    else { setIsDeleted(false); setDeletedMessage(''); }
  }, [user, deletedUsers]);

  // ── Cloud accounts (Supabase Auth) ──
  const applyPeople = useCallback(async (preferredId: string | null): Promise<boolean> => {
    try {
      let list = await fetchPeople();
      if (list.length === 0) {
        const acct = await getCurrentAccount();
        const created = await createPerson(acct?.display || 'Me');
        list = created ? [created] : [];
      }
      setPeople(list);
      const chosen = list.find(p => p.id === preferredId) ?? list[0];
      if (!chosen) return false;
      localStorage.setItem('guardian_selected_person', chosen.id);
      setUser({ username: chosen.display, role: 'admin', key: personDataKey(chosen) });
      return true;
    } catch {
      return false;
    }
  }, []);

  const selectPerson = useCallback((personId: string) => {
    const p = people.find(x => x.id === personId); if (!p) return;
    localStorage.setItem('guardian_selected_person', p.id);
    setUser({ username: p.display, role: 'admin', key: personDataKey(p) });
  }, [people]);

  // Restore a saved Supabase session on load. A password-reset link also creates a session,
  // so on that path we stop at the "choose a new password" step instead of logging in.
  useEffect(() => {
    if (!cloud) return;
    const client = getSupabaseClient();
    const { data: sub } = client
      ? client.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') { setNeedsNewPassword(true); setUser(null); }
        })
      : { data: { subscription: { unsubscribe: () => {} } } };
    let cancelled = false;
    (async () => {
      const session = await getCurrentSession();
      if (cancelled) return;
      if (!session) { setUser(null); setPeople([]); return; }
      if (LAUNCH_HASH.includes('type=signup')) { setJustVerified(true); setUser(null); return; }
      if (LAUNCH_HASH.includes('type=recovery')) { setNeedsNewPassword(true); setUser(null); return; }
      await applyPeople(localStorage.getItem('guardian_selected_person'));
    })();
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [cloud, applyPeople]);

  const signUp = useCallback(async (email: string, password: string, display: string) => {
    const r = await signUpWithEmail(email, password, display);
    if (!r.ok) return { success: false, error: r.error };
    if (!r.needsConfirm) {
      const ok = await applyPeople(null);
      if (!ok) return { success: false, error: 'Account created, but your data could not load. Check the database setup.' };
    }
    return { success: true, needsConfirm: r.needsConfirm };
  }, [applyPeople]);

  const sendResetEmail = useCallback(async (email: string) => {
    const r = await sendPasswordReset(email);
    return r.ok ? { success: true } : { success: false, error: r.error };
  }, []);

  const continueAfterVerification = useCallback(async () => {
    window.history.replaceState(null, '', window.location.pathname);
    setJustVerified(false);
    const ok = await applyPeople(null);
    return ok ? { success: true } : { success: false, error: 'Your email is verified, but your account data could not load. Check the database setup.' };
  }, [applyPeople]);

  const resendSignup = useCallback(async (email: string) => {
    const r = await resendConfirmation(email.trim());
    return r.ok ? { success: true } : { success: false, error: r.error };
  }, []);

  const completePasswordReset = useCallback(async (newPassword: string) => {
    const r = await setNewPassword(newPassword);
    if (!r.ok) return { success: false, error: r.error };
    window.history.replaceState(null, '', window.location.pathname);
    setNeedsNewPassword(false);
    await applyPeople(null);
    return { success: true };
  }, [applyPeople]);

  const login = useCallback(async (username: string, password: string, confirm: string): Promise<{ success: boolean; error?: string }> => {
    if (cloud) {
      if (!username.trim() || !password.trim()) return { success: false, error: 'Enter your email and password' };
      const r = await signInWithEmail(username.trim(), password);
      if (!r.ok) return { success: false, error: r.error };
      const ok = await applyPeople(null);
      if (!ok) return { success: false, error: 'Signed in, but your account data could not load. Check the database setup.' };
      return { success: true };
    }
    if (!password.trim() || !confirm.trim()) return { success: false, error: 'Fill in all fields' };
    if (password !== confirm) return { success: false, error: 'Passwords do not match' };
    const key = username.toLowerCase().trim();
    let passwords = loadPasswords();
    if (cloud) {
      const cu = await fetchCloudUsers();
      if (cu && Object.keys(cu).length > 0) { passwords = { ...passwords, ...cu }; savePasswords(passwords); }
      const del = await fetchDeletedUsers();
      if (del[key]) return { success: false, error: 'Account removed. Contact admin.' };
    }
    const entry = passwords[key];
    if (!entry) return { success: false, error: 'User not found' };
    if (entry.password !== password) return { success: false, error: 'Incorrect password' };
    const u: User = { username: entry.display, role: entry.role, key };
    setUser(u); saveUser(u); setIsDeleted(false);
    return { success: true };
  }, [cloud, applyPeople]);

  const logout = useCallback(() => { setUser(null); saveUser(null); setIsDeleted(false); setPeople([]); if (cloud) void signOutCloud(); }, [cloud]);
  const verifyPassword = useCallback((pw: string): boolean => { if (!user) return false; const e = loadPasswords()[user.key]; return !!e && e.password === pw; }, [user]);

  const changePassword = useCallback(async (userKey: string, newPw: string): Promise<boolean> => {
    const p = loadPasswords(); if (!p[userKey]) return false;
    if (cloud) { if (!(await saveCloudPassword(userKey, newPw))) return false; }
    p[userKey] = { ...p[userKey], password: newPw }; savePasswords(p); return true;
  }, [cloud]);

  const addUser = useCallback(async (key: string, display: string, pw: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const k = key.toLowerCase().trim();
    if (!k || !display.trim() || !pw.trim()) return { success: false, error: 'All fields required' };
    if (pw.length < 6) return { success: false, error: 'Min 6 chars' };
    const p = loadPasswords(); if (p[k]) return { success: false, error: 'Already exists' };
    if (cloud) { if (!(await saveCloudUser(k, display.trim(), role, pw))) return { success: false, error: 'Cloud failed' }; await removeDeletedUser(k); }
    p[k] = { password: pw, role, display: display.trim() }; savePasswords(p); bump();
    return { success: true };
  }, [cloud]);

  const changeUsername = useCallback(async (userKey: string, d: string): Promise<{ success: boolean; error?: string }> => {
    if (!d.trim()) return { success: false, error: 'Required' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (cloud) { if (!(await updateCloudUsername(userKey, d.trim()))) return { success: false, error: 'Cloud failed' }; }
    p[userKey] = { ...p[userKey], display: d.trim() }; savePasswords(p);
    if (user?.key === userKey) { const u = { ...user, username: d.trim() }; setUser(u); saveUser(u); }
    return { success: true };
  }, [user, cloud]);

  const changeUserRole = useCallback(async (userKey: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot change admin' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (cloud) { if (!(await updateCloudUserRole(userKey, newRole))) return { success: false, error: 'Cloud failed' }; }
    p[userKey] = { ...p[userKey], role: newRole }; savePasswords(p); return { success: true };
  }, [cloud]);

  const removeUser = useCallback(async (userKey: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot delete admin' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (cloud) { await addDeletedUser(userKey, reason || 'Account removed by admin.'); if (!(await deleteCloudUser(userKey))) return { success: false, error: 'Cloud failed' }; }
    delete p[userKey]; savePasswords(p); bump();
    return { success: true };
  }, [cloud]);

  // ── Multi-step Request System ──

  const submitRequest = useCallback(async (data: Partial<UserRequest>): Promise<{ success: boolean; error?: string; trackingNo?: string }> => {
    if (!user && data.type !== 'password_reset' && data.type !== 'appeal') return { success: false, error: 'Not logged in' };
    const trackingNo = getNextTrackingNo();
    const req: UserRequest = {
      id: mkId(),
      type: data.type || 'suggestion',
      trackingNo,
      userKey: data.userKey || user?.key || '',
      userDisplay: data.userDisplay || user?.username || '',
      status: 'submitted',
      timestamp: new Date().toISOString(),
      desiredPassword: data.desiredPassword,
      recommendedKey: data.recommendedKey,
      recommendedDisplay: data.recommendedDisplay,
      recommendedPassword: data.recommendedPassword,
      message: data.message,
      desiredRole: data.desiredRole,
      history: [{ status: 'submitted', timestamp: new Date().toISOString(), by: data.userKey || user?.key || '' }],
    };
    if (cloud) await saveCloudRequest(req);
    setRequests(prev => [...prev, req]); bump();
    return { success: true, trackingNo };
  }, [user, cloud, getNextTrackingNo]);

  const updateRequestStatus = useCallback(async (id: string, status: RequestStatus, note?: string, extra?: Record<string, string>): Promise<boolean> => {
    const req = requests.find(r => r.id === id);
    if (!req) return false;

    req.status = status;
    req.history.push({ status, timestamp: new Date().toISOString(), by: user?.key || 'admin', note });
    if (note) req.adminNote = note;
    if (status === 'editing' && note) req.editRequest = note;
    if (status === 'approved' || status === 'rejected') {
      req.resolvedAt = new Date().toISOString();
      req.resolvedBy = user?.key || 'admin';
    }

    // Execute approved actions
    if (status === 'approved') {
      if (req.type === 'password_reset' && req.desiredPassword) {
        const pw = extra?.finalPassword || req.desiredPassword;
        await changePassword(req.userKey, pw);
      }
      if (req.type === 'recommend_user' && req.recommendedKey) {
        await addUser(req.recommendedKey, req.recommendedDisplay || '', req.recommendedPassword || '', 'user');
      }
      if (req.type === 'appeal') {
        if (cloud) await removeDeletedUser(req.userKey);
      }
      if (req.type === 'role_upgrade' && req.desiredRole) {
        await changeUserRole(req.userKey, req.desiredRole as UserRole);
      }
    }

    if (cloud) await saveCloudRequest(req);
    setRequests([...requests]); bump();
    return true;
  }, [user, requests, cloud, changePassword, addUser, changeUserRole]);

  const appealRequest = useCallback(async (id: string, message: string): Promise<boolean> => {
    const req = requests.find(r => r.id === id);
    if (!req || req.status !== 'rejected') return false;
    req.status = 'appealed';
    req.appealMessage = message;
    req.appealTimestamp = new Date().toISOString();
    req.history.push({ status: 'appealed', timestamp: new Date().toISOString(), by: user?.key || '', note: message });
    if (cloud) await saveCloudRequest(req);
    setRequests([...requests]); bump();
    return true;
  }, [user, requests, cloud]);

  const getPendingRequests = useCallback((): UserRequest[] => requests.filter(r => !['approved', 'rejected'].includes(r.status)), [requests]);
  const getAllRequests = useCallback((): UserRequest[] => requests, [requests]);
  const getUserRequests = useCallback((userKey: string): UserRequest[] => requests.filter(r => r.userKey === userKey), [requests]);

  // ── Notifications ──
  const sendNotification = useCallback(async (targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => {
    const notif: AdminNotification = { id: mkId(), targetUserKey, fromAdmin: user?.key || 'admin', message, type, timestamp: new Date().toISOString(), readBy: [] };
    if (cloud) await saveCloudNotification(notif);
    setNotifications(prev => [notif, ...prev]); bump();
  }, [user, cloud]);

  const getNotificationsForUser = useCallback((userKey: string): AdminNotification[] => notifications.filter(n => n.targetUserKey === userKey || n.targetUserKey === 'all'), [notifications]);
  const getUnreadCount = useCallback((userKey: string): number => notifications.filter(n => (n.targetUserKey === userKey || n.targetUserKey === 'all') && !n.readBy.includes(userKey)).length, [notifications]);

  const markAsRead = useCallback(async (notifId: string, userKey: string) => {
    const n = notifications.find(x => x.id === notifId);
    if (n && !n.readBy.includes(userKey)) { n.readBy.push(userKey); if (cloud) await updateNotifReadBy(notifId, n.readBy); setNotifications([...notifications]); bump(); }
  }, [notifications, cloud]);

  const getAllNotifications = useCallback((): AdminNotification[] => notifications, [notifications]);
  const getUserDisplay = useCallback((k: string): string => loadPasswords()[k]?.display || k, []);
  const getAllUsers = useCallback(() => Object.entries(loadPasswords()).map(([key, val]) => ({ key, display: val.display, role: val.role })), []);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, isDeleted, deletedMessage, login, logout, isAdmin, verifyPassword, changePassword,
      getUserDisplay, getAllUsers, addUser, changeUsername, changeUserRole, removeUser,
      submitRequest, updateRequestStatus, appealRequest,
      getPendingRequests, getAllRequests, getUserRequests,
      sendNotification, getNotificationsForUser, getUnreadCount, markAsRead, getAllNotifications,
      dataVersion,
      people, selectPerson, signUp, sendPasswordReset: sendResetEmail, needsNewPassword, completePasswordReset,
      justVerified, continueAfterVerification, resendConfirmation: resendSignup,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
