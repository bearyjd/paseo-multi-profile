import {
  type PluginScreenProps,
  type WorkspaceRef,
  usePaseo,
  useSettings,
  useWorkspace,
  useWorkspaces,
} from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  type Profile,
  formatEnv,
  parseEnv,
  profileLabel,
  profileOf,
  profilesSettings,
  slugify,
} from "../shared/profiles";

function AssignRow({
  reference,
  profiles,
  theme,
}: {
  reference: WorkspaceRef;
  profiles: readonly Profile[];
  theme: PluginScreenProps["theme"];
}) {
  const workspace = useWorkspace(reference);
  const paseo = usePaseo();
  const [error, setError] = useState<string | null>(null);
  if (!workspace) return null;
  const current = profileOf(workspace.labels);

  async function assign(next: string | null) {
    setError(null);
    try {
      const handle = paseo.workspaces.ref(reference);
      // Add the destination before removing the source so a failure keeps the original.
      if (next) await handle.setLabel(profileLabel(next), { assigned: true });
      if (current && current !== next) {
        await handle.setLabel(profileLabel(current), { assigned: false });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const options: { id: string | null; name: string }[] = [
    ...profiles.map((profile) => ({ id: profile.id, name: profile.name })),
    { id: null, name: "None" },
  ];
  return (
    <View style={{ gap: 6, paddingVertical: 6 }}>
      <Text numberOfLines={1} style={{ color: theme.colors.foreground, fontSize: 14 }}>
        {workspace.title ?? workspace.name}
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
          {"  "}
          {workspace.projectDisplayName}
        </Text>
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((option) => {
          const selected = option.id === current;
          return (
            <Pressable
              key={option.id ?? "none"}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Set ${workspace.title ?? workspace.name} to ${option.name}`}
              onPress={() => void assign(option.id)}
              style={{
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: selected ? theme.colors.accent : theme.colors.surface2,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: selected ? theme.colors.accentForeground : theme.colors.foreground,
                }}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={{ color: theme.colors.statusDanger, fontSize: 12 }}>{error}</Text>
      ) : null}
    </View>
  );
}

export function ManageScreen({ theme, layout }: PluginScreenProps) {
  const state = useSettings(profilesSettings);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [envText, setEnvText] = useState("");
  const [providers, setProviders] = useState("");
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const workspaces = useWorkspaces({
    where: (workspace) => !workspace.background,
    orderBy: "name",
  });

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      body: { padding: layout.compact ? 16 : 24, gap: 12 },
      h: { color: theme.colors.foreground, fontSize: layout.compact ? 18 : 20 },
      muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
      card: { padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface1, gap: 8 },
      input: {
        color: theme.colors.foreground,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 8,
      },
      button: { padding: 10, borderRadius: 8, backgroundColor: theme.colors.accent },
      buttonText: { color: theme.colors.accentForeground, textAlign: "center" as const },
      link: { color: theme.colors.accent, fontSize: 13 },
      danger: { color: theme.colors.statusDanger, fontSize: 13 },
    }),
    [theme, layout.compact],
  );

  if (state.status === "loading") return <Text style={styles.muted}>Loading…</Text>;
  if (state.status !== "ready") {
    return (
      <View style={styles.body}>
        <Text style={styles.h}>Profile settings are unreadable</Text>
        <Pressable accessibilityRole="button" onPress={() => void state.reset()} style={styles.button}>
          <Text style={styles.buttonText}>Reset to defaults</Text>
        </Pressable>
      </View>
    );
  }

  const profiles = state.values.profiles;
  const save = (next: Profile[]) => state.save({ profiles: next }, state.revision);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAddMessage("Type a profile name first.");
      return;
    }
    let id = slugify(trimmed);
    while (profiles.some((profile) => profile.id === id)) id = `${id}-2`;
    const ok = await save([
      ...profiles,
      { id, name: trimmed, icon: "User", env: {}, envProviders: [] },
    ]);
    if (ok) {
      setName("");
      setAddMessage(`Added ${trimmed}.`);
    } else {
      setAddMessage("Could not save the profile. Pull to reload and try again.");
    }
  }

  function startEdit(profile: Profile) {
    setEditing(profile.id);
    setEditName(profile.name);
    setEnvText(formatEnv(profile.env));
    setProviders(profile.envProviders.join(", "));
  }

  async function commitEdit(id: string) {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setAddMessage("A profile needs a name.");
      return;
    }
    const envProviders = providers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const ok = await save(
      profiles.map((profile) =>
        profile.id === id
          ? { ...profile, name: trimmedName, env: parseEnv(envText), envProviders }
          : profile,
      ),
    );
    if (ok) setEditing(null);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h}>Profiles</Text>
      <Text style={styles.muted}>
        A profile groups workspaces. Switch the sidebar view to show only one profile. Removing a
        profile keeps its workspaces and moves them to Unassigned.
      </Text>
      {state.saveError ? <Text style={styles.danger}>{String(state.saveError)}</Text> : null}
      {profiles.map((profile) => (
        <View key={profile.id} style={styles.card}>
          <Text style={{ color: theme.colors.foreground, fontSize: 15 }}>
            {profile.name} <Text style={styles.muted}>({profile.id})</Text>
          </Text>
          <Text style={styles.muted}>
            {Object.keys(profile.env).length} environment variable(s)
          </Text>
          {editing === profile.id ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.muted}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                accessibilityLabel={`Name of ${profile.name}`}
                style={styles.input}
                placeholderTextColor={theme.colors.foregroundMuted}
                placeholder="Profile name"
              />
              <Text style={styles.muted}>
                Environment for agents in this profile, one KEY=value per line. Stored unencrypted on
                the daemon host.
              </Text>
              <TextInput
                multiline
                value={envText}
                onChangeText={setEnvText}
                accessibilityLabel={`Environment for ${profile.name}`}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { minHeight: 90 }]}
                placeholderTextColor={theme.colors.foregroundMuted}
                placeholder="ANTHROPIC_API_KEY=sk-..."
              />
              <TextInput
                value={providers}
                onChangeText={setProviders}
                accessibilityLabel="Limit to providers"
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor={theme.colors.foregroundMuted}
                placeholder="Limit to providers, comma separated (blank = all)"
              />
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Pressable accessibilityRole="button" onPress={() => void commitEdit(profile.id)}>
                  <Text style={styles.link}>Save</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setEditing(null)}>
                  <Text style={styles.link}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable accessibilityRole="button" onPress={() => startEdit(profile)}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void save(profiles.filter((item) => item.id !== profile.id))}
              >
                <Text style={styles.danger}>Remove</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
      <View style={styles.card}>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="New profile name"
          placeholder="New profile name"
          placeholderTextColor={theme.colors.foregroundMuted}
          style={styles.input}
          onSubmitEditing={() => void add()}
        />
        <Pressable accessibilityRole="button" onPress={() => void add()} style={styles.button}>
          <Text style={styles.buttonText}>Add profile</Text>
        </Pressable>
        {addMessage ? <Text style={styles.muted}>{addMessage}</Text> : null}
        {state.saveError ? <Text style={styles.danger}>{String(state.saveError)}</Text> : null}
      </View>
      <Text style={[styles.h, { marginTop: 8 }]}>Assign workspaces</Text>
      <Text style={styles.muted}>
        Pick a profile for each workspace. None leaves it under Unassigned.
      </Text>
      <View style={styles.card}>
        {workspaces.length === 0 ? (
          <Text style={styles.muted}>No workspaces yet.</Text>
        ) : (
          workspaces.map((reference) => (
            <AssignRow key={reference.key} reference={reference} profiles={profiles} theme={theme} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
