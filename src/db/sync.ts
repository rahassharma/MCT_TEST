import { getSupabaseClient } from './client';
import { getOwnerId } from './auth';
import type { AppState, UserRequest, AdminNotification } from '../types';
import type { UserRole } from '../AuthContext';

export interface UserData { user_key: string; state: AppState; updated_at: string; }
export interface CloudUser { user_key: string; display: string; role: UserRole; password: string; updated_at?: string; }
export interface DeviceUsageRow { user_key: string; date: string; minutes_played: number; app_breakdown: Record<string, number> | null; last_synced: string; }

// ═══════════════════════════════════
//  USER DATA
// ═══════════════════════════════════

export async function fetchUserData(userKey: string): Promise<AppState | null> {
  const c = getSupabaseClient(); if (!c) return null;
  try { const { data, error } = await c.from('user_data').select('state, updated_at').eq('user_key', userKey).single(); if (error) { if (error.code === 'PGRST116') return null; return null; } return data?.state || null; } catch { return null; }
}

export async function saveUserData(userKey: string, state: AppState): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try {
    const row: Record<string, unknown> = { user_key: userKey, state, updated_at: new Date().toISOString() };
    const owner = await getOwnerId(); if (owner) row.owner_id = owner;
    const { error } = await c.from('user_data').upsert(row, { onConflict: 'user_key' }); return !error;
  } catch { return false; }
}

// ═══════════════════════════════════
//  APP USERS
// ═══════════════════════════════════

export async function fetchCloudUsers(): Promise<Record<string, { password: string; role: UserRole; display: string }> | null> {
  const c = getSupabaseClient(); if (!c) return null;
  try { const { data, error } = await c.from('app_users').select('user_key, display, role, password'); if (error) return null; const map: Record<string, { password: string; role: UserRole; display: string }> = {}; for (const row of (data || []) as CloudUser[]) { map[row.user_key] = { password: row.password, role: row.role, display: row.display }; } return map; } catch { return null; }
}

export async function saveCloudPassword(userKey: string, newPassword: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_users').update({ password: newPassword, updated_at: new Date().toISOString() }).eq('user_key', userKey); return !error; } catch { return false; }
}

export async function saveCloudUser(userKey: string, display: string, role: UserRole, password: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_users').upsert({ user_key: userKey, display, role, password, updated_at: new Date().toISOString() }, { onConflict: 'user_key' }); return !error; } catch { return false; }
}

export async function updateCloudUsername(userKey: string, newDisplay: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_users').update({ display: newDisplay, updated_at: new Date().toISOString() }).eq('user_key', userKey); return !error; } catch { return false; }
}

export async function updateCloudUserRole(userKey: string, newRole: UserRole): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_users').update({ role: newRole, updated_at: new Date().toISOString() }).eq('user_key', userKey); return !error; } catch { return false; }
}

export async function deleteCloudUser(userKey: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_users').delete().eq('user_key', userKey); return !error; } catch { return false; }
}

// ═══════════════════════════════════
//  REQUESTS (cloud)
// ═══════════════════════════════════

export async function fetchCloudRequests(): Promise<UserRequest[]> {
  const c = getSupabaseClient(); if (!c) return [];
  try {
    const { data, error } = await c.from('app_requests').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      userKey: row.user_key,
      userDisplay: row.user_display,
      status: row.status,
      timestamp: row.created_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      ...row.data,
    })) as UserRequest[];
  } catch { return []; }
}

export async function saveCloudRequest(req: UserRequest): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  const { id, type, userKey, userDisplay, status, timestamp, resolvedAt, resolvedBy, ...rest } = req as any;
  try {
    const { error } = await c.from('app_requests').upsert({
      id, type, user_key: userKey, user_display: userDisplay, status,
      data: rest, resolved_at: resolvedAt || null, resolved_by: resolvedBy || null,
      created_at: timestamp,
    }, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

// ═══════════════════════════════════
//  NOTIFICATIONS (cloud)
// ═══════════════════════════════════

export async function fetchCloudNotifications(): Promise<AdminNotification[]> {
  const c = getSupabaseClient(); if (!c) return [];
  try {
    const { data, error } = await c.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      targetUserKey: row.target_user_key,
      fromAdmin: row.from_admin,
      message: row.message,
      type: row.type,
      timestamp: row.created_at,
      readBy: row.read_by || [],
    })) as AdminNotification[];
  } catch { return []; }
}

export async function saveCloudNotification(notif: AdminNotification): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try {
    const { error } = await c.from('app_notifications').upsert({
      id: notif.id, target_user_key: notif.targetUserKey, from_admin: notif.fromAdmin,
      message: notif.message, type: notif.type, read_by: notif.readBy,
      created_at: notif.timestamp,
    }, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

export async function updateNotifReadBy(notifId: string, readBy: string[]): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_notifications').update({ read_by: readBy }).eq('id', notifId); return !error; } catch { return false; }
}

// ═══════════════════════════════════
//  DELETED USERS (cloud)
// ═══════════════════════════════════

export async function fetchDeletedUsers(): Promise<Record<string, string>> {
  const c = getSupabaseClient(); if (!c) return {};
  try {
    const { data, error } = await c.from('app_deleted_users').select('user_key, reason');
    if (error) return {};
    const map: Record<string, string> = {};
    for (const row of (data || []) as any[]) { map[row.user_key] = row.reason; }
    return map;
  } catch { return {}; }
}

export async function addDeletedUser(userKey: string, reason: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_deleted_users').upsert({ user_key: userKey, reason, deleted_at: new Date().toISOString() }, { onConflict: 'user_key' }); return !error; } catch { return false; }
}

export async function removeDeletedUser(userKey: string): Promise<boolean> {
  const c = getSupabaseClient(); if (!c) return false;
  try { const { error } = await c.from('app_deleted_users').delete().eq('user_key', userKey); return !error; } catch { return false; }
}

// ═══════════════════════════════════
//  DEVICE USAGE
// ═══════════════════════════════════

export async function fetchDeviceUsage(userKey: string): Promise<DeviceUsageRow[]> {
  const c = getSupabaseClient(); if (!c) return [];
  try { const { data, error } = await c.from('device_usage').select('user_key, date, minutes_played, app_breakdown, last_synced').eq('user_key', userKey).order('date', { ascending: false }).limit(7); if (error) return []; return (data || []) as DeviceUsageRow[]; } catch { return []; }
}

// ═══════════════════════════════════
//  CONNECTION TEST
// ═══════════════════════════════════

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'No client' };
  try { const r = await c.from('user_data').select('user_key').limit(1); if (r.error) return { ok: false, error: r.error.message }; return { ok: true }; } catch (e) { return { ok: false, error: String(e) }; }
}
