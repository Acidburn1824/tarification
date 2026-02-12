class TarificationCard extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this.content) {
      this.innerHTML = `<ha-card header="Tarification">
        <div class="card-content" id="c"></div>
      </ha-card>`;
      this.content = this.querySelector("#c");
    }
  }

  set hass(hass) {
    this._hass = hass;
    const cfg = this._config || {};
    const base = cfg.base_entity || "sensor.tarification_état_actuel";
    // Better: explicit entities
    const entCurrent = cfg.entity_current || "sensor.tarification_état_actuel";
    const entNext = cfg.entity_next || "sensor.tarification_prochain_état";
    const entNextChange = cfg.entity_next_change || "sensor.tarification_prochain_changement";
    const entRemaining = cfg.entity_remaining || "sensor.tarification_temps_restant";
    const entPrice = cfg.entity_price || "sensor.tarification_prix_actuel";

    const s = (e) => (hass.states[e] ? hass.states[e].state : "—");
    const fmtRemaining = () => {
      const v = hass.states[entRemaining]?.state;
      const n = Number(v);
      if (!isFinite(n)) return "—";
      const hh = Math.floor(n / 3600);
      const mm = Math.floor((n % 3600) / 60);
      const ss = Math.floor(n % 60);
      return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    };

    this.content.innerHTML = `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <div><b>Maintenant</b><br>${s(entCurrent)}</div>
        <div><b>Prix</b><br>${s(entPrice)}</div>
        <div><b>Prochain</b><br>${s(entNext)}</div>
        <div><b>Changement</b><br>${s(entNextChange)}</div>
        <div><b>Reste</b><br>${fmtRemaining()}</div>
      </div>
    `;
  }

  getCardSize() { return 1; }
}
customElements.define("tarification-card", TarificationCard);
