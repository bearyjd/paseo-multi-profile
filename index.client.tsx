import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { ManageScreen } from "./client/manage";
import { ProfileField } from "./client/new-workspace";
import { ProfileSidebarView } from "./client/sidebar-view";

function ManageItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Users"
      label="Profiles"
      active={currentScreen?.screenId === "manage"}
      onPress={() => openScreen({ screenId: "manage" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addScreen({ id: "manage", title: "Profiles", Component: ManageScreen }),
    client.addSidebarHeaderItem({ id: "manage", title: "Profiles", Component: ManageItem }),
    client.addSidebarView({
      id: "by-profile",
      title: "Workspaces by profile",
      description: "Group workspaces by profile and show one profile at a time.",
      Component: ProfileSidebarView,
    }),
    client.addNewWorkspaceItem({ id: "profile", Component: ProfileField }),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
