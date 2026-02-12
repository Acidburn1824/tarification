from __future__ import annotations

from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    CONF_PLAGES,
    CONF_DEFAULT_STATE,
    CONF_PRICES,
    CONF_TEMPO_TODAY_ENTITY,
    DEFAULT_STATE,
)
from .tariff_engine import compute_snapshot, TariffSnapshot

class TarificationCoordinator(DataUpdateCoordinator[TariffSnapshot]):
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        super().__init__(
            hass,
            logger=__import__("logging").getLogger(__name__),
            name=f"{DOMAIN}_{entry.entry_id}",
            update_interval=timedelta(seconds=30),
        )

    def _get_tempo_today(self) -> str | None:
        ent = self.entry.options.get(CONF_TEMPO_TODAY_ENTITY)
        if not ent:
            return None
        st = self.hass.states.get(ent)
        return st.state if st else None

    async def _async_update_data(self) -> TariffSnapshot:
        opts = {**self.entry.data, **self.entry.options}
        plages = opts.get(CONF_PLAGES, [])
        default_state = opts.get(CONF_DEFAULT_STATE, DEFAULT_STATE)
        prices = opts.get(CONF_PRICES, None)
        now = dt_util.now()  # timezone-aware
        tempo_today = self._get_tempo_today()
        snap = compute_snapshot(
            now=now,
            plages=plages,
            default_state=default_state,
            prices=prices,
            tempo_today=tempo_today,
        )
        return snap
