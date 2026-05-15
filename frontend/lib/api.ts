function normalizeApiBaseUrl(value: string) {
  const trimmedValue = value.replace(/\/+$/, "");

  try {
    const url = new URL(trimmedValue);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/api/v1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Keep the raw value for local/dev values that URL cannot parse.
  }

  return trimmedValue;
}

function getLocalApiHost(hostname: string) {
  if (hostname === "localhost") return "127.0.0.1";
  if (hostname.includes(":") && !hostname.startsWith("[")) return `[${hostname}]`;
  return hostname;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1");
const WORKSHOP_STORAGE_KEY = "atelier_workshop_id";
const USER_STORAGE_KEY = "atelier_user";

export type ApiList<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type StoredUser = {
  id?: number;
  username?: string;
  full_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  profile?: {
    role?: string;
    phone?: string;
    avatar?: string | null;
    is_available?: boolean;
  } | null;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("atelier_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("atelier_token", token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("atelier_token");
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function setStoredUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function isAdminUser(user: StoredUser | null) {
  return Boolean(user?.is_superuser || user?.profile?.role === "admin");
}

export function getUserRole(user: StoredUser | null) {
  if (isAdminUser(user)) return "admin";
  return user?.profile?.role ?? "manager";
}

export function isClientUser(user: StoredUser | null) {
  return getUserRole(user) === "client";
}

export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${getLocalApiHost(window.location.hostname)}:8000/api/v1`;
  }
  return API_BASE_URL;
}

export function getWorkshopId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(WORKSHOP_STORAGE_KEY);
}

export function setWorkshopId(workshopId: number | string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSHOP_STORAGE_KEY, String(workshopId));
}

export function toAbsoluteAssetUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value, getApiBaseUrl()).toString();
  } catch {
    return value;
  }
}

function flattenApiError(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => flattenApiError(item))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join(" ") : null;
  }

  if (value && typeof value === "object") {
    const messages = Object.entries(value)
      .map(([field, fieldValue]) => {
        const rendered = flattenApiError(fieldValue);
        if (!rendered) return null;
        if (field === "detail" || field === "non_field_errors") return rendered;
        return `${field}: ${rendered}`;
      })
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join(" | ") : null;
  }

  return null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error("Session introuvable. Connectez-vous pour continuer.");
  }
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }
  const workshopId = getWorkshopId();
  if (workshopId) {
    headers.set("X-Workshop-ID", workshopId);
  }

  let response: Response;
  const apiBaseUrl = getApiBaseUrl();
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });
  } catch {
    throw new Error(`Serveur API indisponible sur ${apiBaseUrl}. Verifiez l'URL API et les autorisations CORS.`);
  }

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login?session=expired");
    }
    throw new Error("Session expiree. Reconnectez-vous.");
  }

  if (!response.ok) {
    let message = `Erreur API ${response.status}`;

    try {
      const payload = await response.json();
      const extracted = flattenApiError(payload);
      if (extracted) {
        message = extracted;
      }
    } catch {
      // Ignore JSON parsing failures and keep the fallback message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
