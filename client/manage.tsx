import { type PluginScreenProps, useSettings } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  type Profile,
  formatEnv,
  parseEnv,
  profilesSettings,
  slugify,
} from "../shared/profiles";

export function ManageScreen({ theme, layout }: PluginScreenProps) {
  const state = useSettings(profilesSettings);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [envText, setEnvText] = useState("");
  const [providers, setProviders] = useState("");

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
    if (!trimmed) return;
    let id = slugify(trimmed);
    while (profiles.some((profile) => profile.id === id)) id = `${id}-2`;
    if (await save([...profiles, { id, name: trimmed, icon: "User", env: {}, envProviders: [] }])) {
      setName("");
    }
  }

  function startEdit(profile: Profile) {
    setEditing(profile.id);
    setEnvText(formatEnv(profile.env));
    setProviders(profile.envProviders.join(", "));
  }

  async function commitEdit(id: string) {
    const envProviders = providers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const ok = await save(
      profiles.map((profile) =>
        profile.id === id ? { ...profile, env: parseEnv(envText), envProviders } : profile,
      ),
    );
    if (ok) setEditing(null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
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
                <Text style={styles.link}>Edit environment</Text>
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
      </View>
    </ScrollView>
  );
}
