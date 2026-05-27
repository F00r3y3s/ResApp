import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';

import {
    AppErrorBoundary,
    configureAnalytics,
    createPostHogClient,
    initSentry,
} from '@/lib/analytics';

// Initialise Sentry as early as possible — at module evaluation time — so
// crashes during provider setup are captured. Falls through to a no-op when
// the public DSN is missing (Expo Go without secrets, tests).
initSentry();

const posthogClient = createPostHogClient();
configureAnalytics(posthogClient);

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5,
            networkMode: 'offlineFirst',
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      }),
  );

  useEffect(() => {
    return () => {
      // Best-effort flush on app teardown; safe when analytics is no-op.
      void import('@/lib/analytics').then(({ Analytics }) => Analytics.flush());
    };
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppErrorBoundary>
  );
}
