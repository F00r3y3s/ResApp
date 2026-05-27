import { describe, expect, it } from '@jest/globals';

import { parseVoiceCommand } from './voice-command-parser';

describe('parseVoiceCommand', () => {
  describe('next command', () => {
    it.each([
      'next',
      'Next',
      'NEXT',
      'next step',
      'go forward',
      'continue',
      'go next',
      'forward',
    ])('recognizes "%s" as next', (input) => {
      expect(parseVoiceCommand(input)).toBe('next');
    });
  });

  describe('back command', () => {
    it.each([
      'back',
      'Back',
      'BACK',
      'previous',
      'go back',
      'previous step',
      'go backward',
    ])('recognizes "%s" as back', (input) => {
      expect(parseVoiceCommand(input)).toBe('back');
    });
  });

  describe('repeat command', () => {
    it.each([
      'repeat',
      'Repeat',
      'REPEAT',
      'say again',
      'what was that',
      'read again',
      'repeat step',
    ])('recognizes "%s" as repeat', (input) => {
      expect(parseVoiceCommand(input)).toBe('repeat');
    });
  });

  describe('unrecognized input', () => {
    it.each([
      '',
      'hello',
      'set timer',
      'how much salt',
      'random words',
      'nextstep',
      'goback',
    ])('returns null for "%s"', (input) => {
      expect(parseVoiceCommand(input)).toBeNull();
    });
  });

  it('trims whitespace before matching', () => {
    expect(parseVoiceCommand('  next  ')).toBe('next');
    expect(parseVoiceCommand('  go back  ')).toBe('back');
  });
});
