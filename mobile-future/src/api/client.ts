import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { ApiList, Session, StoredUser } from "../types";
import { normalizeApiBaseUrl } from "../utils";

const TOKEN_KEY = "couture_sir_token";
const USER_KEY = "couture_sir_user";
const WORKSHOP_KEY = "couture_sir_workshop";

function flattenApiError(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const messages = value.map(flattenApiError).filter((item): item is string => Boolean(item));
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

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export class ApiClient {
  private token: string | null = null;
  private workshopId: string | null = null;
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeApiBaseUrl(baseUrl);
  }

  setSession(session: Session | null) {
    this.token = session?.token ?? null;
    this.workshopId = session?.workshopId ?? null;
  }

  setWorkshopId(workshopId: string | null) {
    this.workshopId = workshopId;
  }

  async loadSession(): Promise<Session | null> {
    const [token, rawUser, workshopId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
      AsyncStorage.getItem(WORKSHOP_KEY)
    ]);

    if (!token || !rawUser) return null;
    try {
      const session = { token, user: JSON.parse(rawUser) as StoredUser, workshopId };
      this.setSession(session);
      return session;
    } catch {
      await this.clearSession();
      return null;
    }
  }

  async saveSession(token: string, user: StoredUser, workshopId?: string | null) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      workshopId ? AsyncStorage.setItem(WORKSHOP_KEY, workshopId) : AsyncStorage.removeItem(WORKSHOP_KEY)
    ]);
    const session = { token, user, workshopId };
    this.setSession(session);
    return session;
  }

  async saveWorkshopId(workshopId: string | null) {
    if (workshopId) await AsyncStorage.setItem(WORKSHOP_KEY, workshopId);
    else await AsyncStorage.removeItem(WORKSHOP_KEY);
    this.workshopId = workshopId;
  }

  async clearSession() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(WORKSHOP_KEY)
    ]);
    this.setSession(null);
  }

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await safeJson<{ token?: string; user?: StoredUser } & Record<string, unknown>>(response);
    if (!response.ok || !payload?.token || !payload?.user) {
      throw new Error(flattenApiError(payload) || "Connexion impossible.");
    }
    return this.saveSession(payload.token, payload.user);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.token) throw new Error("Session introuvable. Connectez-vous.");
    const headers = new Headers(init.headers);
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (!isFormData) headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Token ${this.token}`);
    if (this.workshopId) headers.set("X-Workshop-ID", this.workshopId);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new Error(`Serveur API indisponible sur ${this.baseUrl}.`);
    }

    if (response.status === 401) {
      await this.clearSession();
      throw new Error("Session expiree. Reconnectez-vous.");
    }

    if (response.status === 204) return undefined as T;

    const payload = await safeJson<T & Record<string, unknown>>(response);
    if (!response.ok) {
      throw new Error(flattenApiError(payload) || `Erreur API ${response.status}`);
    }
    return payload as T;
  }

  list<T>(endpoint: string) {
    return this.request<ApiList<T>>(endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  remove(endpoint: string) {
    return this.request<void>(endpoint, { method: "DELETE" });
  }
}
