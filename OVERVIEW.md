Keeps workspaces for different parts of your life apart on one Paseo daemon, for example a home profile and a work profile. Every profile uses the same providers and models. Only the workspaces are separated.

Each workspace belongs to one profile. A new sidebar view, "Workspaces by profile", groups workspaces by profile and has a switcher to show one profile at a time or all of them. The switcher choice is stored per device, so your phone can stay on work while your laptop shows home. Workspaces without a profile appear under Unassigned until you move them.

## Setup

Turn the view on under Settings > Sidebar > Sidebar view. Add, remove and edit profiles from the Profiles item in the sidebar header. Two profiles, Home and Work, exist by default. The New workspace screen gets a Profile field that starts on the profile your device is viewing.

Requires Paseo 0.17.4 or later.

## Optional environment per profile

A profile can hold environment variables, such as a different API key for work. They are added to every agent started in that profile's workspaces, optionally only for the providers you list. Values are stored unencrypted in the daemon's plugin settings, so use this for convenience, not as a secret vault.

## Limits

Profiles are a view and a label, not access control. Anyone who can reach the daemon can still open any workspace, and the "All" view shows everything. Profile membership is kept as a `profile:<id>` label on the workspace. Environment changes apply the next time an agent session opens.
