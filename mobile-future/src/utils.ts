import { ImageValue, StoredUser } from "./types";

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/api/v1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function getRole(user: StoredUser | null | undefined) {
  if (user?.is_superuser || user?.profile?.role === "admin") return "admin";
  return user?.profile?.role || "manager";
}

export function canWrite(role: string) {
  return role === "admin" || role === "manager";
}

export function formatMoney(value: unknown) {
  const numberValue = Number(value || 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(numberValue)} XOF`;
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function parseTags(value: unknown) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseJsonOrKeyValue(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text.split(/\n|,/).reduce<Record<string, string>>((acc, line) => {
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey?.trim();
      const nextValue = rest.join(":").trim();
      if (key && nextValue) acc[key] = nextValue;
      return acc;
    }, {});
  }
}

export function toFormInitialValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && "uri" in value) return value as ImageValue;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function fileNameFromUri(uri: string) {
  const name = uri.split("/").pop() || `image-${Date.now()}.jpg`;
  return name.includes(".") ? name : `${name}.jpg`;
}

export function toAbsoluteAssetUrl(value: unknown, baseUrl: string) {
  return toAssetUrlCandidates(value, baseUrl)?.[0] ?? null;
}

export function toAssetUrlCandidates(value: unknown, baseUrl: string) {
  if (!value) return null;
  const rawValue = String(value);
  if (/^(file:|content:|data:)/i.test(rawValue)) return [rawValue];

  try {
    const base = new URL(baseUrl);
    const candidates: string[] = [];
    const addCandidate = (candidate: string) => {
      if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
    };
    const normalizedPath = normalizeAssetPath(rawValue);

    if (/^https?:/i.test(rawValue)) {
      const parsed = new URL(rawValue);
      const originalPath = normalizeAssetPath(`${parsed.pathname}${parsed.search}`);
      const isLocalHost = ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);

      if (parsed.protocol === "http:" && base.protocol === "https:") {
        parsed.protocol = "https:";
      }
      if (isLocalHost || parsed.hostname === base.hostname) {
        parsed.protocol = base.protocol;
        parsed.host = base.host;
      }

      parsed.pathname = originalPath.split("?")[0];
      addCandidate(parsed.toString());
      addCandidate(new URL(originalPath, base.origin).toString());
      return candidates;
    }

    addCandidate(new URL(normalizedPath, base.origin).toString());
    if (!rawValue.startsWith("/") && !rawValue.startsWith("media/") && !rawValue.startsWith("static/")) {
      addCandidate(new URL(`/media/${rawValue.replace(/^\/+/, "")}`, base.origin).toString());
    }
    return candidates;
  } catch {
    return [rawValue];
  }
}

function normalizeAssetPath(value: string) {
  const [rawPath, rawQuery = ""] = value.trim().split("?");
  let path = rawPath.replace(/\\/g, "/");
  const mediaIndex = path.indexOf("/media/");
  const staticIndex = path.indexOf("/static/");

  if (mediaIndex >= 0) {
    path = path.slice(mediaIndex);
  } else if (staticIndex >= 0) {
    path = path.slice(staticIndex);
  } else if (path.startsWith("media/") || path.startsWith("static/")) {
    path = `/${path}`;
  } else if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return rawQuery ? `${path}?${rawQuery}` : path;
}
