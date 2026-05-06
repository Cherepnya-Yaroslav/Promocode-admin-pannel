import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { DateRangeControl, type DateRangePreset } from '../components/primitives/DateRangeControl';
import { MetricCard } from '../components/primitives/MetricCard';
import { ServerDataTable } from '../components/primitives/ServerDataTable';
import { StatusBadge } from '../components/primitives/StatusBadge';
import { apiClient } from '../lib/api';
import { FilterBar, SelectFilterField, TextFilterField } from '../features/analytics/filters';
import { resolveDateRange } from '../features/analytics/date-range';
import type {
  AnalyticsListResponse,
  AnalyticsSortDirection,
  UserAnalyticsRow,
  UserAnalyticsSortKey
} from '../features/analytics/types';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'No orders yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function UsersAnalyticsPage(): JSX.Element {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<UserAnalyticsSortKey>('totalOrdersAmount');
  const [sortDir, setSortDir] = useState<AnalyticsSortDirection>('desc');
  const [preset, setPreset] = useState<DateRangePreset>('Last 30 days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [segment, setSegment] = useState('');
  const [activeStatus, setActiveStatus] = useState('');

  const dateRange = resolveDateRange({ preset, customDateFrom, customDateTo });

  const query = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      sortDir,
      ...dateRange,
      ...(email.trim() ? { email: email.trim().toLowerCase() } : {}),
      ...(country.trim() ? { country: country.trim().toUpperCase() } : {}),
      ...(segment.trim() ? { segment: segment.trim() } : {}),
      ...(activeStatus ? { isActive: activeStatus === 'active' } : {})
    }),
    [
      activeStatus,
      country,
      dateRange,
      email,
      page,
      pageSize,
      segment,
      sortBy,
      sortDir
    ]
  );

  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'users', auth.accessToken, query],
    queryFn: () =>
      apiClient.getUsersAnalytics<AnalyticsListResponse<UserAnalyticsRow>>(query, {
        token: auth.accessToken!
      }),
    enabled: Boolean(auth.accessToken),
    placeholderData: keepPreviousData
  });

  const currentRows = analyticsQuery.data?.items ?? [];
  const metrics = useMemo(
    () => ({
      activeUsers: currentRows.filter((row) => row.isActive).length,
      pageRevenue: currentRows.reduce((sum, row) => sum + row.totalOrdersAmount, 0),
      pageDiscounts: currentRows.reduce(
        (sum, row) => sum + row.totalDiscountAmount,
        0
      ),
      pageUsages: currentRows.reduce(
        (sum, row) => sum + row.totalPromoUsageCount,
        0
      )
    }),
    [currentRows]
  );

  function handleSortChange(nextSortKey: string): void {
    const typedSortKey = nextSortKey as UserAnalyticsSortKey;
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
            <span className="eyebrow-pill__badge">Users</span>
            ClickHouse-backed exposure view
          </p>
          <h2>Users analytics</h2>
          <p>
            Scan value concentration, promo dependency, and discount exposure by
            customer cohort without loading the full dataset into the browser.
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
          label="User email"
          onChange={(value) => {
            setEmail(value);
            setPage(1);
          }}
          placeholder="alex@example.com"
          value={email}
        />
        <TextFilterField
          label="Country"
          onChange={(value) => {
            setCountry(value);
            setPage(1);
          }}
          placeholder="US"
          value={country}
        />
        <TextFilterField
          label="Segment"
          onChange={(value) => {
            setSegment(value);
            setPage(1);
          }}
          placeholder="vip"
          value={segment}
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
      </FilterBar>

      <section className="metric-grid">
        <MetricCard
          label="Result set size"
          value={String(analyticsQuery.data?.totalCount ?? 0)}
        />
        <MetricCard
          label="Active users on page"
          value={String(metrics.activeUsers)}
          delta="Current page"
          tone="positive"
        />
        <MetricCard
          label="Page order amount"
          value={formatMoney(metrics.pageRevenue)}
          delta="Gross"
          tone="info"
        />
        <MetricCard
          label="Page discount exposure"
          value={formatMoney(metrics.pageDiscounts)}
          delta={`${metrics.pageUsages} usages`}
          tone="warning"
        />
      </section>

      <ServerDataTable
        columns={[
          {
            key: 'email',
            header: 'User',
            sortKey: 'email',
            render: (row) => (
              <div className="table-person">
                <strong>{row.fullName}</strong>
                <span>{row.email}</span>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge
                label={row.isActive ? 'Active' : 'Inactive'}
                tone={row.isActive ? 'positive' : 'neutral'}
              />
            )
          },
          {
            key: 'country',
            header: 'Country',
            render: (row) => row.country
          },
          {
            key: 'segment',
            header: 'Segment',
            render: (row) => row.segment
          },
          {
            key: 'totalOrdersCount',
            header: 'Orders',
            sortKey: 'totalOrdersCount',
            render: (row) => String(row.totalOrdersCount)
          },
          {
            key: 'totalOrdersAmount',
            header: 'Revenue',
            sortKey: 'totalOrdersAmount',
            render: (row) => formatMoney(row.totalOrdersAmount)
          },
          {
            key: 'totalDiscountAmount',
            header: 'Discount',
            sortKey: 'totalDiscountAmount',
            render: (row) => formatMoney(row.totalDiscountAmount)
          },
          {
            key: 'totalPromoUsageCount',
            header: 'Promo uses',
            sortKey: 'totalPromoUsageCount',
            render: (row) => String(row.totalPromoUsageCount)
          },
          {
            key: 'lastOrderAt',
            header: 'Last order',
            sortKey: 'lastOrderAt',
            render: (row) => formatDate(row.lastOrderAt)
          }
        ]}
        getRowKey={(row) => row.userId}
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
        subtitle="Monitor user value, order activity, and discount exposure across the customer base."
        title="User value and exposure ledger"
        totalCount={analyticsQuery.data?.totalCount ?? 0}
      />
    </div>
  );
}
