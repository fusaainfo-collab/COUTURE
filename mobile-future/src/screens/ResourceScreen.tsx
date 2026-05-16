import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  Text,
  View
} from "react-native";

import { ApiClient } from "../api/client";
import { colors, spacing } from "../theme";
import { ApiList, FieldConfig, FieldOption, ImageValue, ResourceConfig } from "../types";
import {
  canWrite,
  displayValue,
  fileNameFromUri,
  parseJsonOrKeyValue,
  parseTags,
  toAssetUrlCandidates,
  toFormInitialValue
} from "../utils";
import { Badge, Button, Card, ChoiceRow, EmptyState, Field, H1, H2, LoadingState, Muted } from "../components/ui";

type RelationOptions = Record<string, FieldOption[]>;

function getText(item: Record<string, unknown>, keyOrReader: string | ((item: Record<string, unknown>) => string)) {
  if (typeof keyOrReader === "function") return keyOrReader(item);
  return displayValue(item[keyOrReader]);
}

function relationLabel(item: Record<string, unknown>, field: FieldConfig) {
  const primary = field.relation?.labelKey ? item[field.relation.labelKey] : null;
  const fallback = field.relation?.fallbackLabelKey ? item[field.relation.fallbackLabelKey] : null;
  if (primary && fallback) return `${displayValue(primary)} - ${displayValue(fallback)}`;
  return displayValue(primary || fallback || item.id);
}

function initialForm(config: ResourceConfig, editing?: Record<string, unknown> | null) {
  return config.fields.reduce<Record<string, unknown>>((acc, field) => {
    if (editing && !field.createOnly) {
      acc[field.key] = toFormInitialValue(editing[field.key]);
      return acc;
    }
    acc[field.key] = field.defaultValue ?? "";
    return acc;
  }, {});
}

function appendFormData(formData: FormData, key: string, value: unknown) {
  if (value === "" || value === null || value === undefined) return;
  if (typeof value === "object" && "uri" in value) {
    const image = value as ImageValue;
    formData.append(key, {
      uri: image.uri,
      name: image.name,
      type: image.type
    } as unknown as Blob);
    return;
  }
  if (Array.isArray(value) || typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
}

function buildPayloadFromFields(config: ResourceConfig, form: Record<string, unknown>, editing?: Record<string, unknown> | null) {
  if (config.buildPayload) return config.buildPayload(form, editing);

  return config.fields.reduce<Record<string, unknown>>((acc, field) => {
    if (editing && field.createOnly) return acc;
    const raw = form[field.key];
    if (raw === "" || raw === undefined || raw === null) return acc;

    if (field.type === "boolean") acc[field.key] = Boolean(raw);
    else if (field.type === "json") acc[field.key] = parseJsonOrKeyValue(raw);
    else if (field.type === "tags") acc[field.key] = parseTags(raw);
    else if (field.type === "number") acc[field.key] = String(raw);
    else if (field.type === "image") {
      if (typeof raw === "object" && "uri" in raw) acc[field.key] = raw;
    }
    else if (field.relation) acc[field.key] = Number(raw);
    else acc[field.key] = raw;
    return acc;
  }, {});
}

function makeBody(config: ResourceConfig, payload: Record<string, unknown>) {
  if (!config.multipart) return payload;
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => appendFormData(formData, key, value));
  return formData;
}

function getImageUris(value: unknown, baseUrl: string) {
  if (value && typeof value === "object" && "uri" in value) {
    return [String((value as ImageValue).uri)];
  }
  return toAssetUrlCandidates(value, baseUrl) ?? [];
}

function getTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function ResilientImage({
  uris,
  style,
  resizeMode = "contain"
}: {
  uris: string[];
  style: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}) {
  const imageKey = uris.join("|");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [imageKey]);

  const uri = uris[index];
  if (!uri) return null;

  return (
    <Image
      key={uri}
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setIndex((current) => (current < uris.length - 1 ? current + 1 : current));
      }}
    />
  );
}

export function ResourceScreen({ api, config, role }: { api: ApiClient; config: ResourceConfig; role: string }) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(() => initialForm(config));
  const [relations, setRelations] = useState<RelationOptions>({});

  const writable = canWrite(role);
  const canCreate = writable && config.allowCreate;
  const canEdit = writable && config.allowEdit;
  const canDelete = writable && config.allowDelete;
  const imageField = useMemo(() => config.fields.find((field) => field.type === "image")?.key, [config.fields]);

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await api.list<Record<string, unknown>>(config.endpoint);
      setItems(payload.results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, config.endpoint]);

  const loadRelations = useCallback(async () => {
    const relationFields = config.fields.filter((field) => field.relation);
    const nextRelations: RelationOptions = {};
    await Promise.all(
      relationFields.map(async (field) => {
        if (!field.relation) return;
        const payload: ApiList<Record<string, unknown>> = await api.list(field.relation.endpoint);
        const rows = field.relation.filter ? payload.results.filter(field.relation.filter) : payload.results;
        nextRelations[field.key] = rows.map((item) => ({
          label: relationLabel(item, field),
          value: String(item[field.relation?.valueKey || "id"] || "")
        }));
      })
    );
    setRelations(nextRelations);
  }, [api, config.fields]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      config.searchable.some((key) => displayValue(item[key]).toLowerCase().includes(normalized))
    );
  }, [config.searchable, items, query]);

  async function openCreate() {
    setEditing(null);
    setForm(initialForm(config));
    setSuccess("");
    setError("");
    setFormOpen(true);
    try {
      await loadRelations();
    } catch (relationError) {
      setError(relationError instanceof Error ? relationError.message : "Chargement des choix impossible.");
    }
  }

  async function openEdit(item: Record<string, unknown>) {
    setEditing(item);
    setForm(initialForm(config, item));
    setSuccess("");
    setError("");
    setFormOpen(true);
    try {
      await loadRelations();
    } catch (relationError) {
      setError(relationError instanceof Error ? relationError.message : "Chargement des choix impossible.");
    }
  }

  async function submit() {
    const missing = config.fields.find((field) => field.required && !form[field.key]);
    if (missing) {
      setError(`${missing.label} est obligatoire.`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = buildPayloadFromFields(config, form, editing);
      const body = makeBody(config, payload);
      const saved = editing
        ? await api.patch<Record<string, unknown>>(`${config.endpoint}${editing.id}/`, body)
        : await api.post<Record<string, unknown>>(config.endpoint, body);
      setItems((current) => {
        if (!editing) return [saved, ...current];
        return current.map((item) => (item.id === saved.id ? saved : item));
      });
      setFormOpen(false);
      setSuccess(editing ? "Element mis a jour." : "Element cree.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item: Record<string, unknown>) {
    Alert.alert("Supprimer", "Confirmer la suppression ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.remove(`${config.endpoint}${item.id}/`);
            setItems((current) => current.filter((row) => row.id !== item.id));
            setSuccess("Element supprime.");
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Suppression impossible.");
          }
        }
      }
    ]);
  }

  async function runAction(item: Record<string, unknown>, actionIndex: number) {
    const action = config.actions?.[actionIndex];
    if (!action) return;
    setError("");
    setSuccess("");
    try {
      const result = await action.run(api, item);
      if (result && typeof result === "object") {
        setItems((current) => current.map((row) => (row.id === result.id ? result : row)));
      } else {
        await load();
      }
      setSuccess(`${action.label}: termine.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action impossible.");
    }
  }

  async function pickImage(field: FieldConfig) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const nextValue: ImageValue = {
      uri: asset.uri,
      name: asset.fileName || fileNameFromUri(asset.uri),
      type: asset.mimeType || "image/jpeg"
    };
    setForm((current) => ({ ...current, [field.key]: nextValue }));
  }

  function renderFormField(field: FieldConfig) {
    if (editing && field.createOnly) return null;
    const rawValue = form[field.key];
    const value = String(rawValue || "");

    if (field.type === "select") {
      const options = field.relation ? relations[field.key] || [] : field.options || [];
      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          {options.length ? (
            <ChoiceRow options={options} value={String(value)} onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))} />
          ) : (
            <Muted>Aucun choix disponible.</Muted>
          )}
        </View>
      );
    }

    if (field.type === "boolean") {
      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <ChoiceRow
            options={[
              { label: "Oui", value: "true" },
              { label: "Non", value: "false" }
            ]}
            value={String(Boolean(rawValue))}
            onChange={(next) => setForm((current) => ({ ...current, [field.key]: next === "true" }))}
          />
        </View>
      );
    }

    if (field.type === "image") {
      const imageUris = getImageUris(rawValue, api.baseUrl);
      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          {imageUris.length ? <ResilientImage uris={imageUris} style={styles.preview} /> : null}
          <Button tone="neutral" onPress={() => pickImage(field)}>
            {imageUris.length ? "Changer la photo" : "Choisir une photo"}
          </Button>
        </View>
      );
    }

    return (
      <Field
        key={field.key}
        label={field.label}
        value={value}
        onChangeText={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
        multiline={field.type === "textarea" || field.type === "json"}
        keyboardType={field.keyboard || (field.type === "number" ? "numeric" : "default")}
        placeholder={field.placeholder}
      />
    );
  }

  if (loading) return <LoadingState label={`Chargement ${config.title.toLowerCase()}...`} />;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <H1>{config.title}</H1>
            <Muted>{config.subtitle}</Muted>
          </View>
          {canCreate ? <Button onPress={openCreate}>Ajouter</Button> : null}
        </View>

        <Field label="Recherche" value={query} onChangeText={setQuery} placeholder="Rechercher..." />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        {filteredItems.length === 0 ? (
          <EmptyState label="Aucune donnee disponible." />
        ) : (
          filteredItems.map((item) => {
            const badge = config.badge?.(item);
            const imageValue = imageField ? item[imageField] || item.image_url || item.imageUrl : null;
            const imageUris = imageField ? getImageUris(imageValue, api.baseUrl) : [];
            const tags = getTags(item.tags);
            return (
              <Card key={String(item.id)} style={styles.itemCard}>
                {imageField ? (
                  <View style={styles.imageFrame}>
                    {imageUris.length ? (
                      <ResilientImage uris={imageUris} style={styles.itemImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>Aucune photo</Text>
                      </View>
                    )}
                  </View>
                ) : null}
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={styles.itemTitle}>{getText(item, config.titleField)}</Text>
                    {config.detailFields.map((field, index) => (
                      <Muted key={`${String(item.id)}-${index}`}>{getText(item, field)}</Muted>
                    ))}
                  </View>
                  {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
                </View>
                {tags.length ? (
                  <View style={styles.tagRow}>
                    {tags.map((tag) => (
                      <View key={`${String(item.id)}-${tag}`} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(config.actions?.length || canEdit || canDelete) ? (
                  <View style={styles.itemActions}>
                    {config.actions?.map((action, index) => (
                      <Button key={action.label} tone={action.tone || "neutral"} onPress={() => runAction(item, index)}>
                        {action.label}
                      </Button>
                    ))}
                    {canEdit ? <Button tone="neutral" onPress={() => openEdit(item)}>Modifier</Button> : null}
                    {canDelete ? <Button tone="red" onPress={() => confirmDelete(item)}>Supprimer</Button> : null}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <H2>{editing ? "Modifier" : "Ajouter"} - {config.title}</H2>
              <Muted>{editing ? "Mise a jour via l'API." : "Creation via l'API."}</Muted>
            </View>
            <Pressable onPress={() => setFormOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            {config.fields.map(renderFormField)}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button onPress={submit} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1
  },
  container: {
    padding: spacing.md,
    gap: spacing.md
  },
  header: {
    gap: spacing.md
  },
  titleBlock: {
    gap: spacing.sm
  },
  error: {
    color: colors.red,
    borderWidth: 1,
    borderColor: "#f8717166",
    backgroundColor: "#f8717118",
    padding: spacing.md,
    borderRadius: 10
  },
  success: {
    color: colors.green,
    borderWidth: 1,
    borderColor: "#34d39966",
    backgroundColor: "#34d39918",
    padding: spacing.md,
    borderRadius: 10
  },
  itemCard: {
    gap: spacing.md
  },
  imageFrame: {
    height: 240,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.ink
  },
  itemImage: {
    height: "100%",
    width: "100%"
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelSoft
  },
  imagePlaceholderText: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: "700"
  },
  itemHeader: {
    gap: spacing.md
  },
  itemTitleBlock: {
    gap: 5
  },
  itemTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "800"
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  tagText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  modal: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingTop: 54
  },
  modalHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  closeText: {
    color: colors.gold,
    fontWeight: "700"
  },
  form: {
    padding: spacing.md,
    gap: spacing.md
  },
  formGroup: {
    gap: spacing.sm
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  preview: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.panelSoft
  }
});
