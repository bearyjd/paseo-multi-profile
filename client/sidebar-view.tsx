import {
  type PluginSidebarViewProps,
  type WorkspaceRef,
  useAgents,
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
  indent = 0,
}: {
  reference: WorkspaceRef;
  profiles: readonly Profile[];
  props: Props;
  indent?: number;
}) {
  const { theme, navigation, active } = props;
  const workspace = useWorkspace(reference);
  const paseo = usePaseo();
  const [open, setOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!workspace) return null;
  const current = profileOf(workspace.labels);
  const label = workspace.title ?? workspace.name;
  // react-native-web forwards onContextMenu (right click); touch uses long press.
  const openMenu = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    // A second right click closes the menu, and cancels a pending archive.
    if (open) setConfirmArchive(false);
    setOpen(!open);
  };
  const contextMenu = { onContextMenu: openMenu } as object;
  const selected = active.workspace?.key === reference.key;

  async function assign(next: string | null) {
    const handle = paseo.workspaces.ref(reference);
    // Add the destination before removing the source so a failure keeps the original.
    if (next) await handle.setLabel(profileLabel(next), { assigned: true });
    if (current && current !== next) await handle.setLabel(profileLabel(current), { assigned: false });
    setOpen(false);
  }

  async function archive() {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    try {
      await paseo.workspaces.ref(reference).archive();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setConfirmArchive(false);
    }
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 28,
          paddingLeft: 12 + indent,
          paddingRight: 12,
          backgroundColor: selected ? theme.colors.surface2 : "transparent",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open workspace ${workspace.title ?? workspace.name}`}
          style={{ flex: 1, minWidth: 0, paddingVertical: 4 }}
          onPress={() => navigation.openWorkspace(reference)}
          onLongPress={() => openMenu()}
          {...contextMenu}
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
          onPress={() => {
            if (open) setConfirmArchive(false);
            setOpen((value) => !value);
          }}
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
        <View style={{ paddingLeft: 24 + indent, paddingBottom: 4 }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${confirmArchive ? "Confirm archive of" : "Archive"} ${label}`}
            onPress={() => void archive()}
            style={{ paddingVertical: 4, paddingHorizontal: 12 }}
          >
            <Text style={{ color: theme.colors.statusDanger, fontSize: 12 }}>
              {confirmArchive ? "Tap again to archive this workspace" : "Archive workspace"}
            </Text>
          </Pressable>
          {error ? (
            <Text style={{ color: theme.colors.statusDanger, fontSize: 11, paddingHorizontal: 12 }}>
              {error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ProjectHeader({
  first,
  label,
  count,
  open,
  onToggle,
  props,
}: {
  first: WorkspaceRef;
  label: string;
  count: number;
  open: boolean;
  onToggle(): void;
  props: Props;
}) {
  const { theme, navigation } = props;
  const project = useWorkspace(first, (workspace) => workspace.project);
  const [menu, setMenu] = useState(false);
  const show = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    setMenu((value) => !value);
  };
  return (
    <View>
      <TreeHeader
        label={label}
        count={count}
        depth={1}
        open={open}
        onToggle={onToggle}
        theme={theme}
        onMenu={show}
      />
      {menu && project ? (
        <View style={{ paddingLeft: 36, paddingBottom: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`New workspace in ${label}`}
            onPress={() => {
              setMenu(false);
              navigation.openProject(project);
            }}
            style={{ paddingVertical: 4, paddingHorizontal: 12 }}
          >
            <Text style={{ color: theme.colors.accent, fontSize: 12 }}>
              New workspace in {label}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setMenu(false)}
            style={{ paddingVertical: 4, paddingHorizontal: 12 }}
          >
            <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Close</Text>
          </Pressable>
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

const EMPTY = "__empty__";
const SEP = "\u0001";

function TreeHeader({
  label,
  count,
  depth,
  open,
  onToggle,
  onMenu,
  theme,
}: {
  label: string;
  count: number;
  depth: 0 | 1;
  open: boolean;
  onToggle(): void;
  /** Right click or long press. */
  onMenu?: (event?: { preventDefault?: () => void }) => void;
  theme: Props["theme"];
}) {
  const contextMenu = onMenu ? ({ onContextMenu: onMenu } as object) : {};
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${open ? "Collapse" : "Expand"} ${label}`}
      onPress={onToggle}
      onLongPress={onMenu ? () => onMenu() : undefined}
      {...contextMenu}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 28,
        paddingRight: 12,
        paddingLeft: 12 + depth * 12,
        gap: 6,
      }}
    >
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, width: 12 }}>
        {open ? "▾" : "▸"}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: depth === 0 ? theme.colors.foreground : theme.colors.foregroundMuted,
          fontSize: depth === 0 ? 12 : 11,
          fontWeight: depth === 0 ? "600" : "400",
        }}
      >
        {label}
      </Text>
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>{count}</Text>
    </Pressable>
  );
}

export function ProfileSidebarView(props: PluginSidebarViewProps) {
  const { theme } = props;
  const profileState = useSettings(profilesSettings);
  const activeState = useSettings(activeSettings);
  const profiles = useMemo(
    () => (profileState.status === "ready" ? profileState.values.profiles : []),
    [profileState],
  );
  const active = activeState.status === "ready" ? activeState.values.active : ALL_PROFILES;
  const showUnassigned = activeState.status === "ready" ? activeState.values.showUnassigned : true;
  const collapsed = useMemo(
    () => new Set(activeState.status === "ready" ? activeState.values.collapsed : []),
    [activeState],
  );

  // Workspaces that already have an agent go under their project; the rest are listed
  // separately so a workspace never disappears just because nothing is open in it.
  const agentGroups = useAgents({
    where: (agent) => !agent.background,
    groupBy: (agent) => agent.workspace.key,
  });
  const withAgents = useMemo(() => new Set(agentGroups.map((group) => group.key)), [agentGroups]);
  const knownProfiles = useMemo(() => new Set(profiles.map((profile) => profile.id)), [profiles]);

  const groups = useWorkspaces({
    where: (workspace) => !workspace.background,
    orderBy: (a, b) =>
      a.projectDisplayName.localeCompare(b.projectDisplayName) || a.name.localeCompare(b.name),
    groupBy: (workspace) => {
      const id = profileOf(workspace.labels);
      const profile = id && knownProfiles.has(id) ? id : UNASSIGNED;
      const hasAgents = withAgents.has(workspace.ref.key);
      return {
        key: `${profile}${SEP}${hasAgents ? workspace.project.key : EMPTY}`,
        title: hasAgents ? workspace.projectDisplayName : "No agents yet",
      };
    },
  });
  const everything = useWorkspaces();

  const sections = useMemo(() => {
    const all = [
      ...profiles.map((profile) => ({ id: profile.id, name: profile.name })),
      { id: UNASSIGNED, name: "Unassigned" },
    ];
    return all
      .filter(
        (section) =>
          active === ALL_PROFILES ||
          section.id === active ||
          (section.id === UNASSIGNED && showUnassigned),
      )
      .map((section) => {
        const own = groups.filter((group) => group.key.startsWith(`${section.id}${SEP}`));
        // The "No agents yet" bucket goes last.
        const ordered = [
          ...own.filter((group) => !group.key.endsWith(`${SEP}${EMPTY}`)),
          ...own.filter((group) => group.key.endsWith(`${SEP}${EMPTY}`)),
        ];
        return {
          ...section,
          groups: ordered,
          count: ordered.reduce((sum, group) => sum + group.items.length, 0),
        };
      });
  }, [groups, profiles, active, showUnassigned]);

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
  const toggle = (key: string) => {
    const next = new Set(collapsed);
    if (!next.delete(key)) next.add(key);
    void activeState.save({ ...activeState.values, collapsed: [...next] }, activeState.revision);
  };

  const shown = sections.reduce((sum, section) => sum + section.count, 0);
  const hidden = Math.max(0, everything.length - groups.reduce((sum, group) => sum + group.items.length, 0));

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
      {sections.map((section) => {
        const sectionKey = `p:${section.id}`;
        const open = !collapsed.has(sectionKey);
        return (
          <View key={section.id} style={{ paddingBottom: 6 }}>
            <TreeHeader
              label={section.name}
              count={section.count}
              depth={0}
              open={open}
              onToggle={() => toggle(sectionKey)}
              theme={theme}
            />
            {open
              ? section.groups.map((group) => {
                  const bucket = group.key.slice(group.key.indexOf(SEP) + 1);
                  const groupKey = `g:${section.id}:${bucket}`;
                  const groupOpen = !collapsed.has(groupKey);
                  return (
                    <View key={group.key}>
                      {bucket === EMPTY ? (
                        <TreeHeader
                          label={group.title ?? bucket}
                          count={group.items.length}
                          depth={1}
                          open={groupOpen}
                          onToggle={() => toggle(groupKey)}
                          theme={theme}
                        />
                      ) : (
                        <ProjectHeader
                          first={group.items[0]}
                          label={group.title ?? bucket}
                          count={group.items.length}
                          open={groupOpen}
                          onToggle={() => toggle(groupKey)}
                          props={props}
                        />
                      )}
                      {groupOpen
                        ? group.items.map((reference) => (
                            <WorkspaceRow
                              key={reference.key}
                              reference={reference}
                              profiles={profiles}
                              props={props}
                              indent={24}
                            />
                          ))
                        : null}
                    </View>
                  );
                })
              : null}
          </View>
        );
      })}
      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, padding: 12 }}>
        {shown} workspace{shown === 1 ? "" : "s"} shown
        {hidden > 0 ? `, ${hidden} background workspace${hidden === 1 ? "" : "s"} hidden` : ""}
      </Text>
    </ScrollView>
  );
}
