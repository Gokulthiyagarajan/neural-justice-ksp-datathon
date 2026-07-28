// Tests for the Copilot suggestion engine.
// Covers role-aware and language-aware suggestion generation,
// welcome messages, and pool diversity guarantees.

import { describe, it, expect } from 'vitest';
import {
  getRandomSuggestions,
  ROLE_SUGGESTIONS,
  SUGGESTED_QUERIES,
  ROLE_WELCOME,
} from '../../src/copilot/constants/suggestedQueries';

describe('SUGGESTED_QUERIES', () => {
  it('has English suggestions', () => {
    expect(SUGGESTED_QUERIES.en.length).toBeGreaterThan(0);
  });

  it('has Kannada suggestions', () => {
    expect(SUGGESTED_QUERIES.kn.length).toBeGreaterThan(0);
  });

  it('has same number of suggestions in each language', () => {
    expect(SUGGESTED_QUERIES.en.length).toBe(SUGGESTED_QUERIES.kn.length);
  });

  it('every suggestion is a non-empty string', () => {
    for (const lang of ['en', 'kn'] as const) {
      for (const q of SUGGESTED_QUERIES[lang]) {
        expect(typeof q).toBe('string');
        expect(q.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('ROLE_SUGGESTIONS', () => {
  const roles = ['OFFICER', 'ANALYST', 'INVESTIGATOR', 'SUPERVISOR', 'SUPER_ADMIN'] as const;

  it('has entries for all 5 KSP roles', () => {
    for (const role of roles) {
      expect(ROLE_SUGGESTIONS[role]).toBeDefined();
    }
  });

  it('each role has English and Kannada pools', () => {
    for (const role of roles) {
      expect(ROLE_SUGGESTIONS[role].en.length).toBeGreaterThan(0);
      expect(ROLE_SUGGESTIONS[role].kn.length).toBeGreaterThan(0);
    }
  });

  it('role suggestions are distinct from generic queries', () => {
    for (const role of roles) {
      for (const q of ROLE_SUGGESTIONS[role].en) {
        expect(SUGGESTED_QUERIES.en).not.toContain(q);
      }
    }
  });

  it('higher-rank roles have at least 6 suggestions', () => {
    for (const role of ['INVESTIGATOR', 'SUPERVISOR', 'SUPER_ADMIN'] as const) {
      expect(ROLE_SUGGESTIONS[role].en.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('getRandomSuggestions', () => {
  it('returns requested number of suggestions', () => {
    const result = getRandomSuggestions(4, 'en', 'OFFICER');
    expect(result).toHaveLength(4);
  });

  it('returns up to pool size when count exceeds pool', () => {
    const result = getRandomSuggestions(100, 'en', 'OFFICER');
    expect(result.length).toBeLessThanOrEqual(ROLE_SUGGESTIONS.OFFICER.en.length);
  });

  it('falls back to generic pool when no role is given', () => {
    const result = getRandomSuggestions(2, 'en');
    expect(result).toHaveLength(2);
    // Should contain generic queries
    const allGeneric = SUGGESTED_QUERIES.en;
    expect(result.every((q) => allGeneric.includes(q))).toBe(true);
  });

  it('falls back to generic pool for unknown role', () => {
    const result = getRandomSuggestions(2, 'en', 'UNKNOWN' as any);
    expect(result).toHaveLength(2);
  });

  it('returns unique suggestions (no duplicates)', () => {
    const result = getRandomSuggestions(4, 'kn', 'SUPER_ADMIN');
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  it('returns Kannada suggestions when lang is kn', () => {
    const result = getRandomSuggestions(2, 'kn', 'INVESTIGATOR');
    const allKannada = ROLE_SUGGESTIONS.INVESTIGATOR.kn;
    expect(result.every((q) => allKannada.includes(q))).toBe(true);
  });
});

describe('ROLE_WELCOME', () => {
  const roles = ['OFFICER', 'ANALYST', 'INVESTIGATOR', 'SUPERVISOR', 'SUPER_ADMIN'] as const;

  it('has welcome config for every KSP role in both languages', () => {
    for (const role of roles) {
      expect(ROLE_WELCOME[role]).toBeDefined();
      expect(ROLE_WELCOME[role].en).toBeDefined();
      expect(ROLE_WELCOME[role].kn).toBeDefined();
      expect(typeof ROLE_WELCOME[role].en.title).toBe('string');
      expect(typeof ROLE_WELCOME[role].en.subtext).toBe('string');
      expect(typeof ROLE_WELCOME[role].kn.title).toBe('string');
      expect(typeof ROLE_WELCOME[role].kn.subtext).toBe('string');
    }
  });

  it('each role has a unique welcome title', () => {
    const titles = roles.map((r) => ROLE_WELCOME[r].en.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(roles.length);
  });

  it('welcome titles are non-empty', () => {
    for (const role of roles) {
      expect(ROLE_WELCOME[role].en.title.trim().length).toBeGreaterThan(0);
      expect(ROLE_WELCOME[role].kn.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('welcome subtext is non-empty', () => {
    for (const role of roles) {
      expect(ROLE_WELCOME[role].en.subtext.trim().length).toBeGreaterThan(0);
      expect(ROLE_WELCOME[role].kn.subtext.trim().length).toBeGreaterThan(0);
    }
  });
});
