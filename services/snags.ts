import type { PickedPhoto } from '@/services/media';
import { supabase } from '@/services/supabase';

import { recordNotification, sendPush } from '@/services/notifications';

export type SnagStatus = 'open' | 'in_progress' | 'resolved';

export type SnagPhoto = {
  id: string;
  storage_path: string;
  sort_order: number;
};

export type ProjectSnag = {
  id: string;
  project_id: string;
  reporter_id: string;
  title: string;
  description: string | null;
  location_hint: string | null;
  status: SnagStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  reporter: { id: string; full_name: string | null; avatar_url: string | null } | null;
  photos: SnagPhoto[];
};

/** List snags for a project, newest first, non-deleted. */
export async function fetchProjectSnags(project_id: string): Promise<ProjectSnag[]> {
  const { data, error } = await supabase
    .from('project_snags')
    .select(`
      id, project_id, reporter_id, title, description, location_hint, status,
      resolved_at, resolved_by, resolution_note, created_at,
      reporter:profiles!project_snags_reporter_id_fkey ( id, full_name, avatar_url ),
      photos:project_snag_photos ( id, storage_path, sort_order )
    `)
    .eq('project_id', project_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectSnag[]) ?? [];
}

/**
 * Create a snag with optional photos. Photos upload to the existing
 * `project-media` bucket under {user_id}/snags/{snag_id}/{i}.{ext} so the
 * media_insert_own policy (first folder segment = auth.uid()) keeps
 * working without changes.
 *
 * Fires a push + inbox row to the counterparty so the tradesman sees the
 * snag arrive in real time.
 */
export async function createSnag(args: {
  project_id: string;
  title: string;
  description?: string | null;
  location_hint?: string | null;
  photos?: PickedPhoto[];
}): Promise<ProjectSnag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const trimmedTitle = args.title.trim();
  if (!trimmedTitle) throw new Error('Title required');

  // 1. Insert the snag.
  const { data: snag, error: insertErr } = await supabase
    .from('project_snags')
    .insert({
      project_id: args.project_id,
      reporter_id: user.id,
      title: trimmedTitle,
      description: args.description?.trim() || null,
      location_hint: args.location_hint?.trim() || null,
    })
    .select('id, project_id')
    .single();
  if (insertErr) throw insertErr;

  // 2. Upload + link photos (if any). Use Promise.all to parallelise the
  //    storage uploads; insert into project_snag_photos afterwards.
  if (args.photos && args.photos.length > 0) {
    const uploads = await Promise.all(
      args.photos.map(async (photo, i) => {
        const path = `${user.id}/snags/${snag.id}/${i}.${photo.ext}`;
        const res = await fetch(photo.uri);
        const buffer = await res.arrayBuffer();
        const { error } = await supabase.storage
          .from('project-media')
          .upload(path, buffer, {
            contentType: photo.mimeType,
            upsert: false,
          });
        if (error) throw error;
        return { storage_path: path, sort_order: i };
      }),
    );

    const { error: linkErr } = await supabase
      .from('project_snag_photos')
      .insert(
        uploads.map((u) => ({
          snag_id: snag.id,
          storage_path: u.storage_path,
          sort_order: u.sort_order,
        })),
      );
    if (linkErr) throw linkErr;
  }

  // 3. Notify the counterparty (project participant who isn't us).
  void notifyCounterpartyOfSnag(snag.id, snag.project_id, user.id, trimmedTitle);

  // 4. Return the full snag row.
  const full = await fetchSnag(snag.id);
  if (!full) throw new Error('Snag created but could not be re-fetched');
  return full;
}

/** Fetch a single snag with photos + reporter. */
export async function fetchSnag(id: string): Promise<ProjectSnag | null> {
  const { data, error } = await supabase
    .from('project_snags')
    .select(`
      id, project_id, reporter_id, title, description, location_hint, status,
      resolved_at, resolved_by, resolution_note, created_at,
      reporter:profiles!project_snags_reporter_id_fkey ( id, full_name, avatar_url ),
      photos:project_snag_photos ( id, storage_path, sort_order )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProjectSnag | null;
}

/** Soft delete a snag. RLS scopes update to project participants. */
export async function softDeleteSnag(id: string) {
  const { error } = await supabase
    .from('project_snags')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Find the OTHER party on the project and ping them about the new snag.
 * Mirrors the notifyCounterparty pattern in services/projects.ts; we
 * inline it here to avoid importing private helpers.
 */
async function notifyCounterpartyOfSnag(
  snag_id: string,
  project_id: string,
  reporter_id: string,
  title: string,
) {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('tradesman_id, customer_id')
      .eq('id', project_id)
      .single();
    if (!project) return;

    const recipient_id =
      project.tradesman_id === reporter_id ? project.customer_id : project.tradesman_id;
    if (!recipient_id) return;

    const pushTitle = 'New snag flagged';
    const pushBody = title;

    await recordNotification({
      user_id: recipient_id,
      kind: 'new_update',
      project_id,
      title: pushTitle,
      body: pushBody,
      data: { project_id, snag_id },
    });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipient_id);
    if (!tokens || tokens.length === 0) return;

    await sendPush({
      tokens: tokens.map((t) => t.token),
      title: pushTitle,
      body: pushBody,
      data: { project_id, snag_id },
    });
  } catch (e) {
    console.warn('[notifyCounterpartyOfSnag] failed', e);
  }
}
