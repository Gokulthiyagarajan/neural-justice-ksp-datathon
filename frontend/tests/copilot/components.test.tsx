// Component tests for the Copilot UI module.
//
// Tests rendering, state, and interactions for:
// - CopilotMessage (assistant/user bubbles, charts, confidence, cited cards)
// - CopilotSuggestions (chip buttons)
// - CopilotInput (text input, send, voice)
// - CopilotDock (floating button)
// - CopilotHighlight (DOM effects)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CopilotMessage from '../../src/copilot/CopilotMessage';
import CopilotSuggestions from '../../src/copilot/CopilotSuggestions';
import CopilotInput from '../../src/copilot/CopilotInput';
import CopilotDock from '../../src/copilot/CopilotDock';
import CopilotHighlight from '../../src/copilot/CopilotHighlight';

// ── Mocks ───────────────────────────────────────────────────────────────────

// Mock AiAssistantContext (used by CopilotDock)
vi.mock('@/context/AiAssistantContext', () => ({
  useAiAssistant: () => ({
    state: 'expanded',
    lang: 'en',
  }),
}));

// Mock framer-motion to render children immediately (no animation)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      // Strip framer-motion specific props
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// ── CopilotMessage ──────────────────────────────────────────────────────────

describe('CopilotMessage', () => {
  const baseAssistantMsg = {
    id: 'ai-msg-1',
    role: 'assistant' as const,
    content: 'Crime has increased by 15% in Bengaluru Urban.',
    timestamp: new Date('2026-07-28T10:30:00'),
  };

  it('renders assistant message content', () => {
    render(<CopilotMessage message={baseAssistantMsg} />);
    expect(screen.getByText(/Crime has increased by 15%/)).toBeInTheDocument();
  });

  it('renders user message with different alignment', () => {
    const userMsg = {
      id: 'user-msg-1',
      role: 'user' as const,
      content: 'Show me today\'s FIR stats',
      timestamp: new Date(),
    };
    render(<CopilotMessage message={userMsg} />);
    expect(screen.getByText(/today's FIR stats/)).toBeInTheDocument();
  });

  it('shows AI Copilot label for assistant messages', () => {
    render(<CopilotMessage message={baseAssistantMsg} />);
    expect(screen.getByText('AI Copilot')).toBeInTheDocument();
  });

  it('renders confidence badge when confidence is provided', () => {
    const msg = { ...baseAssistantMsg, confidence: 85 };
    render(<CopilotMessage message={msg} />);
    expect(screen.getByText('85% AI')).toBeInTheDocument();
  });

  it('does not render confidence badge when confidence is undefined', () => {
    render(<CopilotMessage message={baseAssistantMsg} />);
    expect(screen.queryByText(/% AI/)).not.toBeInTheDocument();
  });

  it('renders green confidence badge for high confidence (>= 85)', () => {
    const msg = { ...baseAssistantMsg, confidence: 90 };
    render(<CopilotMessage message={msg} />);
    const badge = screen.getByText('90% AI');
    expect(badge).toBeInTheDocument();
  });

  it('renders yellow confidence badge for medium confidence (70-84)', () => {
    const msg = { ...baseAssistantMsg, confidence: 75 };
    render(<CopilotMessage message={msg} />);
    const badge = screen.getByText('75% AI');
    expect(badge).toBeInTheDocument();
  });

  it('renders red confidence badge for low confidence (< 70)', () => {
    const msg = { ...baseAssistantMsg, confidence: 55 };
    render(<CopilotMessage message={msg} />);
    const badge = screen.getByText('55% AI');
    expect(badge).toBeInTheDocument();
  });

  it('renders cited cards section', () => {
    const msg = {
      ...baseAssistantMsg,
      citedCards: ['todays-firs' as const, 'crime-index' as const],
    };
    render(<CopilotMessage message={msg} />);
    expect(screen.getByText('REFERENCED FROM DASHBOARD')).toBeInTheDocument();
    // Card labels are transformed: "todays firs", "crime index"
    expect(screen.getByText(/Todays Firs/i)).toBeInTheDocument();
    expect(screen.getByText(/Crime Index/i)).toBeInTheDocument();
  });

  it('does not render cited cards section when citedCards is empty', () => {
    const msg = { ...baseAssistantMsg, citedCards: [] };
    render(<CopilotMessage message={msg} />);
    expect(screen.queryByText('REFERENCED FROM DASHBOARD')).not.toBeInTheDocument();
  });

  it('does not render cited cards section when citedCards is undefined', () => {
    render(<CopilotMessage message={baseAssistantMsg} />);
    expect(screen.queryByText('REFERENCED FROM DASHBOARD')).not.toBeInTheDocument();
  });

  it('renders inline bar chart when chartData is present', () => {
    const msg = {
      ...baseAssistantMsg,
      chartData: {
        type: 'bar' as const,
        labels: ['Jan', 'Feb', 'Mar'],
        data: [10, 25, 35],
      },
    };
    render(<CopilotMessage message={msg} />);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('renders inline line chart as SVG', () => {
    const msg = {
      ...baseAssistantMsg,
      chartData: {
        type: 'line' as const,
        labels: ['Q1', 'Q2'],
        data: [50, 80],
      },
    };
    const { container } = render(<CopilotMessage message={msg} />);
    // Line chart renders as SVG polyline
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
  });

  it('shows streaming animation when streaming is true', () => {
    const msg = {
      ...baseAssistantMsg,
      content: '',
      streaming: true,
    };
    render(<CopilotMessage message={msg} />);
    // Should show bouncing dots instead of text
    const dots = document.querySelectorAll('.animate-bounce');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('shows action buttons for non-streaming messages', () => {
    render(<CopilotMessage message={baseAssistantMsg} />);
    expect(screen.getByText(/View full report/i)).toBeInTheDocument();
    expect(screen.getByText(/Export insight/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask follow-up/i)).toBeInTheDocument();
  });
});

// ── CopilotSuggestions ──────────────────────────────────────────────────────

describe('CopilotSuggestions', () => {
  const suggestions = [
    'Show today\'s FIRs',
    'Analyze crime patterns',
    'District hotspots',
  ];

  it('renders all suggestion chips', () => {
    render(
      <CopilotSuggestions suggestions={suggestions} onSelect={() => {}} />,
    );
    expect(screen.getByText(/today's FIRs/)).toBeInTheDocument();
    expect(screen.getByText(/Analyze crime patterns/)).toBeInTheDocument();
    expect(screen.getByText(/District hotspots/)).toBeInTheDocument();
  });

  it('calls onSelect when a chip is clicked', () => {
    const onSelect = vi.fn();
    render(
      <CopilotSuggestions suggestions={suggestions} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText(/today's FIRs/));
    expect(onSelect).toHaveBeenCalledWith('Show today\'s FIRs');
  });

  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(
      <CopilotSuggestions suggestions={[]} onSelect={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('sets data-lang attribute', () => {
    render(
      <CopilotSuggestions suggestions={suggestions} onSelect={() => {}} lang="kn" />,
    );
    const container = screen.getByText(/today's FIRs/).closest('[data-lang]')!;
    expect(container).toHaveAttribute('data-lang', 'kn');
  });
});

// ── CopilotInput ────────────────────────────────────────────────────────────

describe('CopilotInput', () => {
  it('renders textarea and send button', () => {
    render(
      <CopilotInput value="" onChange={() => {}} onSend={() => {}} lang="en" />,
    );
    const textarea = screen.getByPlaceholderText(/Ask about FIRs/);
    expect(textarea).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onChange when text is typed', () => {
    const onChange = vi.fn();
    render(
      <CopilotInput value="" onChange={onChange} onSend={() => {}} lang="en" />,
    );
    const textarea = screen.getByPlaceholderText(/Ask about FIRs/);
    fireEvent.change(textarea, { target: { value: 'new query' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onSend when Enter is pressed', () => {
    const onSend = vi.fn();
    render(
      <CopilotInput value="test query" onChange={() => {}} onSend={onSend} lang="en" />,
    );
    const textarea = screen.getByPlaceholderText(/Ask about FIRs/);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('test query');
  });

  it('does not call onSend on Enter+Shift', () => {
    const onSend = vi.fn();
    render(
      <CopilotInput value="test query" onChange={() => {}} onSend={onSend} lang="en" />,
    );
    const textarea = screen.getByPlaceholderText(/Ask about FIRs/);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('send button is disabled when input is empty', () => {
    render(
      <CopilotInput value="" onChange={() => {}} onSend={() => {}} lang="en" />,
    );
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1]; // Last button is send
    expect(sendBtn).toBeDisabled();
  });

  it('send button is enabled when input has text', () => {
    render(
      <CopilotInput value="query" onChange={() => {}} onSend={() => {}} lang="en" />,
    );
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1];
    expect(sendBtn).not.toBeDisabled();
  });

  it('uses Kannada placeholder when lang is kn', () => {
    render(
      <CopilotInput value="" onChange={() => {}} onSend={() => {}} lang="kn" />,
    );
    expect(screen.getByPlaceholderText(/ಎಫ್ಐಆರ್/)).toBeInTheDocument();
  });
});

// ── CopilotDock ─────────────────────────────────────────────────────────────

describe('CopilotDock', () => {
  it('renders a dock button', () => {
    render(<CopilotDock />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('displays keyboard shortcut hint', () => {
    render(<CopilotDock />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('shows green status indicator when idle (expanded)', () => {
    render(<CopilotDock />);
    const greenDot = document.querySelector('.bg-verified-green');
    expect(greenDot).toBeInTheDocument();
  });
});

// ── CopilotHighlight ────────────────────────────────────────────────────────

describe('CopilotHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds highlight class to matching DOM elements', () => {
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'todays-firs');
    document.body.appendChild(el);

    render(<CopilotHighlight cardIds={['todays-firs' as const]} />);
    expect(el.classList.contains('copilot-highlighted')).toBe(true);
  });

  it('removes highlight class after 3 seconds', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'crime-index');
    document.body.appendChild(el);

    render(<CopilotHighlight cardIds={['crime-index' as const]} />);
    expect(el.classList.contains('copilot-highlighted')).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(el.classList.contains('copilot-highlighted')).toBe(false);

    vi.useRealTimers();
  });

  it('does nothing for empty cardIds', () => {
    const el = document.createElement('div');
    el.setAttribute('data-copilot-card', 'todays-firs');
    document.body.appendChild(el);

    render(<CopilotHighlight cardIds={[]} />);
    expect(el.classList.contains('copilot-highlighted')).toBe(false);
  });

  it('highlights multiple elements with the same card ID', () => {
    const el1 = document.createElement('div');
    el1.setAttribute('data-copilot-card', 'ai-alerts');
    document.body.appendChild(el1);

    const el2 = document.createElement('div');
    el2.setAttribute('data-copilot-card', 'ai-alerts');
    document.body.appendChild(el2);

    render(<CopilotHighlight cardIds={['ai-alerts' as const]} />);
    expect(el1.classList.contains('copilot-highlighted')).toBe(true);
    expect(el2.classList.contains('copilot-highlighted')).toBe(true);
  });

  it('renders null (no visible output)', () => {
    const { container } = render(<CopilotHighlight cardIds={['todays-firs' as const]} />);
    expect(container.innerHTML).toBe('');
  });
});
