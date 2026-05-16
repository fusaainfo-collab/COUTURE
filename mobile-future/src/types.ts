import type { ApiClient } from "./api/client";

export type ApiList<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type StoredUser = {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  profile?: {
    role?: "admin" | "manager" | "tailor" | "client" | string;
    phone?: string;
    avatar?: string | null;
    is_available?: boolean;
  } | null;
};

export type Session = {
  token: string;
  user: StoredUser;
  workshopId?: string | null;
};

export type FieldOption = {
  label: string;
  value: string;
};

export type FieldType = "text" | "number" | "textarea" | "select" | "date" | "datetime" | "boolean" | "json" | "tags" | "image";

export type RelationConfig = {
  endpoint: string;
  labelKey: string;
  valueKey?: string;
  fallbackLabelKey?: string;
  filter?: (item: Record<string, unknown>) => boolean;
};

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  relation?: RelationConfig;
  defaultValue?: string | boolean;
  keyboard?: "default" | "numeric" | "email-address" | "phone-pad";
  createOnly?: boolean;
};

export type ImageValue = {
  uri: string;
  name: string;
  type: string;
};

export type ResourceAction = {
  label: string;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
  run: (api: ApiClient, item: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
};

export type ResourceConfig = {
  key: string;
  title: string;
  subtitle: string;
  endpoint: string;
  roles: string[];
  fields: FieldConfig[];
  searchable: string[];
  multipart?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  titleField: string | ((item: Record<string, unknown>) => string);
  detailFields: Array<string | ((item: Record<string, unknown>) => string)>;
  badge?: (item: Record<string, unknown>) => { label: string; tone?: "neutral" | "gold" | "green" | "red" | "blue" };
  actions?: ResourceAction[];
  buildPayload?: (form: Record<string, unknown>, editing?: Record<string, unknown> | null) => Record<string, unknown>;
};

export type ScreenKey =
  | "dashboard"
  | "reports"
  | "messages"
  | "api"
  | "clients"
  | "commandes"
  | "mesures"
  | "rendez-vous"
  | "paiements"
  | "modeles"
  | "notifications"
  | "tailleurs"
  | "statistiques"
  | "workshops"
  | "users";
