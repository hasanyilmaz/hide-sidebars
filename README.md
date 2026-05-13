# Hide Sidebars

Hide Sidebars adds independent auto-hide controls for Obsidian's left and right sidebars.

It is built for desktop vaults where you want more writing space without losing quick access to the file explorer, search, backlinks, outline, or other sidebar panes.

## Features

- Toggle auto-hide separately for the left sidebar, right sidebar, or both sidebars.
- Reveal sidebars by moving the mouse to the matching screen edge.
- Use overlay mode to float sidebars over the editor instead of resizing the workspace.
- Configure sidebar width, trigger zone width, vertical trigger padding, and collapse delay.
- Control the plugin from ribbon icons, the command palette, or the plugin settings tab.
- Clean up plugin-applied sidebar classes automatically when the plugin is disabled.

## Compatibility

- Obsidian `1.0.0` or newer.
- Desktop only.

## Installation

### Manual installation

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest GitHub release.
2. Create this folder in your vault if it does not already exist:

```text
<vault>/.obsidian/plugins/hide-sidebars/
```

3. Copy the three downloaded files into that folder.
4. Reload Obsidian.
5. Enable **Hide Sidebars** from **Settings -> Community plugins**.

## Usage

Hide Sidebars adds three ribbon icons:

- Left sidebar: toggles auto-hide for the left sidebar.
- Right sidebar: toggles auto-hide for the right sidebar.
- Both sidebars: toggles auto-hide for both enabled sidebars together.

When auto-hide is enabled, move the mouse to the matching screen edge to reveal the sidebar. Move the mouse away from the sidebar to let it collapse again.

The command palette also includes:

- Toggle left sidebar auto-hide
- Toggle right sidebar auto-hide
- Toggle both sidebars auto-hide
- Toggle overlay mode

## Settings

- **Overlay mode**: Float sidebars over the editor instead of pushing content aside.
- **Show notifications**: Show a short notice when changing sidebar modes.
- **Transition delay**: Delay before a sidebar collapses after the mouse leaves.
- **Sidebar width**: Width used when expanding each sidebar.
- **Trigger zone width**: Width of the hover area at the screen edge.
- **Trigger vertical padding**: Top and bottom screen areas where edge hover does not trigger the sidebar.
