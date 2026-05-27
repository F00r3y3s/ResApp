import { getCircleRepository } from '@/features/circle/circle-repository-provider';
import { CreateCircleScreenContent } from '@/features/circle/create-circle-screen';
import { useIsOnline } from '@/features/circle/use-is-online';

export default function CreateCircleRoute() {
  const isOnline = useIsOnline();
  return <CreateCircleScreenContent repository={getCircleRepository()} isOnline={isOnline} />;
}
