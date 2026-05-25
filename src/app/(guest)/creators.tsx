import AsyncStorage from '@react-native-async-storage/async-storage';

import { CreatorListScreenContent } from '@/features/creators/creator-list-screen';
import { createFollowRepository } from '@/features/creators/follow-repository';

const followRepository = createFollowRepository(AsyncStorage);

export default function CreatorsRoute() {
  return <CreatorListScreenContent followRepository={followRepository} />;
}
