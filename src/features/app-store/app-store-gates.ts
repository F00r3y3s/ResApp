export type ReleaseGateStatus = 'pending' | 'done' | 'blocked';

export type ReleaseGateId =
  | 'secrets-no-service-keys'
  | 'secrets-no-private-api-keys'
  | 'guideline-252-no-code-execution'
  | 'guideline-252-eas-static-build'
  | 'offline-stress-test'
  | 'no-ai-leftovers'
  | 'modular-code-structure'
  | 'ai-consent'
  | 'privacy-policy-in-app'
  | 'ai-data-disclaimer'
  | 'delete-account'
  | 'native-iap-only'
  | 'restore-purchases'
  | 'latest-apple-sdk'
  | 'privacy-manifests'
  | 'tap-targets-44'
  | 'demo-review-account'
  | 'reviewer-screen-recording';

export type ReleaseGate = {
  id: ReleaseGateId;
  title: string;
  phase: string;
  guideline: string;
};

export type ReleaseGateCheck = {
  id: ReleaseGateId;
  status: ReleaseGateStatus;
};

export const releaseGates: ReleaseGate[] = [
  {
    id: 'secrets-no-service-keys',
    title: 'No Supabase service role, database password, or admin token in the app bundle',
    phase: 'Phase 0 and every PR',
    guideline: 'Security',
  },
  {
    id: 'secrets-no-private-api-keys',
    title: 'No OpenAI, USDA, RevenueCat secret, Sentry auth, or private tracking token in mobile code',
    phase: 'Phase 0 and every PR',
    guideline: 'Security',
  },
  {
    id: 'guideline-252-no-code-execution',
    title: 'No in-app terminal, script compiler, generated-code preview, or user-executable code surface',
    phase: 'All phases',
    guideline: '2.5.2',
  },
  {
    id: 'guideline-252-eas-static-build',
    title: 'Production artifacts are built as reviewed native bundles through EAS',
    phase: 'Release',
    guideline: '2.5.2',
  },
  {
    id: 'offline-stress-test',
    title: 'Airplane-mode launch and core cooking flows do not crash or white-screen',
    phase: 'Each feature slice',
    guideline: '2.1',
  },
  {
    id: 'no-ai-leftovers',
    title: 'No demo copy, development placeholders, unused scaffold screens, or review-hostile labels',
    phase: 'Each feature slice',
    guideline: '2.1',
  },
  {
    id: 'modular-code-structure',
    title: 'Feature modules stay small, typed, and reusable',
    phase: 'Each feature slice',
    guideline: '2.1',
  },
  {
    id: 'ai-consent',
    title: 'First AI action requires explicit consent and names OpenAI as the processing partner',
    phase: 'Phase 7',
    guideline: '5.1.2',
  },
  {
    id: 'privacy-policy-in-app',
    title: 'Settings includes native links to privacy policy, terms, export, and support',
    phase: 'Phase 1',
    guideline: '5.1.2',
  },
  {
    id: 'ai-data-disclaimer',
    title: 'Privacy policy states when photos, labels, receipts, recipes, and prompts go to OpenAI',
    phase: 'Phase 7',
    guideline: '5.1.2',
  },
  {
    id: 'delete-account',
    title: 'Authenticated profile includes native account deletion',
    phase: 'Phase 2',
    guideline: '5.1.1',
  },
  {
    id: 'native-iap-only',
    title: 'Premium digital features use Apple IAP through RevenueCat on iOS',
    phase: 'Phase 11',
    guideline: '3.1.1',
  },
  {
    id: 'restore-purchases',
    title: 'Paywall includes visible Restore Purchases action',
    phase: 'Phase 11',
    guideline: '3.1.1',
  },
  {
    id: 'latest-apple-sdk',
    title: 'Expo/EAS production build targets the current App Store SDK requirement',
    phase: 'Release',
    guideline: 'Packaging',
  },
  {
    id: 'privacy-manifests',
    title: 'Third-party dependencies are checked for required Apple privacy manifests',
    phase: 'Release',
    guideline: 'Packaging',
  },
  {
    id: 'tap-targets-44',
    title: 'All interactive controls meet or exceed 44 by 44 points',
    phase: 'Design QA',
    guideline: 'HIG',
  },
  {
    id: 'demo-review-account',
    title: 'App Review Notes include an active demo account for authenticated and premium flows',
    phase: 'Release',
    guideline: 'Review',
  },
  {
    id: 'reviewer-screen-recording',
    title: 'App Review Notes include a short private screen recording of AI scan latency and success',
    phase: 'Release',
    guideline: 'Review',
  },
];

export function getBlockedReleaseGateIds(checks: ReleaseGateCheck[]) {
  return checks.filter((check) => check.status !== 'done').map((check) => check.id);
}
