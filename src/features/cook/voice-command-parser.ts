/**
 * Maps raw speech-to-text transcripts to cook mode commands.
 *
 * Supported commands:
 * - "next" — advance to the next step
 * - "back" — return to the previous step
 * - "repeat" — re-read/highlight the current step
 *
 * Returns null for unrecognized input.
 */

export type VoiceCommand = 'next' | 'back' | 'repeat';

const NEXT_PATTERNS: RegExp[] = [
  /^next(\s+step)?$/,
  /^go\s+(forward|next)$/,
  /^continue$/,
  /^forward$/,
];

const BACK_PATTERNS: RegExp[] = [
  /^back$/,
  /^previous(\s+step)?$/,
  /^go\s+back(ward)?$/,
];

const REPEAT_PATTERNS: RegExp[] = [
  /^repeat(\s+step)?$/,
  /^say\s+again$/,
  /^what\s+was\s+that$/,
  /^read\s+again$/,
];

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.trim().toLowerCase();

  if (!normalized) return null;

  for (const pattern of NEXT_PATTERNS) {
    if (pattern.test(normalized)) return 'next';
  }

  for (const pattern of BACK_PATTERNS) {
    if (pattern.test(normalized)) return 'back';
  }

  for (const pattern of REPEAT_PATTERNS) {
    if (pattern.test(normalized)) return 'repeat';
  }

  return null;
}
