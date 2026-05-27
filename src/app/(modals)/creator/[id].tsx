import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

import { CreatorDetailScreenContent } from '@/features/creators/creator-detail-screen';
import { createFollowRepository } from '@/features/creators/follow-repository';

const followRepository = createFollowRepository(AsyncStorage);

export default function CreatorDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreatorDetailScreenContent creatorId={id} followRepository={followRepository} />;
}
