import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { isSupabaseConfigured } from './db/config';
import {
  fetchCloudUsers, saveCloudPassword, saveCloudUser,
  updateCloudUsername, updateCloudUserRole, deleteCloudUser,
} from './db/sync';
import type { UserRequest, PasswordResetRequest, RecommendUserRequest, SuggestionRequest, AdminNotification } from './types';

export type UserRole = 'admin' | 'user';

export interface User {
  username: string;
  role: UserRole;
  key: string;
}

interface AuthContextValue {
  user: User | null;
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
  removeUser: (userKey: string) => Promise<{ success: boolean; error?: string }>;
  // Requests
  submitPasswordReset: (userKey: string, desiredPassword: string) => { success: boolean; error?: string };
  submitRecommendUser: (recommendedKey: string, recommendedDisplay: string, recommendedPassword: string) => { success: boolean; error?: string };
  submitSuggestion: (message: string) => { success: boolean; error?: string };
  getPendingRequests: () => UserRequest[];
  getAllRequests: () => UserRequest[];
  getUserRequests: (userKey: string) => UserRequest[];
  resolveRequest: (id: string, status: 'approved' | 'rejected', extra?: { finalPassword?: string; adminReply?: string }) => Promise<boolean>;
  // Notifications
  sendNotification: (targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => void;
  getNotificationsForUser: (userKey: string) => AdminNotification[];
  getUnreadCount: (userKey: string) => number;
  markAsRead: (notifId: string, userKey: string) => void;
  getAllNotifications: () => AdminNotification[];
}

const DEFAULT_USERS: Record<string, { password: string; role: UserRole; display: string }> = {
  admin: { password: 'Rahas@2010', role: 'admin', display: 'Rahas' },
  rahas: { password: '452010', role: 'user', display: 'Rahas Sharma' },
};

const PASSWORDS_KEY = 'screentime_passwords';
const REQUESTS_KEY = 'screentime_requests';
const NOTIFS_KEY = 'screentime_notifications';

function loadPasswords(): Record<string, { password: string; role: UserRole; display: string }> {
  try { const s = localStorage.getItem(PASSWORDS_KEY); if (s) return { ...DEFAULT_USERS, ...JSON.parse(s) }; } catch {}
  return { ...DEFAULT_USERS };
}
function savePasswords(p: Record<string, { password: string; role: UserRole; display: string }>): void {
  try { localStorage.setItem(PASSWORDS_KEY, JSON.stringify(p)); } catch {}
}
function loadRequests(): UserRequest[] {
  try { const s = localStorage.getItem(REQUESTS_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveRequests(r: UserRequest[]): void {
  try { localStorage.setItem(REQUESTS_KEY, JSON.stringify(r)); } catch {}
}
function loadNotifs(): AdminNotification[] {
  try { const s = localStorage.getItem(NOTIFS_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveNotifs(n: AdminNotification[]): void {
  try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(n)); } catch {}
}

export function verifyAdminPassword(password: string): boolean {
  return loadPasswords().admin?.password === password;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, login: async () => ({ success: false }), logout: () => {}, isAdmin: false,
  verifyPassword: () => false, changePassword: async () => false, getUserDisplay: () => '', getAllUsers: () => [],
  addUser: async () => ({ success: false }), changeUsername: async () => ({ success: false }),
  changeUserRole: async () => ({ success: false }), removeUser: async () => ({ success: false }),
  submitPasswordReset: () => ({ success: false }), submitRecommendUser: () => ({ success: false }),
  submitSuggestion: () => ({ success: false }), getPendingRequests: () => [], getAllRequests: () => [],
  getUserRequests: () => [], resolveRequest: async () => false,
  sendNotification: () => {}, getNotificationsForUser: () => [], getUnreadCount: () => 0,
  markAsRead: () => {}, getAllNotifications: () => [],
});

function loadUser(): User | null {
  try { const s = localStorage.getItem('screentime_user'); if (s) return JSON.parse(s); } catch {}
  return null;
}
function saveUser(u: User | null) {
  try { if (u) localStorage.setItem('screentime_user', JSON.stringify(u)); else localStorage.removeItem('screentime_user'); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [, setVer] = useState(0);
  const bump = () => setVer(v => v + 1);

  const login = useCallback(async (username: string, password: string, confirm: string): Promise<{ success: boolean; error?: string }> => {
    if (!password.trim() || !confirm.trim()) return { success: false, error: 'Please fill in all fields' };
    if (password !== confirm) return { success: false, error: 'Passwords do not match' };
    const key = username.toLowerCase().trim();
    let passwords = loadPasswords();
    if (isSupabaseConfigured()) {
      const cloud = await fetchCloudUsers();
      if (cloud && Object.keys(cloud).length > 0) { passwords = { ...passwords, ...cloud }; savePasswords(passwords); }
    }
    const entry = passwords[key];
    if (!entry) return { success: false, error: 'User not found' };
    if (entry.password !== password) return { success: false, error: 'Incorrect password' };
    const u: User = { username: entry.display, role: entry.role, key };
    setUser(u); saveUser(u);
    return { success: true };
  }, []);

  const logout = useCallback(() => { setUser(null); saveUser(null); }, []);

  const verifyPassword = useCallback((password: string): boolean => {
    if (!user) return false;
    const e = loadPasswords()[user.key];
    return !!e && e.password === password;
  }, [user]);

  const changePassword = useCallback(async (userKey: string, newPassword: string): Promise<boolean> => {
    const p = loadPasswords(); if (!p[userKey]) return false;
    if (isSupabaseConfigured()) { if (!(await saveCloudPassword(userKey, newPassword))) return false; }
    p[userKey] = { ...p[userKey], password: newPassword }; savePasswords(p); return true;
  }, []);

  const addUser = useCallback(async (key: string, display: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const k = key.toLowerCase().trim();
    if (!k || !display.trim() || !password.trim()) return { success: false, error: 'All fields required' };
    if (password.length < 6) return { success: false, error: 'Min 6 characters' };
    const p = loadPasswords(); if (p[k]) return { success: false, error: 'User already exists' };
    if (isSupabaseConfigured()) { if (!(await saveCloudUser(k, display.trim(), role, password))) return { success: false, error: 'Cloud save failed' }; }
    p[k] = { password, role, display: display.trim() }; savePasswords(p);
    return { success: true };
  }, []);

  const changeUsername = useCallback(async (userKey: string, newDisplay: string): Promise<{ success: boolean; error?: string }> => {
    if (!newDisplay.trim()) return { success: false, error: 'Name required' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (isSupabaseConfigured()) { if (!(await updateCloudUsername(userKey, newDisplay.trim()))) return { success: false, error: 'Cloud failed' }; }
    p[userKey] = { ...p[userKey], display: newDisplay.trim() }; savePasswords(p);
    if (user?.key === userKey) { const u = { ...user, username: newDisplay.trim() }; setUser(u); saveUser(u); }
    return { success: true };
  }, [user]);

  const changeUserRole = useCallback(async (userKey: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot change admin' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (isSupabaseConfigured()) { if (!(await updateCloudUserRole(userKey, newRole))) return { success: false, error: 'Cloud failed' }; }
    p[userKey] = { ...p[userKey], role: newRole }; savePasswords(p);
    return { success: true };
  }, []);

  const removeUser = useCallback(async (userKey: string): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot delete admin' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (isSupabaseConfigured()) { if (!(await deleteCloudUser(userKey))) return { success: false, error: 'Cloud failed' }; }
    delete p[userKey]; savePasswords(p);
    return { success: true };
  }, []);

  // ── Requests ──

  const submitPasswordReset = useCallback((userKey: string, desiredPassword: string): { success: boolean; error?: string } => {
    if (!desiredPassword.trim() || desiredPassword.length < 6) return { success: false, error: 'Password min 6 chars' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'User not found' };
    if (p[userKey].role === 'admin') return { success: false, error: 'Admin cannot use this' };
    const reqs = loadRequests();
    // Allow re-submit even after rejection — only block if there's a PENDING one
    if (reqs.find(r => r.type === 'password_reset' && (r as PasswordResetRequest).userKey === userKey && r.status === 'pending'))
      return { success: false, error: 'A request is already pending' };
    const req: PasswordResetRequest = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'password_reset', userKey, userDisplay: p[userKey].display,
      desiredPassword, timestamp: new Date().toISOString(), status: 'pending',
    };
    reqs.push(req); saveRequests(reqs); bump();
    return { success: true };
  }, []);

  const submitRecommendUser = useCallback((recommendedKey: string, recommendedDisplay: string, recommendedPassword: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'Not logged in' };
    const k = recommendedKey.toLowerCase().trim();
    if (!k || !recommendedDisplay.trim() || !recommendedPassword.trim()) return { success: false, error: 'All fields required' };
    if (recommendedPassword.length < 6) return { success: false, error: 'Password min 6 chars' };
    const p = loadPasswords(); if (p[k]) return { success: false, error: 'User key already exists' };
    const reqs = loadRequests();
    if (reqs.find(r => r.type === 'recommend_user' && (r as RecommendUserRequest).recommendedKey === k && r.status === 'pending'))
      return { success: false, error: 'Already recommended' };
    const req: RecommendUserRequest = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'recommend_user', userKey: user.key, userDisplay: user.username,
      recommendedKey: k, recommendedDisplay: recommendedDisplay.trim(),
      recommendedPassword, timestamp: new Date().toISOString(), status: 'pending',
    };
    reqs.push(req); saveRequests(reqs); bump();
    return { success: true };
  }, [user]);

  const submitSuggestion = useCallback((message: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'Not logged in' };
    if (!message.trim()) return { success: false, error: 'Message required' };
    const req: SuggestionRequest = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'suggestion', userKey: user.key, userDisplay: user.username,
      message: message.trim(), timestamp: new Date().toISOString(), status: 'pending',
    };
    const reqs = loadRequests(); reqs.push(req); saveRequests(reqs); bump();
    return { success: true };
  }, [user]);

  const getPendingRequests = useCallback((): UserRequest[] => loadRequests().filter(r => r.status === 'pending'), []);
  const getAllRequests = useCallback((): UserRequest[] => loadRequests(), []);
  const getUserRequests = useCallback((userKey: string): UserRequest[] => loadRequests().filter(r => r.userKey === userKey), []);

  const resolveRequest = useCallback(async (id: string, status: 'approved' | 'rejected', extra?: { finalPassword?: string; adminReply?: string }): Promise<boolean> => {
    const reqs = loadRequests();
    const idx = reqs.findIndex(r => r.id === id); if (idx === -1) return false;
    const req = reqs[idx];
    req.status = status;
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = user?.key || 'admin';

    if (status === 'approved') {
      if (req.type === 'password_reset') {
        const pw = extra?.finalPassword || (req as PasswordResetRequest).desiredPassword;
        if (!(await changePassword(req.userKey, pw))) return false;
      }
      if (req.type === 'recommend_user') {
        const r = req as RecommendUserRequest;
        const result = await addUser(r.recommendedKey, r.recommendedDisplay, r.recommendedPassword, 'user');
        if (!result.success) return false;
      }
      if (req.type === 'suggestion' && extra?.adminReply) {
        (req as SuggestionRequest).adminReply = extra.adminReply;
      }
    }

    saveRequests(reqs); bump();
    return true;
  }, [user, changePassword, addUser]);

  // ── Notifications ──

  const sendNotification = useCallback((targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => {
    const notif: AdminNotification = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      targetUserKey, fromAdmin: user?.key || 'admin',
      message, type, timestamp: new Date().toISOString(), readBy: [],
    };
    const notifs = loadNotifs(); notifs.push(notif); saveNotifs(notifs); bump();
  }, [user]);

  const getNotificationsForUser = useCallback((userKey: string): AdminNotification[] => {
    return loadNotifs().filter(n => n.targetUserKey === userKey || n.targetUserKey === 'all').reverse();
  }, []);

  const getUnreadCount = useCallback((userKey: string): number => {
    return loadNotifs().filter(n => (n.targetUserKey === userKey || n.targetUserKey === 'all') && !n.readBy.includes(userKey)).length;
  }, []);

  const markAsRead = useCallback((notifId: string, userKey: string) => {
    const notifs = loadNotifs();
    const n = notifs.find(x => x.id === notifId);
    if (n && !n.readBy.includes(userKey)) { n.readBy.push(userKey); saveNotifs(notifs); bump(); }
  }, []);

  const getAllNotifications = useCallback((): AdminNotification[] => loadNotifs().reverse(), []);

  const getUserDisplay = useCallback((userKey: string): string => loadPasswords()[userKey]?.display || userKey, []);
  const getAllUsers = useCallback(() => Object.entries(loadPasswords()).map(([key, val]) => ({ key, display: val.display, role: val.role })), []);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAdmin, verifyPassword, changePassword,
      getUserDisplay, getAllUsers, addUser, changeUsername, changeUserRole, removeUser,
      submitPasswordReset, submitRecommendUser, submitSuggestion,
      getPendingRequests, getAllRequests, getUserRequests, resolveRequest,
      sendNotification, getNotificationsForUser, getUnreadCount, markAsRead, getAllNotifications,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
