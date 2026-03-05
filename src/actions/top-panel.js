function disconnectSignal(target, signalId) {
  if (!target || !signalId) {
    return;
  }

  target.disconnect(signalId);
}

function logSettingChange(extension, key, value) {
  extension._logger.info(`top-panel: setting changed: ${key}`, { value });
}

export function connectTopPanelActions(extension) {
  const settings = extension._settings;
  const calendarSource = extension._indicator?._calendarSource ?? null;

  const handles = {
    settings,
    calendarSource,
  };

  handles.whichPanelChangedSignal = settings.connect("changed::which-panel", () => {
    logSettingChange(extension, "which-panel", settings.get_int("which-panel"));
    extension.unloadIndicator();
    extension.loadIndicator();
  });
  handles.eventLookaheadChangedSignal = settings.connect(
    "changed::event-lookahead",
    () => {
      logSettingChange(
        extension,
        "event-lookahead",
        settings.get_int("event-lookahead")
      );
      extension.refreshIndicator();
    }
  );
  handles.showOnlyTimerChangedSignal = settings.connect(
    "changed::show-only-timer",
    () => {
      logSettingChange(
        extension,
        "show-only-timer",
        settings.get_boolean("show-only-timer")
      );
      extension.refreshIndicator();
    }
  );
  handles.use24HourFormatChangedSignal = settings.connect(
    "changed::use-24-hour-format",
    () => {
      logSettingChange(
        extension,
        "use-24-hour-format",
        settings.get_boolean("use-24-hour-format")
      );
      extension.refreshIndicator();
    }
  );
  handles.refreshIntervalValueChangedSignal = settings.connect(
    "changed::refresh-interval-value",
    () => {
      logSettingChange(
        extension,
        "refresh-interval-value",
        settings.get_int("refresh-interval-value")
      );
      extension._restartLoop();
    }
  );
  handles.refreshIntervalUnitChangedSignal = settings.connect(
    "changed::refresh-interval-unit",
    () => {
      logSettingChange(
        extension,
        "refresh-interval-unit",
        settings.get_int("refresh-interval-unit")
      );
      extension._restartLoop();
    }
  );
  handles.comingUpColorChangedSignal = settings.connect(
    "changed::coming-up-color",
    () => {
      logSettingChange(
        extension,
        "coming-up-color",
        settings.get_string("coming-up-color")
      );
      extension.refreshIndicator();
    }
  );
  handles.comingUpThresholdValueChangedSignal = settings.connect(
    "changed::coming-up-threshold-value",
    () => {
      logSettingChange(
        extension,
        "coming-up-threshold-value",
        settings.get_int("coming-up-threshold-value")
      );
      extension.refreshIndicator();
    }
  );
  handles.comingUpThresholdUnitChangedSignal = settings.connect(
    "changed::coming-up-threshold-unit",
    () => {
      logSettingChange(
        extension,
        "coming-up-threshold-unit",
        settings.get_int("coming-up-threshold-unit")
      );
      extension.refreshIndicator();
    }
  );
  handles.startingSoonColorChangedSignal = settings.connect(
    "changed::starting-soon-color",
    () => {
      logSettingChange(
        extension,
        "starting-soon-color",
        settings.get_string("starting-soon-color")
      );
      extension.refreshIndicator();
    }
  );
  handles.startingSoonThresholdValueChangedSignal = settings.connect(
    "changed::starting-soon-threshold-value",
    () => {
      logSettingChange(
        extension,
        "starting-soon-threshold-value",
        settings.get_int("starting-soon-threshold-value")
      );
      extension.refreshIndicator();
    }
  );
  handles.startingSoonThresholdUnitChangedSignal = settings.connect(
    "changed::starting-soon-threshold-unit",
    () => {
      logSettingChange(
        extension,
        "starting-soon-threshold-unit",
        settings.get_int("starting-soon-threshold-unit")
      );
      extension.refreshIndicator();
    }
  );
  handles.calendarSourceChangedSignal = calendarSource
    ? calendarSource.connect("changed", () => {
        extension._logger.info("top-panel: calendar source changed");
        extension._markCalendarInitialSyncComplete("calendar-source-changed");
        extension.refreshIndicator();
      })
    : 0;

  return handles;
}

export function disconnectTopPanelActions(handles) {
  if (!handles) {
    return;
  }

  const { settings, calendarSource } = handles;

  disconnectSignal(settings, handles.whichPanelChangedSignal);
  disconnectSignal(settings, handles.eventLookaheadChangedSignal);
  disconnectSignal(settings, handles.showOnlyTimerChangedSignal);
  disconnectSignal(settings, handles.use24HourFormatChangedSignal);
  disconnectSignal(settings, handles.refreshIntervalValueChangedSignal);
  disconnectSignal(settings, handles.refreshIntervalUnitChangedSignal);
  disconnectSignal(settings, handles.comingUpColorChangedSignal);
  disconnectSignal(settings, handles.comingUpThresholdValueChangedSignal);
  disconnectSignal(settings, handles.comingUpThresholdUnitChangedSignal);
  disconnectSignal(settings, handles.startingSoonColorChangedSignal);
  disconnectSignal(settings, handles.startingSoonThresholdValueChangedSignal);
  disconnectSignal(settings, handles.startingSoonThresholdUnitChangedSignal);
  disconnectSignal(calendarSource, handles.calendarSourceChangedSignal);
}
