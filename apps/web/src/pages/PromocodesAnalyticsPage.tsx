import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { DateRangeControl, type DateRangePreset } from '../components/primitives/DateRangeControl';
import { MetricCard } from '../components/primitives/MetricCard';
import { PromoCodePill } from '../components/primitives/PromoCodePill';
import { ServerDataTable } from '../components/primitives/ServerDataTable';
import { StatusBadge } from '../components/primitives/StatusBadge';
import { apiClient } from '../lib/api';
import { FilterBar, SelectFilterField, TextFilterField } from '../features/analytics/filters';
import { resolveDateRange } from '../features/analytics/date-range';
import type {
  AnalyticsListResponse,
  AnalyticsSortDirection,
  PromocodeAnalyticsRow,
  PromocodeAnalyticsSortKey
} from '../features/analytics/types';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function PromocodesAnalyticsPage(): JSX.Element {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<PromocodeAnalyticsSortKey>('totalDiscountAmount');
  const [sortDir, setSortDir] = useState<AnalyticsSortDirection>('desc');
  const [preset, setPreset] = useState<DateRangePreset>('Last 30 days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minUsageCount, setMinUsageCount] = useState('');

  const dateRange = resolveDateRange({ preset, customDateFrom, customDateTo });

  const query = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      sortDir,
      ...dateRange,
      ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
      ...(discountType ? { discountType: discountType as 'PERCENT' | 'FIXED' } : {}),
      ...(activeStatus ? { isActive: activeStatus === 'active' } : {}),
      ...(stateFilter
        ? { state: stateFilter as 'active' | 'inactive' | 'scheduled' | 'expired' }
        : {}),
      ...(minUsageCount.trim() ? { minUsageCount: Number(minUsageCount) } : {})
    }),
    [
      activeStatus,
      code,
      dateRange,
      discountType,
      minUsageCount,
      page,
      pageSize,
      sortBy,
      sortDir,
      stateFilter
    ]
  );

  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'promocodes', auth.accessToken, query],
    queryFn: () =>
      apiClient.getPromocodesAnalytics<AnalyticsListResponse<PromocodeAnalyticsRow>>(query, {
        token: auth.accessToken!
      }),
    enabled: Boolean(auth.accessToken),
    placeholderData: keepPreviousData
  });

  const currentRows = analyticsQuery.data?.items ?? [];
  const metrics = useMemo(
    () => ({
      activeCount: currentRows.filter((row) => row.isActive).length,
      pageDiscountSpend: currentRows.reduce(
        (sum, row) => sum + row.totalDiscountAmount,
        0
      ),
      pageRevenueAffected: currentRows.reduce(
        (sum, row) => sum + row.totalRevenueAffected,
        0
      ),
      pageUsageCount: currentRows.reduce((sum, row) => sum + row.totalUsageCount, 0)
    }),
    [currentRows]
  );

  function handleSortChange(nextSortKey: string): void {
    const typedSortKey = nextSortKey as PromocodeAnalyticsSortKey;
    if (typedSortKey === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(typedSortKey);
    setSortDir('desc');
    setPage(1);
  }

  return (
    <div className="page-stack">
      <section className="analytics-page-header">
        <div>
          <p className="eyebrow-pill">
            <span className="eyebrow-pill__badge">Promocodes</span>
            Performance and spend console
          </p>
          <h2>Promocode performance</h2>
          <p>
            Track campaign usage, gross revenue touched, discount share, and
            expiry exposure from ClickHouse-backed analytical rows.
          </p>
        </div>
        <DateRangeControl
          customDateFrom={customDateFrom}
          customDateTo={customDateTo}
          onChange={(value) => {
            setPreset(value);
            setPage(1);
          }}
          onCustomDateFromChange={(value) => {
            setCustomDateFrom(value);
            setPage(1);
          }}
          onCustomDateToChange={(value) => {
            setCustomDateTo(value);
            setPage(1);
          }}
          value={preset}
        />
      </section>

      <FilterBar>
        <TextFilterField
          label="Code"
          onChange={(value) => {
            setCode(value);
            setPage(1);
          }}
          placeholder="SPRING25"
          value={code}
        />
        <SelectFilterField
          label="Discount type"
          onChange={(value) => {
            setDiscountType(value);
            setPage(1);
          }}
          options={[
            { label: 'All types', value: '' },
            { label: 'Percent', value: 'PERCENT' },
            { label: 'Fixed', value: 'FIXED' }
          ]}
          value={discountType}
        />
        <SelectFilterField
          label="Status"
          onChange={(value) => {
            setActiveStatus(value);
            setPage(1);
          }}
          options={[
            { label: 'All statuses', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ]}
          value={activeStatus}
        />
        <SelectFilterField
          label="Lifecycle"
          onChange={(value) => {
            setStateFilter(value);
            setPage(1);
          }}
          options={[
            { label: 'All lifecycle states', value: '' },
            { label: 'Live now', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Expired', value: 'expired' }
          ]}
          value={stateFilter}
        />
        <TextFilterField
          label="Min usage count"
          onChange={(value) => {
            setMinUsageCount(value);
            setPage(1);
          }}
          placeholder="10"
          value={minUsageCount}
        />
      </FilterBar>

      <section className="metric-grid">
        <MetricCard
          label="Result set size"
          value={String(analyticsQuery.data?.totalCount ?? 0)}
        />
        <MetricCard
          label="Active campaigns on page"
          value={String(metrics.activeCount)}
          delta="Live"
          tone="positive"
        />
        <MetricCard
          label="Page discount spend"
          value={formatMoney(metrics.pageDiscountSpend)}
          delta={`${metrics.pageUsageCount} uses`}
          tone="warning"
        />
        <MetricCard
          label="Gross revenue touched"
          value={formatMoney(metrics.pageRevenueAffected)}
          delta="Current page"
          tone="info"
        />
      </section>

      <ServerDataTable
        columns={[
          {
            key: 'code',
            header: 'Promo instrument',
            sortKey: 'code',
            render: (row) => (
              <PromoCodePill
                code={row.code}
                status={row.isActive ? 'Active' : 'Inactive'}
              />
            )
          },
          {
            key: 'discountType',
            header: 'Type',
            render: (row) => `${row.discountType} · ${row.discountValue}`
          },
          {
            key: 'status',
            header: 'Status',
            sortKey: 'isActive',
            render: (row) => (
              <StatusBadge
                label={row.isActive ? 'Active' : 'Inactive'}
                tone={row.isActive ? 'positive' : 'neutral'}
              />
            )
          },
          {
            key: 'totalUsageCount',
            header: 'Usage',
            sortKey: 'totalUsageCount',
            render: (row) => String(row.totalUsageCount)
          },
          {
            key: 'totalDiscountAmount',
            header: 'Discount spend',
            sortKey: 'totalDiscountAmount',
            render: (row) => formatMoney(row.totalDiscountAmount)
          },
          {
            key: 'totalRevenueAffected',
            header: 'Gross revenue touched',
            sortKey: 'totalRevenueAffected',
            render: (row) => formatMoney(row.totalRevenueAffected)
          },
          {
            key: 'conversionRate',
            header: 'Discount share',
            sortKey: 'conversionRate',
            render: (row) => `${(row.conversionRate * 100).toFixed(1)}%`
          },
          {
            key: 'dateTo',
            header: 'Expires',
            sortKey: 'dateTo',
            render: (row) => formatDate(row.dateTo)
          }
        ]}
        getRowKey={(row) => row.promocodeId}
        isError={analyticsQuery.isError}
        isLoading={analyticsQuery.isLoading}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onRetry={() => void analyticsQuery.refetch()}
        onSortChange={handleSortChange}
        page={analyticsQuery.data?.page ?? page}
        pageSize={analyticsQuery.data?.pageSize ?? pageSize}
        rows={currentRows}
        sortBy={sortBy}
        sortDir={sortDir}
        subtitle="Follow promo performance, discount pressure, and active instrument quality."
        title="Campaign performance ledger"
        totalCount={analyticsQuery.data?.totalCount ?? 0}
      />
    </div>
  );
}
