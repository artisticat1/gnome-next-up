import * as Main from "resource:///org/gnome/shell/ui/main.js";

function disconnectSignal(target, signalId) {
  if (!target || !signalId) {
    return;
  }

  target.disconnect(signalId);
}

function logSettingChange(extension, key, value) {
  extension._logger.info(`desktop-background: setting changed: ${key}`, {
    value,
  });
}

export function connectDesktopBackgroundActions(extension) {
  const settings = extension._settings;
  const layoutManager = Main.layoutManager ?? null;

  const handles = {
    settings,
    layoutManager,
  };

  handles.showOnDesktopChangedSignal = settings.connect(
    "changed::show-on-desktop",
    () => {
      logSettingChange(
        extension,
        "show-on-desktop",
        settings.get_boolean("show-on-desktop")
      );
      extension.refreshIndicator();
    }
  );
  handles.desktopEventsToShowChangedSignal = settings.connect(
    "changed::desktop-events-to-show",
    () => {
      logSettingChange(
        extension,
        "desktop-events-to-show",
        settings.get_int("desktop-events-to-show")
      );
      extension.refreshIndicator();
    }
  );
  handles.desktopHorizontalAlignChangedSignal = settings.connect(
    "changed::desktop-horizontal-align",
    () => {
      logSettingChange(
        extension,
        "desktop-horizontal-align",
        settings.get_int("desktop-horizontal-align")
      );
      extension._setDesktopMessage(extension._getCurrentDesktopText());
    }
  );
  handles.desktopVerticalAlignChangedSignal = settings.connect(
    "changed::desktop-vertical-align",
    () => {
      logSettingChange(
        extension,
        "desktop-vertical-align",
        settings.get_int("desktop-vertical-align")
      );
      extension._setDesktopMessage(extension._getCurrentDesktopText());
    }
  );
  handles.desktopFontSizeChangedSignal = settings.connect(
    "changed::desktop-font-size",
    () => {
      logSettingChange(
        extension,
        "desktop-font-size",
        settings.get_int("desktop-font-size")
      );
      extension._setDesktopMessage(extension._getCurrentDesktopText());
    }
  );
  handles.monitorsChangedSignal = layoutManager
    ? layoutManager.connect("monitors-changed", () => {
        extension._logger.info("desktop-background: monitors changed");
        extension._repositionDesktopMessageLabel();
      })
    : 0;

  return handles;
}

export function disconnectDesktopBackgroundActions(handles) {
  if (!handles) {
    return;
  }

  const { settings, layoutManager } = handles;

  disconnectSignal(settings, handles.showOnDesktopChangedSignal);
  disconnectSignal(settings, handles.desktopEventsToShowChangedSignal);
  disconnectSignal(settings, handles.desktopHorizontalAlignChangedSignal);
  disconnectSignal(settings, handles.desktopVerticalAlignChangedSignal);
  disconnectSignal(settings, handles.desktopFontSizeChangedSignal);
  disconnectSignal(layoutManager, handles.monitorsChangedSignal);
}
