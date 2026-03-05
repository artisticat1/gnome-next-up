"use strict";

import Adw from "gi://Adw";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import {
  normalizeRefreshIntervalSettings,
  normalizeStatusHighlightSettings,
} from "./src/prefs/normalization.js";
import { buildTopPanelSection } from "./src/prefs/sections/top-panel.js";
import { buildDesktopBackgroundSection } from "./src/prefs/sections/desktop-background.js";
import { buildLockScreenSection } from "./src/prefs/sections/lock-screen.js";
import { buildColorsSection } from "./src/prefs/sections/colors.js";
import { buildDeveloperSection } from "./src/prefs/sections/developer.js";

export default class NextUpExtensionPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    normalizeRefreshIntervalSettings(settings);
    normalizeStatusHighlightSettings(settings);

    const page = new Adw.PreferencesPage();
    const topPaneGroup = new Adw.PreferencesGroup({ title: "Top Panel" });
    const desktopBackgroundGroup = new Adw.PreferencesGroup({
      title: "Desktop Background",
    });
    const lockScreenGroup = new Adw.PreferencesGroup({
      title: "Lock Screen (experemental)",
    });
    const colorsGroup = new Adw.PreferencesGroup({ title: "Colors" });
    const developerGroup = new Adw.PreferencesGroup({ title: "Developer" });

    page.add(topPaneGroup);
    page.add(desktopBackgroundGroup);
    page.add(lockScreenGroup);
    page.add(colorsGroup);
    page.add(developerGroup);

    buildTopPanelSection(settings, topPaneGroup);
    buildDesktopBackgroundSection(settings, desktopBackgroundGroup);
    buildLockScreenSection(settings, lockScreenGroup);
    buildColorsSection(settings, colorsGroup);
    buildDeveloperSection(settings, developerGroup);

    window.add(page);
  }
}
