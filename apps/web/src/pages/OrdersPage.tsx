import { zodResolver } from '@hookform/resolvers/zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/auth-context';
import { OperationsTabs } from '../components/primitives/OperationsTabs';
import { PromoCodePill } from '../components/primitives/PromoCodePill';
import { ServerDataTable } from '../components/primitives/ServerDataTable';
import { StatusBadge } from '../components/primitives/StatusBadge';
import { SurfaceCard } from '../components/primitives/SurfaceCard';
import {
  applyPromocodeSchema,
  createOrderSchema,
  currencyOptions,
  type ApplyPromocodeFormValues,
  type CreateOrderFormValues
} from '../features/operations/schemas';
import type {
  ApplyPromocodeResponse,
  OrderRecord,
  PaginatedResponse
} from '../features/operations/types';
import { ApiError, apiClient } from '../lib/api';
import { useToast } from '../toast/toast-provider';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
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

export function OrdersPage(): JSX.Element {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['operations', 'orders', auth.accessToken, page, pageSize],
    queryFn: () =>
      apiClient.listMyOrders<PaginatedResponse<OrderRecord>>(
        { page, pageSize },
        { token: auth.accessToken! }
      ),
    enabled: Boolean(auth.accessToken),
    placeholderData: keepPreviousData
  });

  const currentRows = ordersQuery.data?.items ?? [];
  const selectedOrder =
    currentRows.find((order) => order.id === selectedOrderId) ?? currentRows[0] ?? null;

  const createOrderForm = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      amount: '',
      currency: 'USD'
    }
  });

  const applyPromocodeForm = useForm<ApplyPromocodeFormValues>({
    resolver: zodResolver(applyPromocodeSchema),
    defaultValues: {
      code: ''
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: (values: CreateOrderFormValues) =>
      apiClient.createOrder<OrderRecord>(
        {
          amount: Number(values.amount),
          currency: values.currency
        },
        { token: auth.accessToken! }
      ),
    onSuccess: async (createdOrder) => {
      setCreateErrorMessage(null);
      createOrderForm.reset({
        amount: '',
        currency: createdOrder.currency as CreateOrderFormValues['currency']
      });
      setSelectedOrderId(createdOrder.id);
      pushToast({
        title: 'Order created',
        description: `Order ${createdOrder.id.slice(0, 8)} is ready for promocode application.`,
        tone: 'success'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Unable to create order.';
      setCreateErrorMessage(message);
      pushToast({
        title: 'Order creation failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (order: OrderRecord) =>
      apiClient.deleteOrder<OrderRecord>(order.id, { token: auth.accessToken! }),
    onSuccess: async (deletedOrder) => {
      const remainingRows = currentRows.filter((row) => row.id !== deletedOrder.id);
      setSelectedOrderId(remainingRows[0]?.id ?? null);
      pushToast({
        title: 'Order deleted',
        description: `Order ${deletedOrder.id.slice(0, 8)} was removed from your workspace.`,
        tone: 'success'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Unable to delete order.';
      pushToast({
        title: 'Order deletion failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const applyPromocodeMutation = useMutation({
    mutationFn: (values: ApplyPromocodeFormValues) => {
      if (!selectedOrder) {
        throw new Error('No order selected.');
      }

      return apiClient.applyPromocode<ApplyPromocodeResponse>(
        selectedOrder.id,
        { code: values.code.trim().toUpperCase() },
        { token: auth.accessToken! }
      );
    },
    onSuccess: async (response) => {
      setApplyErrorMessage(null);
      applyPromocodeForm.reset({ code: '' });
      setSelectedOrderId(response.order.id);
      pushToast({
        title: 'Promocode applied',
        description: `${response.promoUsage.promocodeCode} reduced the order by ${formatMoney(response.order.discountAmount, response.order.currency)}.`,
        tone: 'success'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operations', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Unable to apply promocode.';
      setApplyErrorMessage(message);
      pushToast({
        title: 'Apply promocode failed',
        description: message,
        tone: 'error'
      });
    }
  });

  const metrics = useMemo(
    () => ({
      total: ordersQuery.data?.totalCount ?? 0,
      gross: currentRows.reduce((sum, order) => sum + order.amount, 0),
      discounts: currentRows.reduce((sum, order) => sum + order.discountAmount, 0),
      applied: currentRows.filter((order) => order.promocodeCode !== null).length
    }),
    [currentRows, ordersQuery.data?.totalCount]
  );

  return (
    <div className="page-stack">
      <section className="analytics-page-header">
        <div>
          <p className="eyebrow-pill">
            <span className="eyebrow-pill__badge">Orders</span>
            Protected operator workflow
          </p>
          <h2>Orders and promocode application</h2>
          <p>
            Create orders for the current authenticated user, then apply one validated
            promocode per order with useful failure messages and analytics refetches.
          </p>
        </div>
        <OperationsTabs />
      </section>

      <section className="metric-grid metric-grid--operations">
        <SurfaceCard className="signal-card">
          <span className="table-meta">Orders in result set</span>
          <strong>{metrics.total}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Gross amount on page</span>
          <strong>{formatMoney(metrics.gross, 'USD')}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Discounts on page</span>
          <strong>{formatMoney(metrics.discounts, 'USD')}</strong>
        </SurfaceCard>
        <SurfaceCard className="signal-card">
          <span className="table-meta">Promocodes applied</span>
          <strong>{metrics.applied}</strong>
        </SurfaceCard>
      </section>

      <div className="operations-dual-grid">
        <SurfaceCard>
          <div className="operations-card-header">
            <div>
              <h3>Create order</h3>
              <p>Separate order creation from promocode application exactly like the backend contract.</p>
            </div>
          </div>
          <form
            className="operations-form"
            onSubmit={createOrderForm.handleSubmit((values: CreateOrderFormValues) =>
              createOrderMutation.mutate(values)
            )}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>Order amount</span>
                <input inputMode="decimal" placeholder="240" {...createOrderForm.register('amount')} />
                <small>{createOrderForm.formState.errors.amount?.message}</small>
              </label>
              <label className="form-field">
                <span>Currency</span>
                <select {...createOrderForm.register('currency')}>
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <small>{createOrderForm.formState.errors.currency?.message}</small>
              </label>
            </div>
            {createErrorMessage ? <div className="form-error">{createErrorMessage}</div> : null}
            <div className="form-actions">
              <button
                className="button button--primary"
                disabled={createOrderMutation.isPending}
                type="submit"
              >
                {createOrderMutation.isPending ? 'Creating…' : 'Create order'}
              </button>
              <button
                className="button button--ghost"
                onClick={() => {
                  createOrderForm.reset({ amount: '', currency: 'USD' });
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
          <div className="operations-card-header">
            <div>
              <h3>Apply promocode</h3>
              <p>
                Choose one eligible order, then let the backend enforce ownership,
                activity windows, usage caps, and locking.
              </p>
            </div>
            {selectedOrder ? (
              <StatusBadge label={selectedOrder.status.replace('_', ' ')} tone="info" />
            ) : null}
          </div>
          {selectedOrder ? (
            <form
              className="operations-form"
              onSubmit={applyPromocodeForm.handleSubmit((values: ApplyPromocodeFormValues) =>
                applyPromocodeMutation.mutate(values)
              )}
            >
              <div className="operation-highlight">
                <div>
                  <span className="table-meta">Selected order</span>
                  <strong>#{selectedOrder.id.slice(0, 8)}</strong>
                </div>
                <div>
                  <span className="table-meta">Gross / final</span>
                  <strong>
                    {formatMoney(selectedOrder.amount, selectedOrder.currency)} /{' '}
                    {formatMoney(selectedOrder.finalAmount, selectedOrder.currency)}
                  </strong>
                </div>
              </div>
              <label className="form-field">
                <span>Promocode</span>
                <input placeholder="SPRING25" {...applyPromocodeForm.register('code')} />
                <small>{applyPromocodeForm.formState.errors.code?.message}</small>
              </label>
              {selectedOrder.promocodeCode ? (
                <div className="form-note">
                  This order already uses {selectedOrder.promocodeCode}. Pick another
                  order if you want to apply a different promocode.
                </div>
              ) : null}
              {applyErrorMessage ? <div className="form-error">{applyErrorMessage}</div> : null}
              <div className="form-actions">
                <button
                  className="button button--primary"
                  disabled={applyPromocodeMutation.isPending || Boolean(selectedOrder.promocodeCode)}
                  type="submit"
                >
                  {applyPromocodeMutation.isPending ? 'Applying…' : 'Apply promocode'}
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    applyPromocodeForm.reset({ code: '' });
                    setApplyErrorMessage(null);
                  }}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <strong>No orders yet</strong>
              <p>Create an order first, then select it from the table to apply a promocode.</p>
            </div>
          )}
        </SurfaceCard>
      </div>

      <ServerDataTable
        columns={[
          {
            key: 'createdAt',
            header: 'Order',
            render: (row) => (
              <div className="table-person">
                <strong>#{row.id.slice(0, 8)}</strong>
                <span>{formatDateTime(row.createdAt)}</span>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge
                label={row.status === 'PROMOCODE_APPLIED' ? 'Promocode applied' : 'Created'}
                tone={row.status === 'PROMOCODE_APPLIED' ? 'positive' : 'info'}
              />
            )
          },
          {
            key: 'amount',
            header: 'Gross',
            render: (row) => formatMoney(row.amount, row.currency)
          },
          {
            key: 'discountAmount',
            header: 'Discount',
            render: (row) => formatMoney(row.discountAmount, row.currency)
          },
          {
            key: 'finalAmount',
            header: 'Final',
            render: (row) => formatMoney(row.finalAmount, row.currency)
          },
          {
            key: 'promocode',
            header: 'Promocode',
            render: (row) =>
              row.promocodeCode ? (
                <PromoCodePill code={row.promocodeCode} status="Active" />
              ) : (
                'Not applied'
              )
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="table-actions">
                <button
                  className="button button--ghost button--table"
                  onClick={() => setSelectedOrderId(row.id)}
                  type="button"
                >
                  Select
                </button>
                <button
                  className="button button--ghost button--table"
                  disabled={deleteOrderMutation.isPending}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Delete order ${row.id.slice(0, 8)}?`
                    );

                    if (confirmed) {
                      deleteOrderMutation.mutate(row);
                    }
                  }}
                  type="button"
                >
                  {deleteOrderMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )
          }
        ]}
        getRowKey={(row) => row.id}
        isError={ordersQuery.isError}
        isLoading={ordersQuery.isLoading}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onRetry={() => void ordersQuery.refetch()}
        page={ordersQuery.data?.page ?? page}
        pageSize={ordersQuery.data?.pageSize ?? pageSize}
        rows={currentRows}
        subtitle="Track your current orders, select one for promocode application, or remove stale drafts."
        title="My orders"
        totalCount={ordersQuery.data?.totalCount ?? 0}
      />
    </div>
  );
}
