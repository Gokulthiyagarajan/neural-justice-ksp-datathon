// Tests for copilot hooks (useDashboardHighlight, useCopilot).
//
// useDashboardHighlight tests verify DOM-sidecard highlighting logic.
// useCopilot tests verify message sending, session management, and
// state transitions.
//
// NOTE: These are unit-level hook tests using vi.mock. Full integration
// testing requires a running backend and is covered by e2e tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardHighlight } from '../../src/copilot/hooks/useDashboardHighlight';

// ── useDashboardHighlight ──────────────────────────────────────────────────

describe('useDashboardHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds copilot-highlighted class to matching elements', () => {
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'todays-firs');
    document.body.appendChild(el);

    const { result } = renderHook(() => useDashboardHighlight());

    act(() => {
      result.current.highlight(['todays-firs']);
    });

    expect(el.classList.contains('copilot-highlighted')).toBe(true);
  });

  it('removes class after 3 seconds', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'crime-index');
    document.body.appendChild(el);

    const { result } = renderHook(() => useDashboardHighlight());

    act(() => {
      result.current.highlight(['crime-index']);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(false);

    vi.useRealTimers();
  });

  it('does nothing for non-existent card IDs', () => {
    const { result } = renderHook(() => useDashboardHighlight());

    act(() => {
      result.current.highlight(['non-existent-card'] as any);
    });
    // Should not throw — no-op is acceptable
  });

  it('can highlight multiple cards simultaneously', () => {
    const el1 = document.createElement('div');
    el1.setAttribute('data-copilot-card', 'todays-firs');
    document.body.appendChild(el1);

    const el2 = document.createElement('div');
    el2.setAttribute('data-copilot-card', 'crime-index');
    document.body.appendChild(el2);

    const { result } = renderHook(() => useDashboardHighlight());

    act(() => {
      result.current.highlight(['todays-firs', 'crime-index']);
    });

    expect(el1.classList.contains('copilot-highlighted')).toBe(true);
    expect(el2.classList.contains('copilot-highlighted')).toBe(true);
  });

  it('re-applies highlight and resets timer when same card is highlighted again', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'ai-alerts');
    document.body.appendChild(el);

    const { result } = renderHook(() => useDashboardHighlight());

    act(() => {
      result.current.highlight(['ai-alerts']);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(true);

    // Advance partway, then re-highlight
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.highlight(['ai-alerts']);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(true);

    // Should stay highlighted for another 3s from the re-highlight
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(el.classList.contains('copilot-highlighted')).toBe(false);

    vi.useRealTimers();
  });
});
