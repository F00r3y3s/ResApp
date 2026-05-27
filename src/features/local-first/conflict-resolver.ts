/**
 * Conflict Resolver — Last-Write-Wins (LWW) Strategy
 *
 * Determines which version of a record should win when both local and remote
 * have been modified since the last sync.
 *
 * Strategy for v1: Last-Write-Wins based on `updated_at` timestamp.
 * - If local is newer → local wins.
 * - If remote is newer → remote wins.
 * - If timestamps are identical → remote wins (server is source of truth).
 *
 * Future versions may implement field-level merge for specific tables
 * (e.g. merging ingredient lists). This is deferred — see T12.4 in the roadmap.
 *
 * Privacy note: Conflict resolution only applies to 'syncable' records that
 * have passed the canSyncLocalRecord() gate (per privacy-contract.md).
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ConflictRecord = {
  /** Row ID */
  id: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Full row data */
  data: Record<string, unknown>;
};

export type ConflictWinner = 'local-wins' | 'remote-wins';

export type ConflictResolution = {
  /** Which side won */
  winner: ConflictWinner;
  /** The data that should be applied */
  resolvedData: Record<string, unknown>;
  /** The strategy used to resolve */
  strategy: 'last-write-wins';
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a conflict between a local and remote version of the same record.
 *
 * Uses last-write-wins: the record with the more recent `updatedAt` timestamp
 * is chosen. On tie, remote wins (server is authoritative).
 *
 * Field-level merge is NOT implemented in v1. This function always returns
 * the full winning record's data — it does not attempt to merge individual fields.
 */
export function resolveConflict(
  local: ConflictRecord,
  remote: ConflictRecord,
): ConflictResolution {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  if (localTime > remoteTime) {
    return {
      winner: 'local-wins',
      resolvedData: local.data,
      strategy: 'last-write-wins',
    };
  }

  // Remote wins when equal (tie-break) or newer
  return {
    winner: 'remote-wins',
    resolvedData: remote.data,
    strategy: 'last-write-wins',
  };
}
