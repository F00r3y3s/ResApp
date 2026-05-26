import { ScanModePillRow } from '@/features/scan/scan-mode-pill-row';

/**
 * Lens tab — entry point for scan flows (T8.3).
 *
 * Renders the mode pill row that pushes into `(modals)/scan` with the right
 * `?type` query param. Capture/review and AI-gateway fallback live in the
 * modal route, so this tab stays a thin composition surface.
 */
export default function LensScreen() {
  return <ScanModePillRow />;
}
