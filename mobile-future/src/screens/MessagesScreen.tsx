import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiClient } from "../api/client";
import { colors, spacing } from "../theme";
import { ApiList, StoredUser } from "../types";
import { canWrite, formatDateTime, getRole } from "../utils";
import { Badge, Button, Card, ChoiceRow, EmptyState, Field, H1, H2, LoadingState, Muted } from "../components/ui";

type MessageItem = {
  id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
};

type MessageThread = {
  id: number;
  client: number | null;
  client_name: string;
  subject: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "closed" | "archived";
  messages: MessageItem[];
  created_at: string;
};

type ClientOption = {
  user: number | null;
  full_name: string;
  phone: string;
};

export function MessagesScreen({ api, user }: { api: ApiClient; user: StoredUser }) {
  const role = getRole(user);
  const canChooseClient = canWrite(role);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clientUserId, setClientUserId] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) || threads[0],
    [activeId, threads]
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const [messagePayload, clientsPayload] = await Promise.all([
        api.list<MessageThread>("/messages/"),
        canChooseClient
          ? api.list<ClientOption>("/clients/")
          : Promise.resolve({ count: 0, next: null, previous: null, results: [] } satisfies ApiList<ClientOption>)
      ]);
      setThreads(messagePayload.results);
      setClients(clientsPayload.results.filter((client) => client.user));
      setActiveId((current) => current || messagePayload.results[0]?.id || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement des messages impossible.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, canChooseClient]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendThread() {
    if (!subject.trim() || !body.trim()) {
      setError("Sujet et message obligatoires.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = await api.post<MessageThread>("/messages/", {
        subject: subject.trim(),
        priority,
        client: clientUserId ? Number(clientUserId) : undefined,
        initial_message: body.trim()
      });
      setThreads((current) => [created, ...current]);
      setActiveId(created.id);
      setSubject("");
      setBody("");
      setClientUserId("");
      setPriority("normal");
      setSuccess("Message envoye.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply() {
    if (!activeThread || !reply.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const message = await api.post<MessageItem>(`/messages/${activeThread.id}/repondre/`, { body: reply.trim() });
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThread.id ? { ...thread, messages: [...thread.messages, message] } : thread
        )
      );
      setReply("");
      setSuccess("Reponse envoyee.");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Reponse impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Chargement des messages..." />;

  const clientOptions = clients.map((client) => ({
    label: `${client.full_name} - ${client.phone}`,
    value: String(client.user)
  }));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <H1>Messages</H1>
        <Muted>{canChooseClient ? "Messages entre l'atelier et les clients." : "Ecrivez a l'atelier et suivez les reponses."}</Muted>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Card style={styles.form}>
        <H2>Nouveau message</H2>
        {canChooseClient ? (
          <View style={styles.formGroup}>
            <Muted>Client</Muted>
            {clientOptions.length ? (
              <ChoiceRow options={clientOptions} value={clientUserId} onChange={setClientUserId} />
            ) : (
              <Muted>Aucun client avec compte utilisateur.</Muted>
            )}
          </View>
        ) : null}
        <Field label="Sujet" value={subject} onChangeText={setSubject} placeholder="Sujet" />
        <View style={styles.formGroup}>
          <Muted>Priorite</Muted>
          <ChoiceRow
            value={priority}
            onChange={setPriority}
            options={[
              { label: "Basse", value: "low" },
              { label: "Normale", value: "normal" },
              { label: "Haute", value: "high" },
              { label: "Urgente", value: "urgent" }
            ]}
          />
        </View>
        <Field label="Message" value={body} onChangeText={setBody} multiline placeholder="Votre message" />
        <Button onPress={sendThread} disabled={saving}>
          {saving ? "Envoi..." : "Envoyer"}
        </Button>
      </Card>

      <Card style={styles.form}>
        <H2>Conversations</H2>
        {threads.length === 0 ? <EmptyState label="Aucune conversation." /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.threadTabs}>
          {threads.map((thread) => (
            <Button
              key={thread.id}
              tone={activeThread?.id === thread.id ? "gold" : "neutral"}
              onPress={() => setActiveId(thread.id)}
            >
              {thread.subject}
            </Button>
          ))}
        </ScrollView>

        {activeThread ? (
          <View style={styles.conversation}>
            <View style={styles.threadHeader}>
              <View>
                <Text style={styles.threadTitle}>{activeThread.subject}</Text>
                <Muted>{activeThread.client_name || "Client non lie"}</Muted>
              </View>
              <Badge tone={activeThread.priority === "urgent" ? "red" : activeThread.priority === "high" ? "gold" : "neutral"}>
                {activeThread.priority}
              </Badge>
            </View>
            {activeThread.messages.length === 0 ? <EmptyState label="Aucun message dans cette conversation." /> : null}
            {activeThread.messages.map((message) => (
              <View key={message.id} style={styles.message}>
                <View style={styles.messageTop}>
                  <Text style={styles.sender}>{message.sender_name}</Text>
                  <Muted>{formatDateTime(message.created_at)}</Muted>
                </View>
                <Text style={styles.messageBody}>{message.body}</Text>
              </View>
            ))}
            <Field label="Repondre" value={reply} onChangeText={setReply} multiline placeholder="Votre reponse" />
            <Button onPress={sendReply} disabled={saving || !reply.trim()}>
              Repondre
            </Button>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md
  },
  header: {
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
  form: {
    gap: spacing.md
  },
  formGroup: {
    gap: spacing.sm
  },
  threadTabs: {
    gap: spacing.sm
  },
  conversation: {
    gap: spacing.md
  },
  threadHeader: {
    gap: spacing.sm
  },
  threadTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "800"
  },
  message: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  messageTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sender: {
    color: colors.ivory,
    fontWeight: "700"
  },
  messageBody: {
    color: colors.muted,
    lineHeight: 20
  }
});
