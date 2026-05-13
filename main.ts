import { Notice, Plugin, setIcon } from 'obsidian';
import { SidebarController } from './src/sidebar-controller';
import { HideSidebarsSettingTab } from './src/settings-tab';
import {
	DEFAULT_SETTINGS,
	HideSidebarsSettings,
	MIN_VERTICAL_TRIGGER_HEIGHT,
	SidebarSide,
	THROTTLE_MS,
} from './src/types';

export default class HideSidebarsPlugin extends Plugin {
	settings: HideSidebarsSettings;
	leftController: SidebarController | null = null;
	rightController: SidebarController | null = null;
	leftRibbonIcon: HTMLElement | null = null;
	rightRibbonIcon: HTMLElement | null = null;
	bothRibbonIcon: HTMLElement | null = null;
	lastMouseMoveTime = 0;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.lastMouseMoveTime = 0;

		this.app.workspace.onLayoutReady(() => {
			this.initControllers();
			this.initEvents();
			this.addRibbonIcons();
			this.initializeControllers();
		});

		this.addCommand({
			id: 'toggle-left-sidebar',
			name: 'Toggle left sidebar auto-hide',
			callback: () => {
				this.leftController?.toggle();
			},
		});

		this.addCommand({
			id: 'toggle-right-sidebar',
			name: 'Toggle right sidebar auto-hide',
			callback: () => {
				this.rightController?.toggle();
			},
		});

		this.addCommand({
			id: 'toggle-both-sidebars',
			name: 'Toggle both sidebars auto-hide',
			callback: () => {
				this.toggleBothSidebars();
			},
		});

		this.addCommand({
			id: 'toggle-overlay-mode',
			name: 'Toggle overlay mode',
			callback: async () => {
				await this.setOverlayMode(!this.settings.overlayMode);
			},
		});

		this.addSettingTab(new HideSidebarsSettingTab(this.app, this));
	}

	onunload(): void {
		this.leftController?.cleanup();
		this.rightController?.cleanup();
	}

	initControllers(): void {
		this.leftController = new SidebarController(this.app, 'left', this.settings, this);
		this.rightController = new SidebarController(this.app, 'right', this.settings, this);
	}

	initializeControllers(): void {
		this.leftController?.initializeFromSettings();
		this.rightController?.initializeFromSettings();
		this.updateRibbonIcons();
	}

	addRibbonIcons(): void {
		if (!this.leftController || !this.rightController) return;

		this.leftRibbonIcon = this.addRibbonIcon(
			this.leftController.isActive() ? 'panel-left-close' : 'panel-left-open',
			`Left sidebar: ${this.leftController.isActive() ? 'auto-hide' : 'always show'}`,
			() => {
				this.leftController?.toggle();
			}
		);

		this.rightRibbonIcon = this.addRibbonIcon(
			this.rightController.isActive() ? 'panel-right-close' : 'panel-right-open',
			`Right sidebar: ${this.rightController.isActive() ? 'auto-hide' : 'always show'}`,
			() => {
				this.rightController?.toggle();
			}
		);

		this.bothRibbonIcon = this.addRibbonIcon(
			this.areBothControllersActive() ? 'fold-horizontal' : 'unfold-horizontal',
			`Both sidebars: ${this.areBothControllersActive() ? 'auto-hide' : 'always show'}`,
			() => {
				this.toggleBothSidebars();
			}
		);
	}

	updateRibbonIcons(): void {
		if (this.leftRibbonIcon && this.leftController) {
			const iconName = this.leftController.isActive() ? 'panel-left-close' : 'panel-left-open';
			const tooltip = `Left sidebar: ${this.leftController.isActive() ? 'auto-hide' : 'always show'}`;
			this.leftRibbonIcon.setAttribute('aria-label', tooltip);
			this.leftRibbonIcon.empty();
			setIcon(this.leftRibbonIcon, iconName);
		}

		if (this.rightRibbonIcon && this.rightController) {
			const iconName = this.rightController.isActive() ? 'panel-right-close' : 'panel-right-open';
			const tooltip = `Right sidebar: ${this.rightController.isActive() ? 'auto-hide' : 'always show'}`;
			this.rightRibbonIcon.setAttribute('aria-label', tooltip);
			this.rightRibbonIcon.empty();
			setIcon(this.rightRibbonIcon, iconName);
		}

		if (this.bothRibbonIcon) {
			const bothActive = this.areBothControllersActive();
			const iconName = bothActive ? 'fold-horizontal' : 'unfold-horizontal';
			const tooltip = `Both sidebars: ${bothActive ? 'auto-hide' : 'always show'}`;
			this.bothRibbonIcon.setAttribute('aria-label', tooltip);
			this.bothRibbonIcon.empty();
			setIcon(this.bothRibbonIcon, iconName);
		}
	}

	initEvents(): void {
		this.registerDomEvent(window, 'mousemove', (e: MouseEvent) => {
			const now = Date.now();
			if (now - this.lastMouseMoveTime < THROTTLE_MS) return;
			this.lastMouseMoveTime = now;
			this.handleMouseMove(e);
		});
	}

	handleMouseMove(e: MouseEvent): void {
		const x = e.clientX;
		const y = e.clientY;
		const target = e.target;
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		if (this.leftController?.isActive()) {
			const padding = this.getEffectiveTriggerPadding(this.settings.leftTriggerPadding, windowHeight);
			const inEdgeX = x < this.settings.leftTriggerWidth;
			const inEdgeY = y >= padding && y <= windowHeight - padding;
			const inEdge = inEdgeX && inEdgeY;
			const inSafe = this.isSafeZone('left', target);

			if (inEdge) {
				this.leftController.expand();
			} else if (inSafe) {
				if (this.leftController.isExpanded || this.leftController.containerEl.classList.contains('hide-sidebars-overlay-left')) {
					this.leftController.cancelCollapse();
				}
			} else {
				this.leftController.scheduleCollapse();
			}
		}

		if (this.rightController?.isActive()) {
			const padding = this.getEffectiveTriggerPadding(this.settings.rightTriggerPadding, windowHeight);
			const inEdgeX = x > windowWidth - this.settings.rightTriggerWidth;
			const inEdgeY = y >= padding && y <= windowHeight - padding;
			const inEdge = inEdgeX && inEdgeY;
			const inSafe = this.isSafeZone('right', target);

			if (inEdge) {
				this.rightController.expand();
			} else if (inSafe) {
				if (this.rightController.isExpanded || this.rightController.containerEl.classList.contains('hide-sidebars-overlay-right')) {
					this.rightController.cancelCollapse();
				}
			} else {
				this.rightController.scheduleCollapse();
			}
		}
	}

	isSafeZone(side: SidebarSide, target: EventTarget | null): boolean {
		if (!(target instanceof Element)) return false;
		if (target.closest('.menu') || target.closest('.modal') || target.closest('.popover')) return true;

		if (target.closest('.view-header') || target.closest('.workspace-tab-header-container')) return true;

		if (side === 'left') {
			if (target.closest('.mod-left-split')) return true;
			if (target.closest('.workspace-ribbon.mod-left')) return true;
		} else {
			if (target.closest('.mod-right-split')) return true;
			if (target.closest('.workspace-ribbon.mod-right')) return true;
		}

		return false;
	}

	async setOverlayMode(value: boolean): Promise<void> {
		this.settings.overlayMode = value;
		await this.saveSettings();
		this.leftController?.syncOverlayMode();
		this.rightController?.syncOverlayMode();

		if (this.settings.showNotifications) {
			new Notice(`Overlay mode: ${this.settings.overlayMode ? 'on' : 'off'}`);
		}
	}

	async setSideEnabled(side: SidebarSide, value: boolean): Promise<void> {
		if (side === 'left') {
			this.settings.leftSideEnabled = value;
		} else {
			this.settings.rightSideEnabled = value;
		}

		await this.saveSettings();

		const controller = side === 'left' ? this.leftController : this.rightController;
		if (!controller) return;

		if (value) {
			controller.initializeFromSettings();
		} else {
			controller.restoreNativeState(true);
		}

		this.updateRibbonIcons();
	}

	async loadSettings(): Promise<void> {
		const loadedData: unknown = await this.loadData();
		const loadedSettings = this.isSettingsObject(loadedData) ? loadedData : {};
		this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private toggleBothSidebars(): void {
		const controllers = [this.leftController, this.rightController].filter(
			(controller): controller is SidebarController => controller !== null && controller.isEnabled()
		);
		if (controllers.length === 0) return;

		const anyActive = controllers.some((controller) => controller.isActive());
		for (const controller of controllers) {
			if (anyActive) {
				if (controller.isActive()) controller.toggle();
			} else if (!controller.isActive()) {
				controller.toggle();
			}
		}
	}

	private areBothControllersActive(): boolean {
		return Boolean(this.leftController?.isActive() && this.rightController?.isActive());
	}

	private getEffectiveTriggerPadding(configuredPadding: number, windowHeight: number): number {
		const safePadding = Math.max(0, configuredPadding);
		const maxPadding = Math.max(0, Math.floor((windowHeight - MIN_VERTICAL_TRIGGER_HEIGHT) / 2));
		return Math.min(safePadding, maxPadding);
	}

	private isSettingsObject(value: unknown): value is Partial<HideSidebarsSettings> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}
}
