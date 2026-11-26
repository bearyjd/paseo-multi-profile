import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  PROFILE_METADATA_KEY,
  profileLabel,
  profileOf,
  profilesSettings,
} from "../shared/profiles";

export function registerProfiles(server: PluginServerContext) {
  const settings = server.registerSettings(profilesSettings);

  async function profileById(id: string) {
    const state = await settings.read();
    if (state.status !== "ready") return null;
    return state.values.profiles.find((profile) => profile.id === id) ?? null;
  }

  // A workspace created from the New workspace screen carries the chosen profile in metadata;
  // the client reads labels, so convert it once, after creation.
  const removeCreate = server.addHook("workspace.create.after", async ({ workspace }, { paseo }) => {
    const chosen = workspace.metadata[PROFILE_METADATA_KEY];
    if (typeof chosen !== "string" || !chosen) return;
    await paseo.workspaces.ref(workspace.id).setLabel(profileLabel(chosen), { assigned: true });
  });

  // Optional credential separation: inject the profile's env into every agent launch.
  const removeOpen = server.addHook("agent.open.before", async ({ request }, { paseo }) => {
    if (!request.workspaceId) return;
    const workspace = await paseo.workspaces.ref(request.workspaceId).refresh();
    const id = profileOf(workspace?.labels ?? []);
    if (!id) return;
    const profile = await profileById(id);
    if (!profile || Object.keys(profile.env).length === 0) return;
    if (profile.envProviders.length > 0 && !profile.envProviders.includes(request.provider)) return;
    return { ...request, env: { ...request.env, ...profile.env } };
  });

  return () => {
    removeCreate();
    removeOpen();
  };
}
