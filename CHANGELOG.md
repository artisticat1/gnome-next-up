# Changelog

## Unreleased

### Added
- `Colors` settings section with color pickers for `Coming up` and `Starting soon`.
- Threshold settings for `Coming up` and `Starting soon` (value + minutes/hours unit).
- Top bar `Show only timer` toggle.
- `Latest changelog` section in `README.md` with a link to this file.

### Changed
- Refresh interval settings simplified to `Seconds` and `Minutes` only.
- Refresh interval value clamped to `1-60`.
- Top bar timer text now uses `In ...` and `Ends in ...`.
- Time formatting split by context: compact in top bar, detailed (`days, hours, minutes`) on lock screen and desktop.
- Event icon behavior updated: Calendar for normal event state, Alarm only for `starting soon`, Confetti when no events.
- `Colors` section moved to the last section in preferences.
