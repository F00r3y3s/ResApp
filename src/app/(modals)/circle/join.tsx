import { getCircleRepository } from '@/features/circle/circle-repository-provider';
import { JoinCircleScreenContent } from '@/features/circle/join-circle-screen';
import { useIsOnline } from '@/features/circle/use-is-online';

export default function JoinCircleRoute() {
  const isOnline = useIsOnline();
  return <JoinCircleScreenContent repository={getCircleRepository()} isOnline={isOnline} />;
}
