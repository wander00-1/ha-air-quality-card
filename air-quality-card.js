'use strict';

// Synchronous — Lovelace scans window.customCards at page load.
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'air-quality-card',
  name: 'Air Quality Card',
  description: 'Composite air quality score with pollutant tiles and trend graphs',
  preview: true,
  documentationURL: 'https://github.com/wander00-1/ha-air-quality-card',
});

(async () => {

await customElements.whenDefined('home-assistant-main');

// Strategy 1: import('lit') works when HA has an importmap for it (some builds do).
// Strategy 2: walk the prototype chain and find LitElement by its stable _$litElement$
//   marker, then create a synthetic html that produces TemplateResult objects Lit
//   already knows how to process (_$litType$ is explicitly unminified in Lit's build).
let LitElement, html;
try {
  ({ LitElement, html } = await import('lit'));
} catch (_) {
  let proto = customElements.get('home-assistant-main');
  while (proto && !Object.prototype.hasOwnProperty.call(proto, '_$litElement$')) {
    proto = Object.getPrototypeOf(proto);
  }
  LitElement = proto;
  html = (strings, ...values) => ({ _$litType$: 1, strings, values });
}

if (!LitElement || !html) {
  console.error('[air-quality-card] Could not load LitElement from HA — minimum HA 2023.9 required.');
  return;
}

// Styles are injected via createRenderRoot() on each class so we never need
// the css tagged-template function (its CSSResult class is inaccessible from
// outside HA's module closure on most builds).

// ── Data ─────────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  pm1:    [10,  25,   50],
  pm25:   [12,  35,   55],
  pm4:    [12,  35,   55],
  pm10:   [50,  100,  150],
  voc:    [150, 250,  400],
  co2:    [800, 1000, 1500],
  no2:    [40,  100,  200],
  nh3:    [200, 1000, 1500],
  ch4:    [1000,5000, 25000],
  h2:     [500, 2000, 10000],
  ethanol:[100, 500,  1000],
  rh:     [60,  70,   80],
  so2:    [35,  75,   185],
  o3:     [54,  70,   85],
  co:     [4.4, 9.4,  12.4],
};

const SCORE_BANDS = [
  { max: 25,  label: 'Good',     color: '#4caf50' },
  { max: 50,  label: 'Moderate', color: '#f9a825' },
  { max: 75,  label: 'Poor',     color: '#ef6c00' },
  { max: 100, label: 'Bad',      color: '#c62828' },
];

const AQI_BANDS = [
  { max: 50,  label: 'Good',     color: '#4caf50' },
  { max: 100, label: 'Moderate', color: '#f9a825' },
  { max: 200, label: 'Poor',     color: '#ef6c00' },
  { max: 500, label: 'Bad',      color: '#c62828' },
];

const STATUS_LABELS = ['Good', 'Moderate', 'High', 'Very High'];
const STATUS_COLORS = ['#4caf50', '#f9a825', '#ef6c00', '#c62828'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreInfo(score, bands) {
  return bands.find(b => score <= b.max) ?? bands[bands.length - 1];
}

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

function sortedTiles(config) {
  const configured = TILE_DEFS.filter(t => config[t.cfgKey]);
  const order = config.tile_order || [];
  const inOrder = order.map(k => configured.find(t => t.key === k)).filter(Boolean);
  const rest = configured.filter(t => !order.includes(t.key));
  return [...inOrder, ...rest];
}

const CHEMICAL_NAMES = {
  pm1:     'Particulate 1.0µm',
  pm25:    'Particulate 2.5µm',
  pm4:     'Particulate 4.0µm',
  pm10:    'Particulate 10µm',
  voc:     'Organics',
  co2:     'Carbon Dioxide',
  no2:     'Nitrogen Dioxide',
  nh3:     'Ammonia',
  ch4:     'Methane',
  h2:      'Hydrogen',
  ethanol: 'Ethanol',
  rh:      'Relative Humidity',
  so2:     'Sulphur Dioxide',
  o3:      'Ozone',
  co:      'Carbon Monoxide',
};

const TILE_DEFS = [
  { key: 'pm1',     cfgKey: 'pm1_entity',     label: 'PM1.0',  unit: 'µg/m³' },
  { key: 'pm25',    cfgKey: 'pm25_entity',    label: 'PM2.5',  unit: 'µg/m³' },
  { key: 'pm4',     cfgKey: 'pm4_entity',     label: 'PM4.0',  unit: 'µg/m³' },
  { key: 'pm10',    cfgKey: 'pm10_entity',    label: 'PM10',   unit: 'µg/m³' },
  { key: 'voc',     cfgKey: 'voc_entity',     label: 'VOC',    unit: 'idx'   },
  { key: 'co2',     cfgKey: 'co2_entity',     label: 'CO₂',    unit: 'ppm'   },
  { key: 'no2',     cfgKey: 'no2_entity',     label: 'NO₂',    unit: 'µg/m³' },
  { key: 'nh3',     cfgKey: 'nh3_entity',     label: 'NH₃',    unit: 'µg/m³' },
  { key: 'ch4',     cfgKey: 'ch4_entity',     label: 'CH₄',    unit: 'ppm'   },
  { key: 'h2',      cfgKey: 'h2_entity',      label: 'H₂',     unit: 'ppm'   },
  { key: 'ethanol', cfgKey: 'ethanol_entity', label: 'C₂H₅OH', unit: 'ppm'   },
  { key: 'rh',      cfgKey: 'rh_entity',      label: 'RH',     unit: '%'     },
  { key: 'so2',     cfgKey: 'so2_entity',     label: 'SO₂',    unit: 'ppb'   },
  { key: 'o3',      cfgKey: 'o3_entity',      label: 'O₃',     unit: 'ppb'   },
  { key: 'co',      cfgKey: 'co_entity',      label: 'CO',     unit: 'ppm'   },
];

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
  .top { display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
  .gauge-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
  .score-label { margin-top: 4px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
  .right { flex: 1; min-width: 0; }
  .graph-slot { width: 100%; }
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
  .tile > * { pointer-events: none; }
  .tile-lbl { font-size: 11px; color: var(--secondary-text-color, #aaa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile-val { font-size: 15px; font-weight: 700; margin: 3px 0 1px; line-height: 1; }
  .tile-unit { font-size: 9px; color: var(--secondary-text-color, #aaa); }
  .tile-status { font-size: 9px; margin-bottom: 5px; line-height: 1.2; }
  .bar-bg { background: var(--divider-color, #3a3a3a); border-radius: 3px; height: 3px; overflow: hidden; }
  .bar { height: 100%; border-radius: 3px; transition: width 0.4s ease, background 0.4s ease; }
  .na { color: var(--secondary-text-color, #aaa); }
  .card-name { font-size: 13px; font-weight: 600; color: var(--secondary-text-color, #aaa); letter-spacing: 0.3px; margin-bottom: 10px; }
  .climate-vals { display: flex; gap: 32px; margin-bottom: 2px; justify-content: center; }
  .climate-val { display: flex; flex-direction: column; align-items: center; }
  .climate-val-label { font-size: 11px; color: var(--secondary-text-color, #aaa); }
  .climate-val-num { font-size: 20px; font-weight: 700; line-height: 1.1; }
`;

const EDITOR_CSS = `
  :host { display: block; }
  ha-form { display: block; }
  .section-header { font-size: 14px; font-weight: 500; color: var(--secondary-text-color); padding: 16px 16px 0; border-top: 1px solid var(--divider-color, #3a3a3a); margin-top: 8px; }
  .section-header:first-child { border-top: none; margin-top: 0; padding-top: 8px; }
  .tiles-section { padding: 8px 16px 12px; }
  .tile-row { border-radius: 8px; margin-bottom: 6px; background: var(--secondary-background-color, #2c2c2e); overflow: hidden; }
  .tile-row.drag-over { outline: 2px dashed var(--primary-color, #03a9f4); outline-offset: -2px; }
  .tile-row.dragging  { opacity: 0.3; }
  .tile-row-header { display: flex; align-items: center; gap: 6px; padding: 8px 8px 4px; }
  .tile-grip { color: var(--secondary-text-color); font-size: 16px; cursor: grab; user-select: none; flex-shrink: 0; }
  .tile-name { flex: 1; font-size: 13px; font-weight: 600; }
  .tile-row-btns { display: flex; gap: 2px; }
  .tile-btn { background: none; border: none; color: var(--secondary-text-color); cursor: pointer; font-size: 11px; padding: 3px 5px; border-radius: 3px; line-height: 1; }
  .tile-btn:hover:not([disabled]) { color: var(--primary-text-color); background: var(--divider-color, #3a3a3a); }
  .tile-btn[disabled] { opacity: 0.3; cursor: default; }
  .tile-btn.active { color: var(--primary-color, #03a9f4); }
  .tile-btn.remove { color: var(--error-color, #c62828); }
  .tile-btn.settings { font-size: 15px; padding: 2px 5px; }
  .tile-settings { border-top: 1px solid var(--divider-color, #3a3a3a); padding: 4px 0; }
  .add-tile-row { margin-top: 8px; }
  .add-tile-select { width: 100%; padding: 8px; border-radius: 6px; background: var(--secondary-background-color, #2c2c2e); color: var(--primary-text-color, #fff); border: 1px solid var(--divider-color, #3a3a3a); font-size: 13px; cursor: pointer; }
  .add-tile-select:hover { border-color: var(--primary-color, #03a9f4); }
`;

// ── AirQualityCard ────────────────────────────────────────────────────────────

class AirQualityCard extends LitElement {
  static properties = {
    _hass:   { attribute: false },
    _config: { attribute: false },
  };

  static getConfigElement() {
    return document.createElement('air-quality-card-editor');
  }

  static getStubConfig() {
    return { show_name: true, tile_tap_enabled: true, tile_order: ['pm1', 'pm25', 'pm4', 'pm10', 'voc', 'co2'] };
  }

  createRenderRoot() {
    const root = super.createRenderRoot();
    const s = document.createElement('style');
    s.textContent = CARD_CSS;
    root.appendChild(s);
    return root;
  }

  setConfig(config) {
    if (!config) return;
    this._config = config;
  }

  set hass(hass) {
    if (!this._config) return;
    const ids = Object.values(this._config).filter(v => typeof v === 'string' && v);
    const changed = !this._hass || ids.some(id => hass.states[id] !== this._hass.states[id]);
    if (changed) this._hass = hass;
    this.shadowRoot?.querySelectorAll('mini-graph-card').forEach(c => { c.hass = hass; });
  }

  getCardSize() { return 4; }

  updated(changedProps) {
    if (changedProps.has('_config')) this._setupMiniGraphCard();
  }

  _stateVal(entityId) {
    if (!entityId || !this._hass) return null;
    const s = this._hass.states[entityId];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _deviceName() {
    const cfg = this._config;
    if (cfg.name) return cfg.name;
    if (!this._hass) return '';
    const entityKeys = Object.keys(cfg).filter(k => k.endsWith('_entity'));
    let deviceId = cfg.device_id || '';
    if (!deviceId && this._hass.entities) {
      for (const key of entityKeys) {
        const eid = cfg[key];
        if (eid && this._hass.entities[eid]?.device_id) { deviceId = this._hass.entities[eid].device_id; break; }
      }
    }
    if (deviceId && this._hass.devices?.[deviceId]) {
      const dev = this._hass.devices[deviceId];
      return dev.name_by_user || dev.name || '';
    }
    return '';
  }

  _setupMiniGraphCard() {
    const mgc = this.shadowRoot?.querySelector('mini-graph-card');
    if (!mgc) return;
    const cfg = this._config;
    const entities = [];
    if (cfg.temperature_entity) entities.push({ entity: cfg.temperature_entity, name: 'Temperature', color: '#ffb300' });
    if (cfg.humidity_entity)    entities.push({ entity: cfg.humidity_entity,    name: 'Humidity',    color: '#42a5f5' });
    if (!entities.length) return;
    const graphCfg = { entities, hours_to_show: 24, line_width: 2, font_size: 85, height: 80, fill: false,
      show: { icon: false, name: false, state: false, legend: false, labels: false } };
    const configure = () => {
      customElements.upgrade(mgc);
      try { mgc.setConfig(graphCfg); } catch (_) { mgc.config = graphCfg; }
      if (this._hass) mgc.hass = this._hass;
    };
    if (customElements.get('mini-graph-card')) configure();
    else customElements.whenDefined('mini-graph-card').then(configure);
  }

  _tileClick(entityId) {
    if (this._config.tile_tap_enabled === false || !entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId } }));
  }

  _renderGauge(score, color) {
    const r = 48, cx = 60, cy = 60, C = 2 * Math.PI * r;
    const unavail = score === null;
    const filled = unavail ? 0 : Math.min((score / 100) * C, C);
    // Keep this as a flat template — nesting html`<circle>` inside SVG creates it
    // in HTML namespace (not SVG), making it invisible.
    return html`
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--divider-color,#3a3a3a)" stroke-width="10"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="${color}" stroke-width="10"
          stroke-dasharray="${filled.toFixed(2)} ${C.toFixed(2)}"
          stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
          opacity="${unavail ? 0 : 1}"/>
        <text x="${cx}" y="${cy - 5}" text-anchor="middle"
          fill="${unavail ? 'var(--secondary-text-color,#aaa)' : 'currentColor'}"
          font-size="${unavail ? 20 : 28}" font-weight="700">${unavail ? '—' : score}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle"
          fill="var(--secondary-text-color,#aaa)" font-size="11">AQI</text>
      </svg>
    `;
  }

  _renderTile(t) {
    const cfg = this._config;
    const val = this._stateVal(cfg[t.cfgKey]);
    const label = cfg[`${t.key}_name`] || (cfg.use_chemical_names ? CHEMICAL_NAMES[t.key] : t.label);
    let valContent, statusText, statusColor, barWidth, barBg;
    if (val === null) {
      valContent = html`<span class="na">—</span>`;
      statusText = 'Unavailable'; statusColor = 'var(--secondary-text-color, #aaa)';
      barWidth = '0%'; barBg = '#3a3a3a';
    } else {
      const { idx, pct } = tileStatus(t.key, val, cfg);
      statusText = STATUS_LABELS[idx]; statusColor = STATUS_COLORS[idx];
      barWidth = `${Math.min(100, pct).toFixed(1)}%`; barBg = STATUS_COLORS[idx];
      valContent = html`${val.toFixed(1)}<span class="tile-unit"> ${t.unit}</span>`;
    }
    return html`
      <div class="tile" data-key="${t.key}" @click=${() => this._tileClick(cfg[t.cfgKey])}>
        <div class="tile-lbl">${label}</div>
        <div class="tile-val${val === null ? ' na' : ''}">${valContent}</div>
        <div class="tile-status" style="color:${statusColor}">${statusText}</div>
        <div class="bar-bg"><div class="bar" style="width:${barWidth};background:${barBg}"></div></div>
      </div>
    `;
  }

  render() {
    if (!this._config) return html``;
    const cfg = this._config;
    const nativeAqi = this._stateVal(cfg.aqi_entity);
    const pm25Val   = this._stateVal(cfg.pm25_entity);
    const vocVal    = this._stateVal(cfg.voc_entity);
    const co2Val    = this._stateVal(cfg.co2_entity);
    const hasScore  = nativeAqi !== null || pm25Val !== null;
    let score = null, scoreLabel = 'Unavailable', scoreColor = 'var(--secondary-text-color, #aaa)';
    if (hasScore) {
      const useNative = nativeAqi !== null;
      score = useNative ? Math.round(Math.min(500, Math.max(0, nativeAqi))) : computeScore(pm25Val, vocVal, co2Val);
      const band = scoreInfo(score, useNative ? AQI_BANDS : SCORE_BANDS);
      scoreLabel = band.label; scoreColor = band.color;
    }
    const name     = this._deviceName();
    const showName = cfg.show_name !== false && !!name;
    const tempV    = this._stateVal(cfg.temperature_entity);
    const humV     = this._stateVal(cfg.humidity_entity);
    const hasGraph = !!(cfg.temperature_entity || cfg.humidity_entity);
    const tiles    = sortedTiles(cfg);
    return html`
      <ha-card>
        ${showName ? html`<div class="card-name">${name}</div>` : ''}
        <div class="top">
          <div class="gauge-wrap">
            ${this._renderGauge(score, scoreColor)}
            <div class="score-label" style="color:${scoreColor}">${scoreLabel}</div>
          </div>
          <div class="right">
            ${(cfg.temperature_entity || cfg.humidity_entity) ? html`
              <div class="climate-vals">
                ${cfg.temperature_entity ? html`
                  <div class="climate-val">
                    <span class="climate-val-label" style="color:#ffb300">Temperature</span>
                    <span class="climate-val-num">${tempV !== null ? `${tempV.toFixed(1)} °C` : '—'}</span>
                  </div>` : ''}
                ${cfg.humidity_entity ? html`
                  <div class="climate-val">
                    <span class="climate-val-label" style="color:#42a5f5">Humidity</span>
                    <span class="climate-val-num">${humV !== null ? `${humV.toFixed(1)} %` : '—'}</span>
                  </div>` : ''}
              </div>` : ''}
            ${hasGraph ? html`<div class="graph-slot"><mini-graph-card></mini-graph-card></div>` : ''}
          </div>
        </div>
        <div class="tiles" style="${cfg.columns ? `grid-template-columns:repeat(${cfg.columns},1fr)` : ''}">
          ${tiles.map(t => this._renderTile(t))}
        </div>
      </ha-card>
    `;
  }
}

// ── AirQualityCardEditor ──────────────────────────────────────────────────────

const DISPLAY_SCHEMA = [
  { name: 'show_name',          label: 'Show device name',                                                        selector: { boolean: {} } },
  { name: 'tile_tap_enabled',   label: 'Tap tile to open entity details',                                         selector: { boolean: {} } },
  { name: 'use_chemical_names', label: 'Show full chemical names on tiles (e.g. Carbon Dioxide instead of CO₂)', selector: { boolean: {} } },
  { name: 'name',               label: 'Name override (leave blank to use device name)',                           selector: { text: {} } },
  { name: 'columns',            label: 'Tile columns (leave blank for auto)',                                      selector: { number: { min: 1, max: 10, step: 1, mode: 'box' } } },
];

const ENTITY_SCHEMA = [
  { name: 'aqi_entity',         label: 'AQI Entity (uses sensor value directly; falls back to computed)',          selector: { entity: { domain: 'sensor' } } },
  { name: 'temperature_entity', label: 'Temperature Entity (climate display + graph)',                             selector: { entity: { domain: 'sensor', device_class: 'temperature' } } },
  { name: 'humidity_entity',    label: 'Humidity Entity (climate display + graph)',                                selector: { entity: { domain: 'sensor', device_class: 'humidity' } } },
];

class AirQualityCardEditor extends LitElement {
  static properties = {
    _hass:         { attribute: false },
    _config:       { attribute: false },
    _expandedTile: { state: true },
    _dragSrc:      { state: true },
    _dragOver:     { state: true },
  };

  createRenderRoot() {
    const root = super.createRenderRoot();
    const s = document.createElement('style');
    s.textContent = EDITOR_CSS;
    root.appendChild(s);
    return root;
  }

  setConfig(config) { this._config = { ...config }; }

  set hass(hass) { this._hass = hass; }

  _fireConfigChanged(config) {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }

  _updateConfig(updates) {
    const next = { ...this._config };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || (k.endsWith('_entity') && v === '')) delete next[k];
      else next[k] = v;
    }
    this._config = next;
    this._fireConfigChanged(next);
  }

  _displayFormData() {
    const c = this._config;
    return {
      show_name:          c.show_name          ?? true,
      tile_tap_enabled:   c.tile_tap_enabled   ?? true,
      use_chemical_names: c.use_chemical_names ?? false,
      name:               c.name               ?? '',
      columns:            c.columns            ?? null,
    };
  }

  _entityFormData() {
    const c = this._config;
    return {
      aqi_entity:         c.aqi_entity         ?? '',
      temperature_entity: c.temperature_entity ?? '',
      humidity_entity:    c.humidity_entity    ?? '',
    };
  }

  _tileFormData(t) {
    const c = this._config;
    const def = THRESHOLDS[t.key] || [0, 0, 0];
    return {
      [`${t.key}_name`]: c[`${t.key}_name`] ?? '',
      [`${t.key}_t1`]:   c[`${t.key}_t1`]   ?? def[0],
      [`${t.key}_t2`]:   c[`${t.key}_t2`]   ?? def[1],
      [`${t.key}_t3`]:   c[`${t.key}_t3`]   ?? def[2],
    };
  }

  _editorTiles() {
    const c = this._config;
    const order = c.tile_order || [];
    const inOrder = order.map(k => TILE_DEFS.find(t => t.key === k)).filter(Boolean);
    const extras  = TILE_DEFS.filter(t => c[t.cfgKey] && !order.includes(t.key));
    return [...inOrder, ...extras];
  }

  _moveTile(key, dir) {
    const order = this._editorTiles().map(t => t.key);
    const idx = order.indexOf(key), next = idx + dir;
    if (next < 0 || next >= order.length) return;
    [order[idx], order[next]] = [order[next], order[idx]];
    this._updateConfig({ tile_order: order });
  }

  _removeTile(t) {
    const next = { ...this._config };
    const newOrder = (next.tile_order || []).filter(k => k !== t.key);
    if (newOrder.length) next.tile_order = newOrder; else delete next.tile_order;
    delete next[t.cfgKey]; delete next[`${t.key}_name`];
    delete next[`${t.key}_t1`]; delete next[`${t.key}_t2`]; delete next[`${t.key}_t3`];
    if (this._expandedTile === t.key) this._expandedTile = null;
    this._config = next; this._fireConfigChanged(next);
  }

  _addTile(e) {
    const key = e.target.value; e.target.value = '';
    if (!key) return;
    const current = this._editorTiles().map(t => t.key);
    if (current.includes(key)) return;
    this._updateConfig({ tile_order: [...current, key] });
  }

  _onDrop(targetKey) {
    if (!this._dragSrc || this._dragSrc === targetKey) return;
    const order = this._editorTiles().map(t => t.key);
    const from = order.indexOf(this._dragSrc), to = order.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    order.splice(from, 1); order.splice(to, 0, this._dragSrc);
    this._dragSrc = null; this._dragOver = null;
    this._updateConfig({ tile_order: order });
  }

  _renderTileRow(t, tiles) {
    const cfg = this._config;
    const isExpanded = this._expandedTile === t.key;
    const isDragging = this._dragSrc === t.key;
    const isDragOver = this._dragOver === t.key;
    const idx = tiles.indexOf(t), total = tiles.length;

    const entitySchema = [
      { name: 'entity', label: `${t.label} entity (${t.unit})`, selector: { entity: { domain: 'sensor' } } },
    ];
    const settingsSchema = [
      { name: `${t.key}_name`, label: `Label override (default: ${t.label})`, selector: { text: {} } },
      { name: `${t.key}_t1`,   label: `Good ≤ (${t.unit})`,                   selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      { name: `${t.key}_t2`,   label: `Moderate ≤ (${t.unit})`,               selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
      { name: `${t.key}_t3`,   label: `High ≤ (${t.unit})`,                   selector: { number: { min: 0, step: 0.1, mode: 'box' } } },
    ];

    return html`
      <div class="tile-row ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}"
        @dragover=${(e) => e.preventDefault()}
        @dragenter=${(e) => { e.preventDefault(); if (this._dragSrc && this._dragSrc !== t.key) this._dragOver = t.key; }}
        @dragleave=${() => { if (this._dragOver === t.key) this._dragOver = null; }}
        @drop=${(e) => { e.preventDefault(); this._onDrop(t.key); }}>
        <div class="tile-row-header">
          <span class="tile-grip" draggable="true"
            @dragstart=${(e) => { this._dragSrc = t.key; e.dataTransfer.effectAllowed = 'move'; }}
            @dragend=${() => { this._dragSrc = null; this._dragOver = null; }}>⠿</span>
          <span class="tile-name">${cfg[`${t.key}_name`] || `${CHEMICAL_NAMES[t.key]} (${t.label})`}</span>
          <div class="tile-row-btns">
            <button class="tile-btn" ?disabled=${idx === 0}
              @click=${() => this._moveTile(t.key, -1)} title="Move up">▲</button>
            <button class="tile-btn" ?disabled=${idx === total - 1}
              @click=${() => this._moveTile(t.key, 1)} title="Move down">▼</button>
            <button class="tile-btn settings ${isExpanded ? 'active' : ''}"
              @click=${() => { this._expandedTile = isExpanded ? null : t.key; }}
              title="Threshold &amp; label settings">⚙</button>
            <button class="tile-btn remove"
              @click=${() => this._removeTile(t)} title="Remove tile">✕</button>
          </div>
        </div>
        <ha-form
          .schema=${entitySchema}
          .data=${{ entity: cfg[t.cfgKey] || '' }}
          .hass=${this._hass}
          .computeLabel=${(s) => s.label}
          @value-changed=${(e) => this._updateConfig({ [t.cfgKey]: e.detail.value.entity || '' })}
        ></ha-form>
        ${isExpanded ? html`
          <div class="tile-settings">
            <ha-form
              .schema=${settingsSchema}
              .data=${this._tileFormData(t)}
              .hass=${this._hass}
              .computeLabel=${(s) => s.label}
              @value-changed=${(e) => this._updateConfig(e.detail.value)}
            ></ha-form>
          </div>` : ''}
      </div>
    `;
  }

  render() {
    if (!this._config) return html``;
    const tiles = this._editorTiles();
    const usedKeys = tiles.map(t => t.key);
    const unconfigured = TILE_DEFS.filter(t => !usedKeys.includes(t.key));
    return html`
      <div class="section-header">Display</div>
      <ha-form
        .schema=${DISPLAY_SCHEMA}
        .data=${this._displayFormData()}
        .hass=${this._hass}
        .computeLabel=${(s) => s.label}
        @value-changed=${(e) => this._updateConfig(e.detail.value)}
      ></ha-form>
      <div class="section-header">Entities</div>
      <ha-form
        .schema=${ENTITY_SCHEMA}
        .data=${this._entityFormData()}
        .hass=${this._hass}
        .computeLabel=${(s) => s.label}
        @value-changed=${(e) => this._updateConfig(e.detail.value)}
      ></ha-form>
      <div class="section-header">Pollutant Tiles</div>
      <div class="tiles-section">
        ${tiles.map(t => this._renderTileRow(t, tiles))}
        ${unconfigured.length ? html`
          <div class="add-tile-row">
            <select class="add-tile-select" @change=${(e) => this._addTile(e)}>
              <option value="">＋ Add tile</option>
              ${unconfigured.map(t => html`<option value="${t.key}">${CHEMICAL_NAMES[t.key]} (${t.label}, ${t.unit})</option>`)}
            </select>
          </div>` : ''}
      </div>
    `;
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

customElements.define('air-quality-card', AirQualityCard);
customElements.define('air-quality-card-editor', AirQualityCardEditor);

})(); // end async IIFE
