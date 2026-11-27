import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/** Workspaces carry one label of the form `profile:<id>` to belong to a profile. */
export const PROFILE_LABEL_PREFIX = "profile:";
/** Workspace metadata key the New workspace field writes; the daemon turns it into a label. */
export const PROFILE_METADATA_KEY = "multi-profile.id";
/** Sentinel for the "show everything" and "no profile" views. */
export const ALL_PROFILES = "__all__";
export const UNASSIGNED = "__unassigned__";

export const ProfileSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  name: z.string().min(1),
  /** Lucide icon name shown beside the profile. */
  icon: z.string().default("User"),
  /** Optional separation of credentials: injected into every agent opened in this profile's workspaces. */
  env: z.record(z.string(), z.string()).default({}),
  /** Optional: only inject env for these providers (e.g. "claude"). Empty means all. */
  envProviders: z.array(z.string()).default([]),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Shared with the daemon: the list of profiles. */
export const profilesSettings = defineSettings({
  id: "profiles",
  scope: "host",
  version: 1,
  schema: z.object({
    profiles: z.array(ProfileSchema).default([
      { id: "home", name: "Home", icon: "House", env: {}, envProviders: [] },
      { id: "work", name: "Work", icon: "Briefcase", env: {}, envProviders: [] },
    ]),
  }),
});

/** Which profile this device is looking at. Per device, so a phone can stay on work. */
export const activeSettings = defineSettings({
  id: "active",
  scope: "device",
  version: 1,
  schema: z.object({
    active: z.string().default(ALL_PROFILES),
    showUnassigned: z.boolean().default(true),
    /** Collapsed tree nodes, e.g. `p:work` or `g:work:<projectKey>`. */
    collapsed: z.array(z.string()).default([]),
  }),
});

export function profileLabel(id: string): string {
  return `${PROFILE_LABEL_PREFIX}${id}`;
}

/** The profile id a workspace belongs to, or null. */
export function profileOf(labels: readonly string[]): string | null {
  const found = labels.find((label) => label.startsWith(PROFILE_LABEL_PREFIX));
  return found ? found.slice(PROFILE_LABEL_PREFIX.length) : null;
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(slug) ? slug : `p-${slug || "profile"}`;
}

/** Parse `KEY=value` lines. Blank lines and `#` comments are ignored. */
export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    env[key] = line.slice(eq + 1).trim();
  }
  return env;
}

export function formatEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}
