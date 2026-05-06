export type DateRangePreset = 'Today' | 'Last 7 days' | 'Last 30 days' | 'Custom';

interface DateRangeControlProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  customDateFrom?: string;
  customDateTo?: string;
  onCustomDateFromChange?: (value: string) => void;
  onCustomDateToChange?: (value: string) => void;
}

const presets: DateRangePreset[] = ['Today', 'Last 7 days', 'Last 30 days', 'Custom'];

export function DateRangeControl({
  value,
  onChange,
  customDateFrom,
  customDateTo,
  onCustomDateFromChange,
  onCustomDateToChange
}: DateRangeControlProps): JSX.Element {
  return (
    <div className="date-range-control-wrap">
      <div className="date-range-control" role="tablist" aria-label="Date presets">
        {presets.map((preset) => (
          <button
            key={preset}
            className={preset === value ? 'date-chip date-chip--active' : 'date-chip'}
            onClick={() => onChange(preset)}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      {value === 'Custom' ? (
        <div className="date-range-custom">
          <label className="filter-field">
            <span>From</span>
            <input
              onChange={(event) => onCustomDateFromChange?.(event.target.value)}
              type="date"
              value={customDateFrom ?? ''}
            />
          </label>
          <label className="filter-field">
            <span>To</span>
            <input
              onChange={(event) => onCustomDateToChange?.(event.target.value)}
              type="date"
              value={customDateTo ?? ''}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
