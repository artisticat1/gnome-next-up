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
    const lockScreenGroup = new Adw.PreferencesGroup({ title: "Lock Screen" });
    const colorsGroup = new Adw.PreferencesGroup({ title: "Colors" });

    page.add(topPaneGroup);
    page.add(desktopBackgroundGroup);
    page.add(lockScreenGroup);
    page.add(colorsGroup);

    buildTopPanelSection(settings, topPaneGroup);
    buildDesktopBackgroundSection(settings, desktopBackgroundGroup);
    buildLockScreenSection(settings, lockScreenGroup);
    buildColorsSection(settings, colorsGroup);

    window.add(page);
  }
}
