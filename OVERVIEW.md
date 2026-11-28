Keeps workspaces for different parts of your life apart on one Paseo daemon, for example a home profile and a work profile. Every profile uses the same providers and models. Only the workspaces are separated.

Each workspace belongs to one profile. A new sidebar view, "Workspaces by profile", shows workspaces as a collapsible tree: profile, then project, then workspace. A switcher at the top shows one profile at a time or all of them. The switcher choice and which branches are collapsed are stored per device, so your phone can stay on work while your laptop shows home. Workspaces without a profile appear under Unassigned until you move them, and workspaces with no agents yet are grouped under "No agents yet" so they stay visible.

Right click a workspace, or long press it on a touch screen, to move it to another profile or archive it. Archiving asks for a second tap. Right click or long press a project to start a new workspace in it.

## Setup

Turn the view on under Settings > Sidebar > Sidebar view. Add, rename, reorder by dragging, and remove profiles from the Profiles item in the sidebar header. The same screen lists every workspace so you can assign each one. Two profiles, Home and Work, exist by default. The New workspace screen gets a Profile field that starts on the profile your device is viewing.

Requires Paseo 0.17.4 or later.

## Optional environment per profile

A profile can hold environment variables, such as a different API key for work. They are added to every agent started in that profile's workspaces, optionally only for the providers you list. The values are passed to the agent provider process for those sessions, so any program that process runs can read them. They are stored unencrypted in the daemon's plugin settings on the host, and clients connected to the daemon can read them on the Profiles screen. Use this for convenience, not as a secret vault.

The plugin sends nothing to any other service and downloads nothing.

## Limits

Profiles are a view and a label, not access control. Anyone who can reach the daemon can still open any workspace, and the "All" view shows everything. Profile membership is kept as a `profile:<id>` label on the workspace. Environment changes apply the next time an agent session opens.
