import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

export function buildLockScreenSection(settings, lockScreenGroup) {
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
}
