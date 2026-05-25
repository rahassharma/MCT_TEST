import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { isSupabaseConfigured } from './db/config';
import {
  fetchCloudUsers, saveCloudPassword, saveCloudUser,
  updateCloudUsername, updateCloudUserRole, deleteCloudUser,
  fetchCloudRequests, saveCloudRequest,
  fetchCloudNotifications, saveCloudNotification, updateNotifReadBy,
  fetchDeletedUsers, addDeletedUser, removeDeletedUser,
} from './db/sync';
import type { UserRequest, PasswordResetRequest, RecommendUserRequest, SuggestionRequest, AdminNotification } from './types';

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
  submitPasswordReset: (userKey: string, desiredPassword: string) => Promise<{ success: boolean; error?: string }>;
  submitRecommendUser: (recommendedKey: string, recommendedDisplay: string, recommendedPassword: string) => Promise<{ success: boolean; error?: string }>;
  submitSuggestion: (message: string) => Promise<{ success: boolean; error?: string }>;
  submitAppeal: (message: string) => Promise<{ success: boolean; error?: string }>;
  getPendingRequests: () => UserRequest[];
  getAllRequests: () => UserRequest[];
  getUserRequests: (userKey: string) => UserRequest[];
  resolveRequest: (id: string, status: 'approved' | 'rejected', extra?: { finalPassword?: string; adminReply?: string }) => Promise<boolean>;
  sendNotification: (targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => Promise<void>;
  getNotificationsForUser: (userKey: string) => AdminNotification[];
  getUnreadCount: (userKey: string) => number;
  markAsRead: (notifId: string, userKey: string) => Promise<void>;
  getAllNotifications: () => AdminNotification[];
  dataVersion: number;
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
export function verifyAdminPassword(password: string): boolean { return loadPasswords().admin?.password === password; }

function loadUser(): User | null { try { const s = localStorage.getItem('screentime_user'); if (s) return JSON.parse(s); } catch {} return null; }
function saveUser(u: User | null) { try { if (u) localStorage.setItem('screentime_user', JSON.stringify(u)); else localStorage.removeItem('screentime_user'); } catch {} }

const AuthContext = createContext<AuthContextValue>({
  user: null, isDeleted: false, deletedMessage: '', login: async () => ({ success: false }), logout: () => {},
  isAdmin: false, verifyPassword: () => false, changePassword: async () => false, getUserDisplay: () => '', getAllUsers: () => [],
  addUser: async () => ({ success: false }), changeUsername: async () => ({ success: false }),
  changeUserRole: async () => ({ success: false }), removeUser: async () => ({ success: false }),
  submitPasswordReset: async () => ({ success: false }), submitRecommendUser: async () => ({ success: false }),
  submitSuggestion: async () => ({ success: false }), submitAppeal: async () => ({ success: false }),
  getPendingRequests: () => [], getAllRequests: () => [], getUserRequests: () => [], resolveRequest: async () => false,
  sendNotification: async () => {}, getNotificationsForUser: () => [], getUnreadCount: () => 0,
  markAsRead: async () => {}, getAllNotifications: () => [], dataVersion: 0,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [dataVersion, setDataVersion] = useState(0);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState('');

  // Cloud-synced caches (refreshed periodically)
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<Record<string, string>>({});

  const bump = () => setDataVersion(v => v + 1);
  const cloud = isSupabaseConfigured();

  // Periodic sync from cloud (every 5 seconds)
  useEffect(() => {
    const sync = async () => {
      if (!cloud) return;
      try {
        const [reqs, notifs, deleted] = await Promise.all([
          fetchCloudRequests(), fetchCloudNotifications(), fetchDeletedUsers(),
        ]);
        setRequests(reqs);
        setNotifications(notifs);
        setDeletedUsers(deleted);
      } catch {}
    };
    sync();
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, [cloud]);

  // Check if current user is deleted
  useEffect(() => {
    if (!user) return;
    if (deletedUsers[user.key]) {
      setIsDeleted(true);
      setDeletedMessage(deletedUsers[user.key]);
    } else {
      setIsDeleted(false);
      setDeletedMessage('');
    }
  }, [user, deletedUsers]);

  const login = useCallback(async (username: string, password: string, confirm: string): Promise<{ success: boolean; error?: string }> => {
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
  }, [cloud]);

  const logout = useCallback(() => { setUser(null); saveUser(null); setIsDeleted(false); }, []);

  const verifyPassword = useCallback((pw: string): boolean => {
    if (!user) return false; const e = loadPasswords()[user.key]; return !!e && e.password === pw;
  }, [user]);

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
    if (cloud) {
      if (!(await saveCloudUser(k, display.trim(), role, pw))) return { success: false, error: 'Cloud failed' };
      await removeDeletedUser(k); // Clear deleted status
    }
    p[k] = { password: pw, role, display: display.trim() }; savePasswords(p); bump();
    return { success: true };
  }, [cloud]);

  const changeUsername = useCallback(async (userKey: string, newDisplay: string): Promise<{ success: boolean; error?: string }> => {
    if (!newDisplay.trim()) return { success: false, error: 'Name required' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (cloud) { if (!(await updateCloudUsername(userKey, newDisplay.trim()))) return { success: false, error: 'Cloud failed' }; }
    p[userKey] = { ...p[userKey], display: newDisplay.trim() }; savePasswords(p);
    if (user?.key === userKey) { const u = { ...user, username: newDisplay.trim() }; setUser(u); saveUser(u); }
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
    if (cloud) {
      await addDeletedUser(userKey, reason || 'Account removed by admin.');
      if (!(await deleteCloudUser(userKey))) return { success: false, error: 'Cloud failed' };
    }
    delete p[userKey]; savePasswords(p); bump();
    return { success: true };
  }, [cloud]);

  // ── Requests (all cloud-backed) ──

  const mkId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const submitPasswordReset = useCallback(async (userKey: string, desiredPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!desiredPassword.trim() || desiredPassword.length < 6) return { success: false, error: 'Min 6 chars' };
    const p = loadPasswords(); if (!p[userKey]) return { success: false, error: 'Not found' };
    if (p[userKey].role === 'admin') return { success: false, error: 'Admin cannot use this' };
    if (requests.find(r => r.type === 'password_reset' && r.userKey === userKey && r.status === 'pending'))
      return { success: false, error: 'Already pending' };
    const req: PasswordResetRequest = {
      id: mkId(), type: 'password_reset', userKey, userDisplay: p[userKey].display,
      desiredPassword, timestamp: new Date().toISOString(), status: 'pending',
    };
    if (cloud) await saveCloudRequest(req);
    setRequests(prev => [...prev, req]); bump();
    return { success: true };
  }, [cloud, requests]);

  const submitRecommendUser = useCallback(async (recKey: string, recDisplay: string, recPw: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };
    const k = recKey.toLowerCase().trim();
    if (!k || !recDisplay.trim() || !recPw.trim()) return { success: false, error: 'All fields required' };
    if (recPw.length < 6) return { success: false, error: 'Min 6 chars' };
    const p = loadPasswords(); if (p[k]) return { success: false, error: 'Key taken' };
    if (requests.find(r => r.type === 'recommend_user' && (r as RecommendUserRequest).recommendedKey === k && r.status === 'pending'))
      return { success: false, error: 'Already recommended' };
    const req: RecommendUserRequest = {
      id: mkId(), type: 'recommend_user', userKey: user.key, userDisplay: user.username,
      recommendedKey: k, recommendedDisplay: recDisplay.trim(), recommendedPassword: recPw,
      timestamp: new Date().toISOString(), status: 'pending',
    };
    if (cloud) await saveCloudRequest(req);
    setRequests(prev => [...prev, req]); bump();
    return { success: true };
  }, [user, cloud, requests]);

  const submitSuggestion = useCallback(async (message: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };
    if (!message.trim()) return { success: false, error: 'Required' };
    const req: SuggestionRequest = {
      id: mkId(), type: 'suggestion', userKey: user.key, userDisplay: user.username,
      message: message.trim(), timestamp: new Date().toISOString(), status: 'pending',
    };
    if (cloud) await saveCloudRequest(req);
    setRequests(prev => [...prev, req]); bump();
    return { success: true };
  }, [user, cloud]);

  const submitAppeal = useCallback(async (message: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };
    const req: SuggestionRequest = {
      id: mkId(), type: 'suggestion', userKey: user.key, userDisplay: user.username,
      message: `🔴 ACCOUNT APPEAL: ${message.trim()}`, timestamp: new Date().toISOString(), status: 'pending',
    };
    if (cloud) await saveCloudRequest(req);
    setRequests(prev => [...prev, req]); bump();
    return { success: true };
  }, [user, cloud]);

  const getPendingRequests = useCallback((): UserRequest[] => requests.filter(r => r.status === 'pending'), [requests]);
  const getAllRequests = useCallback((): UserRequest[] => requests, [requests]);
  const getUserRequests = useCallback((userKey: string): UserRequest[] => requests.filter(r => r.userKey === userKey), [requests]);

  const resolveRequest = useCallback(async (id: string, status: 'approved' | 'rejected', extra?: { finalPassword?: string; adminReply?: string }): Promise<boolean> => {
    const req = requests.find(r => r.id === id);
    if (!req) return false;
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
    }
    if (req.type === 'suggestion' && extra?.adminReply) {
      (req as SuggestionRequest).adminReply = extra.adminReply;
    }

    if (cloud) await saveCloudRequest(req);
    setRequests([...requests]); bump();
    return true;
  }, [user, requests, cloud, changePassword, addUser]);

  // ── Notifications (cloud-backed) ──

  const sendNotification = useCallback(async (targetUserKey: string, message: string, type: 'warning' | 'info' | 'success') => {
    const notif: AdminNotification = {
      id: mkId(), targetUserKey, fromAdmin: user?.key || 'admin',
      message, type, timestamp: new Date().toISOString(), readBy: [],
    };
    if (cloud) await saveCloudNotification(notif);
    setNotifications(prev => [notif, ...prev]); bump();
  }, [user, cloud]);

  const getNotificationsForUser = useCallback((userKey: string): AdminNotification[] => {
    return notifications.filter(n => n.targetUserKey === userKey || n.targetUserKey === 'all');
  }, [notifications]);

  const getUnreadCount = useCallback((userKey: string): number => {
    return notifications.filter(n => (n.targetUserKey === userKey || n.targetUserKey === 'all') && !n.readBy.includes(userKey)).length;
  }, [notifications]);

  const markAsRead = useCallback(async (notifId: string, userKey: string) => {
    const n = notifications.find(x => x.id === notifId);
    if (n && !n.readBy.includes(userKey)) {
      n.readBy.push(userKey);
      if (cloud) await updateNotifReadBy(notifId, n.readBy);
      setNotifications([...notifications]); bump();
    }
  }, [notifications, cloud]);

  const getAllNotifications = useCallback((): AdminNotification[] => notifications, [notifications]);

  const getUserDisplay = useCallback((userKey: string): string => loadPasswords()[userKey]?.display || userKey, []);
  const getAllUsers = useCallback(() => Object.entries(loadPasswords()).map(([key, val]) => ({ key, display: val.display, role: val.role })), []);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, isDeleted, deletedMessage, login, logout, isAdmin, verifyPassword, changePassword,
      getUserDisplay, getAllUsers, addUser, changeUsername, changeUserRole, removeUser,
      submitPasswordReset, submitRecommendUser, submitSuggestion, submitAppeal,
      getPendingRequests, getAllRequests, getUserRequests, resolveRequest,
      sendNotification, getNotificationsForUser, getUnreadCount, markAsRead, getAllNotifications,
      dataVersion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
