import { useLocalSearchParams } from 'expo-router';

import { CircleDetailScreenContent } from '@/features/circle/circle-detail-screen';
import { getCircleRepository } from '@/features/circle/circle-repository-provider';

export default function CircleDetailRoute() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  return (
    <CircleDetailScreenContent
      circleId={String(circleId ?? '')}
      repository={getCircleRepository()}
    />
  );
}
