/**
 * Supervised people under the signed-in account. Each person's usage, behavior and face
 * profile is stored under a per-person data key (see personDataKey), with owner_id set to the
 * account so Supabase's row rules keep accounts apart.
 */
import { getSupabaseClient } from './client';
import { getOwnerId } from './auth';

export interface Person { id: string; display: string; legacyUserKey: string | null; }

/**
 * The key this person's data lives under. People migrated from the old single-user setup keep
 * their original key (so their existing history stays attached); new people use their id.
 */
export function personDataKey(p: Person): string { return p.legacyUserKey || p.id; }

/**
 * Links any existing family data to this account. Runs on every sign-in and does nothing for
 * accounts other than the owner (see guardian_auto_claim.sql). Errors are ignored here so that a
 * failed claim never blocks sign-in; the people list below will show any real problem.
 */
export async function claimLegacyData(): Promise<void> {
  const c = getSupabaseClient(); if (!c) return;
  try { await c.rpc('claim_legacy_people'); } catch { /* ignored on purpose, see above */ }
}

/** Deletes one person's stored face data (the phone re-enrols them). Returns an error message or null. */
export async function clearFaceData(personId: string): Promise<string | null> {
  const c = getSupabaseClient(); if (!c) return 'Cloud is not configured';
  const { error } = await c.from('supervised_profiles').delete().eq('user_key', personId);
  return error ? error.message : null;
}

/** Loads the account's people, or returns the real database error so it can be shown. */
export async function loadPeopleOrError(): Promise<{ ok: true; people: Person[] } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const { data, error } = await c.from('people').select('id, display, legacy_user_key').order('created_at', { ascending: true });
  if (error) return { ok: false, error: `Could not read your people (${error.message}). Has the people migration been run?` };
  return { ok: true, people: (data || []).map((r: any) => ({ id: r.id, display: r.display, legacyUserKey: r.legacy_user_key ?? null })) };
}

/** Creates the first person for a new account, or returns the real database error. */
export async function createPersonOrError(display: string): Promise<{ ok: true; person: Person } | { ok: false; error: string }> {
  const c = getSupabaseClient(); if (!c) return { ok: false, error: 'Cloud is not configured' };
  const owner = await getOwnerId(); if (!owner) return { ok: false, error: 'No signed-in account found' };
  const { data, error } = await c.from('people').insert({ owner_id: owner, display }).select('id, display, legacy_user_key').single();
  if (error || !data) return { ok: false, error: `Could not create your first person (${error?.message ?? 'no data returned'})` };
  return { ok: true, person: { id: data.id, display: data.display, legacyUserKey: data.legacy_user_key ?? null } };
}
