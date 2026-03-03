/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import Indicator from "./src/indicator.js";
import * as DateHelperFunctions from "./src/date.js";
import Gio from "gi://Gio";

const IndicatorInstance = GObject.registerClass(Indicator);
const REFRESH_INTERVAL_UNIT = {
  SECONDS: 0,
  MINUTES: 1,
};
const MIN_REFRESH_INTERVAL_VALUE = 1;
const MAX_REFRESH_INTERVAL_VALUE = 60;
const THRESHOLD_UNIT = {
  MINUTES: 0,
  HOURS: 1,
};
const MIN_STATUS_THRESHOLD_VALUE = 1;
const MAX_STATUS_THRESHOLD_VALUE = 9999;
const DEFAULT_COMING_UP_COLOR = "yellow";
const DEFAULT_STARTING_SOON_COLOR = "red";
const DESKTOP_HORIZONTAL_ALIGN = {
  LEFT: 0,
  RIGHT: 1,
};
const DESKTOP_VERTICAL_ALIGN = {
  TOP: 0,
  BOTTOM: 1,
};
const DESKTOP_LABEL_MARGIN = 24;
const MIN_DESKTOP_EVENTS_TO_SHOW = 1;
const MAX_DESKTOP_EVENTS_TO_SHOW = 6;
const DEFAULT_DESKTOP_EVENTS_TO_SHOW = 1;
const MIN_FONT_SIZE_PX = 8;
const MAX_FONT_SIZE_PX = 72;
const DEFAULT_LOCK_SCREEN_FONT_SIZE = 14;
const DEFAULT_DESKTOP_FONT_SIZE = 14;
const LOCK_SCREEN_DEBUG_REVISION = "lockscreen-debug-r3";
const DEBUG_LOCK_SCREEN_ENV = "NEXT_UP_DEBUG_LOCK_SCREEN";
const SENSITIVE_DEBUG_KEY_PATTERN = /(text|preview|summary)/i;
const REDACTED_LOG_VALUE = "[redacted]";
const INDICATOR_TIMING_STATE = {
  NONE: "none",
  COMING_UP: "coming-up",
  STARTING_SOON: "starting-soon",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default class NextUpExtension extends Extension {
  enable() {
    this._extensionRevision = LOCK_SCREEN_DEBUG_REVISION;
    this._debugLogsEnabled = GLib.getenv(DEBUG_LOCK_SCREEN_ENV) === "1";
    this._indicator = new IndicatorInstance({
      confettiGicon: Gio.icon_new_for_string(
        this.path + "/assets/party-popper.png"
      ),
      openPrefsCallback: this.openPreferences.bind(this),
    });

    this._settings = this.getSettings();
    this._normalizeRefreshIntervalSettings();
    this._normalizeStatusHighlightSettings();
    this._currentIndicatorText = "";
    this._currentDesktopText = "";
    this._whichPanelChangedSignal = this._settings.connect(
      "changed::which-panel",
      () => {
        this.unloadIndicator();
        this.loadIndicator();
      }
    );
    this._eventLookaheadChangedSignal = this._settings.connect(
      "changed::event-lookahead",
      () => this.refreshIndicator()
    );
    this._showOnlyTimerChangedSignal = this._settings.connect(
      "changed::show-only-timer",
      () => this.refreshIndicator()
    );
    this._refreshIntervalValueChangedSignal = this._settings.connect(
      "changed::refresh-interval-value",
      () => this._restartLoop()
    );
    this._refreshIntervalUnitChangedSignal = this._settings.connect(
      "changed::refresh-interval-unit",
      () => this._restartLoop()
    );
    this._comingUpColorChangedSignal = this._settings.connect(
      "changed::coming-up-color",
      () => this.refreshIndicator()
    );
    this._comingUpThresholdValueChangedSignal = this._settings.connect(
      "changed::coming-up-threshold-value",
      () => this.refreshIndicator()
    );
    this._comingUpThresholdUnitChangedSignal = this._settings.connect(
      "changed::coming-up-threshold-unit",
      () => this.refreshIndicator()
    );
    this._startingSoonColorChangedSignal = this._settings.connect(
      "changed::starting-soon-color",
      () => this.refreshIndicator()
    );
    this._startingSoonThresholdValueChangedSignal = this._settings.connect(
      "changed::starting-soon-threshold-value",
      () => this.refreshIndicator()
    );
    this._startingSoonThresholdUnitChangedSignal = this._settings.connect(
      "changed::starting-soon-threshold-unit",
      () => this.refreshIndicator()
    );
    this._showOnLockScreenChangedSignal = this._settings.connect(
      "changed::show-on-lock-screen",
      () => {
        this._debugLockScreen("Setting changed: show-on-lock-screen", {
          enabled: this._settings.get_boolean("show-on-lock-screen"),
        });
        this.refreshIndicator();
      }
    );
    this._showOnDesktopChangedSignal = this._settings.connect(
      "changed::show-on-desktop",
      () => this.refreshIndicator()
    );
    this._desktopEventsToShowChangedSignal = this._settings.connect(
      "changed::desktop-events-to-show",
      () => this.refreshIndicator()
    );
    this._desktopHorizontalAlignChangedSignal = this._settings.connect(
      "changed::desktop-horizontal-align",
      () => this._setDesktopMessage(this._getCurrentDesktopText())
    );
    this._desktopVerticalAlignChangedSignal = this._settings.connect(
      "changed::desktop-vertical-align",
      () => this._setDesktopMessage(this._getCurrentDesktopText())
    );
    this._lockScreenFontSizeChangedSignal = this._settings.connect(
      "changed::lock-screen-font-size",
      () => this._setLockScreenMessage(this._getCurrentIndicatorText())
    );
    this._desktopFontSizeChangedSignal = this._settings.connect(
      "changed::desktop-font-size",
      () => this._setDesktopMessage(this._getCurrentDesktopText())
    );
    this._lockScreenActiveChangedSignal = Main.screenShield.connect(
      "active-changed",
      () => {
        this._debugLockScreen("screenShield active-changed", {
          active: Main.screenShield?.active ?? null,
        });
        this.refreshIndicator();
      }
    );
    this._lockScreenLockedChangedSignal = Main.screenShield.connect(
      "locked-changed",
      () => {
        this._debugLockScreen("screenShield locked-changed", {
          locked: Main.screenShield?.locked ?? null,
        });
        this.refreshIndicator();
      }
    );
    this._calendarSourceChangedSignal = this._indicator._calendarSource.connect(
      "changed",
      () => this.refreshIndicator()
    );
    this._monitorsChangedSignal = Main.layoutManager.connect(
      "monitors-changed",
      () => this._repositionDesktopMessageLabel()
    );

    // Wait 3 seconds before loading the indicator
    // So that it isn't loaded too early and positioned after other elements in the panel
    this.delaySourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      3,
      () => {
        this._debugLockScreen("Initial delayed load fired", {
          showOnLockScreen: this._settings.get_boolean("show-on-lock-screen"),
          active: Main.screenShield?.active ?? null,
          locked: Main.screenShield?.locked ?? null,
          hasDialog: Boolean(this._getLockScreenDialog()),
        });
        this.loadIndicator();
        this._startLoop();
        this.refreshIndicator();
        this.delaySourceId = null;

        return false;
      }
    );

    this._debugLockScreen("Extension enabled", {
      revision: this._extensionRevision,
    });
  }

  _startLoop() {
    const refreshIntervalInSeconds = this._getRefreshIntervalInSeconds();

    this.sourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      refreshIntervalInSeconds,
      () => {
        this.refreshIndicator();

        return GLib.SOURCE_CONTINUE;
      }
    );
  }

  _stopLoop() {
    if (this.sourceId) {
      GLib.Source.remove(this.sourceId);
      this.sourceId = null;
    }
  }

  _restartLoop() {
    this._stopLoop();
    this.refreshIndicator();
    this._startLoop();
  }

  _getRefreshIntervalInSeconds() {
    const value = Math.max(
      MIN_REFRESH_INTERVAL_VALUE,
      Math.min(
        MAX_REFRESH_INTERVAL_VALUE,
        this._settings.get_int("refresh-interval-value")
      )
    );
    const unit = this._settings.get_int("refresh-interval-unit");

    switch (unit) {
      case REFRESH_INTERVAL_UNIT.MINUTES:
        return value * 60;
      case REFRESH_INTERVAL_UNIT.SECONDS:
      default:
        return value;
    }
  }

  _normalizeRefreshIntervalSettings() {
    const configuredValue = this._settings.get_int("refresh-interval-value");
    const configuredUnit = this._settings.get_int("refresh-interval-unit");
    let normalizedValue = configuredValue;
    let normalizedUnit = configuredUnit;

    if (
      normalizedUnit < REFRESH_INTERVAL_UNIT.SECONDS ||
      normalizedUnit > REFRESH_INTERVAL_UNIT.MINUTES
    ) {
      // Convert legacy "Hours" into minutes before clamping.
      if (normalizedUnit === 2) {
        normalizedValue *= 60;
      }
      normalizedUnit = REFRESH_INTERVAL_UNIT.MINUTES;
    }

    normalizedValue = Math.max(
      MIN_REFRESH_INTERVAL_VALUE,
      Math.min(MAX_REFRESH_INTERVAL_VALUE, normalizedValue)
    );

    if (normalizedValue !== configuredValue) {
      this._settings.set_int("refresh-interval-value", normalizedValue);
    }
    if (normalizedUnit !== configuredUnit) {
      this._settings.set_int("refresh-interval-unit", normalizedUnit);
    }
  }

  _normalizeStatusThresholdSettings(valueKey, unitKey, defaultUnit) {
    const configuredValue = this._settings.get_int(valueKey);
    const configuredUnit = this._settings.get_int(unitKey);
    const normalizedValue = clamp(
      configuredValue,
      MIN_STATUS_THRESHOLD_VALUE,
      MAX_STATUS_THRESHOLD_VALUE
    );
    const normalizedUnit =
      configuredUnit >= THRESHOLD_UNIT.MINUTES &&
      configuredUnit <= THRESHOLD_UNIT.HOURS
        ? configuredUnit
        : defaultUnit;

    if (normalizedValue !== configuredValue) {
      this._settings.set_int(valueKey, normalizedValue);
    }
    if (normalizedUnit !== configuredUnit) {
      this._settings.set_int(unitKey, normalizedUnit);
    }
  }

  _normalizeStatusHighlightSettings() {
    this._normalizeStatusThresholdSettings(
      "coming-up-threshold-value",
      "coming-up-threshold-unit",
      THRESHOLD_UNIT.HOURS
    );
    this._normalizeStatusThresholdSettings(
      "starting-soon-threshold-value",
      "starting-soon-threshold-unit",
      THRESHOLD_UNIT.MINUTES
    );

    const comingUpColor = this._settings.get_string("coming-up-color").trim();
    const startingSoonColor = this._settings
      .get_string("starting-soon-color")
      .trim();

    if (comingUpColor.length === 0) {
      this._settings.set_string("coming-up-color", DEFAULT_COMING_UP_COLOR);
    }
    if (startingSoonColor.length === 0) {
      this._settings.set_string(
        "starting-soon-color",
        DEFAULT_STARTING_SOON_COLOR
      );
    }
  }

  _getThresholdInSeconds(
    valueKey,
    unitKey,
    defaultValue,
    defaultUnit = THRESHOLD_UNIT.MINUTES
  ) {
    const rawValue = this._settings?.get_int(valueKey) ?? defaultValue;
    const rawUnit = this._settings?.get_int(unitKey) ?? defaultUnit;
    const value = clamp(
      rawValue,
      MIN_STATUS_THRESHOLD_VALUE,
      MAX_STATUS_THRESHOLD_VALUE
    );
    const unit =
      rawUnit >= THRESHOLD_UNIT.MINUTES && rawUnit <= THRESHOLD_UNIT.HOURS
        ? rawUnit
        : defaultUnit;

    if (unit === THRESHOLD_UNIT.HOURS) {
      return value * 60 * 60;
    }

    return value * 60;
  }

  _getConfiguredColor(settingKey, fallback) {
    const configuredValue = this._settings?.get_string(settingKey) ?? "";
    const trimmed = configuredValue.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  _getIndicatorTimingState(eventStatus) {
    const nextEvent = eventStatus?.nextEvent ?? null;
    if (!nextEvent?.date) {
      return INDICATOR_TIMING_STATE.NONE;
    }

    const secondsUntilNextEvent = Math.ceil(
      (nextEvent.date.valueOf() - Date.now()) / 1000
    );
    if (secondsUntilNextEvent < 0) {
      return INDICATOR_TIMING_STATE.NONE;
    }

    const comingUpThresholdSeconds = this._getThresholdInSeconds(
      "coming-up-threshold-value",
      "coming-up-threshold-unit",
      2,
      THRESHOLD_UNIT.HOURS
    );
    const startingSoonThresholdSeconds = this._getThresholdInSeconds(
      "starting-soon-threshold-value",
      "starting-soon-threshold-unit",
      30,
      THRESHOLD_UNIT.MINUTES
    );
    const effectiveStartingSoonThreshold = Math.min(
      startingSoonThresholdSeconds,
      comingUpThresholdSeconds
    );
    const effectiveComingUpThreshold = Math.max(
      comingUpThresholdSeconds,
      startingSoonThresholdSeconds
    );

    if (secondsUntilNextEvent <= effectiveStartingSoonThreshold) {
      return INDICATOR_TIMING_STATE.STARTING_SOON;
    }
    if (secondsUntilNextEvent <= effectiveComingUpThreshold) {
      return INDICATOR_TIMING_STATE.COMING_UP;
    }

    return INDICATOR_TIMING_STATE.NONE;
  }

  _getIndicatorStatusColor(indicatorTimingState) {
    if (indicatorTimingState === INDICATOR_TIMING_STATE.STARTING_SOON) {
      return this._getConfiguredColor(
        "starting-soon-color",
        DEFAULT_STARTING_SOON_COLOR
      );
    }
    if (indicatorTimingState === INDICATOR_TIMING_STATE.COMING_UP) {
      return this._getConfiguredColor(
        "coming-up-color",
        DEFAULT_COMING_UP_COLOR
      );
    }

    return null;
  }

  _getLockScreenDialog() {
    return Main.screenShield?._dialog ?? null;
  }

  _getClampedFontSize(settingKey, fallback) {
    const configuredSize = this._settings?.get_int(settingKey) ?? fallback;
    return Math.max(MIN_FONT_SIZE_PX, Math.min(MAX_FONT_SIZE_PX, configuredSize));
  }

  _getLockScreenFontSize() {
    return this._getClampedFontSize(
      "lock-screen-font-size",
      DEFAULT_LOCK_SCREEN_FONT_SIZE
    );
  }

  _getDesktopFontSize() {
    return this._getClampedFontSize("desktop-font-size", DEFAULT_DESKTOP_FONT_SIZE);
  }

  _getDesktopEventsToShow() {
    const configuredCount =
      this._settings?.get_int("desktop-events-to-show") ??
      DEFAULT_DESKTOP_EVENTS_TO_SHOW;

    return Math.max(
      MIN_DESKTOP_EVENTS_TO_SHOW,
      Math.min(MAX_DESKTOP_EVENTS_TO_SHOW, configuredCount)
    );
  }

  _getLockScreenLabelStyle() {
    const fontSize = this._getLockScreenFontSize();
    return `margin-top: 12px; margin-bottom: 12px; max-width: 42em; opacity: 255; font-size: ${fontSize}px;`;
  }

  _getDesktopLabelStyle(maxWidth) {
    const fontSize = this._getDesktopFontSize();
    return `padding: 8px 12px; border-radius: 10px; background-color: rgba(0, 0, 0, 0.45); color: #ffffff; max-width: ${maxWidth}px; font-size: ${fontSize}px;`;
  }

  _applyLockScreenLabelStyle(label) {
    if (!label) {
      return;
    }

    label.set_style(this._getLockScreenLabelStyle());
  }

  _createLockScreenMessageLabel() {
    const label = new St.Label({
      style_class: "unlock-dialog-clock-hint",
      x_align: Clutter.ActorAlign.CENTER,
      visible: false,
    });
    label.clutter_text.line_wrap = true;
    label.set_style(this._getLockScreenLabelStyle());
    return label;
  }

  _getDesktopBackgroundGroup() {
    return Main.layoutManager?._backgroundGroup ?? null;
  }

  _createDesktopMessageLabel() {
    const label = new St.Label({
      visible: false,
      reactive: false,
    });
    label.clutter_text.line_wrap = true;
    const monitor = Main.layoutManager?.primaryMonitor;
    const initialMaxWidth = monitor
      ? Math.max(220, Math.floor(monitor.width * 0.45))
      : 600;
    label.set_style(this._getDesktopLabelStyle(initialMaxWidth));
    return label;
  }

  _removeActor(actor, actorName = "actor") {
    if (!actor) {
      return;
    }

    try {
      const parent = actor.get_parent();
      if (parent) {
        parent.remove_child(actor);
      }
    } catch (error) {
      this._debugLockScreen(`Failed to remove ${actorName}`, {
        error: String(error),
      });
    }
  }

  _clearLockScreenMessageActors(options = {}) {
    const removeFromParent = options.removeFromParent ?? false;
    const reason = options.reason ?? "unspecified";
    const clockLabel = this._lockScreenMessageLabel;
    const promptLabel = this._unlockPromptMessageLabel;

    this._debugLockScreen("Clearing lock-screen actors", {
      reason,
      removeFromParent,
      hasClockLabel: Boolean(clockLabel),
      hasPromptLabel: Boolean(promptLabel),
      hasDialog: Boolean(this._lockScreenDialog),
    });

    this._lockScreenMessageLabel = null;
    this._unlockPromptMessageLabel = null;
    this._lockScreenDialog = null;

    if (!removeFromParent) {
      return;
    }

    // Remove by actual parent relationship to avoid stale labels
    // if dialog tracking state is already out of sync.
    this._removeActor(clockLabel, "lock-screen clock label");
    this._removeActor(promptLabel, "unlock prompt label");
  }

  _clearDesktopMessageActor(options = {}) {
    const removeFromParent = options.removeFromParent ?? false;
    const reason = options.reason ?? "unspecified";
    const desktopLabel = this._desktopMessageLabel;

    this._debugLockScreen("Clearing desktop actor", {
      reason,
      removeFromParent,
      hasDesktopLabel: Boolean(desktopLabel),
      hasBackgroundGroup: Boolean(this._desktopBackgroundGroup),
    });

    this._desktopMessageLabel = null;
    this._desktopBackgroundGroup = null;

    if (removeFromParent) {
      this._removeActor(desktopLabel, "desktop message label");
    }
  }

  _getCurrentIndicatorText() {
    return this._currentIndicatorText ?? "";
  }

  _getCurrentDesktopText() {
    return this._currentDesktopText ?? "";
  }

  _sanitizeDebugDetails(details, parentKey = "") {
    if (details === null || details === undefined) {
      return details;
    }

    if (Array.isArray(details)) {
      return details.map((entry) => this._sanitizeDebugDetails(entry, parentKey));
    }

    if (typeof details === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(details)) {
        if (SENSITIVE_DEBUG_KEY_PATTERN.test(key)) {
          sanitized[key] = REDACTED_LOG_VALUE;
          continue;
        }
        sanitized[key] = this._sanitizeDebugDetails(value, key);
      }
      return sanitized;
    }

    if (typeof details === "string" && SENSITIVE_DEBUG_KEY_PATTERN.test(parentKey)) {
      return REDACTED_LOG_VALUE;
    }

    return details;
  }

  _debugLockScreen(message, details = null) {
    if (!this._debugLogsEnabled) {
      return;
    }

    const prefix = `[${this.uuid}] lock-screen`;

    if (details === null || details === undefined) {
      log(`${prefix}: ${message}`);
      return;
    }

    let detailsText = "";
    try {
      detailsText = JSON.stringify(this._sanitizeDebugDetails(details));
    } catch {
      detailsText = String(details);
    }

    log(`${prefix}: ${message} ${detailsText}`);
  }

  _hasDialogActor(dialog, actorPropertyName) {
    try {
      return Boolean(dialog?.[actorPropertyName]);
    } catch (error) {
      this._debugLockScreen(
        `Unable to inspect dialog.${actorPropertyName}`,
        { error: String(error) }
      );
      return false;
    }
  }

  _setLabelText(label, text, labelName = "label", labelPropertyName = null) {
    if (!label) {
      this._debugLockScreen(`Skipping update for ${labelName}: actor missing`);
      return;
    }

    try {
      label.text = text;
      label.visible = text.length > 0;
      this._debugLockScreen(`Updated ${labelName}`, {
        visible: label.visible,
      });
    } catch (error) {
      this._debugLockScreen(`Failed to update ${labelName}`, {
        error: String(error),
      });
      if (labelPropertyName) {
        this[labelPropertyName] = null;
      }
    }
  }

  _syncLockScreenMessageActor() {
    const showOnLockScreen =
      this._settings?.get_boolean("show-on-lock-screen") ?? false;
    const dialog = this._getLockScreenDialog();
    this._debugLockScreen("Sync lock-screen actors", {
      showOnLockScreen,
      hasDialog: Boolean(dialog),
      active: Main.screenShield?.active ?? null,
      locked: Main.screenShield?.locked ?? null,
    });

    if (!showOnLockScreen) {
      this._clearLockScreenMessageActors({
        removeFromParent: true,
        reason: "setting-disabled",
      });
      return;
    }

    if (!dialog) {
      this._debugLockScreen("No lock-screen dialog available");
      this._clearLockScreenMessageActors({
        removeFromParent: false,
        reason: "dialog-missing",
      });
      return;
    }

    if (this._lockScreenDialog !== dialog) {
      this._debugLockScreen("Lock-screen dialog changed, creating labels", {
        hasClockActor: this._hasDialogActor(dialog, "_clock"),
        hasPromptBoxActor: this._hasDialogActor(dialog, "_promptBox"),
      });
      this._clearLockScreenMessageActors({
        removeFromParent: false,
        reason: "dialog-changed",
      });
      this._lockScreenDialog = dialog;
    }

    try {
      if (!this._lockScreenMessageLabel && dialog._clock) {
        this._lockScreenMessageLabel = this._createLockScreenMessageLabel();
        dialog._clock.add_child(this._lockScreenMessageLabel);
        this._debugLockScreen("Added lock-screen clock label");
      }

      if (!this._unlockPromptMessageLabel && dialog._promptBox) {
        this._unlockPromptMessageLabel = this._createLockScreenMessageLabel();
        dialog._promptBox.add_child(this._unlockPromptMessageLabel);
        this._debugLockScreen("Added unlock prompt label");
      }
    } catch (error) {
      this._debugLockScreen("Failed to create/attach lock-screen label", {
        error: String(error),
      });
    }

    this._applyLockScreenLabelStyle(this._lockScreenMessageLabel);
    this._applyLockScreenLabelStyle(this._unlockPromptMessageLabel);

    const currentText = this._getCurrentIndicatorText();
    this._setLabelText(
      this._lockScreenMessageLabel,
      currentText,
      "lock-screen clock label",
      "_lockScreenMessageLabel"
    );
    this._setLabelText(
      this._unlockPromptMessageLabel,
      currentText,
      "unlock prompt label",
      "_unlockPromptMessageLabel"
    );

    this._debugLockScreen("Lock-screen dialog sync result", {
      hasClockLabel: Boolean(this._lockScreenMessageLabel),
      hasPromptLabel: Boolean(this._unlockPromptMessageLabel),
    });
  }

  _setLockScreenMessage(text) {
    this._debugLockScreen("Applying lock-screen message", { hasText: text.length > 0 });
    this._syncLockScreenMessageActor();

    if (!this._settings.get_boolean("show-on-lock-screen")) {
      this._debugLockScreen("Lock-screen setting disabled; skipping text update");
      return;
    }

    this._setLabelText(
      this._lockScreenMessageLabel,
      text,
      "lock-screen clock label",
      "_lockScreenMessageLabel"
    );
    this._setLabelText(
      this._unlockPromptMessageLabel,
      text,
      "unlock prompt label",
      "_unlockPromptMessageLabel"
    );
  }

  _repositionDesktopMessageLabel() {
    const label = this._desktopMessageLabel;
    const monitor = Main.layoutManager?.primaryMonitor;

    if (!label || !monitor) {
      return;
    }

    const horizontalAlign =
      this._settings?.get_int("desktop-horizontal-align") ??
      DESKTOP_HORIZONTAL_ALIGN.LEFT;
    const verticalAlign =
      this._settings?.get_int("desktop-vertical-align") ??
      DESKTOP_VERTICAL_ALIGN.TOP;
    const maxWidth = Math.max(220, Math.floor(monitor.width * 0.45));

    label.set_style(this._getDesktopLabelStyle(maxWidth));

    // Clear any previously forced width before recomputing.
    label.set_width(-1);
    const textLength = label.text?.length ?? 0;
    if (textLength === 0) {
      return;
    }

    // Measure the text unwrapped to get a sensible auto width, then clamp.
    const previousLineWrap = label.clutter_text.line_wrap;
    label.clutter_text.line_wrap = false;
    const [, unwrappedWidth] = label.get_preferred_width(-1);
    label.clutter_text.line_wrap = previousLineWrap;

    const fallbackWidth = Math.min(maxWidth, Math.max(220, textLength * 8));
    const measuredWidth = unwrappedWidth > 0 ? unwrappedWidth : fallbackWidth;
    const labelWidth = Math.min(measuredWidth, maxWidth);
    const [, labelHeight] = label.get_preferred_height(labelWidth);
    label.set_width(labelWidth);

    const x =
      horizontalAlign === DESKTOP_HORIZONTAL_ALIGN.RIGHT
        ? monitor.x + monitor.width - labelWidth - DESKTOP_LABEL_MARGIN
        : monitor.x + DESKTOP_LABEL_MARGIN;
    const y =
      verticalAlign === DESKTOP_VERTICAL_ALIGN.BOTTOM
        ? monitor.y + monitor.height - labelHeight - DESKTOP_LABEL_MARGIN
        : monitor.y + DESKTOP_LABEL_MARGIN;

    label.set_position(Math.round(x), Math.round(y));
  }

  _syncDesktopMessageActor() {
    const showOnDesktop = this._settings?.get_boolean("show-on-desktop") ?? false;
    const backgroundGroup = this._getDesktopBackgroundGroup();

    if (!showOnDesktop) {
      this._clearDesktopMessageActor({
        removeFromParent: true,
        reason: "setting-disabled",
      });
      return;
    }

    if (!backgroundGroup) {
      this._clearDesktopMessageActor({
        removeFromParent: true,
        reason: "background-group-missing",
      });
      return;
    }

    if (this._desktopBackgroundGroup !== backgroundGroup) {
      this._clearDesktopMessageActor({
        removeFromParent: true,
        reason: "background-group-changed",
      });
      this._desktopBackgroundGroup = backgroundGroup;
    }

    if (!this._desktopMessageLabel) {
      this._desktopMessageLabel = this._createDesktopMessageLabel();
      this._desktopBackgroundGroup.add_child(this._desktopMessageLabel);
    }

    this._repositionDesktopMessageLabel();
  }

  _setDesktopMessage(text) {
    this._syncDesktopMessageActor();

    if (!this._settings.get_boolean("show-on-desktop")) {
      return;
    }

    this._setLabelText(
      this._desktopMessageLabel,
      text,
      "desktop message label",
      "_desktopMessageLabel"
    );
    this._repositionDesktopMessageLabel();
  }

  loadIndicator() {
    const boxes = [
      Main.panel._leftBox,
      Main.panel._centerBox,
      Main.panel._rightBox,
    ];

    const whichPanel = this._settings.get_int("which-panel");

    // If aligned to left, place it after workspaces indicator
    const index = whichPanel === 0 ? 1 : 0;

    boxes[whichPanel].insert_child_at_index(this._indicator.container, index);
  }

  unloadIndicator() {
    this._indicator.container
      .get_parent()
      .remove_child(this._indicator.container);
  }

  refreshIndicator() {
    const lookaheadMode = this._settings.get_int("event-lookahead");
    const events = DateHelperFunctions.getEventsForLookahead(
      this._indicator._calendarSource,
      lookaheadMode
    );
    const eventStatus = DateHelperFunctions.getNextEventsToDisplay(events);
    const fullIndicatorText = DateHelperFunctions.eventStatusToIndicatorText(
      eventStatus,
      lookaheadMode
    );
    const lockScreenText = DateHelperFunctions.eventStatusToLockScreenText(
      eventStatus,
      lookaheadMode
    );
    const showOnlyTimer = this._settings.get_boolean("show-only-timer");
    const topBarText = showOnlyTimer
      ? DateHelperFunctions.eventStatusToTimerText(eventStatus, lookaheadMode)
      : fullIndicatorText;
    const indicatorTimingState = this._getIndicatorTimingState(eventStatus);
    const indicatorStatusColor = this._getIndicatorStatusColor(
      indicatorTimingState
    );
    const desktopEventsToShow = this._getDesktopEventsToShow();
    const desktopText = DateHelperFunctions.eventsToDesktopText(
      events,
      desktopEventsToShow,
      lookaheadMode
    );
    this._currentIndicatorText = lockScreenText;
    this._currentDesktopText = desktopText;
    this._debugLockScreen("Computed indicator text", {
      hasCurrentEvent: eventStatus.currentEvent !== null,
      hasNextEvent: eventStatus.nextEvent !== null,
      showOnlyTimer,
      indicatorTimingState,
      indicatorStatusColor,
      desktopEventsToShow,
    });

    if (eventStatus.currentEvent === null && eventStatus.nextEvent === null) {
      this._indicator.showConfettiIcon();
    } else if (indicatorTimingState === INDICATOR_TIMING_STATE.STARTING_SOON) {
      this._indicator.showAlarmIcon();
    } else {
      this._indicator.showCalendarIcon();
    }

    this._indicator.setText(topBarText);
    this._indicator.setTextColor(indicatorStatusColor);
    this._setLockScreenMessage(lockScreenText);
    this._setDesktopMessage(desktopText);
  }

  disable() {
    this._debugLockScreen("Disabling extension");
    const parent = this._indicator.container.get_parent();
    if (parent) {
      parent.remove_child(this._indicator.container);
    }

    this._settings.disconnect(this._whichPanelChangedSignal);
    this._settings.disconnect(this._eventLookaheadChangedSignal);
    this._settings.disconnect(this._showOnlyTimerChangedSignal);
    this._settings.disconnect(this._refreshIntervalValueChangedSignal);
    this._settings.disconnect(this._refreshIntervalUnitChangedSignal);
    this._settings.disconnect(this._comingUpColorChangedSignal);
    this._settings.disconnect(this._comingUpThresholdValueChangedSignal);
    this._settings.disconnect(this._comingUpThresholdUnitChangedSignal);
    this._settings.disconnect(this._startingSoonColorChangedSignal);
    this._settings.disconnect(this._startingSoonThresholdValueChangedSignal);
    this._settings.disconnect(this._startingSoonThresholdUnitChangedSignal);
    this._settings.disconnect(this._showOnLockScreenChangedSignal);
    this._settings.disconnect(this._showOnDesktopChangedSignal);
    this._settings.disconnect(this._desktopEventsToShowChangedSignal);
    this._settings.disconnect(this._desktopHorizontalAlignChangedSignal);
    this._settings.disconnect(this._desktopVerticalAlignChangedSignal);
    this._settings.disconnect(this._lockScreenFontSizeChangedSignal);
    this._settings.disconnect(this._desktopFontSizeChangedSignal);
    this._indicator._calendarSource.disconnect(this._calendarSourceChangedSignal);

    if (this._lockScreenActiveChangedSignal) {
      Main.screenShield.disconnect(this._lockScreenActiveChangedSignal);
      this._lockScreenActiveChangedSignal = null;
    }

    if (this._lockScreenLockedChangedSignal) {
      Main.screenShield.disconnect(this._lockScreenLockedChangedSignal);
      this._lockScreenLockedChangedSignal = null;
    }

    if (this._monitorsChangedSignal) {
      Main.layoutManager.disconnect(this._monitorsChangedSignal);
      this._monitorsChangedSignal = null;
    }

    this._clearLockScreenMessageActors({
      removeFromParent: true,
      reason: "disable",
    });
    this._clearDesktopMessageActor({
      removeFromParent: true,
      reason: "disable",
    });

    this._currentIndicatorText = "";
    this._currentDesktopText = "";
    this._debugLogsEnabled = false;
    this._settings = null;

    this._indicator.destroy();
    this._indicator = null;

    this._stopLoop();

    if (this.delaySourceId) {
      GLib.Source.remove(this.delaySourceId);
      this.delaySourceId = null;
    }
  }
}
