import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {
  MAX_REFRESH_INTERVAL_VALUE,
  MIN_REFRESH_INTERVAL_VALUE,
} from "../constants.js";
import { clamp } from "../helpers.js";

export function buildTopPanelSection(settings, topPaneGroup) {
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
}
