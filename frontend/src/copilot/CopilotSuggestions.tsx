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
          className="shrink-0 px-3.5 py-1.5 rounded-full text-13.3333px transition-all duration-150 cursor-pointer whitespace-nowrap bg-muted border border-border text-muted-foreground hover:border-primary hover:text-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
