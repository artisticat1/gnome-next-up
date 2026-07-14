const DEFAULT_LOG_PREFIX = "next-up@artisticat1.github.com";

export default class Log {
  constructor(prefix = DEFAULT_LOG_PREFIX) {
    this._prefix = prefix;
    this._debugEnabled = false;
  }

  setDebugEnabled(enabled) {
    this._debugEnabled = Boolean(enabled);
  }

  info(message, details = null) {
    this.debug(message, details);
  }

  debug(message, details = null) {
    if (!this._debugEnabled) {
      return;
    }

    if (details === null || details === undefined) {
      log(`${this._prefix}: ${message}`);
      return;
    }

    let detailsText = "";
    try {
      detailsText = JSON.stringify(details);
    } catch {
      detailsText = String(details);
    }

    log(`${this._prefix}: ${message} ${detailsText}`);
  }
}
