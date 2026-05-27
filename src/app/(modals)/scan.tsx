import { useLocalSearchParams } from 'expo-router';

import { getAIGatewayClient } from '@/features/ai-gateway/ai-gateway-provider';
import { getGroceryRepository } from '@/features/grocery/grocery-repository-provider';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import type { ScanParseResponse } from '@/features/scan/detected-item';
import {
    ScanReviewScreenContent,
    type ScanParseSender,
} from '@/features/scan/scan-review-screen';

type ScanMode = 'receipt' | 'pantry-photo';

/**
 * Scan modal route (T8.1 capture/review + T8.2 AI parse → confirm + T8.3 receipt mode).
 *
 * Reads `?type=receipt` from the route to switch into receipt mode. Anything
 * else falls back to pantry-photo. The grocery repository is only provided in
 * receipt mode so receipt-bound items can be routed to the grocery list.
 *
 * The sender is null when the AI gateway isn't configured (no Supabase env
 * vars, or user not authenticated). In that case, the screen falls back to
 * T8.1 behavior: capture and review, then dismiss.
 */
export default function ScanModalRoute() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const scanMode: ScanMode = type === 'receipt' ? 'receipt' : 'pantry-photo';

  const gatewayClient = getAIGatewayClient();
  const pantryRepository = getPantryRepository();
  const groceryRepository =
    scanMode === 'receipt' ? getGroceryRepository() : undefined;

  const scanParseSender: ScanParseSender | null = gatewayClient
    ? async (imageUri: string) => {
        const response = await gatewayClient.request<ScanParseResponse>(
          'scan-parse',
          {
            type: 'scan-parse',
            imageUrl: imageUri,
            scanType: scanMode,
          },
        );
        return response;
      }
    : null;

  return (
    <ScanReviewScreenContent
      scanMode={scanMode}
      pantryRepository={pantryRepository}
      groceryRepository={groceryRepository}
      scanParseSender={scanParseSender}
    />
  );
}
