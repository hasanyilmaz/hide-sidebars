import { App, PluginSettingTab, Setting } from 'obsidian';
import type HideSidebarsPlugin from '../main';
import { MAX_DELAY_MS } from './types';

type SidebarSettingSide = 'left' | 'right';

export class HideSidebarsSettingTab extends PluginSettingTab {
	plugin: HideSidebarsPlugin;

	constructor(app: App, plugin: HideSidebarsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Usage').setHeading();

		const helpDiv = containerEl.createDiv({ cls: 'setting-item-description' });
		helpDiv.createEl('p', { text: 'Use the ribbon icons or command palette to control each sidebar.' });
		const helpList = helpDiv.createEl('ul');
		helpList.createEl('li', { text: 'Auto-hide mode reveals a sidebar when the mouse reaches the matching screen edge.' });
		helpList.createEl('li', { text: 'Always show mode restores Obsidian native sidebar behavior.' });
		helpList.createEl('li', { text: 'Overlay mode floats sidebars over the editor instead of pushing content.' });

		new Setting(containerEl).setName('Behavior').setHeading();

		new Setting(containerEl)
			.setName('Overlay mode')
			.setDesc('When enabled, sidebars float over content. When disabled, they push content.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.overlayMode)
				.onChange(async (value) => {
					await this.plugin.setOverlayMode(value);
				}));

		new Setting(containerEl)
			.setName('Show notifications')
			.setDesc('Show notification popups when switching between auto-hide and always show modes.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Transition delay (ms)')
			.setDesc(`Delay before a sidebar collapses after the mouse leaves (0-${MAX_DELAY_MS}ms, default: 50ms).`)
			.addSlider((slider) => slider
				.setLimits(0, MAX_DELAY_MS, 25)
				.setValue(this.plugin.settings.delay)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.delay = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Left sidebar').setHeading();

		this.createModeDescription('left');

		new Setting(containerEl)
			.setName('Enable left sidebar')
			.setDesc('Enable auto-hide functionality for the left sidebar.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.leftSideEnabled)
				.onChange(async (value) => {
					await this.plugin.setSideEnabled('left', value);
				}));

		new Setting(containerEl)
			.setName('Left sidebar width (px)')
			.setDesc('Width of the left sidebar when expanded (default: 252px).')
			.addText((text) => text
				.setPlaceholder('252')
				.setValue(String(this.plugin.settings.leftSidebarWidth))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.leftSidebarWidth = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Left trigger zone width (px)')
			.setDesc('Width of the hover trigger zone at the left edge of the screen (default: 50px).')
			.addText((text) => text
				.setPlaceholder('50')
				.setValue(String(this.plugin.settings.leftTriggerWidth))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.leftTriggerWidth = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Left trigger vertical padding (px)')
			.setDesc('Blank space from top and bottom of screen where trigger is inactive (default: 100px).')
			.addText((text) => text
				.setPlaceholder('100')
				.setValue(String(this.plugin.settings.leftTriggerPadding))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num >= 0) {
						this.plugin.settings.leftTriggerPadding = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl).setName('Right sidebar').setHeading();

		this.createModeDescription('right');

		new Setting(containerEl)
			.setName('Enable right sidebar')
			.setDesc('Enable auto-hide functionality for the right sidebar.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.rightSideEnabled)
				.onChange(async (value) => {
					await this.plugin.setSideEnabled('right', value);
				}));

		new Setting(containerEl)
			.setName('Right sidebar width (px)')
			.setDesc('Width of the right sidebar when expanded (default: 252px).')
			.addText((text) => text
				.setPlaceholder('252')
				.setValue(String(this.plugin.settings.rightSidebarWidth))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.rightSidebarWidth = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Right trigger zone width (px)')
			.setDesc('Width of the hover trigger zone at the right edge of the screen (default: 50px).')
			.addText((text) => text
				.setPlaceholder('50')
				.setValue(String(this.plugin.settings.rightTriggerWidth))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.rightTriggerWidth = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Right trigger vertical padding (px)')
			.setDesc('Blank space from top and bottom of screen where trigger is inactive (default: 100px).')
			.addText((text) => text
				.setPlaceholder('100')
				.setValue(String(this.plugin.settings.rightTriggerPadding))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num >= 0) {
						this.plugin.settings.rightTriggerPadding = num;
						await this.plugin.saveSettings();
					}
				}));
	}

	private createModeDescription(side: SidebarSettingSide): void {
		const modeDiv = this.containerEl.createDiv({ cls: 'setting-item-description' });
		modeDiv.createSpan({ text: 'Current mode: ' });
		modeDiv.createEl('strong', { text: this.getModeLabel(side) });
	}

	private getModeLabel(side: SidebarSettingSide): string {
		const isAutoHide = side === 'left'
			? this.plugin.leftController?.isActive()
			: this.plugin.rightController?.isActive();
		return isAutoHide ? 'Auto-hide' : 'Always show';
	}
}
