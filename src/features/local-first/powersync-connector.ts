import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/react-native';

import { publicEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;

    if (!token || !publicEnv.powerSyncUrl) {
      return null;
    }

    return {
      endpoint: publicEnv.powerSyncUrl,
      token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const record = { ...op.opData, id: op.id };

        await supabase?.functions.invoke('sync-write', {
          body: {
            table: op.table,
            op: op.op,
            record,
          },
        });
      }

      await transaction.complete();
    } catch (error) {
      await transaction.complete(error instanceof Error ? error.message : 'Sync upload failed');
    }
  }
}
