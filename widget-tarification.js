/**
 * Widget Tarification - Carte Lovelace Custom pour Home Assistant
 * Gestion des plages Heures Creuses / Heures Pleines / Heures Super Creuses
 * Compatible HACS
 */

const STORAGE_KEY = 'widget_tarification_config';
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Jours fériés'];
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Fér'];
const FRENCH_PUBLIC_HOLIDAYS = [
  '01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'
];

// ============================================================
// ZLINKY / LINKY TIC SUPPORT
// ============================================================
const PTEC_MAP = {
  'HC..': { status: 'hc', label: 'Heures creuses', color: 'hc' },
  'HP..': { status: 'hp', label: 'Heures pleines', color: 'hp' },
  'HCJB': { status: 'hc', label: 'HC Jour Bleu', color: 'hc', tempo: 'bleu' },
  'HPJB': { status: 'hp', label: 'HP Jour Bleu', color: 'hp', tempo: 'bleu' },
  'HCJW': { status: 'hc', label: 'HC Jour Blanc', color: 'hc', tempo: 'blanc' },
  'HPJW': { status: 'hp', label: 'HP Jour Blanc', color: 'hp', tempo: 'blanc' },
  'HCJR': { status: 'hc', label: 'HC Jour Rouge', color: 'hc', tempo: 'rouge' },
  'HPJR': { status: 'hp', label: 'HP Jour Rouge', color: 'hp', tempo: 'rouge' },
  'HN..': { status: 'hc', label: 'Heures Normales', color: 'hc' },
  'PM..': { status: 'hp', label: 'Pointe Mobile', color: 'hp' },
  'HP': { status: 'hp', label: 'Heures pleines', color: 'hp' },
  'HC': { status: 'hc', label: 'Heures creuses', color: 'hc' },
  'HP HC': { status: 'hp', label: 'Heures pleines', color: 'hp' },
  'HC HP': { status: 'hc', label: 'Heures creuses', color: 'hc' },
};

function parsePTEC(stateValue) {
  if (!stateValue || stateValue === 'unknown' || stateValue === 'unavailable') return null;
  const trimmed = stateValue.trim();
  if (PTEC_MAP[trimmed]) return PTEC_MAP[trimmed];
  const upper = trimmed.toUpperCase();
  if (PTEC_MAP[upper]) return PTEC_MAP[upper];
  if (/HC/i.test(trimmed)) return { status: 'hc', label: 'Heures creuses', color: 'hc' };
  if (/HP/i.test(trimmed)) return { status: 'hp', label: 'Heures pleines', color: 'hp' };
  return null;
}

// ============================================================
// DATA MODEL
// ============================================================
class TarificationConfig {
  constructor(data = null) {
    if (data) {
      this.joursSpecifiques = data.joursSpecifiques ?? false;
      this.joursMask = data.joursMask ?? [false, false, false, false, false, false, false, false];
      this.saisonnalite = data.saisonnalite ?? false;
      this.nbPlagesHiver = data.nbPlagesHiver ?? 1;
      this.nbPlagesEte = data.nbPlagesEte ?? 1;
      this.nbPlagesHorsSaison = data.nbPlagesHorsSaison ?? 1;
      this.superCreusesHiver = data.superCreusesHiver ?? false;
      this.superCreusesEte = data.superCreusesEte ?? false;
      this.superCreusesHorsSaison = data.superCreusesHorsSaison ?? false;
      this.lignes = data.lignes ?? this._defaultLignes();
    } else {
      this.joursSpecifiques = false;
      this.joursMask = [false, false, false, false, false, false, false, false];
      this.saisonnalite = false;
      this.nbPlagesHiver = 1;
      this.nbPlagesEte = 1;
      this.nbPlagesHorsSaison = 1;
      this.superCreusesHiver = false;
      this.superCreusesEte = false;
      this.superCreusesHorsSaison = false;
      this.lignes = this._defaultLignes();
    }
  }

  _defaultLignes() {
    const lignes = [];
    for (let i = 0; i < 16; i++) {
      lignes.push({
        nbPlagesCode: '00',
        superCreuses: '0',
        hc1Debut: '0000',
        hc1Duree: '0000',
        hc2Debut: '0000',
        hc2Duree: '000',
        hc3Debut: '0000',
        hc3Duree: '000',
        hscDebut: '0000',
        hscDuree: '000',
      });
    }
    return lignes;
  }

  buildP14(lineIdx) {
    const l = this.lignes[lineIdx];
    return l.nbPlagesCode + l.superCreuses +
           l.hc1Debut + l.hc1Duree +
           l.hc2Debut + l.hc2Duree +
           l.hc3Debut + l.hc3Duree +
           l.hscDebut + l.hscDuree;
  }

  buildP12() {
    return this.joursMask.map(v => v ? '1' : '0').join('');
  }

  getNbPlages(lineIdx) {
    if (!this.saisonnalite) return this.nbPlagesHorsSaison;
    return lineIdx < 8 ? this.nbPlagesHiver : this.nbPlagesEte;
  }

  isJourSpecifique(dayIdx) {
    return this.joursSpecifiques && this.joursMask[dayIdx];
  }

  getPlagesForDay(dayIdx) {
    const lineIdx = dayIdx;
    const l = this.lignes[lineIdx];
    const plages = [];

    if (this.isJourSpecifique(dayIdx)) {
      plages.push({ debut: 0, duree: 1440, type: 'hc' });
      return plages;
    }

    const nbPlages = this.getNbPlages(lineIdx);

    const hc1Start = this._parseTime(l.hc1Debut);
    const hc1Dur = this._parseDuree4(l.hc1Duree);
    if (hc1Dur > 0) plages.push({ debut: hc1Start, duree: hc1Dur, type: 'hc' });

    if (nbPlages >= 2) {
      const hc2Start = this._parseTime(l.hc2Debut);
      const hc2Dur = this._parseDuree3(l.hc2Duree);
      if (hc2Dur > 0) plages.push({ debut: hc2Start, duree: hc2Dur, type: 'hc' });
    }

    if (nbPlages >= 3) {
      const hc3Start = this._parseTime(l.hc3Debut);
      const hc3Dur = this._parseDuree3(l.hc3Duree);
      if (hc3Dur > 0) plages.push({ debut: hc3Start, duree: hc3Dur, type: 'hc' });
    }

    if (l.superCreuses === '1') {
      const hscStart = this._parseTime(l.hscDebut);
      const hscDur = this._parseDuree3(l.hscDuree);
      if (hscDur > 0) plages.push({ debut: hscStart, duree: hscDur, type: 'hsc' });
    }

    return plages;
  }

  _parseTime(str) {
    const h = parseInt(str.substring(0, 2), 10);
    const m = parseInt(str.substring(2, 4), 10);
    return h * 60 + m;
  }

  _parseDuree4(str) {
    const h = parseInt(str.substring(0, 2), 10);
    const m = parseInt(str.substring(2, 4), 10);
    return h * 60 + m;
  }

  _parseDuree3(str) {
    const h = parseInt(str.substring(0, 1), 10);
    const m = parseInt(str.substring(1, 3), 10);
    return h * 60 + m;
  }

  toJSON() {
    return {
      joursSpecifiques: this.joursSpecifiques,
      joursMask: this.joursMask,
      saisonnalite: this.saisonnalite,
      nbPlagesHiver: this.nbPlagesHiver,
      nbPlagesEte: this.nbPlagesEte,
      nbPlagesHorsSaison: this.nbPlagesHorsSaison,
      superCreusesHiver: this.superCreusesHiver,
      superCreusesEte: this.superCreusesEte,
      superCreusesHorsSaison: this.superCreusesHorsSaison,
      lignes: this.lignes,
    };
  }
}

// ============================================================
// PERSISTENCE via HA helpers (input_text entities)
// ============================================================
class TarificationStorage {
  constructor(hass, entityBase) {
    this.hass = hass;
    this.entityBase = entityBase || 'input_text.widget_tarif';
  }

  async save(config) {
    const json = JSON.stringify(config.toJSON());
    const chunkSize = 250;
    const chunks = [];
    for (let i = 0; i < json.length; i += chunkSize) {
      chunks.push(json.substring(i, i + chunkSize));
    }
    try {
      for (let i = 0; i < chunks.length && i < 10; i++) {
        await this.hass.callService('input_text', 'set_value', {
          entity_id: `${this.entityBase}_${i}`,
          value: chunks[i]
        });
      }
      await this.hass.callService('input_text', 'set_value', {
        entity_id: `${this.entityBase}_meta`,
        value: `chunks:${chunks.length}`
      });
    } catch (e) {
      console.warn('Widget Tarification: Sauvegarde HA échouée, fallback localStorage', e);
      localStorage.setItem(STORAGE_KEY, json);
    }
  }

  async load() {
    try {
      const metaEntity = this.hass.states[`${this.entityBase}_meta`];
      if (metaEntity && metaEntity.state.startsWith('chunks:')) {
        const nbChunks = parseInt(metaEntity.state.split(':')[1], 10);
        let json = '';
        for (let i = 0; i < nbChunks; i++) {
          const entity = this.hass.states[`${this.entityBase}_${i}`];
          if (entity) json += entity.state;
        }
        if (json) {
          return new TarificationConfig(JSON.parse(json));
        }
      }
    } catch (e) {
      console.warn('Widget Tarification: Chargement HA échoué, fallback localStorage', e);
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return new TarificationConfig(JSON.parse(stored));
      } catch (e) { /* ignore */ }
    }
    return new TarificationConfig();
  }
}

// ============================================================
// HELPER: French public holidays detection
// ============================================================
function isFrenchPublicHoliday(date) {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (FRENCH_PUBLIC_HOLIDAYS.includes(mmdd)) return true;
  const year = date.getFullYear();
  const easter = computeEaster(year);
  const easterBased = [0, 1, 39, 49, 50];
  for (const offset of easterBased) {
    const d = new Date(easter);
    d.setDate(d.getDate() + offset);
    if (d.getDate() === date.getDate() && d.getMonth() === date.getMonth()) return true;
  }
  return false;
}

function computeEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getTodayDayIndex(date) {
  if (isFrenchPublicHoliday(date)) return 7;
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ============================================================
// STYLES — fond transparent + textes adaptés
// ============================================================
const CARD_STYLES = `
  :host {
    --wt-primary: #e8a020;
    --wt-primary-dark: #c8871a;
    --wt-green: #5cb85c;
    --wt-green-dark: #4a9a4a;
    --wt-green-light: #8fd18f;
    --wt-orange: #f0a030;
    --wt-orange-light: #f5c060;
    --wt-blue: #4a90d9;
    --wt-blue-light: #7ab8f5;
    --wt-red: #d9534f;
    --wt-bg: transparent;
    --wt-bg-section: rgba(255,255,255,0.08);
    --wt-border: rgba(255,255,255,0.15);
    --wt-text: #ffffff;
    --wt-text-light: rgba(255,255,255,0.6);
    --wt-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: block;
  }

  .card-container {
    background: transparent;
    border-radius: var(--wt-radius);
    overflow: hidden;
    box-shadow: none;
  }

  /* HEADER */
  .header {
    background: linear-gradient(135deg, var(--wt-primary), var(--wt-primary-dark));
    color: white;
    padding: 12px 16px;
    text-align: center;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.5px;
  }

  /* TIMELINE VIEW */
  .timeline-container {
    padding: 16px;
  }

  .timeline-bar-wrapper {
    position: relative;
    margin: 8px 0;
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--wt-text-light);
    margin-bottom: 4px;
    padding: 0 2px;
  }

  .timeline-bar {
    position: relative;
    height: 28px;
    background: var(--wt-orange);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
  }

  .timeline-segment {
    position: absolute;
    top: 0;
    height: 100%;
    transition: all 0.3s ease;
  }

  .timeline-segment.hc {
    background: var(--wt-green);
  }

  .timeline-segment.hsc {
    background: var(--wt-blue);
  }

  .timeline-cursor {
    position: absolute;
    top: -4px;
    width: 3px;
    height: 36px;
    background: var(--wt-red);
    border-radius: 2px;
    z-index: 10;
    transition: left 60s linear;
    box-shadow: 0 0 4px rgba(217,83,79,0.5);
  }

  .timeline-cursor::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    width: 11px;
    height: 11px;
    background: var(--wt-red);
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .timeline-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 13px;
    color: var(--wt-text);
    flex-wrap: wrap;
  }

  .timeline-info .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 2px;
  }

  .timeline-info .dot.hp { background: var(--wt-orange); }
  .timeline-info .dot.hc { background: var(--wt-green); }
  .timeline-info .dot.hsc { background: var(--wt-blue); }

  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: white;
  }

  .status-badge.hp { background: var(--wt-orange); }
  .status-badge.hc { background: var(--wt-green); }
  .status-badge.hsc { background: var(--wt-blue); }

  .tempo-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 600; color: white; margin-left: 6px;
  }
  .tempo-badge.tempo-bleu { background: #2196F3; }
  .tempo-badge.tempo-blanc { background: #9E9E9E; }
  .tempo-badge.tempo-rouge { background: #F44336; }

  .zlinky-badge {
    display: inline-block; padding: 2px 6px; border-radius: 8px;
    font-size: 9px; font-weight: 500; color: var(--wt-text-light);
    border: 1px solid var(--wt-border); margin-left: 6px;
  }

  .config-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .config-btn:hover {
    background: rgba(255,255,255,0.35);
  }

  /* CONFIG PAGES */
  .config-container {
    padding: 16px;
  }

  .config-section {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--wt-border);
  }

  .config-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--wt-text);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title::before {
    content: '-';
    color: var(--wt-primary);
    font-weight: 700;
  }

  .section-desc {
    font-size: 12px;
    color: var(--wt-text-light);
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  /* TOGGLE */
  .toggle-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle {
    position: relative;
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.3s;
    flex-shrink: 0;
  }

  .toggle.active {
    background: var(--wt-blue);
  }

  .toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle.active::after {
    transform: translateX(20px);
  }

  /* RADIO / CHECKBOX DAYS */
  .days-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .day-btn {
    padding: 5px 10px;
    border: 1.5px solid var(--wt-border);
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
    background: rgba(255,255,255,0.05);
    color: var(--wt-text-light);
    transition: all 0.2s;
    user-select: none;
  }

  .day-btn.active {
    border-color: var(--wt-green);
    background: var(--wt-green);
    color: white;
  }

  .day-btn.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* NUMBER SELECTOR */
  .number-selector {
    display: inline-flex;
    align-items: center;
    gap: 0;
    border: 1.5px solid var(--wt-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .number-selector button {
    width: 28px;
    height: 28px;
    border: none;
    background: var(--wt-bg-section);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: var(--wt-text);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .number-selector button:hover {
    background: rgba(255,255,255,0.15);
  }

  .number-selector .value {
    width: 32px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--wt-text);
    border-left: 1px solid var(--wt-border);
    border-right: 1px solid var(--wt-border);
  }

  /* TIME SELECTOR */
  .time-selector {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .time-digit-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .time-digit-group button {
    width: 28px;
    height: 22px;
    border: none;
    background: var(--wt-bg-section);
    cursor: pointer;
    font-size: 12px;
    color: var(--wt-text);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .time-digit-group button:hover {
    background: rgba(255,255,255,0.15);
  }

  .time-digit-group .digit {
    width: 28px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    color: var(--wt-text);
    background: rgba(255,255,255,0.1);
    border: 1.5px solid var(--wt-border);
    border-radius: 4px;
    margin: 2px 0;
  }

  .time-separator {
    font-size: 20px;
    font-weight: 700;
    color: var(--wt-text);
    padding: 0 2px;
    align-self: center;
  }

  /* DURATION SELECTOR */
  .duration-selector {
    display: inline-flex;
    align-items: center;
    gap: 0;
    border: 1.5px solid var(--wt-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .duration-selector button {
    width: 28px;
    height: 32px;
    border: none;
    background: var(--wt-bg-section);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: var(--wt-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .duration-selector button:hover {
    background: rgba(255,255,255,0.15);
  }

  .duration-selector .value {
    min-width: 50px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--wt-text);
    border-left: 1px solid var(--wt-border);
    border-right: 1px solid var(--wt-border);
    padding: 0 6px;
  }

  /* HC BLOCK */
  .hc-block {
    background: var(--wt-bg-section);
    border-radius: var(--wt-radius);
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid var(--wt-border);
  }

  .hc-block-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--wt-green-light);
    margin-bottom: 10px;
  }

  .hc-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .hc-label {
    font-size: 12px;
    color: var(--wt-text);
    min-width: 50px;
  }

  /* HSC BLOCK */
  .hsc-block {
    background: rgba(74,144,217,0.15);
    border-radius: var(--wt-radius);
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid rgba(74,144,217,0.3);
  }

  .hsc-block-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--wt-blue-light);
    margin-bottom: 10px;
  }

  /* NAV BUTTONS */
  .nav-buttons {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--wt-border);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1.5px solid var(--wt-border);
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
    cursor: pointer;
    font-size: 13px;
    color: var(--wt-text);
    transition: all 0.2s;
  }

  .nav-btn:hover {
    background: rgba(255,255,255,0.12);
  }

  .nav-btn.primary {
    background: var(--wt-green);
    color: white;
    border-color: var(--wt-green);
  }

  .nav-btn.primary:hover {
    background: var(--wt-green-dark);
  }

  .nav-btn.cancel {
    color: #ff6b6b;
    border-color: #ff6b6b;
  }

  .page-indicator {
    text-align: center;
    font-size: 12px;
    color: var(--wt-text-light);
    padding: 4px 0 8px;
  }

  /* SEASON LABEL */
  .season-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .season-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--wt-text);
    min-width: 110px;
  }

  /* LEGEND */
  .legend {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--wt-text-light);
  }

  .hidden { display: none !important; }
`;

// ============================================================
// MAIN CARD ELEMENT
// ============================================================
class WidgetTarification extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._tarif = new TarificationConfig();
    this._mode = 'display';
    this._configPage = 1;
    this._timerInterval = null;
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._loadConfig().then(() => this._render());
    } else if (this._sensorPTEC && this._mode === 'display') {
      const oldState = oldHass && oldHass.states[this._sensorPTEC] ? oldHass.states[this._sensorPTEC].state : null;
      const newState = hass.states[this._sensorPTEC] ? hass.states[this._sensorPTEC].state : null;
      if (oldState !== newState) {
        this._render();
      }
    }
  }

  setConfig(config) {
    this._config = config;
    this._entityBase = config.entity_base || 'input_text.widget_tarif';
    this._sensorPTEC = config.sensor_ptec || null;
  }

  static getConfigElement() {
    return document.createElement('widget-tarification-editor');
  }

  static getStubConfig() {
    return { entity_base: 'input_text.widget_tarif' };
  }

  getCardSize() {
    return this._mode === 'display' ? 3 : 8;
  }

  async _loadConfig() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this._tarif = new TarificationConfig(JSON.parse(stored));
        return;
      } catch (e) { /* ignore */ }
    }

    if (this._hass) {
      const storage = new TarificationStorage(this._hass, this._entityBase);
      this._tarif = await storage.load();
    }
  }

  async _saveConfig() {
    const json = JSON.stringify(this._tarif.toJSON());
    localStorage.setItem(STORAGE_KEY, json);

    if (this._hass) {
      const storage = new TarificationStorage(this._hass, this._entityBase);
      try {
        await storage.save(this._tarif);
      } catch (e) {
        console.warn('Widget Tarification: Could not save to HA entities', e);
      }
    }
  }

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = CARD_STYLES;
    shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card-container';

    if (this._mode === 'display') {
      card.innerHTML = this._renderDisplay();
      shadow.appendChild(card);
      this._startTimer();
      this._bindDisplayEvents(card);
    } else {
      card.innerHTML = this._renderConfig();
      shadow.appendChild(card);
      this._bindConfigEvents(card);
    }
  }

  // ============================================================
  // DISPLAY MODE
  // ============================================================
  _renderDisplay() {
    const now = new Date();
    const dayIdx = getTodayDayIndex(now);
    const plages = this._tarif.getPlagesForDay(dayIdx);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let currentStatus = 'hp';
    let nextChange = null;
    let nextChangeType = null;

    for (const p of plages) {
      const end = (p.debut + p.duree) % 1440;
      let inPlage = false;
      if (p.debut + p.duree <= 1440) {
        inPlage = currentMinutes >= p.debut && currentMinutes < p.debut + p.duree;
      } else {
        inPlage = currentMinutes >= p.debut || currentMinutes < end;
      }
      if (inPlage) {
        if (p.type === 'hsc') {
          currentStatus = 'hsc';
        } else if (p.type === 'hc' && currentStatus !== 'hsc') {
          currentStatus = 'hc';
        }
      }
    }

    const sortedEvents = [];
    for (const p of plages) {
      sortedEvents.push({ time: p.debut, event: 'start', type: p.type });
      sortedEvents.push({ time: (p.debut + p.duree) % 1440, event: 'end', type: p.type });
    }
    sortedEvents.sort((a, b) => a.time - b.time);

    for (const evt of sortedEvents) {
      if (evt.time > currentMinutes) {
        nextChange = evt.time;
        nextChangeType = evt.event === 'start' ? evt.type : 'hp';
        break;
      }
    }
    if (nextChange === null && sortedEvents.length > 0) {
      nextChange = sortedEvents[0].time + 1440;
      nextChangeType = sortedEvents[0].event === 'start' ? sortedEvents[0].type : 'hp';
    }

    const minutesUntilChange = nextChange !== null ?
      (nextChange > currentMinutes ? nextChange - currentMinutes : nextChange + 1440 - currentMinutes) : null;

    const timeUntilStr = minutesUntilChange !== null ? this._formatMinutes(minutesUntilChange) : '';

    const statusLabels = { hp: 'Heures pleines', hc: 'Heures creuses', hsc: 'Heures super creuses' };
    const nextStatusLabels = { hp: 'HP', hc: 'HC', hsc: 'HSC' };

    let ptecInfo = null;
    let tempoDay = null;
    if (this._sensorPTEC && this._hass) {
      const ptecState = this._hass.states[this._sensorPTEC];
      if (ptecState) {
        ptecInfo = parsePTEC(ptecState.state);
        if (ptecInfo) {
          currentStatus = ptecInfo.status;
          tempoDay = ptecInfo.tempo || null;
        }
      }
    }

    const timeLabels = this._getTimeLabels(plages);
    const cursorPos = (currentMinutes / 1440) * 100;
    const segments = this._buildSegments(plages);

    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const dateStr = `${dayNames[now.getDay()]} ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()} à ${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;

    const nextChangeStr = nextChangeType ?
      `Dans ${timeUntilStr}, je serai en ${nextStatusLabels[nextChangeType] || 'HP'}` : '';

    return `
      <div class="header" style="position:relative;">
        Widget tarification
        <button class="config-btn" data-action="open-config" title="Configuration">⚙</button>
      </div>
      <div class="timeline-container">
        <div class="timeline-bar-wrapper">
          <div class="timeline-labels">
            ${timeLabels.map(t => `<span style="position:absolute;left:${t.pos}%;transform:translateX(-50%);font-size:10px;">${t.label}</span>`).join('')}
          </div>
          <div style="position:relative;margin-top:18px;">
            <div class="timeline-bar">
              ${segments.map(s => `<div class="timeline-segment ${s.type}" style="left:${s.left}%;width:${s.width}%;${s.type === 'hsc' ? 'z-index:2;' : ''}"></div>`).join('')}
            </div>
            <div class="timeline-cursor" style="left:${cursorPos}%;"></div>
          </div>
        </div>
        <div class="timeline-info">
          <span>📅 ${dateStr}.</span>
          <span>${nextChangeStr}</span>
          <span class="status-badge ${currentStatus}">${ptecInfo ? ptecInfo.label : statusLabels[currentStatus]}</span>
          ${tempoDay ? `<span class="tempo-badge tempo-${tempoDay}">Tempo ${tempoDay}</span>` : ''}
          ${ptecInfo ? '<span class="zlinky-badge">⚡ ZLinky</span>' : ''}
        </div>
        <div class="legend">
          <div class="legend-item"><span class="dot hp"></span>Heures pleines</div>
          <div class="legend-item"><span class="dot hc"></span>Heures creuses</div>
          ${this._hasHSC() ? '<div class="legend-item"><span class="dot hsc"></span>Super creuses</div>' : ''}
        </div>
      </div>
    `;
  }

  _hasHSC() {
    for (let i = 0; i < 16; i++) {
      if (this._tarif.lignes[i].superCreuses === '1') return true;
    }
    return false;
  }

  _getTimeLabels(plages) {
    const labels = [{ pos: 0, label: '00:00' }, { pos: 100, label: '24:00' }];
    for (const p of plages) {
      if (p.duree >= 1440) continue;
      const startPos = (p.debut / 1440) * 100;
      const endMin = (p.debut + p.duree) % 1440;
      const endPos = (endMin / 1440) * 100;
      labels.push({ pos: startPos, label: this._minutesToTime(p.debut) });
      labels.push({ pos: endPos, label: this._minutesToTime(endMin) });
    }
    labels.sort((a, b) => a.pos - b.pos);
    const filtered = [];
    for (const l of labels) {
      if (filtered.length === 0 || Math.abs(l.pos - filtered[filtered.length - 1].pos) > 3) {
        filtered.push(l);
      }
    }
    return filtered;
  }

  _buildSegments(plages) {
    const segments = [];
    for (const p of plages) {
      if (p.debut + p.duree <= 1440) {
        segments.push({
          left: (p.debut / 1440) * 100,
          width: (p.duree / 1440) * 100,
          type: p.type
        });
      } else {
        const firstPart = 1440 - p.debut;
        const secondPart = p.duree - firstPart;
        segments.push({ left: (p.debut / 1440) * 100, width: (firstPart / 1440) * 100, type: p.type });
        segments.push({ left: 0, width: (secondPart / 1440) * 100, type: p.type });
      }
    }
    return segments;
  }

  _minutesToTime(m) {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  _formatMinutes(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min}min`;
    if (min === 0) return `${h}h`;
    return `${h}h${String(min).padStart(2, '0')}`;
  }

  _startTimer() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      if (this._mode === 'display') this._render();
    }, 60000);
  }

  _bindDisplayEvents(card) {
    const btn = card.querySelector('[data-action="open-config"]');
    if (btn) {
      btn.addEventListener('click', () => {
        this._mode = 'config';
        this._configPage = 1;
        this._configBackup = JSON.stringify(this._tarif.toJSON());
        this._render();
      });
    }
  }

  // ============================================================
  // CONFIG MODE
  // ============================================================
  _renderConfig() {
    const totalPages = this._tarif.saisonnalite ? 4 : 3;

    let content = '';
    switch (this._configPage) {
      case 1: content = this._renderConfigPage1(); break;
      case 2: content = this._renderConfigPage2(); break;
      case 3: content = this._tarif.saisonnalite ? this._renderConfigPage3() : this._renderConfigPage3NoSeason(); break;
      case 4: content = this._renderConfigPage4(); break;
    }

    return `
      <div class="header">Widget tarification</div>
      <div class="config-container">
        ${content}
      </div>
      <div class="nav-buttons">
        <button class="nav-btn" data-action="config-back" ${this._configPage === 1 ? 'disabled style="opacity:0.4"' : ''}>
          ◀ Retour
        </button>
        ${this._configPage < totalPages ? `
          <button class="nav-btn primary" data-action="config-next">Continuer ▶</button>
        ` : `
          <button class="nav-btn primary" data-action="config-save">✓ Valider</button>
        `}
      </div>
      <div style="display:flex;justify-content:center;padding:4px 16px 8px;">
        <button class="nav-btn cancel" data-action="config-cancel" style="font-size:12px;padding:4px 12px;">Annuler</button>
      </div>
      <div class="page-indicator">Page : ${this._configPage} / ${totalPages}</div>
    `;
  }

  _renderConfigPage1() {
    const t = this._tarif;
    return `
      <div class="config-section">
        <div class="section-header">
          <div>
            <div class="section-title">Jours spécifiques</div>
            <div class="section-desc">Votre abonnement comporte une tarification réduite certains jours (week-end, jours fériés, etc.)</div>
          </div>
          <div class="toggle ${t.joursSpecifiques ? 'active' : ''}" data-action="toggle-jours-spec"></div>
        </div>
        <div class="days-grid">
          ${DAYS.map((d, i) => `
            <div class="day-btn ${t.joursMask[i] ? 'active' : ''} ${!t.joursSpecifiques ? 'disabled' : ''}"
                 data-action="toggle-day" data-day="${i}">${d}</div>
          `).join('')}
        </div>
      </div>

      <div class="config-section">
        <div class="section-header">
          <div>
            <div class="section-title">Saisonnalité</div>
            <div class="section-desc">Votre abonnement comporte des plages différentes en période estivale et hivernale</div>
          </div>
          <div class="toggle ${t.saisonnalite ? 'active' : ''}" data-action="toggle-saison"></div>
        </div>
      </div>

      <div class="config-section">
        <div class="section-title">Nombre de plage d'heures creuses sur 24 heures</div>
        <div style="margin-top:10px;">
          ${t.saisonnalite ? `
            <div class="season-row">
              <span class="season-label">Période hivernale :</span>
              ${this._renderNumberSelector(t.nbPlagesHiver, 'nb-plages-hiver')}
            </div>
            <div class="season-row">
              <span class="season-label">Période estivale :</span>
              ${this._renderNumberSelector(t.nbPlagesEte, 'nb-plages-ete')}
            </div>
          ` : `
            ${this._renderNumberSelector(t.nbPlagesHorsSaison, 'nb-plages')}
          `}
        </div>
      </div>

      <div class="config-section">
        <div class="section-title">Heures super Creuses</div>
        <div class="section-desc">Plage d'Heures super Creuses (tarification encore plus avantageuse)</div>
        <div style="margin-top:8px;">
          ${t.saisonnalite ? `
            <div class="season-row">
              <span class="season-label">Période hivernale :</span>
              <div class="toggle ${t.superCreusesHiver ? 'active' : ''}" data-action="toggle-hsc-hiver"></div>
            </div>
            <div class="season-row">
              <span class="season-label">Période estivale :</span>
              <div class="toggle ${t.superCreusesEte ? 'active' : ''}" data-action="toggle-hsc-ete"></div>
            </div>
          ` : `
            <div class="toggle-wrapper">
              <div class="toggle ${t.superCreusesHorsSaison ? 'active' : ''}" data-action="toggle-hsc"></div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  _renderConfigPage2() {
    const t = this._tarif;
    const nbPlages = t.saisonnalite ? t.nbPlagesHiver : t.nbPlagesHorsSaison;
    const l = t.lignes[0];
    const hasHSC = t.saisonnalite ? t.superCreusesHiver : t.superCreusesHorsSaison;
    const label = t.saisonnalite ? ' (période hivernale)' : '';

    let html = `<div class="section-title">Plages d'heures creuses${label}</div>`;
    html += this._renderHCBlock('HC1 - Plage principale', l.hc1Debut, l.hc1Duree, 'hc1', true);
    if (nbPlages >= 2) html += this._renderHCBlock('HC2 - Plage secondaire', l.hc2Debut, l.hc2Duree, 'hc2', false);
    if (nbPlages >= 3) html += this._renderHCBlock('HC3 - 2ème plage secondaire', l.hc3Debut, l.hc3Duree, 'hc3', false);
    if (hasHSC) html += this._renderHSCBlock('Heures super creuses', l.hscDebut, l.hscDuree, 'hsc');
    return html;
  }

  _renderConfigPage3() {
    const t = this._tarif;
    const nbPlages = t.nbPlagesEte;
    const l = t.lignes[8];
    const hasHSC = t.superCreusesEte;

    let html = `<div class="section-title">Plages d'heures creuses (période estivale)</div>`;
    html += this._renderHCBlock('HC1 - Plage principale', l.hc1Debut, l.hc1Duree, 'hc1-ete', true);
    if (nbPlages >= 2) html += this._renderHCBlock('HC2 - Plage secondaire', l.hc2Debut, l.hc2Duree, 'hc2-ete', false);
    if (nbPlages >= 3) html += this._renderHCBlock('HC3 - 2ème plage secondaire', l.hc3Debut, l.hc3Duree, 'hc3-ete', false);
    if (hasHSC) html += this._renderHSCBlock('Heures super creuses', l.hscDebut, l.hscDuree, 'hsc-ete');
    return html;
  }

  _renderConfigPage3NoSeason() {
    const t = this._tarif;
    if (!t.joursSpecifiques || t.joursMask.every(v => !v)) {
      return `
        <div class="section-title">Configuration des jours spécifiques</div>
        <div class="section-desc">Aucun jour spécifique défini. Les jours spécifiques sont en heures creuses 24h/24.</div>
      `;
    }
    const specificDays = DAYS.filter((d, i) => t.joursMask[i]);
    return `
      <div class="section-title">Jours spécifiques</div>
      <div class="section-desc">Les jours suivants sont en heures creuses 24h/24 : <strong>${specificDays.join(', ')}</strong>.</div>
    `;
  }

  _renderConfigPage4() {
    return this._renderConfigPage3NoSeason();
  }

  _renderNumberSelector(value, id) {
    return `
      <div class="number-selector">
        <button data-action="num-dec" data-id="${id}">◀</button>
        <div class="value">${value}</div>
        <button data-action="num-inc" data-id="${id}">▶</button>
      </div>
    `;
  }

  _renderTimeSelector(timeStr, id) {
    const d0 = timeStr[0], d1 = timeStr[1], d2 = timeStr[2], d3 = timeStr[3];
    return `
      <div class="time-selector">
        <div class="time-digit-group">
          <button data-action="time-inc" data-id="${id}" data-pos="0">▲</button>
          <div class="digit">${d0}</div>
          <button data-action="time-dec" data-id="${id}" data-pos="0">▼</button>
        </div>
        <div class="time-digit-group">
          <button data-action="time-inc" data-id="${id}" data-pos="1">▲</button>
          <div class="digit">${d1}</div>
          <button data-action="time-dec" data-id="${id}" data-pos="1">▼</button>
        </div>
        <div class="time-separator">:</div>
        <div class="time-digit-group">
          <button data-action="time-inc" data-id="${id}" data-pos="2">▲</button>
          <div class="digit">${d2}</div>
          <button data-action="time-dec" data-id="${id}" data-pos="2">▼</button>
        </div>
        <div class="time-digit-group">
          <button data-action="time-inc" data-id="${id}" data-pos="3">▲</button>
          <div class="digit">${d3}</div>
          <button data-action="time-dec" data-id="${id}" data-pos="3">▼</button>
        </div>
      </div>
    `;
  }

  _renderDurationSelector(dureeStr, id, is4Char) {
    let display;
    if (is4Char) {
      const h = parseInt(dureeStr.substring(0, 2), 10);
      const m = parseInt(dureeStr.substring(2, 4), 10);
      display = `${h}.${String(m).padStart(2, '0')}`;
    } else {
      const h = parseInt(dureeStr[0], 10);
      const m = parseInt(dureeStr.substring(1, 3), 10);
      display = `${h}.${String(m).padStart(2, '0')}`;
    }
    return `
      <div class="duration-selector">
        <button data-action="dur-dec" data-id="${id}" data-4char="${is4Char}">◀</button>
        <div class="value">${display}</div>
        <button data-action="dur-inc" data-id="${id}" data-4char="${is4Char}">▶</button>
      </div>
    `;
  }

  _renderHCBlock(title, debutStr, dureeStr, id, is4CharDuree) {
    return `
      <div class="hc-block">
        <div class="hc-block-title">${title}</div>
        <div class="hc-row">
          <span class="hc-label">Début :</span>
          ${this._renderTimeSelector(debutStr, id + '-debut')}
        </div>
        <div class="hc-row">
          <span class="hc-label">Durée :</span>
          ${this._renderDurationSelector(dureeStr, id + '-duree', is4CharDuree)}
          <span style="font-size:11px;color:var(--wt-text-light);">heures</span>
        </div>
      </div>
    `;
  }

  _renderHSCBlock(title, debutStr, dureeStr, id) {
    return `
      <div class="hsc-block">
        <div class="hsc-block-title">🔵 ${title}</div>
        <div class="hc-row">
          <span class="hc-label">Début :</span>
          ${this._renderTimeSelector(debutStr, id + '-debut')}
        </div>
        <div class="hc-row">
          <span class="hc-label">Durée :</span>
          ${this._renderDurationSelector(dureeStr, id + '-duree', false)}
          <span style="font-size:11px;color:var(--wt-text-light);">heures</span>
        </div>
      </div>
    `;
  }

  // ============================================================
  // EVENT BINDING
  // ============================================================
  _bindConfigEvents(card) {
    card.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const t = this._tarif;

      switch (action) {
        case 'config-back':
          if (this._configPage > 1) { this._configPage--; this._render(); }
          break;
        case 'config-next':
          this._configPage++;
          this._render();
          break;
        case 'config-save':
          this._applyConfigToLines();
          this._saveConfig();
          this._mode = 'display';
          this._render();
          break;
        case 'config-cancel':
          this._tarif = new TarificationConfig(JSON.parse(this._configBackup));
          this._mode = 'display';
          this._render();
          break;

        case 'toggle-jours-spec':
          t.joursSpecifiques = !t.joursSpecifiques;
          if (!t.joursSpecifiques) {
            t.joursMask = [false, false, false, false, false, false, false, false];
            for (let i = 0; i < 8; i++) {
              this._resetJourSpecLine(i);
              this._resetJourSpecLine(i + 8);
            }
          }
          this._render();
          break;

        case 'toggle-day': {
          if (!t.joursSpecifiques) break;
          const dayIdx = parseInt(target.dataset.day, 10);
          t.joursMask[dayIdx] = !t.joursMask[dayIdx];
          if (t.joursMask[dayIdx]) {
            this._setJourSpec24h(dayIdx);
            this._setJourSpec24h(dayIdx + 8);
          } else {
            this._resetJourSpecLine(dayIdx);
            this._resetJourSpecLine(dayIdx + 8);
          }
          this._render();
          break;
        }

        case 'toggle-saison':
          t.saisonnalite = !t.saisonnalite;
          if (!t.saisonnalite) {
            t.nbPlagesHorsSaison = 1;
            t.nbPlagesHiver = 1;
            t.nbPlagesEte = 1;
            t.superCreusesHiver = false;
            t.superCreusesEte = false;
            t.superCreusesHorsSaison = false;
            this._resetAllNbPlages();
          }
          this._render();
          break;

        case 'toggle-hsc':
          t.superCreusesHorsSaison = !t.superCreusesHorsSaison;
          this._applySuperCreuses();
          this._render();
          break;

        case 'toggle-hsc-hiver':
          t.superCreusesHiver = !t.superCreusesHiver;
          this._applySuperCreuses();
          this._render();
          break;

        case 'toggle-hsc-ete':
          t.superCreusesEte = !t.superCreusesEte;
          this._applySuperCreuses();
          this._render();
          break;

        case 'num-inc':
        case 'num-dec': {
          const id = target.dataset.id;
          const inc = action === 'num-inc' ? 1 : -1;
          if (id === 'nb-plages') {
            t.nbPlagesHorsSaison = ((t.nbPlagesHorsSaison - 1 + inc + 3) % 3) + 1;
            this._updateNbPlagesCode();
          } else if (id === 'nb-plages-hiver') {
            t.nbPlagesHiver = ((t.nbPlagesHiver - 1 + inc + 3) % 3) + 1;
            this._updateNbPlagesCode();
          } else if (id === 'nb-plages-ete') {
            t.nbPlagesEte = ((t.nbPlagesEte - 1 + inc + 3) % 3) + 1;
            this._updateNbPlagesCode();
          }
          this._render();
          break;
        }

        case 'time-inc':
        case 'time-dec': {
          const id = target.dataset.id;
          const pos = parseInt(target.dataset.pos, 10);
          const inc = action === 'time-inc' ? 1 : -1;
          this._handleTimeChange(id, pos, inc);
          this._render();
          break;
        }

        case 'dur-inc':
        case 'dur-dec': {
          const id = target.dataset.id;
          const is4Char = target.dataset['4char'] === 'true';
          const inc = action === 'dur-inc' ? 1 : -1;
          this._handleDurationChange(id, is4Char, inc);
          this._render();
          break;
        }
      }
    });
  }

  // ============================================================
  // CONFIG LOGIC
  // ============================================================
  _setJourSpec24h(lineIdx) {
    const l = this._tarif.lignes[lineIdx];
    l.hc1Debut = '0000';
    l.hc1Duree = '2400';
    l.hc2Debut = '0000';
    l.hc2Duree = '000';
    l.hc3Debut = '0000';
    l.hc3Duree = '000';
  }

  _resetJourSpecLine(lineIdx) {
    const l = this._tarif.lignes[lineIdx];
    l.hc1Debut = '0000';
    l.hc1Duree = '0000';
    l.hc2Debut = '0000';
    l.hc2Duree = '000';
    l.hc3Debut = '0000';
    l.hc3Duree = '000';
  }

  _resetAllNbPlages() {
    for (let i = 0; i < 16; i++) {
      this._tarif.lignes[i].nbPlagesCode = '00';
      this._tarif.lignes[i].superCreuses = '0';
      this._tarif.lignes[i].hscDebut = '0000';
      this._tarif.lignes[i].hscDuree = '000';
    }
  }

  _updateNbPlagesCode() {
    const t = this._tarif;
    const codeMap = { 1: '00', 2: '10', 3: '11' };
    for (let i = 0; i < 16; i++) {
      if (t.saisonnalite) {
        t.lignes[i].nbPlagesCode = i < 8 ? codeMap[t.nbPlagesHiver] : codeMap[t.nbPlagesEte];
      } else {
        t.lignes[i].nbPlagesCode = codeMap[t.nbPlagesHorsSaison];
      }
    }
  }

  _applySuperCreuses() {
    const t = this._tarif;
    for (let i = 0; i < 16; i++) {
      let active;
      if (t.saisonnalite) {
        active = i < 8 ? t.superCreusesHiver : t.superCreusesEte;
      } else {
        active = t.superCreusesHorsSaison;
      }
      t.lignes[i].superCreuses = active ? '1' : '0';
      if (active) {
        t.lignes[i].hscDebut = '0200';
        t.lignes[i].hscDuree = '400';
      } else {
        t.lignes[i].hscDebut = '0000';
        t.lignes[i].hscDuree = '000';
      }
    }
  }

  _handleTimeChange(id, pos, inc) {
    const parts = id.split('-');
    const isEte = parts.includes('ete');
    const hcType = parts[0];
    const field = hcType === 'hsc' ? 'hscDebut' : hcType + 'Debut';
    const lines = this._getTargetLines(isEte);

    for (const li of lines) {
      if (this._isSpecificDayLine(li)) continue;
      const l = this._tarif.lignes[li];
      let digits = l[field].split('').map(Number);
      const maxDigits = [[0, 2],[0, 9],[0, 5],[0, 9]];

      digits[pos] = digits[pos] + inc;
      if (digits[pos] > maxDigits[pos][1]) digits[pos] = maxDigits[pos][0];
      if (digits[pos] < maxDigits[pos][0]) digits[pos] = maxDigits[pos][1];

      const h = digits[0] * 10 + digits[1];
      const m = digits[2] * 10 + digits[3];
      if (h > 23) { digits[0] = 2; digits[1] = 3; }
      if (h === 23 && m > 59) { digits[2] = 5; digits[3] = 9; }

      l[field] = digits.join('');
    }
  }

  _handleDurationChange(id, is4Char, inc) {
    const parts = id.split('-');
    const isEte = parts.includes('ete');
    const hcType = parts[0];
    const field = hcType === 'hsc' ? 'hscDuree' : hcType + 'Duree';
    const lines = this._getTargetLines(isEte);

    const steps = [];
    for (let h = 1; h <= 8; h++) {
      steps.push(h * 60);
      if (h < 8) steps.push(h * 60 + 30);
    }

    for (const li of lines) {
      if (this._isSpecificDayLine(li)) continue;
      const l = this._tarif.lignes[li];
      let currentMin;

      if (is4Char) {
        currentMin = parseInt(l[field].substring(0, 2), 10) * 60 + parseInt(l[field].substring(2, 4), 10);
      } else {
        currentMin = parseInt(l[field][0], 10) * 60 + parseInt(l[field].substring(1, 3), 10);
      }

      let idx = steps.indexOf(currentMin);
      if (idx === -1) idx = 0;
      idx = (idx + inc + steps.length) % steps.length;
      const newMin = steps[idx];
      const h = Math.floor(newMin / 60);
      const m = newMin % 60;

      if (is4Char) {
        l[field] = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
      } else {
        l[field] = `${h}${String(m).padStart(2, '0')}`;
      }
    }
  }

  _getTargetLines(isEte) {
    if (!this._tarif.saisonnalite) {
      return Array.from({ length: 16 }, (_, i) => i);
    }
    return isEte ?
      Array.from({ length: 8 }, (_, i) => i + 8) :
      Array.from({ length: 8 }, (_, i) => i);
  }

  _isSpecificDayLine(lineIdx) {
    const dayIdx = lineIdx % 8;
    return this._tarif.isJourSpecifique(dayIdx);
  }

  _applyConfigToLines() {
    this._updateNbPlagesCode();
    if (!this._tarif.saisonnalite) {
      for (let i = 0; i < 8; i++) {
        const src = this._tarif.lignes[i];
        const dst = this._tarif.lignes[i + 8];
        Object.assign(dst, JSON.parse(JSON.stringify(src)));
      }
    }
  }

  disconnectedCallback() {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }
}

customElements.define('widget-tarification', WidgetTarification);

// ============================================================
// LOVELACE VISUAL EDITOR
// ============================================================
class WidgetTarificationEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  get _entityBase() { return this._config.entity_base || ''; }
  get _title() { return this._config.title || ''; }
  get _showLegend() { return this._config.show_legend !== false; }
  get _showDate() { return this._config.show_date !== false; }
  get _showCountdown() { return this._config.show_countdown !== false; }
  get _theme() { return this._config.theme || 'default'; }
  get _sensorPTEC() { return this._config.sensor_ptec || ''; }

  _render() {
    if (!this.shadowRoot) return;

    const entityOptions = this._hass ?
      Object.keys(this._hass.states)
        .filter(e => e.startsWith('input_text.'))
        .map(e => e.replace(/_(meta|\d+)$/, ''))
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
      : [];

    const ptecOptions = this._hass ?
      Object.keys(this._hass.states)
        .filter(e => {
          const s = e.toLowerCase();
          return s.includes('ptec') || s.includes('tarif') || s.includes('tier_delivered') ||
                 s.includes('zlinky') || s.includes('linky') || s.includes('register_tier');
        })
        .sort()
      : [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif); }
        .editor-container { padding: 16px; }
        .editor-row { margin-bottom: 16px; }
        .editor-row label { display: block; font-size: 13px; font-weight: 500; color: var(--primary-text-color, #333); margin-bottom: 6px; }
        .editor-row .desc { font-size: 11px; color: var(--secondary-text-color, #888); margin-bottom: 6px; }
        input[type="text"], select { width: 100%; padding: 8px 12px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-size: 14px; box-sizing: border-box; background: var(--card-background-color, white); color: var(--primary-text-color, #333); }
        input[type="text"]:focus, select:focus { outline: none; border-color: var(--primary-color, #4a90d9); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .toggle-row label { margin-bottom: 0; flex: 1; }
        .toggle-switch { position: relative; width: 40px; height: 22px; background: #ccc; border-radius: 11px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; }
        .toggle-switch.on { background: var(--primary-color, #4a90d9); }
        .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .toggle-switch.on::after { transform: translateX(18px); }
        .section-divider { border: none; border-top: 1px solid var(--divider-color, #e0e0e0); margin: 16px 0; }
        .section-title { font-size: 14px; font-weight: 600; color: var(--primary-text-color, #333); margin-bottom: 12px; }
        .help-box { background: var(--secondary-background-color, #f5f5f5); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--secondary-text-color, #666); line-height: 1.5; margin-top: 8px; }
        .help-box code { background: var(--card-background-color, white); padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 11px; }
      </style>
      <div class="editor-container">
        <div class="editor-row">
          <label>Titre de la carte</label>
          <input type="text" id="title" value="${this._title}" placeholder="Widget tarification">
        </div>
        <div class="editor-row">
          <label>Préfixe des entités de persistance</label>
          <div class="desc">Préfixe des entités <code>input_text</code> (optionnel)</div>
          <input type="text" id="entity_base" value="${this._entityBase}" placeholder="input_text.widget_tarif" list="entity-bases">
          <datalist id="entity-bases">${entityOptions.map(e => `<option value="${e}">`).join('')}</datalist>
        </div>
        <hr class="section-divider">
        <div class="section-title">⚡ ZLinky / Linky TIC</div>
        <div class="editor-row">
          <label>Sensor période tarifaire (PTEC)</label>
          <input type="text" id="sensor_ptec" value="${this._sensorPTEC}" placeholder="sensor.zlinky_active_register_tier_delivered" list="ptec-entities">
          <datalist id="ptec-entities">${ptecOptions.map(e => `<option value="${e}">`).join('')}</datalist>
        </div>
        <hr class="section-divider">
        <div class="section-title">🎨 Affichage</div>
        <div class="editor-row">
          <label>Thème couleur</label>
          <select id="theme">
            <option value="default" ${this._theme === 'default' ? 'selected' : ''}>Par défaut (orange/vert)</option>
            <option value="blue" ${this._theme === 'blue' ? 'selected' : ''}>Bleu / Vert</option>
            <option value="dark" ${this._theme === 'dark' ? 'selected' : ''}>Sombre</option>
            <option value="minimal" ${this._theme === 'minimal' ? 'selected' : ''}>Minimaliste</option>
          </select>
        </div>
        <div class="toggle-row">
          <label>Afficher la légende (HP/HC/HSC)</label>
          <div class="toggle-switch ${this._showLegend ? 'on' : ''}" data-field="show_legend"></div>
        </div>
        <div class="toggle-row">
          <label>Afficher la date</label>
          <div class="toggle-switch ${this._showDate ? 'on' : ''}" data-field="show_date"></div>
        </div>
        <div class="toggle-row">
          <label>Afficher le compte à rebours</label>
          <div class="toggle-switch ${this._showCountdown ? 'on' : ''}" data-field="show_countdown"></div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('title').addEventListener('input', (e) => {
      this._updateConfig('title', e.target.value || undefined);
    });
    this.shadowRoot.getElementById('entity_base').addEventListener('input', (e) => {
      this._updateConfig('entity_base', e.target.value || undefined);
    });
    this.shadowRoot.getElementById('sensor_ptec').addEventListener('input', (e) => {
      this._updateConfig('sensor_ptec', e.target.value || undefined);
    });
    this.shadowRoot.getElementById('theme').addEventListener('change', (e) => {
      this._updateConfig('theme', e.target.value === 'default' ? undefined : e.target.value);
    });
    this.shadowRoot.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const field = toggle.dataset.field;
        const currentVal = this._config[field] !== false;
        this._updateConfig(field, !currentVal ? undefined : false);
      });
    });
  }

  _updateConfig(key, value) {
    const newConfig = { ...this._config };
    if (value === undefined) {
      delete newConfig[key];
    } else {
      newConfig[key] = value;
    }
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('widget-tarification-editor', WidgetTarificationEditor);

// ============================================================
// THEME SUPPORT
// ============================================================
const _origRenderDisplay = WidgetTarification.prototype._renderDisplay;
WidgetTarification.prototype._renderDisplay = function() {
  const theme = this._config.theme || 'default';
  const themeVars = {
    'default': {},
    'blue': { '--wt-primary': '#3478c6', '--wt-primary-dark': '#2a5fa0', '--wt-orange': '#e8963a' },
    'dark': { '--wt-primary': '#555', '--wt-primary-dark': '#333' },
    'minimal': { '--wt-primary': '#666', '--wt-primary-dark': '#444' },
  };
  const vars = themeVars[theme] || {};
  Object.entries(vars).forEach(([k, v]) => this.style.setProperty(k, v));

  let html = _origRenderDisplay.call(this);

  if (this._config.title) {
    html = html.replace('Widget tarification', this._config.title);
  }
  if (this._config.show_legend === false) {
    html = html.replace(/<div class="legend">[\s\S]*?<\/div>\s*<\/div>/, '</div>');
  }
  if (this._config.show_date === false) {
    html = html.replace(/📅[^<]*<\/span>/, '</span>');
  }
  if (this._config.show_countdown === false) {
    html = html.replace(/Dans [^<]*<\/span>/, '</span>');
  }

  return html;
};

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'widget-tarification',
  name: 'Widget Tarification',
  description: 'Gestion et affichage des plages Heures Creuses / Pleines / Super Creuses',
  preview: true,
  documentationURL: 'https://github.com/Acidburn1824/tarification',
});

console.info('%c WIDGET-TARIFICATION %c v1.2.1-transparent ', 'color: white; background: #e8a020; font-weight: bold;', 'color: #e8a020; background: white;');
