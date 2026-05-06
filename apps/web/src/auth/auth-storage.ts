const storageKey = 'promo-code-manager.auth';

export interface StoredAuthSession {
  accessToken: string;
}

export function readStoredAuthSession(): StoredAuthSession | null {
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredAuthSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function writeStoredAuthSession(session: StoredAuthSession): void {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  window.localStorage.removeItem(storageKey);
}
