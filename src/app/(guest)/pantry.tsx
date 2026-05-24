import { PantryScreenContent } from '@/features/pantry/pantry-screen';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';

export default function PantryScreen() {
  return <PantryScreenContent repository={getPantryRepository()} />;
}
