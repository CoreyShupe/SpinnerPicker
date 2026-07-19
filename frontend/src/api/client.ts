import type {
  HistoryEntry,
  Option,
  SpinResult,
  StatsCatalog,
  User,
  WheelWithOptions,
} from './types';

/**
 * Thin typed API client. All network access goes through here so the base URL,
 * envelope unwrapping, and error handling live in one place. The base URL comes
 * from VITE_API_URL (see .env) — never hard-code it in components.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch (cause) {
    throw new ApiError(0, 'network_error', `Cannot reach API at ${BASE_URL}`);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error;
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? res.statusText);
  }
  return payload?.data as T;
}

/** Serialize a JSON body for write requests. */
function body(data: unknown): RequestInit {
  return { body: JSON.stringify(data) };
}

export const api = {
  // Wheels
  listWheels: () => request<WheelWithOptions[]>('/api/wheels'),
  createWheel: (data: { name: string; noRepeatWindow?: number; trackStats?: boolean }) =>
    request<WheelWithOptions>('/api/wheels', { method: 'POST', ...body(data) }),
  updateWheel: (
    id: number,
    data: { name?: string; noRepeatWindow?: number; trackStats?: boolean },
  ) => request<WheelWithOptions>(`/api/wheels/${id}`, { method: 'PATCH', ...body(data) }),
  deleteWheel: (id: number) =>
    request<{ id: number }>(`/api/wheels/${id}`, { method: 'DELETE' }),
  spin: (id: number) =>
    request<SpinResult>(`/api/wheels/${id}/spin`, { method: 'POST' }),

  // Options
  createOption: (
    wheelId: number,
    data: { label: string; color?: string; weight?: number },
  ) =>
    request<Option>(`/api/wheels/${wheelId}/options`, { method: 'POST', ...body(data) }),
  updateOption: (
    id: number,
    data: { label?: string; color?: string; weight?: number; position?: number },
  ) => request<Option>(`/api/options/${id}`, { method: 'PATCH', ...body(data) }),
  deleteOption: (id: number) =>
    request<{ id: number }>(`/api/options/${id}`, { method: 'DELETE' }),

  // History
  listHistory: (wheelId: number, limit = 50) =>
    request<HistoryEntry[]>(`/api/wheels/${wheelId}/history?limit=${limit}`),
  deleteHistory: (id: number) =>
    request<{ id: number }>(`/api/history/${id}`, { method: 'DELETE' }),
  clearHistory: (wheelId: number) =>
    request<{ removed: number }>(`/api/wheels/${wheelId}/history`, { method: 'DELETE' }),

  // Users (stats wheels only)
  createUser: (wheelId: number, name: string) =>
    request<User>(`/api/wheels/${wheelId}/users`, { method: 'POST', ...body({ name }) }),
  deleteUser: (id: number) =>
    request<{ id: number }>(`/api/users/${id}`, { method: 'DELETE' }),

  // Stats catalog + rounds
  getStats: (wheelId: number) => request<StatsCatalog>(`/api/wheels/${wheelId}/stats`),
  setStat: (historyId: number, userId: number, value: number | null) =>
    request<StatsCatalog>(`/api/rounds/${historyId}/stats`, {
      method: 'PUT',
      ...body({ userId, value }),
    }),
};
