interface TextFilterFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function TextFilterField({
  label,
  value,
  placeholder,
  onChange
}: TextFilterFieldProps): JSX.Element {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

interface SelectFilterFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}

export function SelectFilterField({
  label,
  value,
  onChange,
  options
}: SelectFilterFieldProps): JSX.Element {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps): JSX.Element {
  return <div className="filter-bar">{children}</div>;
}
import type { ReactNode } from 'react';
