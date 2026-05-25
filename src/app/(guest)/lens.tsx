import { ScanReviewScreenContent } from '@/features/scan/scan-review-screen';

export default function LensScreen() {
  // T8.1 Kitchen Lens capture-and-review slice. Lives directly on the Lens tab
  // for now — moves to a modal route when premium scan flows arrive in T8.2+.
  return <ScanReviewScreenContent />;
}
