import { getAIGatewayClient } from '@/features/ai-gateway/ai-gateway-provider';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import type { ScanParseResponse } from '@/features/scan/detected-item';
import {
    ScanReviewScreenContent,
    type ScanParseSender,
} from '@/features/scan/scan-review-screen';

/**
 * Scan modal route (T8.1 capture/review + T8.2 AI parse → confirm).
 *
 * The sender is null when the AI gateway isn't configured (no Supabase env
 * vars, or user not authenticated). In that case, the screen falls back to
 * T8.1 behavior: capture and review, then dismiss.
 */
export default function ScanModalRoute() {
  const gatewayClient = getAIGatewayClient();
  const pantryRepository = getPantryRepository();

  const scanParseSender: ScanParseSender | null = gatewayClient
    ? async (imageUri: string) => {
        const response = await gatewayClient.request<ScanParseResponse>(
          'scan-parse',
          {
            type: 'scan-parse',
            imageUrl: imageUri,
            scanType: 'pantry-photo',
          },
        );
        return response;
      }
    : null;

  return (
    <ScanReviewScreenContent
      pantryRepository={pantryRepository}
      scanParseSender={scanParseSender}
    />
  );
}
