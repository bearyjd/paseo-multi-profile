import { useNewWorkspace, useSettings } from "@getpaseo/plugin/client";
import { Select } from "@getpaseo/plugin/client/ui";
import { useEffect, useRef } from "react";
import { ALL_PROFILES, PROFILE_METADATA_KEY, activeSettings, profilesSettings } from "../shared/profiles";

/** Pre-selects the device's active profile and lets the user change it before creating. */
export function ProfileField() {
  const newWorkspace = useNewWorkspace();
  const profiles = useSettings(profilesSettings);
  const active = useSettings(activeSettings);
  const seeded = useRef(false);
  const chosen = newWorkspace.metadata[PROFILE_METADATA_KEY];

  useEffect(() => {
    if (seeded.current || active.status !== "ready" || profiles.status !== "ready") return;
    seeded.current = true;
    const id = active.values.active;
    if (id !== ALL_PROFILES && profiles.values.profiles.some((profile) => profile.id === id)) {
      void newWorkspace.setMetadata({ [PROFILE_METADATA_KEY]: id }).catch(() => {});
    }
  }, [active, profiles, newWorkspace]);

  if (profiles.status !== "ready") return null;
  const options = [
    { value: "", label: "No profile" },
    ...profiles.values.profiles.map((profile) => ({ value: profile.id, label: profile.name })),
  ];
  return (
    <Select
      title="Profile"
      icon="Users"
      value={typeof chosen === "string" ? chosen : ""}
      options={options}
      onValueChange={({ value }) => newWorkspace.setMetadata({ [PROFILE_METADATA_KEY]: value || null })}
    />
  );
}
