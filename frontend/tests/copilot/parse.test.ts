// Tests for the Copilot response parser (parseCopilotResponse).
// Covers extraction of [CARD:xxx], [CHART:type:json], [CONF:NN] markers,
// marker stripping for clean text, and edge cases (empty input, malformed
// markers, overlapping tokens).

import { describe, it, expect } from 'vitest';
import { parseCopilotResponse } from '../../src/copilot/constants/suggestedQueries';

describe('parseCopilotResponse', () => {
  describe('card extraction', () => {
    it('extracts a single card marker', () => {
      const result = parseCopilotResponse('Data shows [CARD:todays-firs]');
      expect(result.citedCards).toEqual(['todays-firs']);
    });

    it('extracts multiple card markers', () => {
      const result = parseCopilotResponse(
        '[CARD:todays-firs] and [CARD:crime-index] and [CARD:ai-alerts]',
      );
      expect(result.citedCards).toEqual([
        'todays-firs',
        'crime-index',
        'ai-alerts',
      ]);
    });

    it('ignores invalid/unknown card identifiers', () => {
      const result = parseCopilotResponse('[CARD:non-existent-card]');
      expect(result.citedCards).toEqual([]);
    });

    it('returns empty array when no card markers present', () => {
      const result = parseCopilotResponse('Just plain text with no markers');
      expect(result.citedCards).toEqual([]);
    });

    it('handles adjacent card markers without space', () => {
      const result = parseCopilotResponse(
        '[CARD:todays-firs][CARD:crime-index]',
      );
      expect(result.citedCards).toEqual(['todays-firs', 'crime-index']);
    });

    it('only returns valid dashboard card identifiers', () => {
      const result = parseCopilotResponse(
        '[CARD:todays-firs] [CARD:invalid-123] [CARD:crime-index]',
      );
      expect(result.citedCards).toEqual(['todays-firs', 'crime-index']);
    });
  });

  describe('chart extraction', () => {
    it('extracts a bar chart with valid JSON data', () => {
      const result = parseCopilotResponse(
        '[CHART:bar:{"labels":["Jan","Feb"],"data":[45,67]}]',
      );
      expect(result.chartData).not.toBeNull();
      expect(result.chartData!.type).toBe('bar');
      // Verify the JSON can be parsed correctly
      const parsed = JSON.parse(result.chartData!.json);
      expect(parsed.labels).toEqual(['Jan', 'Feb']);
      expect(parsed.data).toEqual([45, 67]);
    });

    it('extracts a line chart', () => {
      const result = parseCopilotResponse(
        '[CHART:line:{"labels":["Q1","Q2"],"data":[120,95]}]',
      );
      expect(result.chartData).not.toBeNull();
      expect(result.chartData!.type).toBe('line');
    });

    it('extracts a pie chart', () => {
      const result = parseCopilotResponse(
        '[CHART:pie:{"labels":["Theft","Assault"],"data":[45,30]}]',
      );
      expect(result.chartData).not.toBeNull();
      expect(result.chartData!.type).toBe('pie');
    });

    it('returns null when no chart marker present', () => {
      const result = parseCopilotResponse('No chart here');
      expect(result.chartData).toBeNull();
    });

    it('handles chart data with nested JSON', () => {
      const json = JSON.stringify({
        labels: ['Zone A', 'Zone B'],
        data: [15, 22],
        colors: ['#FF0000', '#00FF00'],
      });
      const result = parseCopilotResponse(`[CHART:bar:${json}]`);
      expect(result.chartData).not.toBeNull();
      expect(result.chartData!.type).toBe('bar');
      expect(() => JSON.parse(result.chartData!.json)).not.toThrow();
    });
  });

  describe('confidence extraction', () => {
    it('extracts a valid confidence score', () => {
      const result = parseCopilotResponse('[CONF:85]');
      expect(result.confidence).toBe(85);
    });

    it('extracts 0 confidence', () => {
      const result = parseCopilotResponse('[CONF:0]');
      expect(result.confidence).toBe(0);
    });

    it('extracts 100 confidence', () => {
      const result = parseCopilotResponse('[CONF:100]');
      expect(result.confidence).toBe(100);
    });

    it('returns null when no confidence marker present', () => {
      const result = parseCopilotResponse('No confidence marker');
      expect(result.confidence).toBeNull();
    });
  });

  describe('clean text (marker stripping)', () => {
    it('removes all [CARD:] markers', () => {
      const result = parseCopilotResponse(
        'Start [CARD:todays-firs] middle [CARD:crime-index] end',
      );
      expect(result.cleanText).not.toContain('[CARD:');
      expect(result.cleanText).toContain('Start');
      expect(result.cleanText).toContain('middle');
      expect(result.cleanText).toContain('end');
    });

    it('removes [CHART:] markers', () => {
      const result = parseCopilotResponse(
        'Text [CHART:bar:{"labels":["A"],"data":[1]}] more text',
      );
      expect(result.cleanText).not.toContain('[CHART:');
      expect(result.cleanText).toContain('Text');
      expect(result.cleanText).toContain('more text');
    });

    it('removes [CONF:] markers', () => {
      const result = parseCopilotResponse('Analysis complete [CONF:90]');
      expect(result.cleanText).not.toContain('[CONF:');
      expect(result.cleanText).toContain('Analysis complete');
    });

    it('strips all marker types simultaneously', () => {
      const result = parseCopilotResponse(
        '[CARD:todays-firs] Crime is up 15% [CHART:bar:{"data":[]}] [CONF:85]',
      );
      expect(result.cleanText).not.toContain('[CARD:');
      expect(result.cleanText).not.toContain('[CHART:');
      expect(result.cleanText).not.toContain('[CONF:');
      expect(result.cleanText).toContain('Crime is up 15%');
    });

    it('trims extra whitespace after stripping', () => {
      const result = parseCopilotResponse(
        '  [CARD:todays-firs]   Text   [CONF:85]  ',
      );
      expect(result.cleanText).toBe('Text');
    });

    it('returns empty string for input with only markers', () => {
      const result = parseCopilotResponse('[CARD:todays-firs][CONF:85]');
      expect(result.cleanText).toBe('');
    });

    it('handles empty input', () => {
      const result = parseCopilotResponse('');
      expect(result.cleanText).toBe('');
      expect(result.citedCards).toEqual([]);
      expect(result.chartData).toBeNull();
      expect(result.confidence).toBeNull();
    });

    it('handles input with only whitespace', () => {
      const result = parseCopilotResponse('   ');
      expect(result.cleanText).toBe('');
    });
  });

  describe('combined extraction', () => {
    it('parses cards, chart, and confidence from a realistic response', () => {
      const raw =
        'Based on current data, crime in Bengaluru has increased by 15%. ' +
        '[CARD:todays-firs] [CARD:crime-index] ' +
        '[CHART:bar:{"labels":["Jan","Feb","Mar"],"data":[45,67,89]}] ' +
        '[CONF:85]';

      const result = parseCopilotResponse(raw);

      expect(result.citedCards).toContain('todays-firs');
      expect(result.citedCards).toContain('crime-index');
      expect(result.chartData).not.toBeNull();
      expect(result.chartData!.type).toBe('bar');
      expect(result.confidence).toBe(85);
      expect(result.cleanText).toContain('Bengaluru has increased by 15%');
    });

    it('extracts data when markers are mid-sentence', () => {
      const raw =
        'The crime index [CARD:crime-index] shows [CHART:bar:{"data":[1]}] ' +
        'with high confidence [CONF:92]';

      const result = parseCopilotResponse(raw);

      expect(result.citedCards).toHaveLength(1);
      expect(result.chartData).not.toBeNull();
      expect(result.confidence).toBe(92);
    });
  });
});
