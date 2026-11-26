import {
  type PluginSidebarViewProps,
  type WorkspaceRef,
  useSettings,
  useWorkspace,
  useWorkspaces,
  usePaseo,
} from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  ALL_PROFILES,
  UNASSIGNED,
  activeSettings,
  profileLabel,
  profileOf,
  profilesSettings,
  type Profile,
} from "../shared/profiles";

type Props = Pick<PluginSidebarViewProps, "theme" | "layout" | "navigation" | "active">;

function WorkspaceRow({
  reference,
  profiles,
  props,
}: {
  reference: WorkspaceRef;
  profiles: readonly Profile[];
  props: Props;
}) {
  const { theme, navigation, active } = props;
  const workspace = useWorkspace(reference);
  const paseo = usePaseo();
  const [open, setOpen] = useState(false);
  if (!workspace) return null;
  const current = profileOf(workspace.labels);
  const selected = active.workspace?.key === reference.key;

  async function assign(next: string | null) {
    const handle = paseo.workspaces.ref(reference);
    // Add the destination before removing the source so a failure keeps the original.
    if (next) await handle.setLabel(profileLabel(next), { assigned: true });
    if (current && current !== next) await handle.setLabel(profileLabel(current), { assigned: false });
    setOpen(false);
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 28,
          paddingHorizontal: 12,
          backgroundColor: selected ? theme.colors.surface2 : "transparent",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open workspace ${workspace.title ?? workspace.name}`}
          style={{ flex: 1, minWidth: 0, paddingVertical: 4 }}
          onPress={() => navigation.openWorkspace(reference)}
        >
          <Text numberOfLines={1} style={{ color: theme.colors.foreground, fontSize: 12, lineHeight: 16 }}>
            {workspace.title ?? workspace.name}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>
            {workspace.projectDisplayName}
            {workspace.branch ? ` · ${workspace.branch}` : ""}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change profile of ${workspace.title ?? workspace.name}`}
          onPress={() => setOpen((value) => !value)}
          style={{
            flexShrink: 0,
            marginLeft: 8,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: current ? theme.colors.border : theme.colors.accent,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              color: current ? theme.colors.foregroundMuted : theme.colors.accent,
            }}
          >
            {current ? `${current} ▾` : "Assign ▾"}
          </Text>
        </Pressable>
      </View>
      {open ? (
        <View style={{ paddingLeft: 24, paddingBottom: 4 }}>
          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Move to ${profile.name}`}
              onPress={() => void assign(profile.id)}
              style={{ paddingVertical: 4, paddingHorizontal: 12 }}
            >
              <Text style={{ color: theme.colors.accent, fontSize: 12 }}>
                Move to {profile.name}
                {profile.id === current ? " (current)" : ""}
              </Text>
            </Pressable>
          ))}
          {current ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove from profile"
              onPress={() => void assign(null)}
              style={{ paddingVertical: 4, paddingHorizontal: 12 }}
            >
              <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
                Remove from profile
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
  theme: Props["theme"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Show ${label}`}
      onPress={onPress}
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
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
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfileSidebarView(props: PluginSidebarViewProps) {
  const { theme } = props;
  const profileState = useSettings(profilesSettings);
  const activeState = useSettings(activeSettings);
  const profiles = profileState.status === "ready" ? profileState.values.profiles : [];
  const active = activeState.status === "ready" ? activeState.values.active : ALL_PROFILES;
  const showUnassigned = activeState.status === "ready" ? activeState.values.showUnassigned : true;

  const groups = useWorkspaces({
    where: (workspace) => !workspace.background,
    orderBy: ["lastPromptAt", "desc"],
    groupBy: (workspace) => profileOf(workspace.labels) ?? UNASSIGNED,
  });

  const visible = useMemo(() => {
    const byKey = new Map(groups.map((group) => [group.key, group]));
    const section = (key: string, title: string) => ({ key, title, items: byKey.get(key)?.items ?? [] });
    if (active === ALL_PROFILES) {
      const all = profiles.map((profile) => section(profile.id, profile.name));
      // Workspaces labelled with a profile that no longer exists fall back to Unassigned.
      const known = new Set(profiles.map((profile) => profile.id));
      const orphaned = groups.filter((group) => group.key !== UNASSIGNED && !known.has(group.key));
      const unassigned = [
        ...(byKey.get(UNASSIGNED)?.items ?? []),
        ...orphaned.flatMap((group) => group.items),
      ];
      return [...all, { key: UNASSIGNED, title: "Unassigned", items: unassigned }];
    }
    const profile = profiles.find((item) => item.id === active);
    const chosen = [section(active, profile?.name ?? active)];
    if (showUnassigned) chosen.push(section(UNASSIGNED, "Unassigned"));
    return chosen;
  }, [groups, active, profiles, showUnassigned]);

  if (profileState.status !== "ready" || activeState.status !== "ready") {
    return (
      <Text style={{ color: theme.colors.foregroundMuted, padding: 12, fontSize: 12 }}>
        {profileState.status === "loading" || activeState.status === "loading"
          ? "Loading profiles…"
          : "Profile settings could not be read."}
      </Text>
    );
  }

  const choose = (next: string) =>
    void activeState.save({ ...activeState.values, active: next }, activeState.revision);

  return (
    <ScrollView>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 12 }}>
        <Chip label="All" selected={active === ALL_PROFILES} onPress={() => choose(ALL_PROFILES)} theme={theme} />
        {profiles.map((profile) => (
          <Chip
            key={profile.id}
            label={profile.name}
            selected={active === profile.id}
            onPress={() => choose(profile.id)}
            theme={theme}
          />
        ))}
      </View>
      {visible.map((group) => (
        <View key={group.key} style={{ paddingBottom: 8 }}>
          <Text
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: 11,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            {group.title.toUpperCase()} · {group.items.length}
          </Text>
          {group.items.map((reference) => (
            <WorkspaceRow key={reference.key} reference={reference} profiles={profiles} props={props} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
