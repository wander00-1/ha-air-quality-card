# Changelog

## [1.1.1] - 2026-06-29

### Fixed
- AQI gauge ring now scales correctly for native AQI entities (0–500 range) — previously any value ≥ 100 filled the entire ring, making Moderate, Poor, and Bad visually identical

## [1.1.0] - 2026-06-28

### Added
- Compact tile editor — only configured tiles are shown; add via dropdown, reorder with ▲▼ or drag-and-drop, remove with ✕, expand per-tile settings with ⚙
- Custom tile support — add any sensor as a tile with a configurable label, unit, and thresholds; unlimited instances
- New cards default to PM1.0, PM2.5, PM4.0, PM10, VOC, and CO₂ tiles pre-added
- Editor split into Display, Entities, and Pollutant Tiles sections
- Add tile dropdown shows full chemical name, symbol, and unit for easy identification

## [1.0.5] - 2026-06-28

### Added
- SO₂ (Sulphur Dioxide), O₃ (Ozone), and CO (Carbon Monoxide) pollutant tiles with EPA AQI default thresholds — all configurable via the visual editor (closes #1)

## [1.0.4] - 2026-05-11

### Added
- `use_chemical_names` toggle in the visual editor — switches tile labels from chemical symbols (CO₂, NH₃) to full names (Carbon Dioxide, Ammonia). Per-tile label overrides still take priority.

## [1.0.3] - 2026-05-10

### Fixed
- Native AQI entity now correctly shows Poor (not Bad) for values 101–200 — fix from 1.0.2 required a new release number for HACS to re-download the updated file

## [1.0.2] - 2026-05-10

### Fixed
- Configuration error when native AQI entity returns values above 100 (US AQI scale goes to 500) — `scoreInfo` now falls back to the Bad band instead of crashing
- Gauge arc capped at 100% fill so it does not overflow the circle for high AQI values
- `setConfig` ignores null config calls sent by some HA versions during the card lifecycle
- Native AQI entity now uses correct US AQI scale bands (0–50 Good, 51–100 Moderate, 101–200 Poor, >200 Bad) instead of the computed score bands

## [1.0.1] - 2026-05-10

### Fixed
- Card renders as blank space instead of showing content after upgrading or creating a new card — removed the hard validation throw from `setConfig` so the card renders gracefully with an unavailable gauge when no scoring entities are configured yet

## [1.0.0] - 2026-05-06

### Added
- Circular AQI gauge with computed score (PM2.5, VOC, CO₂) or native AQI entity
- Pollutant tiles: PM1, PM2.5, PM4, PM10, VOC, CO₂, NO₂, NH₃, CH₄, H₂, C₂H₅OH, RH
- Per-tile configurable thresholds and label overrides via the visual editor
- Combined temperature and humidity trend graph via mini-graph-card
- Tap any tile to open entity detail popup
- Unavailable/unknown entity state handling — gauge and tiles indicate offline sensors
- Responsive tile grid with width cap
- ha-form visual config editor — no YAML required
- MIT license
