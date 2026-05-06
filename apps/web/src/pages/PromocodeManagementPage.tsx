import { zodResolver } from '@hookform/resolvers/zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/auth-context';
import { OperationsTabs } from '../components/primitives/OperationsTabs';
import { ServerDataTable } from '../components/primitives/ServerDataTable';
import { PromoCodePill } from '../components/primitives/PromoCodePill';
import { StatusBadge } from '../components/primitives/StatusBadge';
import { SurfaceCard } from '../components/primitives/SurfaceCard';
import {
  createPromocodeSchema,
  discountTypeOptions,
  type CreatePromocodeFormValues,
  type UpdatePromocodeFormValues,
  updatePromocodeSchema
} from '../features/operations/schemas';
import type {
  PaginatedResponse,
  PromocodeRecord
} from '../features/operations/types';
import { ApiError, apiClient } from '../lib/api';
import { useToast } from '../toast/toast-provider';

interface CachedPromocodePagesSnapshot {
  queryKey: readonly unknown[];
  data: PaginatedResponse<PromocodeRecord> | undefined;
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return 'None';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

function parseOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number.parseInt(trimmed, 10);
}

function getPromocodeLifecycleStatus(
  promocode: PromocodeRecord
): { label: string; tone: 'positive' | 'critical' | 'warning' | 'info' | 'neutral' } {
  if (!promocode.isActive) {
    return { label: 'Inactive', tone: 'neutral' };
  }

  const now = Date.now();
  if (new Date(promocode.dateFrom).getTime() > now) {
    return { label: 'Scheduled', tone: 'info' };
  }

  if (new Date(promocode.dateTo).getTime() < now) {
    return { label: 'Expired', tone: 'critical' };
  }

  return { label: 'Active', tone: 'positive' };
}

function toCreatePromocodePayload(values: CreatePromocodeFormValues): Record<string, unknown> {
  return {
    code: values.code.trim().toUpperCase(),
    description: values.description.trim(),
    discountType: values.discountType,
    discountValue: Number(values.discountValue),
    maxDiscountAmount: parseOptionalNumber(values.maxDiscountAmount),
    minOrderAmount: parseOptionalNumber(values.minOrderAmount),
    totalUsageLimit: parseOptionalInteger(values.totalUsageLimit),
    perUserUsageLimit: parseOptionalInteger(values.perUserUsageLimit),
    dateFrom: new Date(values.dateFrom).toISOString(),
    dateTo: new Date(values.dateTo).toISOString(),
    isActive: values.isActive
  };
}

function toUpdatePromocodePayload(values: UpdatePromocodeFormValues): Record<string, unknown> {
  return {
    description: values.description.trim(),
    discountValue: Number(values.discountValue),
    maxDiscountAmount: parseOptionalNumber(values.maxDiscountAmount),
    minOrderAmount: parseOptionalNumber(values.minOrderAmount),
    totalUsageLimit: parseOptionalInteger(values.totalUsageLimit),
    perUserUsageLimit: parseOptionalInteger(values.perUserUsageLimit),
    dateFrom: new Date(values.dateFrom).toISOString(),
    dateTo: new Date(values.dateTo).toISOString(),
    isActive: values.isActive
  };
}

function updatePromocodeCollection(
  data: PaginatedResponse<PromocodeRecord> | undefined,
  updater: (item: PromocodeRecord) => PromocodeRecord
): PaginatedResponse<PromocodeRecord> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    items: data.items.map(updater)
  };
}

export function PromocodeManagementPage(): JSX.Element {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPromocodeId, setSelectedPromocodeId] = useState<string | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);

  const query = useMemo(
    () => ({
      page,
      pageSize,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter ? { isActive: statusFilter === 'active' } : {})
    }),
    [page, pageSize, search, statusFilter]
  );

  const promocodesQuery = useQuery({
    queryKey: ['operations', 'promocodes', auth.accessToken, query],
    queryFn: () =>
      apiClient.listPromocodes<PaginatedResponse<PromocodeRecord>>(query, {
        token: auth.accessToken!
      }),
    enabled: Boolean(auth.accessToken),
    placeholderData: keepPreviousData
  });

  const currentRows = promocodesQuery.data?.items ?? [];
  const selectedPromocode =
    currentRows.find((item) => item.id === selectedPromocodeId) ?? currentRows[0] ?? null;

  useEffect(() => {
    if (!selectedPromocodeId && currentRows.length > 0) {
      const firstPromocode = currentRows[0];
      if (firstPromocode) {
        setSelectedPromocodeId(firstPromocode.id);
      }
    }

    if (
      selectedPromocodeId &&
      currentRows.length > 0 &&
      !currentRows.some((item) => item.id === selectedPromocodeId)
    ) {
      setSelectedPromocodeId(currentRows[0]?.id ?? null);
    }
  }, [currentRows, selectedPromocodeId]);

  const createForm = useForm<CreatePromocodeFormValues>({
    resolver: zodResolver(createPromocodeSchema),
    defaultValues: {
      code: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: '',
      maxDiscountAmount: '',
      minOrderAmount: '',
      totalUsageLimit: '',
      perUserUsageLimit: '',
      dateFrom: '',
      dateTo: '',
      isActive: true
    }
  });

  const editForm = useForm<UpdatePromocodeFormValues>({
    resolver: zodResolver(updatePromocodeSchema),
    defaultValues: {
      description: '',
      discountValue: '',
      maxDiscountAmount: '',
      minOrderAmount: '',
      totalUsageLimit: '',
      perUserUsageLimit: '',
      dateFrom: '',
      dateTo: '',
      isActive: true
    }
  });

  useEffect(() => {
    if (!selectedPromocode) {
      return;
    }

    editForm.reset({
      description: selectedPromocode.description,
      discountValue: String(selectedPromocode.discountValue),
      maxDiscountAmount:
        selectedPromocode.maxDiscountAmount === null
          ? ''
          : String(selectedPromocode.maxDiscountAmount),
      minOrderAmount:
        selectedPromocode.minOrderAmount === null
          ? ''
          : String(selectedPromocode.minOrderAmount),
      totalUsageLimit:
        selectedPromocode.totalUsageLimit === null
          ? ''
          : String(selectedPromocode.totalUsageLimit),
      perUserUsageLimit:
        selectedPromocode.perUserUsageLimit === null
          ? ''
          : String(selectedPromocode.perUserUsageLimit),
      dateFrom: toDateTimeLocalValue(selectedPromocode.dateFrom),
      dateTo: toDateTimeLocalValue(selectedPromocode.dateTo),
      isActive: selectedPromocode.isActive
    });
  }, [editForm, selectedPromocode]);

  const createMutation = useMutation({
    mutationFn: (values: CreatePromocodeFormValues) =>
      apiClient.createPromocode<PromocodeRecord>(toCreatePromocodePayload(values), {
        token: auth.accessToken!
      }),
    onSuccess: async (createdPromocode) => {
      setCreateErrorMessage(null);
      createForm.reset();
      setSelectedPromocodeId(createdPromocode.id);
      pushToast({
        title: 'Promocode created',
        description: `${createdPromocode.code} is now available for order operations.`,
        tone: 'success'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'promocodes'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Unable to create promocode.';
      setCreateErrorMessage(message);
      pushToast({
        title: 'Promocode creation failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdatePromocodeFormValues) => {
      if (!selectedPromocode) {
        throw new Error('No promocode selected.');
      }

      return apiClient.updatePromocode<PromocodeRecord>(
        selectedPromocode.id,
        toUpdatePromocodePayload(values),
        { token: auth.accessToken! }
      );
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'promocodes'] });

      const snapshots = queryClient.getQueriesData<
        PaginatedResponse<PromocodeRecord> | undefined
      >({ queryKey: ['operations', 'promocodes'] });

      queryClient.setQueriesData<PaginatedResponse<PromocodeRecord> | undefined>(
        { queryKey: ['operations', 'promocodes'] },
        (current) =>
          updatePromocodeCollection(current, (item) =>
            item.id === selectedPromocode?.id
              ? {
                  ...item,
                  description: values.description.trim(),
                  discountValue: Number(values.discountValue),
                  maxDiscountAmount:
                    parseOptionalNumber(values.maxDiscountAmount) ?? null,
                  minOrderAmount:
                    parseOptionalNumber(values.minOrderAmount) ?? null,
                  totalUsageLimit:
                    parseOptionalInteger(values.totalUsageLimit) ?? null,
                  perUserUsageLimit:
                    parseOptionalInteger(values.perUserUsageLimit) ?? null,
                  dateFrom: new Date(values.dateFrom).toISOString(),
                  dateTo: new Date(values.dateTo).toISOString(),
                  isActive: values.isActive
                }
              : item
          )
      );

      return {
        snapshots: snapshots.map(([queryKey, data]) => ({ queryKey, data }))
      };
    },
    onSuccess: async (updatedPromocode) => {
      setEditErrorMessage(null);
      setSelectedPromocodeId(updatedPromocode.id);
      pushToast({
        title: 'Promocode updated',
        description: `${updatedPromocode.code} now reflects the latest commercial terms.`,
        tone: 'success'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'promocodes'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error, _values, context) => {
      context?.snapshots.forEach((snapshot: CachedPromocodePagesSnapshot) => {
        queryClient.setQueryData(snapshot.queryKey, snapshot.data);
      });
      const message =
        error instanceof ApiError ? error.message : 'Unable to update promocode.';
      setEditErrorMessage(message);
      pushToast({
        title: 'Promocode update failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (promocodeId: string) =>
      apiClient.deactivatePromocode<PromocodeRecord>(promocodeId, {
        token: auth.accessToken!
      }),
    onMutate: async (promocodeId) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'promocodes'] });

      const snapshots = queryClient.getQueriesData<
        PaginatedResponse<PromocodeRecord> | undefined
      >({ queryKey: ['operations', 'promocodes'] });

      queryClient.setQueriesData<PaginatedResponse<PromocodeRecord> | undefined>(
        { queryKey: ['operations', 'promocodes'] },
        (current) =>
          updatePromocodeCollection(current, (item) =>
            item.id === promocodeId ? { ...item, isActive: false } : item
          )
      );

      return {
        snapshots: snapshots.map(([queryKey, data]) => ({ queryKey, data }))
      };
    },
    onSuccess: async (deactivatedPromocode) => {
      pushToast({
        title: 'Promocode deactivated',
        description: `${deactivatedPromocode.code} will no longer be applied to new orders.`,
        tone: 'info'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'promocodes'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error, _promocodeId, context) => {
      context?.snapshots.forEach((snapshot: CachedPromocodePagesSnapshot) => {
        queryClient.setQueryData(snapshot.queryKey, snapshot.data);
      });
      const message =
        error instanceof ApiError ? error.message : 'Unable to deactivate promocode.';
      pushToast({
        title: 'Promocode deactivation failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const metrics = useMemo(
    () => ({
      total: promocodesQuery.data?.totalCount ?? 0,
      active: currentRows.filter((item) => item.isActive).length,
      scheduled: currentRows.filter(
        (item) => getPromocodeLifecycleStatus(item).label === 'Scheduled'
      ).length,
      totalConfiguredCap: currentRows.reduce(
        (sum, item) => sum + (item.totalUsageLimit ?? 0),
        0
      )
    }),
    [currentRows, promocodesQuery.data?.totalCount]
  );

  return (
    <div className="page-stack">
      <section className="analytics-page-header">
        <div>
          <p className="eyebrow-pill">
            <span className="eyebrow-pill__badge">Operations</span>
            Mongo writes, ClickHouse read model sync
          </p>
          <h2>Promocode operations</h2>
          <p>
            Manage promo instruments from the command side, then let analytics refetch
            against the ClickHouse read model after cache invalidation.
          </p>
        </div>
        <OperationsTabs />
      </section>

      <section className="metric-grid metric-grid--operations">
        <SurfaceCard className="signal-card">
          <span className="table-meta">Visible instruments</span>
          <strong>{metrics.total}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Active on current page</span>
          <strong>{metrics.active}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Scheduled on current page</span>
          <strong>{metrics.scheduled}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Configured usage cap</span>
          <strong>{metrics.totalConfiguredCap}</strong>
        </SurfaceCard>
      </section>

      <div className="operations-dual-grid">
        <SurfaceCard>
          <div className="operations-card-header">
            <div>
              <h3>Create promocode</h3>
              <p>Launch a new financial instrument with validated limits and date windows.</p>
            </div>
          </div>
          <form
            className="operations-form"
            onSubmit={createForm.handleSubmit((values: CreatePromocodeFormValues) =>
              createMutation.mutate(values)
            )}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>Code</span>
                <input placeholder="SPRING25" {...createForm.register('code')} />
                <small>{createForm.formState.errors.code?.message}</small>
              </label>
              <label className="form-field">
                <span>Discount type</span>
                <select {...createForm.register('discountType')}>
                  {discountTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <small>{createForm.formState.errors.discountType?.message}</small>
              </label>
            </div>
            <label className="form-field">
              <span>Description</span>
              <input placeholder="25 percent seasonal campaign" {...createForm.register('description')} />
              <small>{createForm.formState.errors.description?.message}</small>
            </label>
            <div className="form-grid form-grid--triple">
              <label className="form-field">
                <span>Discount value</span>
                <input inputMode="decimal" placeholder="25" {...createForm.register('discountValue')} />
                <small>{createForm.formState.errors.discountValue?.message}</small>
              </label>
              <label className="form-field">
                <span>Max discount</span>
                <input inputMode="decimal" placeholder="100" {...createForm.register('maxDiscountAmount')} />
                <small>{createForm.formState.errors.maxDiscountAmount?.message}</small>
              </label>
              <label className="form-field">
                <span>Min order amount</span>
                <input inputMode="decimal" placeholder="50" {...createForm.register('minOrderAmount')} />
                <small>{createForm.formState.errors.minOrderAmount?.message}</small>
              </label>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>Total usage limit</span>
                <input inputMode="numeric" placeholder="5000" {...createForm.register('totalUsageLimit')} />
                <small>{createForm.formState.errors.totalUsageLimit?.message}</small>
              </label>
              <label className="form-field">
                <span>Per-user limit</span>
                <input inputMode="numeric" placeholder="1" {...createForm.register('perUserUsageLimit')} />
                <small>{createForm.formState.errors.perUserUsageLimit?.message}</small>
              </label>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>Start date</span>
                <input type="datetime-local" {...createForm.register('dateFrom')} />
                <small>{createForm.formState.errors.dateFrom?.message}</small>
              </label>
              <label className="form-field">
                <span>End date</span>
                <input type="datetime-local" {...createForm.register('dateTo')} />
                <small>{createForm.formState.errors.dateTo?.message}</small>
              </label>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" {...createForm.register('isActive')} />
              <span>Promocode is active at launch</span>
            </label>
            {createErrorMessage ? <div className="form-error">{createErrorMessage}</div> : null}
            <div className="form-actions">
              <button
                className="button button--primary"
                disabled={createMutation.isPending}
                type="submit"
              >
                {createMutation.isPending ? 'Creating…' : 'Create promocode'}
              </button>
              <button
                className="button button--ghost"
                onClick={() => {
                  createForm.reset();
                  setCreateErrorMessage(null);
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard>
          <div ref={editSectionRef} />
          <div className="operations-card-header">
            <div>
              <h3>Edit selected promocode</h3>
              <p>
                Adjust live terms without rewriting the backend contract or bypassing
                server validation.
              </p>
            </div>
            {selectedPromocode ? (
              <PromoCodePill
                code={selectedPromocode.code}
                status={getPromocodeLifecycleStatus(selectedPromocode).label}
              />
            ) : null}
          </div>
          {selectedPromocode ? (
            <form
              className="operations-form"
              onSubmit={editForm.handleSubmit((values: UpdatePromocodeFormValues) =>
                updateMutation.mutate(values)
              )}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>Code</span>
                  <input disabled value={selectedPromocode.code} />
                </label>
                <label className="form-field">
                  <span>Discount type</span>
                  <input disabled value={selectedPromocode.discountType} />
                </label>
              </div>
              <label className="form-field">
                <span>Description</span>
                <input {...editForm.register('description')} />
                <small>{editForm.formState.errors.description?.message}</small>
              </label>
              <div className="form-grid form-grid--triple">
                <label className="form-field">
                  <span>Discount value</span>
                  <input inputMode="decimal" {...editForm.register('discountValue')} />
                  <small>{editForm.formState.errors.discountValue?.message}</small>
                </label>
                <label className="form-field">
                  <span>Max discount</span>
                  <input inputMode="decimal" {...editForm.register('maxDiscountAmount')} />
                  <small>{editForm.formState.errors.maxDiscountAmount?.message}</small>
                </label>
                <label className="form-field">
                  <span>Min order amount</span>
                  <input inputMode="decimal" {...editForm.register('minOrderAmount')} />
                  <small>{editForm.formState.errors.minOrderAmount?.message}</small>
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Total usage limit</span>
                  <input inputMode="numeric" {...editForm.register('totalUsageLimit')} />
                  <small>{editForm.formState.errors.totalUsageLimit?.message}</small>
                </label>
                <label className="form-field">
                  <span>Per-user limit</span>
                  <input inputMode="numeric" {...editForm.register('perUserUsageLimit')} />
                  <small>{editForm.formState.errors.perUserUsageLimit?.message}</small>
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Start date</span>
                  <input type="datetime-local" {...editForm.register('dateFrom')} />
                  <small>{editForm.formState.errors.dateFrom?.message}</small>
                </label>
                <label className="form-field">
                  <span>End date</span>
                  <input type="datetime-local" {...editForm.register('dateTo')} />
                  <small>{editForm.formState.errors.dateTo?.message}</small>
                </label>
              </div>
              <label className="checkbox-field">
                <input type="checkbox" {...editForm.register('isActive')} />
                <span>Promocode remains active</span>
              </label>
              {editErrorMessage ? <div className="form-error">{editErrorMessage}</div> : null}
              <div className="form-actions">
                <button
                  className="button button--primary"
                  disabled={updateMutation.isPending}
                  type="submit"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  className="button button--ghost"
                  disabled={deactivateMutation.isPending || !selectedPromocode.isActive}
                  onClick={() => deactivateMutation.mutate(selectedPromocode.id)}
                  type="button"
                >
                  {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <strong>No promocode selected</strong>
              <p>Create one or select a row from the table to edit its terms.</p>
            </div>
          )}
        </SurfaceCard>
      </div>

      <div className="filter-bar">
        <label className="filter-field">
          <span>Search code or description</span>
          <input
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="SPRING, retention, vip"
            value={search}
          />
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
      </div>

      <ServerDataTable
        columns={[
          {
            key: 'code',
            header: 'Instrument',
            render: (row) => (
              <div className="table-person">
                <PromoCodePill
                  code={row.code}
                  status={getPromocodeLifecycleStatus(row).label}
                />
                <span>{row.description}</span>
              </div>
            )
          },
          {
            key: 'discount',
            header: 'Discount',
            render: (row) =>
              row.discountType === 'PERCENT'
                ? `${row.discountValue}%`
                : formatMoney(row.discountValue)
          },
          {
            key: 'window',
            header: 'Window',
            render: (row) => (
              <div className="table-person">
                <strong>{formatDateTime(row.dateFrom)}</strong>
                <span>{formatDateTime(row.dateTo)}</span>
              </div>
            )
          },
          {
            key: 'limits',
            header: 'Limits',
            render: (row) => (
              <div className="table-person">
                <strong>Total: {row.totalUsageLimit ?? 'Open'}</strong>
                <span>Per user: {row.perUserUsageLimit ?? 'Open'}</span>
              </div>
            )
          },
          {
            key: 'active',
            header: 'Live status',
            render: (row) => {
              const lifecycle = getPromocodeLifecycleStatus(row);
              return <StatusBadge label={lifecycle.label} tone={lifecycle.tone} />;
            }
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="table-actions">
                <button
                  className="button button--ghost button--table"
                  onClick={() => {
                    setSelectedPromocodeId(row.id);
                    window.requestAnimationFrame(() => {
                      editSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="button button--ghost button--table"
                  disabled={!row.isActive || deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate(row.id)}
                  type="button"
                >
                  Deactivate
                </button>
              </div>
            )
          }
        ]}
        getRowKey={(row) => row.id}
        isError={promocodesQuery.isError}
        isLoading={promocodesQuery.isLoading}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onRetry={() => void promocodesQuery.refetch()}
        page={promocodesQuery.data?.page ?? page}
        pageSize={promocodesQuery.data?.pageSize ?? pageSize}
        rows={currentRows}
        subtitle="Command-side promocode management via Mongo-backed endpoints, with analytics refresh handled after mutation."
        title="Promocode registry"
        totalCount={promocodesQuery.data?.totalCount ?? 0}
      />
    </div>
  );
}
