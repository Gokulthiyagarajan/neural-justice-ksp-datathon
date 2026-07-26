interface DayRangePickerProps {
  value: number;
  onChange: (days: number) => void;
}

const OPTIONS = [7, 14, 30, 60, 90];

export function DayRangePicker({ value, onChange }: DayRangePickerProps) {
  return (
    <div className="cir-tabs" role="radiogroup" aria-label="Date range">
      {OPTIONS.map((days) => {
        const id = `cir-tabs-${days}`;
        return (
          <label key={days} htmlFor={id}>
            <input
              id={id}
              type="radio"
              className="cir-tabs__r"
              name="day-range"
              checked={value === days}
              onChange={() => onChange(days)}
              aria-label={`${days} days`}
            />
            <span className="cir-tabs__t">{days}d</span>
          </label>
        );
      })}
    </div>
  );
}
