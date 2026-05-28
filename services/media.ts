import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { supabase } from '@/services/supabase';

export type PickedPhoto = {
  uri: string;
  /** mime e.g. 'image/jpeg' — used as contentType on upload */
  mimeType: string;
  /** file extension we derive for the storage path (e.g. 'jpg') */
  ext: string;
};

/**
 * Show an Action Sheet asking Library vs Camera, then return picked images.
 * Honours iOS permissions; alerts the user politely on deny.
 * Returns [] if the user cancels.
 */
export async function pickPhotos(maxCount: number): Promise<PickedPhoto[]> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add photos',
      undefined,
      [
        {
          text: 'Choose from library',
          onPress: async () => resolve(await pickFromLibrary(maxCount)),
        },
        {
          text: 'Take photo',
          onPress: async () => resolve(await pickFromCamera()),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
      ],
      { cancelable: true, onDismiss: () => resolve([]) }
    );
  });
}

/**
 * Avatar-specific picker: square crop, lower quality, single photo.
 * Skips the Library-vs-Camera action sheet — just opens the library.
 * (Could add camera support later via a similar action sheet.)
 */
export async function pickAvatar(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photo access needed', 'Enable photo access in Settings to set an avatar.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5, // half-quality JPG keeps avatars well under 1MB
  });
  if (result.canceled || result.assets.length === 0) return null;
  return toPickedPhoto(result.assets[0]);
}

async function pickFromLibrary(maxCount: number): Promise<PickedPhoto[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photo access needed', 'Enable photo access in Settings to attach photos.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return result.assets.map(toPickedPhoto);
}

async function pickFromCamera(): Promise<PickedPhoto[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera access needed', 'Enable camera access in Settings to take photos.');
    return [];
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return result.assets.map(toPickedPhoto);
}

function toPickedPhoto(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const ext = (mimeType.split('/')[1] ?? 'jpg').toLowerCase();
  return { uri: asset.uri, mimeType, ext };
}

/**
 * Upload one photo to Storage at {user_id}/{update_id}/{index}.{ext}.
 * Returns the storage path (used as the foreign key on project_update_media.storage_path).
 */
export async function uploadPhoto(args: {
  photo: PickedPhoto;
  user_id: string;
  update_id: string;
  index: number;
}): Promise<string> {
  const path = `${args.user_id}/${args.update_id}/${args.index}.${args.photo.ext}`;

  // Local file URI -> binary body. fetch+arrayBuffer works in React Native.
  const res = await fetch(args.photo.uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from('project-media')
    .upload(path, arrayBuffer, {
      contentType: args.photo.mimeType,
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/**
 * Upload a voice note (local .m4a from expo-av) to Storage at
 * `{user_id}/{update_id}/voice.m4a`. Returns the storage path.
 */
export async function uploadVoice(args: {
  uri: string;
  user_id: string;
  update_id: string;
}): Promise<string> {
  const path = `${args.user_id}/${args.update_id}/voice.m4a`;

  const res = await fetch(args.uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from('project-media')
    .upload(path, arrayBuffer, {
      contentType: 'audio/m4a',
      upsert: false,
    });
  if (error) throw error;
  return path;
}

/** Generate a short-lived signed URL for displaying a private object. */
export async function getSignedUrl(storage_path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-media')
    .createSignedUrl(storage_path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload an avatar to the public 'avatars' bucket at `{user_id}/avatar.{ext}`.
 * Returns the public URL (no signing — bucket is public).
 * Overwrites any existing avatar at the same path (upsert).
 */
export async function uploadAvatar(args: {
  photo: PickedPhoto;
  user_id: string;
}): Promise<string> {
  // Use a stable filename so re-uploads overwrite. Cache-bust via the URL.
  const path = `${args.user_id}/avatar.${args.photo.ext}`;

  const res = await fetch(args.photo.uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, {
      contentType: args.photo.mimeType,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-busting query param so the new image actually loads in <Image>.
  return `${data.publicUrl}?v=${Date.now()}`;
}
