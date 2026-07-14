import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";

function parseColorOrDefault(configuredColor, fallbackColor) {
  const rgba = new Gdk.RGBA();
  const configured = configuredColor?.trim() ?? "";
  if (!rgba.parse(configured) && !rgba.parse(fallbackColor)) {
    rgba.parse("white");
  }
  return rgba;
}

export function createColorPicker(settings, colorKey, defaultColor) {
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
