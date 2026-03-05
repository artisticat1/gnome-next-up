import Adw from "gi://Adw";
import Gio from "gi://Gio";

export function buildDeveloperSection(settings, developerGroup) {
  const debugLogsRow = new Adw.SwitchRow({
    title: "Enable debug logs",
    subtitle: "Write debug details to GNOME Shell logs",
  });
  settings.bind(
    "debug-logs-enabled",
    debugLogsRow,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  developerGroup.add(debugLogsRow);
}
