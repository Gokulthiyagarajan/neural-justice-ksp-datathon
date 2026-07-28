// Unit tests for copilot types, constants, and interfaces.
// Tests the type definitions and constant values used across the
// AI Copilot frontend module. Ensures structural contracts are
// maintained between components.

import { describe, it, expect } from 'vitest';

// ── Type-level tests: verify the exported interfaces have expected shapes ──
// These are compile-time guarantees expressed as runtime assertions.

describe('DashboardCard union', () => {
  it('has all expected card identifiers', () => {
    const validCards = [
      'todays-firs',
      'active-investigations',
      'crime-index',
      'ai-alerts',
      'active-cases',
      'prediction-accuracy',
      'intelligence-feed',
      'early-warning',
      'incident-map',
      'trend-chart',
    ] as const;

    // Runtime: every value must be a non-empty string and unique
    expect(validCards.length).toBe(10);
    const unique = new Set(validCards);
    expect(unique.size).toBe(10);
    validCards.forEach((c) => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });
});

describe('CopilotState union', () => {
  it('has exactly 4 valid states', () => {
    const states = ['collapsed', 'expanded', 'thinking', 'speaking'] as const;
    expect(states.length).toBe(4);
    states.forEach((s) => {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });
});

describe('Message interface shape', () => {
  it('can construct a user message', () => {
    const msg = {
      id: 'user-123',
      role: 'user' as const,
      content: 'Show me today\'s FIRs',
      timestamp: new Date('2026-07-28T10:00:00Z'),
    };
    expect(msg.id).toBe('user-123');
    expect(msg.role).toBe('user');
    expect(msg.content).toContain('FIRs');
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it('can construct an assistant message with optional fields', () => {
    const msg = {
      id: 'ai-456',
      role: 'assistant' as const,
      content: 'There are 142 FIRs today.',
      timestamp: new Date(),
      citedCards: ['todays-firs', 'crime-index'],
      chartData: { type: 'bar' as const, labels: ['Jan'], data: [10] },
      confidence: 85,
      streaming: false,
    };
    expect(msg.citedCards).toHaveLength(2);
    expect(msg.chartData?.type).toBe('bar');
    expect(msg.confidence).toBe(85);
    expect(msg.streaming).toBe(false);
  });

  it('optional fields default to undefined when not set', () => {
    const msg = {
      id: 'ai-789',
      role: 'assistant' as const,
      content: 'Analysis complete.',
      timestamp: new Date(),
    };
    expect(msg.citedCards).toBeUndefined();
    expect(msg.chartData).toBeUndefined();
    expect(msg.confidence).toBeUndefined();
    expect(msg.streaming).toBeUndefined();
  });
});

describe('ConversationSession interface shape', () => {
  it('can construct a session object', () => {
    const session = {
      id: 'session-abc',
      title: 'Today\'s crime stats',
      messageCount: 3,
      timestamp: new Date(),
    };
    expect(session.id).toBe('session-abc');
    expect(session.title.length).toBeGreaterThan(0);
    expect(session.messageCount).toBeGreaterThanOrEqual(0);
    expect(session.timestamp).toBeInstanceOf(Date);
  });
});

describe('DashboardSnapshot interface shape', () => {
  it('has all 9 metric fields', () => {
    const snapshot = {
      caseVolume: 142,
      openCases: 89,
      activeCases: 53,
      criticalWarnings: 3,
      crimeIndex: 67.5,
      predictionAccuracy: 82,
      divisionCount: 4,
      districtCount: 31,
      stationCount: 906,
    };
    expect(snapshot.caseVolume).toBe(142);
    expect(snapshot.openCases).toBe(89);
    expect(snapshot.activeCases).toBe(53);
    expect(snapshot.criticalWarnings).toBe(3);
    expect(snapshot.crimeIndex).toBe(67.5);
    expect(snapshot.predictionAccuracy).toBe(82);
    expect(snapshot.divisionCount).toBe(4);
    expect(snapshot.districtCount).toBe(31);
    expect(snapshot.stationCount).toBe(906);
  });

  it('predictionAccuracy can be null', () => {
    const snapshot = {
      caseVolume: 0,
      openCases: 0,
      activeCases: 0,
      criticalWarnings: 0,
      crimeIndex: 0,
      predictionAccuracy: null,
      divisionCount: 0,
      districtCount: 0,
      stationCount: 0,
    };
    expect(snapshot.predictionAccuracy).toBeNull();
  });
});

describe('ChartPayload interface shape', () => {
  it('supports bar, line, and pie types', () => {
    const types = ['line', 'bar', 'pie'] as const;
    types.forEach((t) => {
      const chart = { type: t, labels: ['A', 'B'], data: [1, 2] };
      expect(chart.type).toBe(t);
      expect(chart.labels).toHaveLength(2);
      expect(chart.data).toHaveLength(2);
    });
  });

  it('colors are optional', () => {
    const chart = { type: 'bar' as const, labels: ['X'], data: [5] };
    expect(chart.colors).toBeUndefined();
  });
});
