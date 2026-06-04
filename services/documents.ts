import * as DocumentPicker from 'expo-document-picker';

import { supabase } from '@/services/supabase';

export type ProjectDocument = {
  id: string;
  project_id: string;
  uploader_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploader: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

/**
 * Open the iOS Files / iCloud Drive document picker. Returns the selected
 * asset, or null if the user cancelled. PDF + image MIME types only —
 * matches the storage bucket's allowed_mime_types so any selected file
 * will pass server-side validation.
 */
export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return result.assets[0];
}

/**
 * Upload a picked document to the `documents` bucket under
 * `<project_id>/<random>-<file_name>` and insert a project_documents row.
 * Returns the inserted row.
 *
 * Same fetch→arrayBuffer pattern we use for photo + voice uploads —
 * Supabase Storage in RN needs a binary buffer, not a URI.
 */
export async function uploadDocument(args: {
  project_id: string;
  asset: NonNullable<Awaited<ReturnType<typeof pickDocument>>>;
}): Promise<ProjectDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { project_id, asset } = args;
  const safeName = asset.name?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'document';
  const random = Math.random().toString(36).slice(2, 10);
  const storage_path = `${project_id}/${random}-${safeName}`;

  // Read the file URI into an ArrayBuffer.
  const res = await fetch(asset.uri);
  const buffer = await res.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from('documents')
    .upload(storage_path, buffer, {
      contentType: asset.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data: row, error: insertErr } = await supabase
    .from('project_documents')
    .insert({
      project_id,
      uploader_id: user.id,
      file_name: asset.name ?? 'document',
      storage_path,
      mime_type: asset.mimeType ?? 'application/octet-stream',
      size_bytes: asset.size ?? 0,
    })
    .select(`
      id, project_id, uploader_id, file_name, storage_path, mime_type,
      size_bytes, created_at,
      uploader:profiles!project_documents_uploader_id_fkey ( id, full_name, avatar_url )
    `)
    .single();
  if (insertErr) throw insertErr;

  return row as unknown as ProjectDocument;
}

/** List documents on a project, newest first, excluding soft-deleted rows. */
export async function listProjectDocuments(project_id: string): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from('project_documents')
    .select(`
      id, project_id, uploader_id, file_name, storage_path, mime_type,
      size_bytes, created_at,
      uploader:profiles!project_documents_uploader_id_fkey ( id, full_name, avatar_url )
    `)
    .eq('project_id', project_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectDocument[]) ?? [];
}

/** Soft-delete a document. RLS scopes to the uploader. */
export async function softDeleteDocument(id: string) {
  const { error } = await supabase
    .from('project_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Resolve a storage_path into a temporary signed download URL. */
export async function getDocumentSignedUrl(
  storage_path: string,
  expiresInSec = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storage_path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// Legacy import — the new namespace (Paths/File) is cleaner but the
// download-to-URI flow we need below has more friction. Legacy gives us
// cacheDirectory + downloadAsync in two lines.
import * as FileSystem from 'expo-file-system/legacy';

/** Fetch one document row by id, including uploader profile. */
export async function fetchDocument(id: string): Promise<ProjectDocument | null> {
  const { data, error } = await supabase
    .from('project_documents')
    .select(`
      id, project_id, uploader_id, file_name, storage_path, mime_type,
      size_bytes, created_at,
      uploader:profiles!project_documents_uploader_id_fkey ( id, full_name, avatar_url )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProjectDocument | null;
}

/**
 * Download the document at `storage_path` to the cache directory and
 * return the local URI. Used as the input to the iOS share sheet — the
 * share sheet needs a real on-disk file, not a remote URL.
 */
export async function downloadDocumentToCache(
  storage_path: string,
  file_name: string,
): Promise<string> {
  const signedUrl = await getDocumentSignedUrl(storage_path, 60 * 60);
  const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localUri = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;
  const dl = await FileSystem.downloadAsync(signedUrl, localUri);
  return dl.uri;
}

/**
 * Hard delete: soft-mark the DB row AND remove the storage object so the
 * bucket doesn't accumulate orphans. Only the uploader can do this (RLS).
 */
export async function deleteDocumentEverywhere(args: {
  id: string;
  storage_path: string;
}): Promise<void> {
  // Storage removal first so a failure here doesn't orphan the DB row.
  // If the row remove succeeds but the object remove fails, we still soft
  // delete so the UI hides it — the object becomes an orphan that a
  // future cleanup job can sweep.
  await supabase.storage.from('documents').remove([args.storage_path]);
  await softDeleteDocument(args.id);
}
