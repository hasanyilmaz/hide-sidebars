export type SidebarSide = 'left' | 'right';

export interface HideSidebarsSettings {
	leftSidebarWidth: number;
	rightSidebarWidth: number;
	leftSideEnabled: boolean;
	rightSideEnabled: boolean;
	leftTriggerWidth: number;
	rightTriggerWidth: number;
	leftTriggerPadding: number;
	rightTriggerPadding: number;
	overlayMode: boolean;
	delay: number;
	showNotifications: boolean;
	leftPluginActive: boolean;
	rightPluginActive: boolean;
}

export interface HideSidebarsPluginHost {
	settings: HideSidebarsSettings;
	saveSettings(): Promise<void>;
	updateRibbonIcons(): void;
}

export const DEFAULT_SETTINGS: HideSidebarsSettings = {
	leftSidebarWidth: 252,
	rightSidebarWidth: 252,
	leftSideEnabled: true,
	rightSideEnabled: true,
	leftTriggerWidth: 50,
	rightTriggerWidth: 50,
	leftTriggerPadding: 100,
	rightTriggerPadding: 100,
	overlayMode: false,
	delay: 50,
	showNotifications: false,
	leftPluginActive: true,
	rightPluginActive: true,
};

export const MAX_DELAY_MS = 5000;
export const THROTTLE_MS = 16;
export const MIN_VERTICAL_TRIGGER_HEIGHT = 50;
