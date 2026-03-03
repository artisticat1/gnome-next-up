import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import { createColorPicker } from "../color-picker.js";
import {
  DEFAULT_COMING_UP_COLOR,
  DEFAULT_STARTING_SOON_COLOR,
  MAX_STATUS_THRESHOLD_VALUE,
  MIN_STATUS_THRESHOLD_VALUE,
} from "../constants.js";
import { clamp } from "../helpers.js";

function addStatusColorThresholdRow(settings, colorsGroup, config) {
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

export function buildColorsSection(settings, colorsGroup) {
  addStatusColorThresholdRow(settings, colorsGroup, {
    title: "Coming up",
    defaultColor: DEFAULT_COMING_UP_COLOR,
    colorKey: "coming-up-color",
    thresholdValueKey: "coming-up-threshold-value",
    thresholdUnitKey: "coming-up-threshold-unit",
  });

  addStatusColorThresholdRow(settings, colorsGroup, {
    title: "Starting soon",
    defaultColor: DEFAULT_STARTING_SOON_COLOR,
    colorKey: "starting-soon-color",
    thresholdValueKey: "starting-soon-threshold-value",
    thresholdUnitKey: "starting-soon-threshold-unit",
  });
}
