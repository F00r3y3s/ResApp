/**
 * Cooksnap modal route — thin route file that composes the share cooksnap screen.
 * Behavior lives in src/features/cooksnap/.
 */

import { ShareCooksnapScreen } from '@/features/cooksnap/share-cooksnap-screen';

export default function CooksnapModalRoute() {
  // In production, props would come from route params and context providers.
  // This route file stays thin — all behavior is in the feature module.
  return null;
}

export { ShareCooksnapScreen };
