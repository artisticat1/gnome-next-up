import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

export function buildDesktopBackgroundSection(settings, desktopBackgroundGroup) {
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
}
