# Air Quality Card for Home Assistant

A HACS-compatible Lovelace card that displays a composite air quality score, pollutant breakdowns, and environmental trends — all driven by your own sensor entities.

## Features

- Circular AQI gauge with color-coded score (0–100)
- Pollutant tiles: PM1.0, PM2.5, PM10, VOC, CO₂ with threshold-based status and progress bars
- Temperature and humidity display
- 24-hour trend graphs via [mini-graph-card](https://github.com/kalkih/mini-graph-card)
- Visual config editor with entity pickers — no YAML required
- No hardcoded entities; works with any sensor integration

## Installation

### HACS (recommended)

1. In HACS → Frontend, click the three-dot menu → **Custom repositories**
2. Add `https://github.com/wander00-1/ha-air-quality-card` as type **Dashboard**
3. Install **Air Quality Card**
4. Reload your browser

### Manual

Copy `air-quality-card.js` to `/config/www/` and add a Lovelace resource:

```yaml
url: /local/air-quality-card.js
type: module
```

## Dependencies

Install [mini-graph-card](https://github.com/kalkih/mini-graph-card) via HACS for temperature and humidity trend graphs. The card renders without it — trend slots will be empty.

## Configuration

Use the visual editor, or add YAML manually:

```yaml
type: custom:air-quality-card
pm25_entity: sensor.particulate_matter_2_5um
pm1_entity: sensor.particulate_matter_1um
pm10_entity: sensor.particulate_matter_10um
voc_entity: sensor.volatile_organic_compounds_index
co2_entity: sensor.carbon_dioxide
temperature_entity: sensor.temperature
humidity_entity: sensor.humidity
```

| Key | Required | Description |
|-----|:--------:|-------------|
| `pm25_entity` | ✅ | PM2.5 sensor (µg/m³) — used for scoring |
| `pm1_entity` | — | PM1.0 sensor (µg/m³) |
| `pm10_entity` | — | PM10 sensor (µg/m³) |
| `voc_entity` | — | VOC index sensor (0–500 scale) — used for scoring |
| `co2_entity` | — | CO₂ sensor (ppm) — used for scoring |
| `temperature_entity` | — | Temperature sensor |
| `humidity_entity` | — | Humidity sensor |

## Scoring

Score starts at 100 and penalties are subtracted based on pollutant levels:

| Pollutant | Max Penalty | Threshold |
|-----------|:-----------:|-----------|
| PM2.5 | 40 pts | WHO 24h guideline (35 µg/m³) |
| VOC | 25 pts | Index 300 |
| CO₂ | 35 pts | Baseline 400 ppm, max 2000 ppm |

| Score | Status |
|:-----:|--------|
| 80–100 | 🟢 Good |
| 60–79 | 🟡 Moderate |
| 40–59 | 🟠 Poor |
| 0–39 | 🔴 Bad |

## Tile Thresholds

| Pollutant | Good | Moderate | High | Very High |
|-----------|------|----------|------|-----------|
| PM1.0 | ≤ 10 | ≤ 25 | ≤ 50 | > 50 |
| PM2.5 | ≤ 12 | ≤ 35 | ≤ 55 | > 55 |
| PM10 | ≤ 50 | ≤ 100 | ≤ 150 | > 150 |
| VOC | ≤ 150 | ≤ 250 | ≤ 400 | > 400 |
| CO₂ (ppm) | ≤ 800 | ≤ 1000 | ≤ 1500 | > 1500 |

## Development Roadmap

- [x] **v0.1** — HACS project scaffold (hacs.json, README, card registration)
- [x] **v0.2** — Core card rendering with entity inputs and scoring engine
- [x] **v0.3** — Pollutant tiles with status labels and progress bars
- [x] **v0.4** — Visual config editor with `ha-entity-picker`
- [x] **v0.5** — mini-graph-card trend graph integration
- [ ] **v0.6** — Unavailable/unknown entity state handling
- [ ] **v0.7** — Optional card title, responsive tile layout improvements
- [ ] **v1.0** — Stable release, HACS default repository submission

## Credits

Scoring thresholds based on WHO, EPA, and ASHRAE guidelines.
Original design concept by [jerahmeel-sudo](https://github.com/jerahmeel-sudo/Custom-Air-Quality-Card-with-score-trends-and-pollutant-tiles/).
