import { PowerSyncDatabase } from '@powersync/react-native';

import { AppSchema } from '@/features/local-first/schema';

export const localDatabase = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'family-ai-kitchen.db',
  },
});
