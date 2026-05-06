'use strict';

const THRESHOLDS = {
  pm1:    [10,  25,   50],    // µg/m³
  pm25:   [12,  35,   55],    // µg/m³
  pm4:    [12,  35,   55],    // µg/m³ (no WHO guideline; use PM2.5 scale)
  pm10:   [50,  100,  150],   // µg/m³
  voc:    [150, 250,  400],   // index
  co2:    [800, 1000, 1500],  // ppm
  no2:    [40,  100,  200],   // µg/m³
  nh3:    [200, 1000, 1500],  // µg/m³
  ch4:    [1000,5000, 25000], // ppm
  h2:     [500, 2000, 10000], // ppm
  ethanol:[100, 500,  1000],  // ppm
  rh:     [60,  70,   80],    // % (above-comfort thresholds)
};

// AQI convention: low = clean, high = polluted
const SCORE_BANDS = [
  { max: 25,  label: 'Good',     color: '#4caf50' },
  { max: 50,  label: 'Moderate', color: '#f9a825' },
  { max: 75,  label: 'Poor',     color: '#ef6c00' },
  { max: 100, label: 'Bad',      color: '#c62828' },
];

const STATUS_LABELS = ['Good', 'Moderate', 'High', 'Very High'];
const STATUS_COLORS = ['#4caf50', '#f9a825', '#ef6c00', '#c62828'];

function scoreInfo(score) {
  return SCORE_BANDS.find(b => score <= b.max);
}

// Returns 0–100 where 0 = clean air, 100 = very polluted (AQI convention).
// Null inputs are skipped so unavailable entities don't contribute a fake penalty.
function computeScore(pm25, voc, co2) {
  let total = 0;
  if (pm25 !== null) total += Math.min(40, (pm25 / 35) * 40);
  if (voc  !== null) total += Math.min(25, (voc  / 300) * 25);
  if (co2  !== null) total += Math.min(35, Math.max(0, (co2 - 400) / 1600) * 35);
  return Math.round(Math.min(100, total));
}

function tileStatus(key, value, cfg) {
  const def = THRESHOLDS[key];
  const t1 = cfg?.[`${key}_t1`] ?? def[0];
  const t2 = cfg?.[`${key}_t2`] ?? def[1];
  const t3 = cfg?.[`${key}_t3`] ?? def[2];
  if (value <= t1) return { idx: 0, pct: (value / t1) * 25 };
  if (value <= t2) return { idx: 1, pct: 25 + ((value - t1) / (t2 - t1)) * 25 };
  if (value <= t3) return { idx: 2, pct: 50 + ((value - t2) / (t3 - t2)) * 25 };
  return { idx: 3, pct: 100 };
}

const CARD_CSS = `
  :host { display: block; }

  ha-card {
    background: var(--ha-card-background, #1c1c1e);
    color: var(--primary-text-color, #fff);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 16px;
    box-sizing: border-box;
    font-family: var(--primary-font-family, sans-serif);
    overflow: hidden;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 14px;
  }

  .gauge-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .score-label {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .right {
    flex: 1;
    min-width: 0;
  }

  .graph-slot {
    width: 100%;
  }

  .graph-slot mini-graph-card {
    --ha-card-background: transparent;
    --ha-card-box-shadow: none;
    --ha-card-border-radius: 0;
    display: block;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 100px));
    gap: 8px;
    justify-content: center;
  }

  .tile {
    background: var(--secondary-background-color, #2c2c2e);
    border-radius: 10px;
    padding: 8px 6px 6px;
    text-align: center;
    min-width: 0;
    cursor: pointer;
  }

  .tile > * {
    pointer-events: none;
  }

  .tile-lbl {
    font-size: 11px;
    color: var(--secondary-text-color, #aaa);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tile-val {
    font-size: 15px;
    font-weight: 700;
    margin: 3px 0 1px;
    line-height: 1;
  }

  .tile-unit {
    font-size: 9px;
    color: var(--secondary-text-color, #aaa);
  }

  .tile-status {
    font-size: 9px;
    margin-bottom: 5px;
    line-height: 1.2;
  }

  .bar-bg {
    background: var(--divider-color, #3a3a3a);
    border-radius: 3px;
    height: 3px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease, background 0.4s ease;
  }

  .na {
    color: var(--secondary-text-color, #aaa);
  }

  .card-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--secondary-text-color, #aaa);
    letter-spacing: 0.3px;
    margin-bottom: 10px;
  }

  .climate-vals {
    display: flex;
    gap: 32px;
    margin-bottom: 2px;
    justify-content: center;
  }

  .climate-val {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .climate-val-label {
    font-size: 11px;
    color: var(--secondary-text-color, #aaa);
  }

  .climate-val-num {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
  }
`;

const TILE_DEFS = [
  { key: 'pm1',     cfgKey: 'pm1_entity',     label: 'PM1.0',    unit: 'µg/m³' },
  { key: 'pm25',    cfgKey: 'pm25_entity',    label: 'PM2.5',    unit: 'µg/m³' },
  { key: 'pm4',     cfgKey: 'pm4_entity',     label: 'PM4.0',    unit: 'µg/m³' },
  { key: 'pm10',    cfgKey: 'pm10_entity',    label: 'PM10',     unit: 'µg/m³' },
  { key: 'voc',     cfgKey: 'voc_entity',     label: 'VOC',      unit: 'idx'   },
  { key: 'co2',     cfgKey: 'co2_entity',     label: 'CO₂',      unit: 'ppm'   },
  { key: 'no2',     cfgKey: 'no2_entity',     label: 'NO₂',      unit: 'µg/m³' },
  { key: 'nh3',     cfgKey: 'nh3_entity',     label: 'NH₃',      unit: 'µg/m³' },
  { key: 'ch4',     cfgKey: 'ch4_entity',     label: 'CH₄',      unit: 'ppm'   },
  { key: 'h2',      cfgKey: 'h2_entity',      label: 'H₂',       unit: 'ppm'   },
  { key: 'ethanol', cfgKey: 'ethanol_entity', label: 'C₂H₅OH',   unit: 'ppm'   },
  { key: 'rh',      cfgKey: 'rh_entity',      label: 'RH',       unit: '%'     },
];

class AirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = null;
    this._hass = null;
    this._built = false;
  }

  static getConfigElement() {
    return document.createElement('air-quality-card-editor');
  }

  static getStubConfig() {
    return {
      device_id: '',
      show_name: true,
      tile_tap_enabled: true,
      name: '',
      aqi_entity: '',
      pm25_entity: '',
      pm1_entity: '',
      pm4_entity: '',
      pm10_entity: '',
      voc_entity: '',
      co2_entity: '',
      no2_entity: '',
      nh3_entity: '',
      ch4_entity: '',
      h2_entity: '',
      ethanol_entity: '',
      rh_entity: '',
      temperature_entity: '',
      humidity_entity: '',
    };
  }

  setConfig(config) {
    if (!config.aqi_entity && !config.pm25_entity) {
      throw new Error('Either aqi_entity or pm25_entity is required');
    }
    this._config = config;
    this._built = false;
    if (this._hass) this._buildAndUpdate();
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    if (!this._built) {
      this._buildAndUpdate();
      return;
    }

    const entities = Object.values(this._config).filter(v => typeof v === 'string' && v);
    const changed = !prev || entities.some(id => hass.states[id] !== prev.states[id]);
    if (changed) this._updateDisplay();

    // Always forward hass to embedded graph cards
    this.shadowRoot.querySelectorAll('mini-graph-card').forEach(c => { c.hass = hass; });
  }

  getCardSize() { return 4; }

  // ── private ──────────────────────────────────────────────

  _stateVal(entityId) {
    if (!entityId || !this._hass) return null;
    const s = this._hass.states[entityId];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _buildAndUpdate() {
    const shadow = this.shadowRoot;

    shadow.innerHTML = `
      <style>${CARD_CSS}</style>
      <ha-card>
        <div id="card-name" class="card-name"></div>
        <div class="top">
          <div class="gauge-wrap">
            <svg id="gauge" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"></svg>
            <div id="score-label" class="score-label"></div>
          </div>
          <div class="right">
            <div class="climate-vals">
              <div class="climate-val" id="temp-val" style="display:none">
                <span class="climate-val-label" style="color:#ffb300">Temperature</span>
                <span class="climate-val-num" id="temp-num"></span>
              </div>
              <div class="climate-val" id="hum-val" style="display:none">
                <span class="climate-val-label" style="color:#42a5f5">Humidity</span>
                <span class="climate-val-num" id="hum-num"></span>
              </div>
            </div>
            <div id="climate-graph" class="graph-slot"></div>
          </div>
        </div>
        <div class="tiles" id="tiles" style="${this._config.columns ? `grid-template-columns:repeat(${this._config.columns},1fr)` : ''}">
          ${TILE_DEFS.filter(t => this._config[t.cfgKey]).map(t => `
            <div class="tile" data-key="${t.key}" data-entity="${this._config[t.cfgKey]}">
              <div class="tile-lbl">${t.label}</div>
              <div class="tile-val na" data-val>—</div>
              <div class="tile-status" data-status></div>
              <div class="bar-bg"><div class="bar" data-bar style="width:0%;background:#3a3a3a"></div></div>
            </div>
          `).join('')}
        </div>
      </ha-card>
    `;

    this._setupGraphs();

    shadow.querySelectorAll('.tile[data-entity]').forEach(tile => {
      tile.addEventListener('click', () => {
        if (this._config.tile_tap_enabled === false) return;
        const entityId = tile.dataset.entity;
        if (!entityId) return;
        const ev = new Event('hass-more-info', { bubbles: true, composed: true });
        ev.detail = { entityId };
        this.dispatchEvent(ev);
      });
    });

    this._built = true;
    this._updateDisplay();
  }

  _setupGraphs() {
    const temp = this._config.temperature_entity;
    const hum  = this._config.humidity_entity;
    const entities = [];
    if (temp) entities.push({ entity: temp, name: 'Temperature', color: '#ffb300' });
    if (hum)  entities.push({ entity: hum,  name: 'Humidity',    color: '#42a5f5' });
    if (!entities.length) return;

    const slot = this.shadowRoot.getElementById('climate-graph');
    if (!slot) return;

    const cfg = {
      entities,
      hours_to_show: 24,
      line_width: 2,
      font_size: 85,
      height: 80,
      fill: false,
      show: { icon: false, name: false, state: false, legend: false, labels: false },
    };

    const card = document.createElement('mini-graph-card');
    slot.appendChild(card);

    const configure = () => {
      customElements.upgrade(card);
      try { card.setConfig(cfg); } catch (_) { card.config = cfg; }
      if (this._hass) card.hass = this._hass;
    };
    if (customElements.get('mini-graph-card')) {
      configure();
    } else {
      customElements.whenDefined('mini-graph-card').then(configure);
    }
  }

  _updateDisplay() {
    const cfg = this._config;

    // Use native AQI entity if available, otherwise compute from pollutants.
    // If no scoring input is available at all, show the gauge as unavailable.
    const nativeAqi = this._stateVal(cfg.aqi_entity);
    const pm25Val   = this._stateVal(cfg.pm25_entity);
    const vocVal    = this._stateVal(cfg.voc_entity);
    const co2Val    = this._stateVal(cfg.co2_entity);
    const hasScore  = nativeAqi !== null || pm25Val !== null;

    const sl = this.shadowRoot.getElementById('score-label');
    if (!hasScore) {
      this._renderGauge(null, null);
      if (sl) { sl.textContent = 'Unavailable'; sl.style.color = 'var(--secondary-text-color, #aaa)'; }
    } else {
      const score = nativeAqi !== null
        ? Math.round(Math.min(500, Math.max(0, nativeAqi)))
        : computeScore(pm25Val, vocVal, co2Val);
      const { label, color } = scoreInfo(score);
      this._renderGauge(score, color);
      if (sl) { sl.textContent = label; sl.style.color = color; }
    }

    // Temperature / humidity current values
    const tempV = this._stateVal(cfg.temperature_entity);
    const humV  = this._stateVal(cfg.humidity_entity);
    const tempEl = this.shadowRoot.getElementById('temp-val');
    const humEl  = this.shadowRoot.getElementById('hum-val');
    if (tempEl) {
      tempEl.style.display = cfg.temperature_entity ? '' : 'none';
      const n = this.shadowRoot.getElementById('temp-num');
      if (n) n.textContent = tempV !== null ? `${tempV.toFixed(1)} °C` : '—';
    }
    if (humEl) {
      humEl.style.display = cfg.humidity_entity ? '' : 'none';
      const n = this.shadowRoot.getElementById('hum-num');
      if (n) n.textContent = humV !== null ? `${humV.toFixed(1)} %` : '—';
    }

    // Device name
    const nameEl = this.shadowRoot.getElementById('card-name');
    if (nameEl) {
      const showName = cfg.show_name !== false;
      if (showName) {
        let name = cfg.name || '';
        if (!name && this._hass) {
          // Infer device_id from any configured entity (auto-discover no longer stores it)
          const entityKeys = Object.keys(cfg).filter(k => k.endsWith('_entity'));
          let deviceId = cfg.device_id || '';
          if (!deviceId && this._hass.entities) {
            for (const key of entityKeys) {
              const eid = cfg[key];
              if (eid && this._hass.entities[eid]?.device_id) {
                deviceId = this._hass.entities[eid].device_id;
                break;
              }
            }
          }
          if (deviceId && this._hass.devices?.[deviceId]) {
            const dev = this._hass.devices[deviceId];
            name = dev.name_by_user || dev.name || '';
          }
        }
        nameEl.textContent = name;
        nameEl.style.display = name ? '' : 'none';
      } else {
        nameEl.style.display = 'none';
      }
    }

    // Pollutant tiles
    TILE_DEFS.forEach(({ key, cfgKey, unit }) => {
      const tile = this.shadowRoot.querySelector(`.tile[data-key="${key}"]`);
      if (!tile) return;
      const val = this._stateVal(cfg[cfgKey]);
      const valEl    = tile.querySelector('[data-val]');
      const statusEl = tile.querySelector('[data-status]');
      const barEl    = tile.querySelector('[data-bar]');

      if (val === null) {
        if (valEl)    { valEl.textContent = '—'; valEl.classList.add('na'); }
        if (statusEl) { statusEl.textContent = 'Unavailable'; statusEl.style.color = 'var(--secondary-text-color, #aaa)'; }
        if (barEl)    { barEl.style.width = '0%'; barEl.style.background = '#3a3a3a'; }
        return;
      }

      const { idx, pct } = tileStatus(key, val, cfg);
      const sColor = STATUS_COLORS[idx];

      if (valEl) {
        valEl.classList.remove('na');
        valEl.innerHTML = `${val.toFixed(1)}<span class="tile-unit"> ${unit}</span>`;
      }
      if (statusEl) { statusEl.textContent = STATUS_LABELS[idx]; statusEl.style.color = sColor; }
      if (barEl)    { barEl.style.width = `${Math.min(100, pct).toFixed(1)}%`; barEl.style.background = sColor; }
    });
  }

  _renderGauge(score, color) {
    const svg = this.shadowRoot.getElementById('gauge');
    if (!svg) return;
    const r = 48, cx = 60, cy = 60;
    const C = 2 * Math.PI * r;
    const unavailable = score === null;
    const filled = unavailable ? 0 : (score / 100) * C;
    const arcColor = unavailable ? 'var(--divider-color,#3a3a3a)' : color;
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="var(--divider-color,#3a3a3a)" stroke-width="10"/>
      ${unavailable ? '' : `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${arcColor}" stroke-width="10"
        stroke-dasharray="${filled.toFixed(2)} ${C.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"/>`}
      <text x="${cx}" y="${cy - 5}" text-anchor="middle"
        fill="${unavailable ? 'var(--secondary-text-color,#aaa)' : 'currentColor'}"
        font-size="${unavailable ? '20' : '28'}" font-weight="700">${unavailable ? '—' : score}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle"
        fill="var(--secondary-text-color,#aaa)" font-size="11">AQI</text>
    `;
  }
}

// ── Config Editor ──────────────────────────────────────────

// Maps HA device_class values to card config keys
const DEVICE_CLASS_MAP = {
  aqi:                               'aqi_entity',
  pm1:                               'pm1_entity',
  pm25:                              'pm25_entity',
  pm4:                               'pm4_entity',
  pm10:                              'pm10_entity',
  volatile_organic_compounds_index:  'voc_entity',
  volatile_organic_compounds:        'voc_entity',
  carbon_dioxide:                    'co2_entity',
  nitrogen_dioxide:                  'no2_entity',
  temperature:                       'temperature_entity',
  humidity:                          'humidity_entity',
};

const EDITOR_FIELDS = [
  { key: 'aqi_entity',         label: 'AQI Entity (uses sensor value directly; falls back to computed)' },
  { key: 'pm25_entity',        label: 'PM2.5 Entity (µg/m³) — required if no AQI entity' },
  { key: 'pm1_entity',         label: 'PM1.0 Entity (µg/m³)' },
  { key: 'pm4_entity',         label: 'PM4.0 Entity (µg/m³)' },
  { key: 'pm10_entity',        label: 'PM10 Entity (µg/m³)' },
  { key: 'voc_entity',         label: 'VOC Index Entity' },
  { key: 'co2_entity',         label: 'CO₂ Entity (ppm)' },
  { key: 'no2_entity',         label: 'NO₂ Entity (µg/m³)' },
  { key: 'nh3_entity',         label: 'NH₃ Ammonia Entity (µg/m³)' },
  { key: 'ch4_entity',         label: 'CH₄ Methane Entity (ppm)' },
  { key: 'h2_entity',          label: 'H₂ Hydrogen Entity (ppm)' },
  { key: 'ethanol_entity',     label: 'C₂H₅OH Ethanol Entity (ppm)' },
  { key: 'rh_entity',          label: 'RH Relative Humidity tile (%)' },
  { key: 'temperature_entity', label: 'Temperature Entity (climate display + graph)' },
  { key: 'humidity_entity',    label: 'Humidity Entity (climate display + graph)' },
];

const TILE_ENTITY_LABELS = {
  pm1_entity:     'PM1.0 Entity (µg/m³)',
  pm25_entity:    'PM2.5 Entity (µg/m³) — required if no AQI entity',
  pm4_entity:     'PM4.0 Entity (µg/m³)',
  pm10_entity:    'PM10 Entity (µg/m³)',
  voc_entity:     'VOC Index Entity',
  co2_entity:     'CO₂ Entity (ppm)',
  no2_entity:     'NO₂ Entity (µg/m³)',
  nh3_entity:     'NH₃ Ammonia Entity (µg/m³)',
  ch4_entity:     'CH₄ Methane Entity (ppm)',
  h2_entity:      'H₂ Hydrogen Entity (ppm)',
  ethanol_entity: 'C₂H₅OH Ethanol Entity (ppm)',
  rh_entity:      'RH Relative Humidity tile (%)',
};

// Each pollutant entity picker is immediately followed by its collapsible threshold section.
const TILE_ENTITY_SCHEMA = TILE_DEFS.flatMap(({ key, cfgKey, label, unit }) => [
  { name: cfgKey, label: TILE_ENTITY_LABELS[cfgKey], selector: { entity: { domain: 'sensor' } } },
  {
    type: 'expandable',
    title: `${label} Thresholds`,
    schema: [
      { name: `${key}_t1`, label: `Good (≤ ${unit})`,     selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      { name: `${key}_t2`, label: `Moderate (≤ ${unit})`, selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      { name: `${key}_t3`, label: `High (≤ ${unit})`,     selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
    ],
  },
]);

// Boolean fields that should default to true when not yet set in config.
const BOOLEAN_DEFAULTS = {
  show_name:        true,
  tile_tap_enabled: true,
};

const EDITOR_SCHEMA = [
  { name: 'show_name',          label: 'Show device name',                               selector: { boolean: {} } },
  { name: 'tile_tap_enabled',   label: 'Tap tile to open entity details',                selector: { boolean: {} } },
  { name: 'name',               label: 'Name override (leave blank to use device name)', selector: { text: {} } },
  { name: 'columns',            label: 'Tile columns (leave blank for auto)',             selector: { number: { min: 1, max: 10, step: 1, mode: 'box' } } },
  { name: 'aqi_entity',         label: 'AQI Entity (uses sensor value directly)',         selector: { entity: { domain: 'sensor' } } },
  ...TILE_ENTITY_SCHEMA,
  { name: 'temperature_entity', label: 'Temperature Entity',                              selector: { entity: { domain: 'sensor', device_class: 'temperature' } } },
  { name: 'humidity_entity',    label: 'Humidity Entity',                                 selector: { entity: { domain: 'sensor', device_class: 'humidity' } } },
];

class AirQualityCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._built = false;
  }

  connectedCallback() {
    if (!this._built) this._build();
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._built) this._updateForm();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const form = this.shadowRoot.querySelector('ha-form');
    if (form) form.hass = hass;
  }

  _fireConfigChanged(config) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  _formData() {
    const data = {};
    const fill = (items) => items.forEach(item => {
      if (item.schema) {
        fill(item.schema);
      } else if (item.name) {
        if (item.selector?.boolean) {
          data[item.name] = this._config[item.name] ?? (BOOLEAN_DEFAULTS[item.name] ?? false);
        } else if (item.selector?.number !== undefined) {
          const m = item.name.match(/^(.+)_t([123])$/);
          const def = m ? (THRESHOLDS[m[1]]?.[parseInt(m[2]) - 1] ?? 0) : null;
          data[item.name] = this._config[item.name] ?? def;
        } else {
          data[item.name] = this._config[item.name] ?? '';
        }
      }
    });
    fill(EDITOR_SCHEMA);
    return data;
  }

  _build() {
    if (this._built) return;
    this._built = true;

    const shadow = this.shadowRoot;
    shadow.innerHTML = `<style>:host{display:block} ha-form{display:block}</style>`;

    const form = document.createElement('ha-form');
    form.schema = EDITOR_SCHEMA;
    form.data = this._formData();
    form.computeLabel = (s) => s.label;
    if (this._hass) form.hass = this._hass;

    form.addEventListener('value-changed', e => {
      this._config = { ...this._config, ...e.detail.value };
      this._fireConfigChanged(this._config);
    });

    shadow.appendChild(form);
  }

  _updateForm() {
    const form = this.shadowRoot.querySelector('ha-form');
    if (form) form.data = this._formData();
  }
}

// ── Registration ───────────────────────────────────────────

customElements.define('air-quality-card', AirQualityCard);
customElements.define('air-quality-card-editor', AirQualityCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'air-quality-card',
  name: 'Air Quality Card',
  description: 'Composite air quality score with pollutant tiles and trend graphs',
  preview: true,
  documentationURL: 'https://github.com/wander00-1/ha-air-quality-card',
});
