"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces, Copy, Download, ExternalLink, RefreshCw, Search, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiBaseUrl, getStoredUser, getToken, isAdminUser } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  security?: unknown[];
};

type OpenApiSchema = {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, Record<string, unknown>>;
};

type ApiEndpoint = {
  method: string;
  path: string;
  tag: string;
  summary: string;
  operationId: string;
  hasBody: boolean;
  responseCodes: string[];
};

const apiMethods = ["get", "post", "put", "patch", "delete"] as const;

export default function GestionApiPage() {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [schema, setSchema] = useState<OpenApiSchema | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [schemaUrl, setSchemaUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (!isAdminUser(user)) {
      router.replace("/dashboard");
      return;
    }

    setAccessChecked(true);
    loadSchema();
  }, [router]);

  async function loadSchema() {
    setLoading(true);
    setError("");
    const urls = buildApiUrls();
    setApiBaseUrl(urls.apiBaseUrl);
    setSchemaUrl(urls.schemaUrl);
    setDocsUrl(urls.docsUrl);

    try {
      const token = getToken();
      const headers = new Headers({ Accept: "application/json" });
      if (token) headers.set("Authorization", `Token ${token}`);
      const response = await fetch(urls.schemaUrl, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`Schema API indisponible (${response.status}).`);
      const payload = (await response.json()) as OpenApiSchema;
      setSchema(payload);
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Impossible de generer le schema API.");
    } finally {
      setLoading(false);
    }
  }

  const endpoints = useMemo(() => extractEndpoints(schema), [schema]);
  const filteredEndpoints = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return endpoints;
    return endpoints.filter((endpoint) =>
      [endpoint.method, endpoint.path, endpoint.tag, endpoint.summary, endpoint.operationId]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [endpoints, query]);

  const tagCount = new Set(endpoints.map((endpoint) => endpoint.tag)).size;
  const writeCount = endpoints.filter((endpoint) => ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method)).length;
  const mobileConfig = useMemo(
    () => ({
      API_BASE_URL: apiBaseUrl || "https://votre-domaine.com/api/v1",
      API_SCHEMA_URL: schemaUrl || "https://votre-domaine.com/api/schema/?format=json",
      API_DOCS_URL: docsUrl || "https://votre-domaine.com/api/docs/",
      AUTH_HEADER: "Authorization: Token <token_utilisateur>",
      WORKSHOP_HEADER: "X-Workshop-ID: <id_atelier>",
      CONTENT_TYPE: "application/json"
    }),
    [apiBaseUrl, docsUrl, schemaUrl]
  );

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  function exportSchema() {
    downloadFile("schema-api-openapi.json", JSON.stringify(schema ?? {}, null, 2), "application/json");
  }

  function exportMobileConfig() {
    downloadFile("configuration-api-mobile.json", JSON.stringify(mobileConfig, null, 2), "application/json");
  }

  function exportEndpointsCsv() {
    const rows = [
      ["Methode", "Chemin", "Module", "Operation", "Corps", "Reponses"],
      ...endpoints.map((endpoint) => [
        endpoint.method,
        endpoint.path,
        endpoint.tag,
        endpoint.summary || endpoint.operationId,
        endpoint.hasBody ? "oui" : "non",
        endpoint.responseCodes.join(" | ")
      ])
    ];
    downloadFile("liste-api.csv", toCsv(rows), "text/csv;charset=utf-8");
  }

  if (!accessChecked) {
    return (
      <AppShell>
        <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 text-sm text-stone-400">
          Verification des droits admin...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={schema ? "green" : "gold"}>{schema ? "Schema genere" : "En attente"}</Badge>
              <Badge tone="gold">OpenAPI {schema?.openapi ?? "3"}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/35 bg-gold/12 text-gold">
                <Braces size={21} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">Gestion des API</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
                  Inventaire des routes Django, configuration mobile et exports pour le deploiement en ligne.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadSchema} disabled={loading}>
              <RefreshCw size={17} />
              Actualiser
            </Button>
            <Button variant="secondary" onClick={() => window.open(docsUrl, "_blank", "noopener,noreferrer")} disabled={!docsUrl}>
              <ExternalLink size={17} />
              Swagger
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Endpoints" value={endpoints.length} tone="green" />
          <Metric label="Modules" value={tagCount} tone="gold" />
          <Metric label="Actions ecriture" value={writeCount} tone="red" />
          <Metric label="Version API" value={schema?.info?.version ?? "1.0.0" } tone="neutral" />
        </section>

        {error ? (
          <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-semibold">Configuration mobile</h2>
                <p className="mt-1 text-sm text-stone-500">Valeurs a reprendre dans React Native, Kotlin ou Flutter.</p>
              </div>
              <Smartphone size={20} className="text-gold" />
            </div>

            <div className="mt-5 grid gap-3">
              <ConfigRow label="Base URL" value={mobileConfig.API_BASE_URL} onCopy={() => copyText("base", mobileConfig.API_BASE_URL)} />
              <ConfigRow label="Schema" value={mobileConfig.API_SCHEMA_URL} onCopy={() => copyText("schema", mobileConfig.API_SCHEMA_URL)} />
              <ConfigRow label="Docs" value={mobileConfig.API_DOCS_URL} onCopy={() => copyText("docs", mobileConfig.API_DOCS_URL)} />
              <ConfigRow label="Auth" value={mobileConfig.AUTH_HEADER} onCopy={() => copyText("auth", mobileConfig.AUTH_HEADER)} />
              <ConfigRow label="Atelier" value={mobileConfig.WORKSHOP_HEADER} onCopy={() => copyText("atelier", mobileConfig.WORKSHOP_HEADER)} />
            </div>

            <pre className="premium-scrollbar mt-5 overflow-x-auto rounded-lg border border-line bg-ink/65 p-4 text-xs leading-6 text-stone-300">
              {JSON.stringify(mobileConfig, null, 2)}
            </pre>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button variant="secondary" onClick={exportMobileConfig}>
                <Download size={16} />
                Config JSON
              </Button>
              <Button variant="secondary" onClick={exportSchema} disabled={!schema}>
                <Download size={16} />
                Schema
              </Button>
              <Button variant="secondary" onClick={exportEndpointsCsv} disabled={endpoints.length === 0}>
                <Download size={16} />
                Routes CSV
              </Button>
            </div>

            {copied ? <p className="mt-3 text-sm text-emerald-200">Copie effectuee.</p> : null}
          </div>

          <div className="rounded-lg border border-line bg-ivory/[0.055] p-5 shadow-premium">
            <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Routes generees</h2>
                <p className="mt-1 text-sm text-stone-500">{schema?.info?.title ?? "Atelier Couture API"}</p>
              </div>
              <div className="relative min-w-0 w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="h-10 w-full rounded-lg border border-line bg-ink/55 pl-10 pr-3 text-sm text-ivory outline-none focus:border-gold/45"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chercher module, route, methode..."
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-stone-500">Generation du schema API...</div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="py-14 text-center text-sm text-stone-500">Aucune route trouvee.</div>
            ) : (
              <div className="premium-scrollbar mt-5 max-h-[760px] overflow-y-auto pr-1">
                <div className="grid gap-3">
                  {filteredEndpoints.map((endpoint) => (
                    <article key={`${endpoint.method}-${endpoint.path}`} className="rounded-lg border border-line bg-ink/45 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={methodTone(endpoint.method)}>{endpoint.method}</Badge>
                            <Badge tone="neutral">{endpoint.tag}</Badge>
                            {endpoint.hasBody ? <Badge tone="gold">body</Badge> : null}
                          </div>
                          <h3 className="mt-3 break-all text-sm font-semibold text-ivory">{endpoint.path}</h3>
                          <p className="mt-2 text-sm text-stone-400">{endpoint.summary || endpoint.operationId}</p>
                        </div>
                        <div className="text-xs text-stone-500 lg:text-right">
                          <p>{endpoint.operationId || "operation"}</p>
                          <p className="mt-1">HTTP {endpoint.responseCodes.join(", ") || "200"}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function buildApiUrls() {
  const fallbackBaseUrl = "http://127.0.0.1:8000/api/v1";
  const apiBaseUrl = getApiBaseUrl() || fallbackBaseUrl;
  try {
    const parsed = new URL(apiBaseUrl);
    const backendOrigin = `${parsed.protocol}//${parsed.host}`;
    return {
      apiBaseUrl,
      schemaUrl: `${backendOrigin}/api/schema/?format=json`,
      docsUrl: `${backendOrigin}/api/docs/`
    };
  } catch {
    return {
      apiBaseUrl: fallbackBaseUrl,
      schemaUrl: "http://127.0.0.1:8000/api/schema/?format=json",
      docsUrl: "http://127.0.0.1:8000/api/docs/"
    };
  }
}

function extractEndpoints(schema: OpenApiSchema | null): ApiEndpoint[] {
  if (!schema?.paths) return [];
  return Object.entries(schema.paths)
    .flatMap(([path, operations]) =>
      apiMethods.flatMap((method) => {
        const rawOperation = operations[method];
        if (!rawOperation || typeof rawOperation !== "object") return [];
        const operation = rawOperation as OpenApiOperation;
        return [
          {
            method: method.toUpperCase(),
            path,
            tag: operation.tags?.[0] ?? "api",
            summary: operation.summary ?? operation.description ?? "",
            operationId: operation.operationId ?? "",
            hasBody: Boolean(operation.requestBody),
            responseCodes: Object.keys(operation.responses ?? {})
          }
        ];
      })
    )
    .sort((left, right) => `${left.tag}-${left.path}-${left.method}`.localeCompare(`${right.tag}-${right.path}-${right.method}`));
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "gold" | "green" | "red" }) {
  return (
    <div className="rounded-lg border border-line bg-ivory/[0.055] p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-2xl font-semibold">{value}</span>
        <Badge tone={tone}>Live</Badge>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-ink/45 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase text-stone-500">{label}</p>
        <p className="mt-1 break-all text-sm text-stone-300">{value}</p>
      </div>
      <button
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-ivory/[0.055] text-stone-300 hover:text-gold"
        onClick={onCopy}
        title="Copier"
        type="button"
      >
        <Copy size={15} />
      </button>
    </div>
  );
}

function methodTone(method: string) {
  if (method === "GET") return "green";
  if (method === "DELETE") return "red";
  if (method === "POST") return "gold";
  return "neutral";
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
