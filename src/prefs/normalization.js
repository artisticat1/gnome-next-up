import {
  DEFAULT_COMING_UP_COLOR,
  DEFAULT_STARTING_SOON_COLOR,
  MAX_REFRESH_INTERVAL_VALUE,
  MAX_STATUS_THRESHOLD_VALUE,
  MIN_REFRESH_INTERVAL_VALUE,
  MIN_STATUS_THRESHOLD_VALUE,
  REFRESH_INTERVAL_UNIT,
  THRESHOLD_UNIT,
} from "./constants.js";
import { clamp } from "./helpers.js";

function normalizeStatusThresholdSettings(settings, valueKey, unitKey, defaultUnit) {
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

export function normalizeRefreshIntervalSettings(settings) {
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

export function normalizeStatusHighlightSettings(settings) {
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
