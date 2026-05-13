import { App, Notice } from 'obsidian';
import type { HideSidebarsPluginHost, HideSidebarsSettings, SidebarSide } from './types';

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

	constructor(app: App, side: SidebarSide, settings: HideSidebarsSettings, plugin: HideSidebarsPluginHost) {
		this.app = app;
		this.side = side;
		this.settings = settings;
		this.plugin = plugin;
		this.collapseTimer = null;
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
		}
	}

	removeOverlayClass(): void {
		this.containerEl.classList.remove('hide-sidebars-overlay-left', 'hide-sidebars-overlay-right');
	}

	expand(): void {
		if (!this.isActive()) return;

		this.containerEl.classList.add('hide-sidebars-autohide');
		this.containerEl.classList.remove('hide-sidebars-hidden');

		if (this.settings.overlayMode) {
			this.containerEl.classList.add(this.overlayClass);
		} else {
			this.removeOverlayClass();
		}

		if (!this.isExpanded) {
			this.expandSplit();
		}

		this.cancelCollapse();
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

	private expandSplit(): void {
		const width = this.getConfiguredWidth();
		if (Number.isFinite(width) && width > 0) {
			this.split.setSize?.(width);
		}
		this.split.expand();
	}
}
