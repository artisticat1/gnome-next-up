import * as Main from "resource:///org/gnome/shell/ui/main.js";

const DEBUG_LOGS_SETTINGS_KEY = "debug-logs-enabled";

function disconnectSignal(target, signalId) {
  if (!target || !signalId) {
    return;
  }

  target.disconnect(signalId);
}

function getScreenShieldSnapshot(extension) {
  const shield = Main.screenShield ?? null;
  const lockDialogGroup = shield?._lockDialogGroup ?? null;
  const lockDialogChildren = lockDialogGroup?.get_children?.() ?? [];

  return {
    active: shield?.active ?? null,
    locked: shield?.locked ?? null,
    hasDialog: Boolean(shield?._dialog),
    hasDetectedDialog: Boolean(extension._getLockScreenDialog?.()),
    hasLockDialogGroup: Boolean(lockDialogGroup),
    lockDialogChildrenCount: lockDialogChildren.length,
    hasClockLabel: Boolean(extension._lockScreenMessageLabel),
    hasPromptLabel: Boolean(extension._unlockPromptMessageLabel),
    hasFallbackLabel: Boolean(extension._lockScreenFallbackLabel),
    sessionMode: Main.sessionMode?.currentMode ?? null,
  };
}

function logLockScreenEvent(extension, eventName, details = {}) {
  const payload = {
    ...getScreenShieldSnapshot(extension),
    ...details,
  };
  extension._logger.info(`lock-screen: event: ${eventName}`, payload);
  extension._debugLockScreen(`event: ${eventName}`, payload);
}

export function connectLockScreenActions(extension) {
  const settings = extension._settings;
  const screenShield = Main.screenShield ?? null;

  extension._debugLogsEnabled = settings.get_boolean(DEBUG_LOGS_SETTINGS_KEY);
  extension._logger.setDebugEnabled(extension._debugLogsEnabled);
  logLockScreenEvent(extension, "connect-actions");
  extension._debugLockScreen("Initialized lock-screen actions", {
    debugLogsEnabled: extension._debugLogsEnabled,
    hasScreenShield: Boolean(screenShield),
  });

  const handles = {
    settings,
    screenShield,
  };

  handles.debugLogsEnabledChangedSignal = settings.connect(
    `changed::${DEBUG_LOGS_SETTINGS_KEY}`,
    () => {
      const debugLogsEnabled = settings.get_boolean(DEBUG_LOGS_SETTINGS_KEY);
      logLockScreenEvent(extension, "changed::debug-logs-enabled", {
        value: debugLogsEnabled,
      });

      extension._debugLogsEnabled = debugLogsEnabled;
      extension._logger.setDebugEnabled(debugLogsEnabled);

      extension._debugLockScreen("Setting changed: debug-logs-enabled", {
        enabled: extension._debugLogsEnabled,
      });
    }
  );
  handles.showOnLockScreenChangedSignal = settings.connect(
    "changed::show-on-lock-screen",
    () => {
      logLockScreenEvent(extension, "changed::show-on-lock-screen", {
        value: settings.get_boolean("show-on-lock-screen"),
      });
      extension._debugLockScreen("Setting changed: show-on-lock-screen", {
        enabled: settings.get_boolean("show-on-lock-screen"),
      });
      extension.refreshIndicator();
    }
  );
  handles.lockScreenFontSizeChangedSignal = settings.connect(
    "changed::lock-screen-font-size",
    () => {
      logLockScreenEvent(extension, "changed::lock-screen-font-size", {
        value: settings.get_int("lock-screen-font-size"),
      });
      extension._debugLockScreen("Setting changed: lock-screen-font-size", {
        fontSize: settings.get_int("lock-screen-font-size"),
      });
      extension._setLockScreenMessage(extension._getCurrentIndicatorText());
    }
  );
  handles.lockScreenActiveChangedSignal = screenShield
    ? screenShield.connect("active-changed", () => {
        logLockScreenEvent(extension, "screenShield active-changed", {
          active: Main.screenShield?.active ?? null,
        });
        extension._debugLockScreen("screenShield active-changed", {
          active: Main.screenShield?.active ?? null,
        });
        extension.refreshIndicator();
      })
    : 0;
  handles.lockScreenLockedChangedSignal = screenShield
    ? screenShield.connect("locked-changed", () => {
        logLockScreenEvent(extension, "screenShield locked-changed", {
          locked: Main.screenShield?.locked ?? null,
        });
        extension._debugLockScreen("screenShield locked-changed", {
          locked: Main.screenShield?.locked ?? null,
        });
        extension.refreshIndicator();
      })
    : 0;
  handles.lockScreenShownSignal = screenShield
    ? screenShield.connect("lock-screen-shown", () => {
        logLockScreenEvent(extension, "screenShield lock-screen-shown", {
          active: Main.screenShield?.active ?? null,
          locked: Main.screenShield?.locked ?? null,
          hasDialog: Boolean(Main.screenShield?._dialog),
        });
        extension._debugLockScreen("screenShield lock-screen-shown", {
          active: Main.screenShield?.active ?? null,
          locked: Main.screenShield?.locked ?? null,
          hasDialog: Boolean(Main.screenShield?._dialog),
        });
        extension.refreshIndicator();
      })
    : 0;
  handles.wakeUpScreenSignal = screenShield
    ? screenShield.connect("wake-up-screen", () => {
        logLockScreenEvent(extension, "screenShield wake-up-screen", {
          active: Main.screenShield?.active ?? null,
          locked: Main.screenShield?.locked ?? null,
        });
      })
    : 0;

  return handles;
}

export function disconnectLockScreenActions(handles) {
  if (!handles) {
    return;
  }

  const { settings, screenShield } = handles;

  disconnectSignal(settings, handles.debugLogsEnabledChangedSignal);
  disconnectSignal(settings, handles.showOnLockScreenChangedSignal);
  disconnectSignal(settings, handles.lockScreenFontSizeChangedSignal);
  disconnectSignal(screenShield, handles.lockScreenActiveChangedSignal);
  disconnectSignal(screenShield, handles.lockScreenLockedChangedSignal);
  disconnectSignal(screenShield, handles.lockScreenShownSignal);
  disconnectSignal(screenShield, handles.wakeUpScreenSignal);
}
