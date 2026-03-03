"use strict";

import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const MIN_REFRESH_INTERVAL_VALUE = 1;
const MAX_REFRESH_INTERVAL_VALUE = 60;
const REFRESH_INTERVAL_UNIT = {
  SECONDS: 0,
  MINUTES: 1,
};
const THRESHOLD_UNIT = {
  MINUTES: 0,
  HOURS: 1,
};
const MIN_STATUS_THRESHOLD_VALUE = 1;
const MAX_STATUS_THRESHOLD_VALUE = 9999;
const DEFAULT_COMING_UP_COLOR = "yellow";
const DEFAULT_STARTING_SOON_COLOR = "red";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRefreshIntervalSettings(settings) {
  const configuredValue = settings.get_int("refresh-interval-value");
  const configuredUnit = settings.get_int("refresh-interval-unit");
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

  normalizedValue = clamp(
    normalizedValue,
    MIN_REFRESH_INTERVAL_VALUE,
    MAX_REFRESH_INTERVAL_VALUE
  );

  if (normalizedValue !== configuredValue) {
    settings.set_int("refresh-interval-value", normalizedValue);
  }
  if (normalizedUnit !== configuredUnit) {
    settings.set_int("refresh-interval-unit", normalizedUnit);
  }
}

function normalizeStatusThresholdSettings(
  settings,
  valueKey,
  unitKey,
  defaultUnit
) {
  const configuredValue = settings.get_int(valueKey);
  const configuredUnit = settings.get_int(unitKey);
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
    settings.set_int(valueKey, normalizedValue);
  }
  if (normalizedUnit !== configuredUnit) {
    settings.set_int(unitKey, normalizedUnit);
  }
}

function normalizeStatusHighlightSettings(settings) {
  normalizeStatusThresholdSettings(
    settings,
    "coming-up-threshold-value",
    "coming-up-threshold-unit",
    THRESHOLD_UNIT.HOURS
  );
  normalizeStatusThresholdSettings(
    settings,
    "starting-soon-threshold-value",
    "starting-soon-threshold-unit",
    THRESHOLD_UNIT.MINUTES
  );

  const comingUpColor = settings.get_string("coming-up-color").trim();
  const startingSoonColor = settings.get_string("starting-soon-color").trim();

  if (comingUpColor.length === 0) {
    settings.set_string("coming-up-color", DEFAULT_COMING_UP_COLOR);
  }
  if (startingSoonColor.length === 0) {
    settings.set_string("starting-soon-color", DEFAULT_STARTING_SOON_COLOR);
  }
}

function parseColorOrDefault(configuredColor, fallbackColor) {
  const rgba = new Gdk.RGBA();
  const configured = configuredColor?.trim() ?? "";
  if (!rgba.parse(configured) && !rgba.parse(fallbackColor)) {
    rgba.parse("white");
  }
  return rgba;
}

function createColorPicker(settings, colorKey, defaultColor) {
  const initialColor = parseColorOrDefault(
    settings.get_string(colorKey),
    defaultColor
  );

  if (Gtk.ColorDialogButton) {
    const colorDialog = new Gtk.ColorDialog({
      with_alpha: false,
      modal: true,
    });
    const colorButton = new Gtk.ColorDialogButton({
      dialog: colorDialog,
      valign: Gtk.Align.CENTER,
    });
    colorButton.set_rgba(initialColor);
    colorButton.connect("notify::rgba", (button) => {
      settings.set_string(colorKey, button.get_rgba().to_string());
    });
    return colorButton;
  }

  if (Gtk.ColorButton) {
    const colorButton = new Gtk.ColorButton({
      use_alpha: false,
      valign: Gtk.Align.CENTER,
    });
    colorButton.set_rgba(initialColor);
    colorButton.connect("notify::rgba", (button) => {
      settings.set_string(colorKey, button.get_rgba().to_string());
    });
    return colorButton;
  }

  const colorEntry = new Gtk.Entry({
    width_chars: 10,
    max_width_chars: 18,
    placeholder_text: defaultColor,
    valign: Gtk.Align.CENTER,
  });
  colorEntry.set_text(settings.get_string(colorKey));
  colorEntry.connect("changed", (entry) => {
    settings.set_string(colorKey, entry.get_text().trim());
  });
  return colorEntry;
}

export default class NextUpExtensionPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = this.getSettings();
    normalizeRefreshIntervalSettings(settings);
    normalizeStatusHighlightSettings(settings);

    // Create a preferences page and section groups
    const page = new Adw.PreferencesPage();
    const topPaneGroup = new Adw.PreferencesGroup({ title: "Top Panel" });
    const colorsGroup = new Adw.PreferencesGroup({ title: "Colors" });
    const desktopBackgroundGroup = new Adw.PreferencesGroup({
      title: "Desktop Background",
    });
    const lockScreenGroup = new Adw.PreferencesGroup({ title: "Lock Screen" });
    page.add(topPaneGroup);
    page.add(desktopBackgroundGroup);
    page.add(lockScreenGroup);
    page.add(colorsGroup);

    // Panel placement row
    const panelRow = new Adw.ActionRow({ title: "Panel to show indicator in" });
    topPaneGroup.add(panelRow);

    const panelDropdown = new Gtk.DropDown({
      model: Gtk.StringList.new(["Left", "Center", "Right"]),
      valign: Gtk.Align.CENTER,
    });

    settings.bind(
      "which-panel",
      panelDropdown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );

    panelRow.add_suffix(panelDropdown);
    panelRow.activatable_widget = panelDropdown;

    // Event lookahead range row
    const lookaheadRow = new Adw.ActionRow({
      title: "Events to look ahead",
      subtitle: "Choose whether to show only today or include future events",
    });
    topPaneGroup.add(lookaheadRow);

    const lookaheadDropdown = new Gtk.DropDown({
      model: Gtk.StringList.new(["Today", "Week", "Month"]),
      valign: Gtk.Align.CENTER,
    });

    settings.bind(
      "event-lookahead",
      lookaheadDropdown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );

    lookaheadRow.add_suffix(lookaheadDropdown);
    lookaheadRow.activatable_widget = lookaheadDropdown;

    const showOnlyTimerRow = new Adw.SwitchRow({
      title: "Show only timer",
      subtitle: "Show only icon + time remaining in the top bar",
    });
    settings.bind(
      "show-only-timer",
      showOnlyTimerRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    topPaneGroup.add(showOnlyTimerRow);

    // Refresh interval row
    const refreshRow = new Adw.ActionRow({
      title: "Refresh interval",
      subtitle: "How often the indicator updates",
    });
    topPaneGroup.add(refreshRow);

    const refreshValueSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: MIN_REFRESH_INTERVAL_VALUE,
        upper: MAX_REFRESH_INTERVAL_VALUE,
        step_increment: 1,
        page_increment: 10,
      }),
      climb_rate: 1,
      digits: 0,
      numeric: true,
      valign: Gtk.Align.CENTER,
    });
    refreshValueSpin.set_value(settings.get_int("refresh-interval-value"));
    refreshValueSpin.connect("value-changed", (spin) => {
      settings.set_int(
        "refresh-interval-value",
        clamp(
          spin.get_value_as_int(),
          MIN_REFRESH_INTERVAL_VALUE,
          MAX_REFRESH_INTERVAL_VALUE
        )
      );
    });

    const refreshUnitDropdown = new Gtk.DropDown({
      model: Gtk.StringList.new(["Seconds", "Minutes"]),
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "refresh-interval-unit",
      refreshUnitDropdown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );

    refreshRow.add_suffix(refreshValueSpin);
    refreshRow.add_suffix(refreshUnitDropdown);
    refreshRow.activatable_widget = refreshValueSpin;

    function addStatusColorThresholdRow(config) {
      const row = new Adw.ActionRow({
        title: config.title,
        subtitle: "Color + threshold for this alert level",
      });
      colorsGroup.add(row);

      const colorPicker = createColorPicker(
        settings,
        config.colorKey,
        config.defaultColor
      );

      const thresholdValueSpin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
          lower: MIN_STATUS_THRESHOLD_VALUE,
          upper: MAX_STATUS_THRESHOLD_VALUE,
          step_increment: 1,
          page_increment: 10,
        }),
        climb_rate: 1,
        digits: 0,
        numeric: true,
        valign: Gtk.Align.CENTER,
      });
      thresholdValueSpin.set_value(settings.get_int(config.thresholdValueKey));
      thresholdValueSpin.connect("value-changed", (spin) => {
        settings.set_int(
          config.thresholdValueKey,
          clamp(
            spin.get_value_as_int(),
            MIN_STATUS_THRESHOLD_VALUE,
            MAX_STATUS_THRESHOLD_VALUE
          )
        );
      });

      const thresholdUnitDropdown = new Gtk.DropDown({
        model: Gtk.StringList.new(["Minutes", "Hours"]),
        valign: Gtk.Align.CENTER,
      });
      settings.bind(
        config.thresholdUnitKey,
        thresholdUnitDropdown,
        "selected",
        Gio.SettingsBindFlags.DEFAULT
      );

      row.add_suffix(colorPicker);
      row.add_suffix(thresholdValueSpin);
      row.add_suffix(thresholdUnitDropdown);
      row.activatable_widget = thresholdValueSpin;
    }

    addStatusColorThresholdRow({
      title: "Coming up",
      defaultColor: DEFAULT_COMING_UP_COLOR,
      colorKey: "coming-up-color",
      thresholdValueKey: "coming-up-threshold-value",
      thresholdUnitKey: "coming-up-threshold-unit",
    });
    addStatusColorThresholdRow({
      title: "Starting soon",
      defaultColor: DEFAULT_STARTING_SOON_COLOR,
      colorKey: "starting-soon-color",
      thresholdValueKey: "starting-soon-threshold-value",
      thresholdUnitKey: "starting-soon-threshold-unit",
    });

    const lockScreenRow = new Adw.SwitchRow({
      title: "Show on lock screen",
      subtitle: "Display next event info after you lock the session",
    });
    settings.bind(
      "show-on-lock-screen",
      lockScreenRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    lockScreenGroup.add(lockScreenRow);

    const lockScreenFontRow = new Adw.ActionRow({
      title: "Lock screen font size",
      subtitle: "Text size in pixels",
    });
    const lockScreenFontSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 8,
        upper: 72,
        step_increment: 1,
        page_increment: 4,
      }),
      climb_rate: 1,
      digits: 0,
      numeric: true,
      valign: Gtk.Align.CENTER,
    });
    lockScreenFontSpin.set_value(settings.get_int("lock-screen-font-size"));
    lockScreenFontSpin.connect("value-changed", (spin) => {
      settings.set_int("lock-screen-font-size", spin.get_value_as_int());
    });
    settings.bind(
      "show-on-lock-screen",
      lockScreenFontRow,
      "sensitive",
      Gio.SettingsBindFlags.DEFAULT
    );
    lockScreenFontRow.add_suffix(lockScreenFontSpin);
    lockScreenFontRow.activatable_widget = lockScreenFontSpin;
    lockScreenGroup.add(lockScreenFontRow);

    const desktopRow = new Adw.SwitchRow({
      title: "Show on desktop",
      subtitle: "Display next event info on the desktop background",
    });
    settings.bind(
      "show-on-desktop",
      desktopRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    desktopBackgroundGroup.add(desktopRow);

    const desktopEventsToShowRow = new Adw.ActionRow({
      title: "Number of future events to show",
      subtitle: "Show up to this many upcoming events on desktop",
    });
    const desktopEventsToShowSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 6,
        step_increment: 1,
        page_increment: 1,
      }),
      climb_rate: 1,
      digits: 0,
      numeric: true,
      valign: Gtk.Align.CENTER,
    });
    desktopEventsToShowSpin.set_value(settings.get_int("desktop-events-to-show"));
    desktopEventsToShowSpin.connect("value-changed", (spin) => {
      settings.set_int("desktop-events-to-show", spin.get_value_as_int());
    });
    settings.bind(
      "show-on-desktop",
      desktopEventsToShowRow,
      "sensitive",
      Gio.SettingsBindFlags.DEFAULT
    );
    desktopEventsToShowRow.add_suffix(desktopEventsToShowSpin);
    desktopEventsToShowRow.activatable_widget = desktopEventsToShowSpin;
    desktopBackgroundGroup.add(desktopEventsToShowRow);

    const desktopHorizontalRow = new Adw.ActionRow({
      title: "Desktop horizontal alignment",
    });
    const desktopHorizontalDropdown = new Gtk.DropDown({
      model: Gtk.StringList.new(["Left", "Right"]),
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "desktop-horizontal-align",
      desktopHorizontalDropdown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
      "show-on-desktop",
      desktopHorizontalRow,
      "sensitive",
      Gio.SettingsBindFlags.DEFAULT
    );
    desktopHorizontalRow.add_suffix(desktopHorizontalDropdown);
    desktopHorizontalRow.activatable_widget = desktopHorizontalDropdown;
    desktopBackgroundGroup.add(desktopHorizontalRow);

    const desktopVerticalRow = new Adw.ActionRow({
      title: "Desktop vertical alignment",
    });
    const desktopVerticalDropdown = new Gtk.DropDown({
      model: Gtk.StringList.new(["Top", "Bottom"]),
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "desktop-vertical-align",
      desktopVerticalDropdown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
      "show-on-desktop",
      desktopVerticalRow,
      "sensitive",
      Gio.SettingsBindFlags.DEFAULT
    );
    desktopVerticalRow.add_suffix(desktopVerticalDropdown);
    desktopVerticalRow.activatable_widget = desktopVerticalDropdown;
    desktopBackgroundGroup.add(desktopVerticalRow);

    const desktopFontRow = new Adw.ActionRow({
      title: "Desktop font size",
      subtitle: "Text size in pixels",
    });
    const desktopFontSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 8,
        upper: 72,
        step_increment: 1,
        page_increment: 4,
      }),
      climb_rate: 1,
      digits: 0,
      numeric: true,
      valign: Gtk.Align.CENTER,
    });
    desktopFontSpin.set_value(settings.get_int("desktop-font-size"));
    desktopFontSpin.connect("value-changed", (spin) => {
      settings.set_int("desktop-font-size", spin.get_value_as_int());
    });
    settings.bind(
      "show-on-desktop",
      desktopFontRow,
      "sensitive",
      Gio.SettingsBindFlags.DEFAULT
    );
    desktopFontRow.add_suffix(desktopFontSpin);
    desktopFontRow.activatable_widget = desktopFontSpin;
    desktopBackgroundGroup.add(desktopFontRow);

    // Add our page to the window
    window.add(page);
  }
}
