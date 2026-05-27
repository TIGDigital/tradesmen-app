import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { PhotoStrip } from '@/components/PhotoStrip';
import { getSignedUrl } from '@/services/media';

type Media = { id: string; storage_path: string; sort_order: number };

type Props = {
  media: Media[] | null | undefined;
};

/**
 * Resolves a list of storage paths to signed URLs (in parallel, cached for ~1h)
 * and renders a read-only PhotoStrip. Renders nothing if `media` is empty.
 */
export function MediaThumbs({ media }: Props) {
  const paths = (media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => m.storage_path);

  const { data: urls } = useQuery({
    queryKey: ['signed-urls', paths.join('|')],
    queryFn: async () => Promise.all(paths.map((p) => getSignedUrl(p))),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000, // 50 min — under the 1h signed-URL TTL
  });

  if (paths.length === 0) return null;
  // While resolving, show a faint placeholder strip the same height — avoids layout jump.
  const display = urls ?? paths.map(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
  return (
    <View>
      <PhotoStrip uris={display} />
    </View>
  );
}
