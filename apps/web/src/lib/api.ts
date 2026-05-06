export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: CurrentUser;
}

export interface AuthenticatedRequestOptions {
  token: string;
}

export const unauthorizedEventName = 'pcm:unauthorized';

export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

function buildQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

async function request<TResponse>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    if (response.status === 401 && init?.token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(unauthorizedEventName));
    }

    const payload = (await safeJson(response)) as ApiErrorPayload | null;
    const message = formatApiErrorMessage(payload, response.status);

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatApiErrorMessage(
  payload: ApiErrorPayload | null,
  status: number
): string {
  if (Array.isArray(payload?.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  if (typeof payload?.error === 'string') {
    return payload.error;
  }

  return `Request failed with status ${status}.`;
}

export const apiClient = {
  baseUrl: apiBaseUrl,
  health(): Promise<{ status: string }> {
    return request('/health');
  },
  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  login(payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  me(token: string): Promise<CurrentUser> {
    return request('/auth/me', {
      method: 'GET',
      token
    });
  },
  getUsersAnalytics<TResponse>(
    query: Record<string, string | number | boolean | undefined>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/analytics/users${buildQueryString(query)}`, {
      method: 'GET',
      token: options.token
    });
  },
  getPromocodesAnalytics<TResponse>(
    query: Record<string, string | number | boolean | undefined>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/analytics/promocodes${buildQueryString(query)}`, {
      method: 'GET',
      token: options.token
    });
  },
  getPromoUsagesAnalytics<TResponse>(
    query: Record<string, string | number | boolean | undefined>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/analytics/promo-usages${buildQueryString(query)}`, {
      method: 'GET',
      token: options.token
    });
  },
  listPromocodes<TResponse>(
    query: Record<string, string | number | boolean | undefined>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/promocodes${buildQueryString(query)}`, {
      method: 'GET',
      token: options.token
    });
  },
  createPromocode<TResponse>(
    payload: Record<string, unknown>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request('/promocodes', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: options.token
    });
  },
  updatePromocode<TResponse>(
    promocodeId: string,
    payload: Record<string, unknown>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/promocodes/${promocodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token: options.token
    });
  },
  deactivatePromocode<TResponse>(
    promocodeId: string,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/promocodes/${promocodeId}/deactivate`, {
      method: 'POST',
      token: options.token
    });
  },
  createOrder<TResponse>(
    payload: Record<string, unknown>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: options.token
    });
  },
  listMyOrders<TResponse>(
    query: Record<string, string | number | boolean | undefined>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/orders/my${buildQueryString(query)}`, {
      method: 'GET',
      token: options.token
    });
  },
  deleteOrder<TResponse>(
    orderId: string,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/orders/${orderId}`, {
      method: 'DELETE',
      token: options.token
    });
  },
  applyPromocode<TResponse>(
    orderId: string,
    payload: Record<string, unknown>,
    options: AuthenticatedRequestOptions
  ): Promise<TResponse> {
    return request(`/orders/${orderId}/apply-promocode`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token: options.token
    });
  }
};
