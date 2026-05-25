import { CircleListScreenContent } from '@/features/circle/circle-list-screen';
import { getCircleRepository } from '@/features/circle/circle-repository-provider';
import { useIsOnline } from '@/features/circle/use-is-online';

export default function CircleListRoute() {
  const isOnline = useIsOnline();
  return <CircleListScreenContent repository={getCircleRepository()} isOnline={isOnline} />;
}
