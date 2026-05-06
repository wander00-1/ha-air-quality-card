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

// Returns 0–100 where 0 = clean air, 100 = very polluted (AQI convention)
function computeScore(pm25, voc, co2) {
  const pm25Penalty = Math.min(40, (pm25 / 35) * 40);
  const vocPenalty  = Math.min(25, (voc  / 300) * 25);
  const co2Penalty  = Math.min(35, Math.max(0, (co2 - 400) / 1600) * 35);
  return Math.round(Math.min(100, pm25Penalty + vocPenalty + co2Penalty));
}

function tileStatus(key, value) {
  const [t1, t2, t3] = THRESHOLDS[key];
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
    align-items: flex-start;
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

  .graphs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .graph-item {
    display: flex;
    flex-direction: column;
  }

  .graph-lbl {
    font-size: 12px;
    color: var(--secondary-text-color, #aaa);
    font-weight: 500;
    margin-bottom: 2px;
  }

  .graph-slot {
    flex: 1;
    min-height: 90px;
    overflow: hidden;
  }

  .graph-slot mini-graph-card {
    --ha-card-background: transparent;
    --ha-card-box-shadow: none;
    --ha-card-border-radius: 0;
    display: block;
    margin-top: -8px;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
  }

  .tile {
    background: var(--secondary-background-color, #2c2c2e);
    border-radius: 10px;
    padding: 8px 6px 6px;
    text-align: center;
    min-width: 0;
  }

  .tile-lbl {
    font-size: 10px;
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
            <div class="graphs">
              <div class="graph-item">
                <div class="graph-lbl">Temperature</div>
                <div id="temp-graph" class="graph-slot"></div>
              </div>
              <div class="graph-item">
                <div class="graph-lbl">Humidity</div>
                <div id="hum-graph" class="graph-slot"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="tiles" id="tiles">
          ${TILE_DEFS.filter(t => this._config[t.cfgKey]).map(t => `
            <div class="tile" data-key="${t.key}">
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
    this._built = true;
    this._updateDisplay();
  }

  _setupGraphs() {
    const graphConfig = (entityId) => ({
      entities: [{ entity: entityId }],
      hours_to_show: 24,
      line_width: 2,
      font_size: 85,
      show: { icon: false, name: false, state: true, legend: false },
    });

    const mount = (slotId, entityId) => {
      if (!entityId) return;
      const slot = this.shadowRoot.getElementById(slotId);
      if (!slot) return;
      const cfg = graphConfig(entityId);
      const card = document.createElement('mini-graph-card');
      slot.appendChild(card);
      // Force synchronous upgrade if mini-graph-card is already registered,
      // otherwise wait for it to be defined then upgrade.
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
    };

    mount('temp-graph', this._config.temperature_entity);
    mount('hum-graph',  this._config.humidity_entity);
  }

  _updateDisplay() {
    const cfg = this._config;

    // Use native AQI entity if available, otherwise compute from pollutants
    const nativeAqi = this._stateVal(cfg.aqi_entity);
    const score = nativeAqi !== null
      ? Math.round(Math.min(500, Math.max(0, nativeAqi)))
      : computeScore(
          this._stateVal(cfg.pm25_entity) ?? 0,
          this._stateVal(cfg.voc_entity)  ?? 0,
          this._stateVal(cfg.co2_entity)  ?? 400,
        );
    const { label, color } = scoreInfo(score);

    this._renderGauge(score, color);

    const sl = this.shadowRoot.getElementById('score-label');
    if (sl) { sl.textContent = label; sl.style.color = color; }

    // Device name
    const nameEl = this.shadowRoot.getElementById('card-name');
    if (nameEl) {
      const showName = cfg.show_name !== false;
      if (showName) {
        let name = cfg.name || '';
        if (!name && cfg.device_id && this._hass?.devices?.[cfg.device_id]) {
          const dev = this._hass.devices[cfg.device_id];
          name = dev.name_by_user || dev.name || '';
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
        if (statusEl) statusEl.textContent = '';
        if (barEl)    { barEl.style.width = '0%'; barEl.style.background = '#3a3a3a'; }
        return;
      }

      const { idx, pct } = tileStatus(key, val);
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
    // Ring fill represents pollution level: low fill = clean, full = very polluted
    const filled = (score / 100) * C;
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="var(--divider-color,#3a3a3a)" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${color}" stroke-width="10"
        stroke-dasharray="${filled.toFixed(2)} ${C.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy - 5}" text-anchor="middle"
        fill="currentColor" font-size="28" font-weight="700">${score}</text>
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

const EDITOR_CSS = `
  :host { display: block; }
  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--secondary-text-color);
    margin: 16px 0 4px;
  }
  hr {
    border: none;
    border-top: 1px solid var(--divider-color, #e0e0e0);
    margin: 16px 0;
  }
  ha-entity-picker { display: block; margin-bottom: 8px; }
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    margin-bottom: 4px;
  }
  .toggle-row span { font-size: 14px; color: var(--primary-text-color); }
  .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; inset: 0;
    background: var(--divider-color, #555);
    border-radius: 20px; cursor: pointer; transition: 0.2s;
  }
  .slider:before {
    content: ''; position: absolute;
    width: 14px; height: 14px; left: 3px; bottom: 3px;
    background: #fff; border-radius: 50%; transition: 0.2s;
  }
  input:checked + .slider { background: var(--primary-color, #03a9f4); }
  input:checked + .slider:before { transform: translateX(16px); }
  .text-input {
    width: 100%;
    background: var(--secondary-background-color, #2c2c2e);
    border: 1px solid var(--divider-color, #555);
    border-radius: 4px;
    color: var(--primary-text-color, #fff);
    font-size: 13px;
    font-family: monospace;
    padding: 8px 10px;
    box-sizing: border-box;
    outline: none;
    margin-bottom: 8px;
  }
  .text-input:focus { border-color: var(--primary-color, #03a9f4); }
  label.field-label {
    display: block;
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-bottom: 3px;
  }
  .hint {
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-bottom: 6px;
  }
`;

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
    if (this._built) this._syncValues();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._populateDatalist();
  }

  _autoDiscover(seedEntityId) {
    if (!seedEntityId || !this._hass?.entities) return;
    const seedEntry = this._hass.entities[seedEntityId];
    const deviceId = seedEntry?.device_id;
    if (!deviceId) return;

    const discovered = {};
    Object.values(this._hass.entities).forEach(entry => {
      if (entry.device_id !== deviceId) return;
      const state = this._hass.states[entry.entity_id];
      const dc = state?.attributes?.device_class;
      if (dc && DEVICE_CLASS_MAP[dc] && !discovered[DEVICE_CLASS_MAP[dc]]) {
        discovered[DEVICE_CLASS_MAP[dc]] = entry.entity_id;
      }
    });

    const updated = { ...this._config, device_id: deviceId, ...discovered };
    this._config = updated;
    this._syncValues();
    this._fireConfigChanged(updated);
  }

  _fireConfigChanged(config) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  _build() {
    if (this._built) return;
    this._built = true;

    const shadow = this.shadowRoot;
    // Shared datalist — browser resolves list="" within the same shadow root
    shadow.innerHTML = `
      <style>${EDITOR_CSS}</style>
      <datalist id="aq-entities"></datalist>
      <div>
        <div class="section-label">Card name</div>
        <div class="toggle-row">
          <span>Show device name</span>
          <label class="toggle">
            <input type="checkbox" id="show-name-toggle">
            <span class="slider"></span>
          </label>
        </div>
        <label class="field-label">Name override (leave blank to use device name)</label>
        <input type="text" class="text-input" id="name-input" placeholder="e.g. Living Room Air Quality">
        <hr>
        <div class="section-label">Auto-discover from device</div>
        <div class="hint">Type any entity ID from your device — all others will be filled in automatically</div>
        <input type="text" class="text-input" id="seed-input" list="aq-entities" placeholder="sensor.my_device_pm25" autocomplete="off">
        <hr>
        <div class="section-label">Entities</div>
        ${EDITOR_FIELDS.map(f => `
          <label class="field-label">${f.label}</label>
          <input type="text" class="text-input" data-key="${f.key}" list="aq-entities" placeholder="sensor.…" autocomplete="off">
        `).join('')}
      </div>`;

    shadow.querySelector('#show-name-toggle').addEventListener('change', ev => {
      this._config = { ...this._config, show_name: ev.target.checked };
      this._fireConfigChanged(this._config);
    });

    shadow.querySelector('#name-input').addEventListener('change', ev => {
      this._config = { ...this._config, name: ev.target.value };
      this._fireConfigChanged(this._config);
    });

    shadow.querySelector('#seed-input').addEventListener('change', ev => {
      const val = ev.target.value.trim();
      if (val) this._autoDiscover(val);
    });

    shadow.querySelectorAll('input[data-key]').forEach(inp => {
      inp.addEventListener('change', ev => {
        this._config = { ...this._config, [inp.dataset.key]: ev.target.value.trim() };
        this._fireConfigChanged(this._config);
      });
    });

    this._populateDatalist();
    this._syncValues();
  }

  _populateDatalist() {
    const dl = this.shadowRoot?.querySelector('#aq-entities');
    if (!dl || !this._hass) return;
    dl.innerHTML = Object.keys(this._hass.states)
      .sort()
      .map(id => `<option value="${id}">`)
      .join('');
  }

  _syncValues() {
    if (!this._built) return;
    const shadow = this.shadowRoot;

    const toggle = shadow.querySelector('#show-name-toggle');
    if (toggle) toggle.checked = this._config.show_name !== false;

    const nameInput = shadow.querySelector('#name-input');
    if (nameInput) nameInput.value = this._config.name || '';

    shadow.querySelectorAll('input[data-key]').forEach(inp => {
      const val = this._config[inp.dataset.key] || '';
      if (inp.value !== val) inp.value = val;
    });
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
