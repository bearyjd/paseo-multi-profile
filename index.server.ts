import type { PluginServerContext } from "@getpaseo/plugin/server";
import { registerProfiles } from "./server/profiles";

export default function contribute(server: PluginServerContext) {
  return registerProfiles(server);
}
