import { App, Notice } from 'obsidian';
import type { HideSidebarsPluginHost, HideSidebarsSettings, SidebarSide } from './types';

const BASE_OVERLAY_Z_INDEX = 30;
const FRAME_SPACE_MARKER = 'hide-sidebars-frame-space';

interface SidebarSplit {
	collapsed: boolean;
	containerEl: HTMLElement;
	collapse(): void;
	expand(): void;
	setSize?(width: number): void;
}

export class SidebarController {
	private app: App;
	private side: SidebarSide;
	private settings: HideSidebarsSettings;
	private plugin: HideSidebarsPluginHost;
	private collapseTimer: number | null;
	private expandTimer: number | null;

	constructor(app: App, side: SidebarSide, settings: HideSidebarsSettings, plugin: HideSidebarsPluginHost) {
		this.app = app;
		this.side = side;
		this.settings = settings;
		this.plugin = plugin;
		this.collapseTimer = null;
		this.expandTimer = null;
	}

	get split(): SidebarSplit {
		const split = this.side === 'left' ? this.app.workspace.leftSplit : this.app.workspace.rightSplit;
		return split as unknown as SidebarSplit;
	}

	get containerEl(): HTMLElement {
		return this.split.containerEl;
	}

	get isExpanded(): boolean {
		return !this.split.collapsed;
	}

	/** True when the sidebar is actually on screen (expanded and not virtually hidden by overlay mode). */
	get isVisible(): boolean {
		return this.isExpanded && !this.containerEl.classList.contains('hide-sidebars-hidden');
	}

	isEnabled(): boolean {
		return this.side === 'left' ? this.settings.leftSideEnabled : this.settings.rightSideEnabled;
	}

	isActive(): boolean {
		return this.isEnabled() && this.getPluginActiveSetting();
	}

	setActive(active: boolean): void {
		if (this.side === 'left') {
			this.settings.leftPluginActive = active;
		} else {
			this.settings.rightPluginActive = active;
		}

		void this.plugin.saveSettings();

		const state = active ? 'auto-hide' : 'always show';
		if (this.settings.showNotifications) {
			new Notice(`${this.side === 'left' ? 'Left' : 'Right'} sidebar: ${state}`);
		}

		this.plugin.updateRibbonIcons();
	}

	get overlayClass(): string {
		return this.side === 'left' ? 'hide-sidebars-overlay-left' : 'hide-sidebars-overlay-right';
	}

	applyOverlayClass(): void {
		if (this.isActive() && this.settings.overlayMode) {
			this.containerEl.classList.add(this.overlayClass);
			this.applyOverlayLayout();
		}
	}

	removeOverlayClass(): void {
		const wasOverlay = this.containerEl.classList.contains(this.overlayClass);
		this.containerEl.classList.remove('hide-sidebars-overlay-left', 'hide-sidebars-overlay-right');
		if (wasOverlay) {
			this.clearOverlayLayout();
		}
	}

	/**
	 * Called when the mouse enters the edge trigger zone.
	 * Reveals the sidebar after `revealDelay` ms; an already visible sidebar just stays open.
	 */
	requestExpand(): void {
		if (!this.isActive()) return;
		this.cancelCollapse();

		if (this.isVisible) {
			this.cancelExpand();
			return;
		}

		const delay = Math.max(0, this.settings.revealDelay);
		if (delay === 0) {
			this.expand();
			return;
		}

		// Keep the first timer: continued mouse movement inside the zone must not restart the countdown.
		if (this.expandTimer !== null) return;
		this.expandTimer = window.setTimeout(() => {
			this.expandTimer = null;
			this.expand();
		}, delay);
	}

	cancelExpand(): void {
		if (this.expandTimer !== null) {
			window.clearTimeout(this.expandTimer);
			this.expandTimer = null;
		}
	}

	expand(): void {
		if (!this.isActive()) return;

		this.containerEl.classList.add('hide-sidebars-autohide');
		this.containerEl.classList.remove('hide-sidebars-hidden');

		if (this.settings.overlayMode) {
			this.applyOverlayClass();
		} else {
			this.removeOverlayClass();
		}

		if (!this.isExpanded) {
			this.expandSplit();
		}

		this.cancelCollapse();
		this.cancelExpand();
	}

	scheduleCollapse(): void {
		if (!this.isActive()) return;
		if (this.containerEl.classList.contains('hide-sidebars-hidden')) return;
		if (!this.isExpanded) return;

		this.cancelCollapse();
		this.collapseTimer = window.setTimeout(() => {
			this.collapseTimer = null;
			this.collapse();
		}, this.settings.delay);
	}

	cancelCollapse(): void {
		if (this.collapseTimer) {
			window.clearTimeout(this.collapseTimer);
			this.collapseTimer = null;
		}
	}

	collapse(): void {
		if (!this.isActive()) return;

		if (this.settings.overlayMode) {
			this.containerEl.classList.add('hide-sidebars-autohide');
			this.applyOverlayClass();
			if (!this.isExpanded) {
				this.expandSplit();
			}
			this.containerEl.classList.add('hide-sidebars-hidden');
		} else {
			this.containerEl.classList.remove('hide-sidebars-hidden');
			this.removeOverlayClass();

			if (this.isExpanded) {
				this.split.collapse();
			}
		}
	}

	toggle(): void {
		this.cancelCollapse();
		this.cancelExpand();

		if (!this.isEnabled()) {
			this.restoreNativeState(true);
			this.plugin.updateRibbonIcons();
			return;
		}

		const newState = !this.isActive();
		this.setActive(newState);

		if (newState) {
			this.initializeFromSettings();
		} else {
			this.restoreNativeState(true);
		}
	}

	initializeFromSettings(): void {
		this.cancelCollapse();
		this.cancelExpand();

		if (!this.isActive()) {
			this.cleanup();
			return;
		}

		this.containerEl.classList.add('hide-sidebars-autohide');
		this.containerEl.classList.remove('hide-sidebars-hidden');

		if (this.settings.overlayMode) {
			if (!this.isExpanded) {
				this.expandSplit();
			}
			this.applyOverlayClass();
			this.containerEl.classList.add('hide-sidebars-hidden');
		} else {
			this.removeOverlayClass();
			if (this.isExpanded) {
				this.split.collapse();
			}
		}
	}

	syncOverlayMode(): void {
		this.cancelCollapse();
		this.cancelExpand();

		if (!this.isActive()) {
			this.containerEl.classList.remove('hide-sidebars-hidden');
			this.removeOverlayClass();
			return;
		}

		const wasVisuallyHidden = this.containerEl.classList.contains('hide-sidebars-hidden') || !this.isExpanded;
		this.containerEl.classList.add('hide-sidebars-autohide');

		if (this.settings.overlayMode) {
			if (!this.isExpanded) {
				this.expandSplit();
			}
			this.applyOverlayClass();
			this.containerEl.classList.toggle('hide-sidebars-hidden', wasVisuallyHidden);
		} else {
			this.containerEl.classList.remove('hide-sidebars-hidden');
			this.removeOverlayClass();
			if (wasVisuallyHidden && this.isExpanded) {
				this.split.collapse();
			}
		}
	}

	restoreNativeState(expandSidebar: boolean): void {
		this.cancelCollapse();
		this.cancelExpand();
		this.containerEl.classList.remove('hide-sidebars-autohide', 'hide-sidebars-hidden');
		this.removeOverlayClass();

		if (expandSidebar && !this.isExpanded) {
			this.split.expand();
		}
	}

	cleanup(): void {
		this.restoreNativeState(false);
	}

	private getPluginActiveSetting(): boolean {
		return this.side === 'left' ? this.settings.leftPluginActive : this.settings.rightPluginActive;
	}

	private getConfiguredWidth(): number {
		return this.side === 'left' ? this.settings.leftSidebarWidth : this.settings.rightSidebarWidth;
	}

	/**
	 * Overlay layout is written as inline styles on purpose: themes and Obsidian's
	 * frameless-window rules target the sidebar with selectors of varying strength,
	 * and inline styles beat all of them without resorting to !important.
	 * The values are dynamic anyway (the offset depends on the ribbon's current width).
	 */
	private applyOverlayLayout(): void {
		const parent = this.containerEl.parentElement;
		parent?.classList.add('hide-sidebars-overlay-host');

		const offset = `${this.getRibbonOffset(parent)}px`;
		this.updateRootFrameSpace(true);
		this.containerEl.setCssStyles({
			position: 'absolute',
			top: '0',
			bottom: '0',
			left: this.side === 'left' ? offset : '',
			right: this.side === 'right' ? offset : '',
			height: 'auto',
			zIndex: String(this.getOverlayZIndex(parent)),
			// Soft edge style paints a gradient wider than the sidebar; let it overflow.
			overflow: this.settings.overlayStyle === 'soft' ? 'visible' : '',
		});
	}

	/** Re-apply overlay layout after Obsidian changes the workspace (layout change, window resize). */
	refreshOverlayLayout(): void {
		if (this.containerEl.classList.contains(this.overlayClass)) {
			this.applyOverlayLayout();
		}
	}

	private clearOverlayLayout(): void {
		this.updateRootFrameSpace(false);
		this.containerEl.setCssStyles({
			position: '',
			top: '',
			bottom: '',
			left: '',
			right: '',
			height: '',
			zIndex: '',
			overflow: '',
		});

		const parent = this.containerEl.parentElement;
		if (parent && !parent.querySelector(':scope > .hide-sidebars-overlay-left, :scope > .hide-sidebars-overlay-right')) {
			parent.classList.remove('hide-sidebars-overlay-host');
		}
	}

	/**
	 * Stack above the main area's tab bar. Some setups (macOS frameless window, card-style themes)
	 * give that tab bar its own z-index; with an equal value the left sidebar, which comes first in
	 * the DOM, would be painted underneath it.
	 */
	private getOverlayZIndex(parent: HTMLElement | null): number {
		let max = BASE_OVERLAY_Z_INDEX - 1;
		const candidates = parent?.querySelectorAll<HTMLElement>(
			':scope > .mod-root, :scope > .mod-root .workspace-tab-header-container'
		) ?? [];

		for (const el of Array.from(candidates)) {
			const z = parseInt(getComputedStyle(el).zIndex, 10);
			if (!isNaN(z)) max = Math.max(max, z);
		}

		return max + 1;
	}

	/**
	 * macOS frameless window: Obsidian moves the traffic-light spacing (`mod-top-left-space`) to the
	 * main area's top-left tab group only when the left sidebar is natively collapsed. In overlay mode
	 * the sidebar stays natively expanded, so add that spacing ourselves, otherwise the main tabs
	 * end up under the window buttons while the sidebar is hidden.
	 */
	private updateRootFrameSpace(enable: boolean): void {
		if (this.side !== 'left') return;

		const root = this.app.workspace.rootSplit as unknown as { containerEl?: HTMLElement };
		const rootEl = root.containerEl;
		if (!rootEl) return;

		for (const el of Array.from(rootEl.querySelectorAll<HTMLElement>(`.${FRAME_SPACE_MARKER}`))) {
			el.classList.remove(FRAME_SPACE_MARKER, 'mod-top-left-space');
		}

		if (!enable) return;

		let leftmost: HTMLElement | null = null;
		let leftmostX = Infinity;
		for (const tabs of Array.from(rootEl.querySelectorAll<HTMLElement>('.workspace-tabs.mod-top'))) {
			const x = tabs.getBoundingClientRect().left;
			if (x < leftmostX) {
				leftmostX = x;
				leftmost = tabs;
			}
		}

		// Already spaced by Obsidian itself: leave it alone so we never remove a native class.
		if (!leftmost || leftmost.classList.contains('mod-top-left-space')) return;
		leftmost.classList.add('mod-top-left-space', FRAME_SPACE_MARKER);
	}

	/** Width of the visible ribbon on this side (0 when the ribbon is hidden or absent). */
	private getRibbonOffset(parent: HTMLElement | null): number {
		const ribbon = parent?.querySelector<HTMLElement>(`:scope > .workspace-ribbon.mod-${this.side}`);
		if (!parent || !ribbon) return 0;

		const parentRect = parent.getBoundingClientRect();
		const ribbonRect = ribbon.getBoundingClientRect();
		if (ribbonRect.width <= 0) return 0;

		const offset = this.side === 'left'
			? ribbonRect.right - parentRect.left
			: parentRect.right - ribbonRect.left;
		return Math.max(0, Math.round(offset));
	}

	private expandSplit(): void {
		const width = this.getConfiguredWidth();
		if (Number.isFinite(width) && width > 0) {
			this.split.setSize?.(width);
		}
		this.split.expand();
	}
}
