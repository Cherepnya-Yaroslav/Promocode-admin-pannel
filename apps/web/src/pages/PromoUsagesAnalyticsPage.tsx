import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { DateRangeControl, type DateRangePreset } from '../components/primitives/DateRangeControl';
import { MetricCard } from '../components/primitives/MetricCard';
import { PromoCodePill } from '../components/primitives/PromoCodePill';
import { ServerDataTable } from '../components/primitives/ServerDataTable';
import { apiClient } from '../lib/api';
import { FilterBar, SelectFilterField, TextFilterField } from '../features/analytics/filters';
import { resolveDateRange } from '../features/analytics/date-range';
import type {
  AnalyticsListResponse,
  AnalyticsSortDirection,
  PromoUsageAnalyticsRow,
  PromoUsageAnalyticsSortKey
} from '../features/analytics/types';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function PromoUsagesAnalyticsPage(): JSX.Element {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<PromoUsageAnalyticsSortKey>('usedAt');
  const [sortDir, setSortDir] = useState<AnalyticsSortDirection>('desc');
  const [preset, setPreset] = useState<DateRangePreset>('Last 30 days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [promocodeCode, setPromocodeCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currency, setCurrency] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [minDiscountAmount, setMinDiscountAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');

  const dateRange = resolveDateRange({ preset, customDateFrom, customDateTo });

  const query = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      sortDir,
      ...dateRange,
      ...(promocodeCode.trim()
        ? { promocodeCode: promocodeCode.trim().toUpperCase() }
        : {}),
      ...(userEmail.trim() ? { userEmail: userEmail.trim().toLowerCase() } : {}),
      ...(currency.trim() ? { currency: currency.trim().toUpperCase() } : {}),
      ...(discountType ? { discountType: discountType as 'PERCENT' | 'FIXED' } : {}),
      ...(minDiscountAmount.trim()
        ? { minDiscountAmount: Number(minDiscountAmount) }
        : {}),
      ...(maxDiscountAmount.trim()
        ? { maxDiscountAmount: Number(maxDiscountAmount) }
        : {})
    }),
    [
      currency,
      dateRange,
      discountType,
      maxDiscountAmount,
      minDiscountAmount,
      page,
      pageSize,
      promocodeCode,
      sortBy,
      sortDir,
      userEmail
    ]
  );

  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'promo-usages', auth.accessToken, query],
    queryFn: () =>
      apiClient.getPromoUsagesAnalytics<AnalyticsListResponse<PromoUsageAnalyticsRow>>(
        query,
        {
          token: auth.accessToken!
        }
      ),
    enabled: Boolean(auth.accessToken),
    placeholderData: keepPreviousData
  });

  const currentRows = analyticsQuery.data?.items ?? [];
  const metrics = useMemo(
    () => ({
      gross: currentRows.reduce((sum, row) => sum + row.orderAmount, 0),
      discounts: currentRows.reduce((sum, row) => sum + row.discountAmount, 0),
      net: currentRows.reduce((sum, row) => sum + row.finalAmount, 0)
    }),
    [currentRows]
  );

  function handleSortChange(nextSortKey: string): void {
    const typedSortKey = nextSortKey as PromoUsageAnalyticsSortKey;
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
            <span className="eyebrow-pill__badge">Ledger</span>
            Audit-grade promo usage history
          </p>
          <h2>Promo usage ledger</h2>
          <p>
            Read every applied promocode as a server-driven transaction ledger with
            time, user, instrument, and financial impact visible row by row.
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
          label="Promo code"
          onChange={(value) => {
            setPromocodeCode(value);
            setPage(1);
          }}
          placeholder="SPRING25"
          value={promocodeCode}
        />
        <TextFilterField
          label="User email"
          onChange={(value) => {
            setUserEmail(value);
            setPage(1);
          }}
          placeholder="alex@example.com"
          value={userEmail}
        />
        <TextFilterField
          label="Currency"
          onChange={(value) => {
            setCurrency(value);
            setPage(1);
          }}
          placeholder="USD"
          value={currency}
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
        <TextFilterField
          label="Min discount"
          onChange={(value) => {
            setMinDiscountAmount(value);
            setPage(1);
          }}
          placeholder="10"
          value={minDiscountAmount}
        />
        <TextFilterField
          label="Max discount"
          onChange={(value) => {
            setMaxDiscountAmount(value);
            setPage(1);
          }}
          placeholder="50"
          value={maxDiscountAmount}
        />
      </FilterBar>

      <section className="metric-grid">
        <MetricCard
          label="Ledger rows"
          value={String(analyticsQuery.data?.totalCount ?? 0)}
        />
        <MetricCard
          label="Gross order amount"
          value={formatMoney(metrics.gross)}
          delta="Current page"
          tone="info"
        />
        <MetricCard
          label="Discount amount"
          value={formatMoney(metrics.discounts)}
          delta="Applied"
          tone="warning"
        />
        <MetricCard
          label="Net final amount"
          value={formatMoney(metrics.net)}
          delta="After promos"
          tone="positive"
        />
      </section>

      <ServerDataTable
        columns={[
          {
            key: 'usedAt',
            header: 'Used at',
            sortKey: 'usedAt',
            render: (row) => formatDateTime(row.usedAt)
          },
          {
            key: 'promocodeCode',
            header: 'Promo',
            sortKey: 'promocodeCode',
            render: (row) => (
              <PromoCodePill
                code={row.promocodeCode}
                status={row.discountType}
              />
            )
          },
          {
            key: 'userEmail',
            header: 'User',
            sortKey: 'userEmail',
            render: (row) => (
              <div className="table-person">
                <strong>{row.userFullName}</strong>
                <span>{row.userEmail}</span>
              </div>
            )
          },
          {
            key: 'orderAmount',
            header: 'Order amount',
            sortKey: 'orderAmount',
            render: (row) => formatMoney(row.orderAmount)
          },
          {
            key: 'discountAmount',
            header: 'Discount',
            sortKey: 'discountAmount',
            render: (row) => formatMoney(row.discountAmount)
          },
          {
            key: 'finalAmount',
            header: 'Final amount',
            sortKey: 'finalAmount',
            render: (row) => formatMoney(row.finalAmount)
          },
          {
            key: 'currency',
            header: 'Currency',
            render: (row) => row.currency
          }
        ]}
        getRowKey={(row) => row.promoUsageId}
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
        subtitle="Inspect each promocode application as a ledger of discounts, users, and order impact."
        title="Promo application history"
        totalCount={analyticsQuery.data?.totalCount ?? 0}
      />
    </div>
  );
}
