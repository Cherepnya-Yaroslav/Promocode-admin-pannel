import type { DateRangePreset } from '../../components/primitives/DateRangeControl';

export interface AnalyticsDateRange {
  preset: DateRangePreset;
  customDateFrom: string;
  customDateTo: string;
}

function toStartOfDayIso(date: Date): string {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

function toEndOfDayIso(date: Date): string {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

function parseDateInput(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveDateRange({
  preset,
  customDateFrom,
  customDateTo
}: AnalyticsDateRange): {
  dateFrom?: string;
  dateTo?: string;
} {
  const now = new Date();

  if (preset === 'Today') {
    return {
      dateFrom: toStartOfDayIso(now),
      dateTo: toEndOfDayIso(now)
    };
  }

  if (preset === 'Last 7 days') {
    const dateFrom = new Date(now);
    dateFrom.setDate(now.getDate() - 6);

    return {
      dateFrom: toStartOfDayIso(dateFrom),
      dateTo: toEndOfDayIso(now)
    };
  }

  if (preset === 'Last 30 days') {
    const dateFrom = new Date(now);
    dateFrom.setDate(now.getDate() - 29);

    return {
      dateFrom: toStartOfDayIso(dateFrom),
      dateTo: toEndOfDayIso(now)
    };
  }

  const parsedFrom = parseDateInput(customDateFrom);
  const parsedTo = parseDateInput(customDateTo);

  return {
    ...(parsedFrom ? { dateFrom: toStartOfDayIso(parsedFrom) } : {}),
    ...(parsedTo ? { dateTo: toEndOfDayIso(parsedTo) } : {})
  };
}
