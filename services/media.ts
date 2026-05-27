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

/** Generate a short-lived signed URL for displaying a private object. */
export async function getSignedUrl(storage_path: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-media')
    .createSignedUrl(storage_path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
