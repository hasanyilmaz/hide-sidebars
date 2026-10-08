# Changelog

All notable changes to the Hide Sidebars plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-10-08

### Added

- Overlay style setting: *Soft edge* option, inspired by the Cupertino theme's hover sidebar (gradient fade into the editor, slide-in animation).
- Reveal delay setting: the mouse must stay at the screen edge for the configured time before a sidebar appears.

### Fixed

- Overlay mode: the sidebar now floats over the editor instead of keeping its space in the layout.
- Overlay mode: sidebar content no longer gets pushed into the lower half of the window (the resize handle was turned into a normal block element).
- Overlay mode: the left sidebar now lines up with the ribbon's actual width, and with the window edge when the ribbon is hidden.
- Overlay mode: layout is applied as inline styles so theme or frameless-window rules can no longer keep the sidebar in the layout; the floating sidebar gets an opaque backdrop that survives translucent window mode.
- Overlay mode (macOS frameless window): the left sidebar now stacks above the main tab bar, and the main tabs keep clear of the window buttons while the sidebar is hidden.

## [1.0.1] - 2026-05-13

### Fixed

- Removed scorecard-flagged `!important` declarations from sidebar styling while preserving the macOS frameless window layout fix.

## [1.0.0] - 2026-05-13

### Added

- First public release of Hide Sidebars.
- Independent auto-hide controls for the left and right Obsidian sidebars.
- Ribbon buttons and command palette actions for toggling each sidebar, both sidebars, and overlay mode.
- Edge-triggered reveal zones with configurable width, vertical padding, sidebar width, and collapse delay.
- Optional overlay mode that floats sidebars over the editor instead of pushing content.
- Theme-conscious styling and automatic cleanup when the plugin is disabled.
