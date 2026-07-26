interface CopilotSuggestionsProps {
  suggestions: string[];
  onSelect: (query: string) => void;
  lang?: 'en' | 'kn';
}

export default function CopilotSuggestions({ suggestions, onSelect, lang = 'en' }: CopilotSuggestionsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      data-lang={lang}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {suggestions.map((s, i) => (
        <button
          key={`${s}-${i}`}
          onClick={() => onSelect(s)}
          className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] transition-all duration-150 cursor-pointer whitespace-nowrap bg-bg-tertiary border border-border-primary text-text-tertiary hover:border-signal-amber hover:text-text-primary"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
