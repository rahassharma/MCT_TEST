import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { isSupabaseConfigured } from './db/config';
import {
  fetchCloudUsers,
  saveCloudPassword,
  saveCloudUser,
  updateCloudUsername,
  updateCloudUserRole,
  deleteCloudUser,
} from './db/sync';
import type { PasswordResetRequest } from './types';

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
  // Password reset requests
  submitPasswordReset: (userKey: string, desiredPassword: string) => { success: boolean; error?: string };
  getPendingResets: () => PasswordResetRequest[];
  getAllResets: () => PasswordResetRequest[];
  resolveReset: (id: string, status: 'approved' | 'rejected', finalPassword?: string) => Promise<boolean>;
}

const DEFAULT_USERS: Record<string, { password: string; role: UserRole; display: string }> = {
  admin: { password: 'Rahas@2010', role: 'admin', display: 'Rahas' },
  rahas: { password: '452010', role: 'user', display: 'Rahas Sharma' },
};

const PASSWORDS_KEY = 'screentime_passwords';
const RESETS_KEY = 'screentime_password_resets';

function loadPasswords(): Record<string, { password: string; role: UserRole; display: string }> {
  try {
    const saved = localStorage.getItem(PASSWORDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_USERS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_USERS };
}

function savePasswords(passwords: Record<string, { password: string; role: UserRole; display: string }>): void {
  try {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  } catch {}
}

function loadResets(): PasswordResetRequest[] {
  try {
    const saved = localStorage.getItem(RESETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveResets(resets: PasswordResetRequest[]): void {
  try {
    localStorage.setItem(RESETS_KEY, JSON.stringify(resets));
  } catch {}
}

export function verifyAdminPassword(password: string): boolean {
  const passwords = loadPasswords();
  return passwords.admin?.password === password;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => ({ success: false }),
  logout: () => {},
  isAdmin: false,
  verifyPassword: () => false,
  changePassword: async () => false,
  getUserDisplay: () => '',
  getAllUsers: () => [],
  addUser: async () => ({ success: false }),
  changeUsername: async () => ({ success: false }),
  changeUserRole: async () => ({ success: false }),
  removeUser: async () => ({ success: false }),
  submitPasswordReset: () => ({ success: false }),
  getPendingResets: () => [],
  getAllResets: () => [],
  resolveReset: async () => false,
});

function loadUser(): User | null {
  try {
    const saved = localStorage.getItem('screentime_user');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveUser(user: User | null) {
  try {
    if (user) localStorage.setItem('screentime_user', JSON.stringify(user));
    else localStorage.removeItem('screentime_user');
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [, setResetVersion] = useState(0);

  const login = useCallback(async (username: string, password: string, confirm: string): Promise<{ success: boolean; error?: string }> => {
    if (!password.trim() || !confirm.trim()) return { success: false, error: 'Please fill in all fields' };
    if (password !== confirm) return { success: false, error: 'Passwords do not match' };

    const key = username.toLowerCase().trim();
    let passwords = loadPasswords();

    if (isSupabaseConfigured()) {
      const cloudUsers = await fetchCloudUsers();
      if (cloudUsers && Object.keys(cloudUsers).length > 0) {
        passwords = { ...passwords, ...cloudUsers };
        savePasswords(passwords);
      }
    }

    const entry = passwords[key];
    if (!entry) return { success: false, error: 'User not found' };
    if (entry.password !== password) return { success: false, error: 'Incorrect password' };

    const u: User = { username: entry.display, role: entry.role, key };
    setUser(u);
    saveUser(u);
    return { success: true };
  }, []);

  const logout = useCallback(() => { setUser(null); saveUser(null); }, []);

  const verifyPassword = useCallback((password: string): boolean => {
    if (!user) return false;
    const passwords = loadPasswords();
    const entry = passwords[user.key];
    return !!entry && entry.password === password;
  }, [user]);

  const changePassword = useCallback(async (userKey: string, newPassword: string): Promise<boolean> => {
    const passwords = loadPasswords();
    if (!passwords[userKey]) return false;
    if (isSupabaseConfigured()) {
      const cloudOk = await saveCloudPassword(userKey, newPassword);
      if (!cloudOk) return false;
    }
    passwords[userKey] = { ...passwords[userKey], password: newPassword };
    savePasswords(passwords);
    return true;
  }, []);

  const addUser = useCallback(async (key: string, display: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const normalizedKey = key.toLowerCase().trim();
    if (!normalizedKey) return { success: false, error: 'Username key cannot be empty' };
    if (!display.trim()) return { success: false, error: 'Display name cannot be empty' };
    if (!password.trim()) return { success: false, error: 'Password cannot be empty' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
    const passwords = loadPasswords();
    if (passwords[normalizedKey]) return { success: false, error: 'User already exists' };
    if (isSupabaseConfigured()) {
      const cloudOk = await saveCloudUser(normalizedKey, display.trim(), role, password);
      if (!cloudOk) return { success: false, error: 'Failed to save to cloud' };
    }
    passwords[normalizedKey] = { password, role, display: display.trim() };
    savePasswords(passwords);
    return { success: true };
  }, []);

  const changeUsername = useCallback(async (userKey: string, newDisplay: string): Promise<{ success: boolean; error?: string }> => {
    if (!newDisplay.trim()) return { success: false, error: 'Display name cannot be empty' };
    const passwords = loadPasswords();
    if (!passwords[userKey]) return { success: false, error: 'User not found' };
    if (isSupabaseConfigured()) {
      const cloudOk = await updateCloudUsername(userKey, newDisplay.trim());
      if (!cloudOk) return { success: false, error: 'Failed to update in cloud' };
    }
    passwords[userKey] = { ...passwords[userKey], display: newDisplay.trim() };
    savePasswords(passwords);
    if (user && user.key === userKey) {
      const updated = { ...user, username: newDisplay.trim() };
      setUser(updated);
      saveUser(updated);
    }
    return { success: true };
  }, [user]);

  const changeUserRole = useCallback(async (userKey: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot change the admin role' };
    const passwords = loadPasswords();
    if (!passwords[userKey]) return { success: false, error: 'User not found' };
    if (isSupabaseConfigured()) {
      const cloudOk = await updateCloudUserRole(userKey, newRole);
      if (!cloudOk) return { success: false, error: 'Failed to update in cloud' };
    }
    passwords[userKey] = { ...passwords[userKey], role: newRole };
    savePasswords(passwords);
    return { success: true };
  }, []);

  const removeUser = useCallback(async (userKey: string): Promise<{ success: boolean; error?: string }> => {
    if (userKey === 'admin') return { success: false, error: 'Cannot delete admin' };
    const passwords = loadPasswords();
    if (!passwords[userKey]) return { success: false, error: 'User not found' };
    if (isSupabaseConfigured()) {
      const cloudOk = await deleteCloudUser(userKey);
      if (!cloudOk) return { success: false, error: 'Failed to delete from cloud' };
    }
    delete passwords[userKey];
    savePasswords(passwords);
    return { success: true };
  }, []);

  // ── Password Reset Requests ──

  const submitPasswordReset = useCallback((userKey: string, desiredPassword: string): { success: boolean; error?: string } => {
    if (!desiredPassword.trim()) return { success: false, error: 'Password cannot be empty' };
    if (desiredPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

    const passwords = loadPasswords();
    if (!passwords[userKey]) return { success: false, error: 'User not found' };
    if (passwords[userKey].role === 'admin') return { success: false, error: 'Admin cannot use forgot password' };

    const resets = loadResets();
    const existing = resets.find(r => r.userKey === userKey && r.status === 'pending');
    if (existing) return { success: false, error: 'A reset request is already pending' };

    const req: PasswordResetRequest = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'password_reset',
      userKey,
      userDisplay: passwords[userKey].display,
      desiredPassword,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    resets.push(req);
    saveResets(resets);
    setResetVersion(v => v + 1);
    return { success: true };
  }, []);

  const getPendingResets = useCallback((): PasswordResetRequest[] => {
    return loadResets().filter(r => r.status === 'pending');
  }, []);

  const getAllResets = useCallback((): PasswordResetRequest[] => {
    return loadResets();
  }, []);

  const resolveReset = useCallback(async (id: string, status: 'approved' | 'rejected', finalPassword?: string): Promise<boolean> => {
    const resets = loadResets();
    const idx = resets.findIndex(r => r.id === id);
    if (idx === -1) return false;

    resets[idx].status = status;
    resets[idx].resolvedAt = new Date().toISOString();
    resets[idx].resolvedBy = user?.key || 'admin';

    if (status === 'approved') {
      // Use finalPassword if admin edited it, otherwise use the user's desired password
      const newPw = finalPassword || resets[idx].desiredPassword;
      const ok = await changePassword(resets[idx].userKey, newPw);
      if (!ok) return false;
    }

    saveResets(resets);
    setResetVersion(v => v + 1);
    return true;
  }, [user, changePassword]);

  const getUserDisplay = useCallback((userKey: string): string => {
    const passwords = loadPasswords();
    return passwords[userKey]?.display || userKey;
  }, []);

  const getAllUsers = useCallback((): Array<{ key: string; display: string; role: UserRole }> => {
    const passwords = loadPasswords();
    return Object.entries(passwords).map(([key, val]) => ({
      key, display: val.display, role: val.role,
    }));
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAdmin, verifyPassword, changePassword,
      getUserDisplay, getAllUsers, addUser, changeUsername, changeUserRole, removeUser,
      submitPasswordReset, getPendingResets, getAllResets, resolveReset,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
