import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PhotoStrip } from '@/components/PhotoStrip';
import { getSignedUrl } from '@/services/media';

type Media = {
  id: string;
  storage_path: string;
  sort_order: number;
  media_type?: string | null;
};

type Props = {
  /** ID of the parent project_update — used to deep-link the fullscreen viewer. */
  update_id: string;
  media: Media[] | null | undefined;
};

/**
 * Resolves a list of storage paths to signed URLs (in parallel, cached for ~50min)
 * and renders a tappable PhotoStrip. Tapping a thumb opens the fullscreen viewer
 * at that photo's index. Renders nothing if `media` is empty.
 */
export function MediaThumbs({ update_id, media }: Props) {
  // Photos only — voice notes render via VoicePlayer separately.
  const paths = (media ?? [])
    .filter((m) => m.media_type !== 'voice')
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => m.storage_path);

  const { data: urls } = useQuery({
    queryKey: ['signed-urls', paths.join('|')],
    queryFn: async () => Promise.all(paths.map((p) => getSignedUrl(p))),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });

  if (paths.length === 0) return null;

  const display =
    urls ??
    paths.map(
      () =>
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    );

  return (
    <View>
      <PhotoStrip
        uris={display}
        onPressThumb={(i) =>
          router.push({
            pathname: '/photo/[update_id]',
            params: { update_id, index: String(i) },
          })
        }
      />
    </View>
  );
}
