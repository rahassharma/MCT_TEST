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

export async function fetchPeople(): Promise<Person[]> {
  const c = getSupabaseClient(); if (!c) return [];
  const { data, error } = await c.from('people').select('id, display, legacy_user_key').order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, display: r.display, legacyUserKey: r.legacy_user_key ?? null }));
}

export async function createPerson(display: string): Promise<Person | null> {
  const c = getSupabaseClient(); if (!c) return null;
  const owner = await getOwnerId(); if (!owner) return null;
  const { data, error } = await c.from('people').insert({ owner_id: owner, display }).select('id, display, legacy_user_key').single();
  if (error || !data) return null;
  return { id: data.id, display: data.display, legacyUserKey: data.legacy_user_key ?? null };
}
