/**
 * Account sign-in for the web dashboard, backed by Supabase Auth. One Auth user = one account
 * (the parent/admin). That account owns any number of supervised people (see people.ts).
 */
import { getSupabaseClient } from './client';

export interface AccountInfo { id: string; email: string; display: string; }

export async function getCurrentSession() {
  const c = getSupabaseClient(); if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session ?? null;
}

/** The signed-in account's id, read from the local session (no network call). */
export async function getOwnerId(): Promise<string | null> {
  const s = await getCurrentSession();
  return s?.user?.id ?? null;
}

export async function getCurrentAccount(): Promise<AccountInfo | null> {
  const c = getSupabaseClient(); if (!c) return null;
  const { data } = await c.auth.getUser();
  const u = data.user; if (!u) return null;
  const display = (u.user_metadata?.display as string | undefined) || (u.email ?? 'Me').split('@')[0];
  return { id: u.id, email: u.email ?? '', display };
}

export async function signInWithEmail(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { ok: false, error: 'Confirm your email first — check your inbox.' };
    return { ok: false, error: 'Email or password is incorrect.' };
  }
  return { ok: true };
}

export async function signUpWithEmail(email: string, password: string, display: string):
  Promise<{ ok: true; needsConfirm: boolean } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { display } } });
  if (error) return { ok: false, error: error.message };
  return { ok: true, needsConfirm: !data.session };
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setNewPassword(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { error } = await c.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutCloud(): Promise<void> {
  const c = getSupabaseClient(); if (!c) return;
  await c.auth.signOut();
}

export async function resendConfirmation(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { error } = await c.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
