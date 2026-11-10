import "server-only";
import { cache } from "react";
import { getAuth } from "./auth";
import type { ProfileRow, RoleRow } from "./database.types";

export type Member = ProfileRow & { role_ids: string[]; avatar_url: string | null };

/** Tous les profils (actifs et désactivés), avec leurs rôles et l'URL signée de la photo. */
export const getTeam = cache(async (): Promise<Member[]> => {
  const { supabase, user } = await getAuth();
  if (!user) return [];
  const [{ data: profiles }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("profile_roles").select("profile_id, role_id"),
  ]);
  const rows = (profiles ?? []) as ProfileRow[];
  const paths = rows.map((p) => p.avatar_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 60 * 60);
    for (const item of data ?? [])
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return rows.map((p) => ({
    ...p,
    role_ids: (links ?? []).filter((l) => l.profile_id === p.id).map((l) => l.role_id),
    avatar_url: p.avatar_path ? (urls.get(p.avatar_path) ?? null) : null,
  }));
});

export const getRoles = cache(async (): Promise<RoleRow[]> => {
  const { supabase, user } = await getAuth();
  if (!user) return [];
  const { data } = await supabase.from("roles").select("*").order("sort_order");
  return (data ?? []) as RoleRow[];
});

/** Version « légère » du profil, passée aux composants client. */
export type PersonLite = { id: string; name: string; avatar_url: string | null };

export function toLite(m: Member): PersonLite {
  return { id: m.id, name: m.full_name || m.email, avatar_url: m.avatar_url };
}
