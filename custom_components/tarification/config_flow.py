from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import (
    DOMAIN,
    CONF_NAME,
    CONF_PLAGES,
    CONF_DEFAULT_STATE,
    CONF_PRICES,
    CONF_TEMPO_TODAY_ENTITY,
    CONF_TEMPO_TOMORROW_ENTITY,
    DEFAULT_NAME,
    DEFAULT_STATE,
    STATE_HP,
    STATE_HC,
    STATE_HSC,
)

DEFAULT_PLAGES = [
    {"start": "22:30", "end": "06:30", "state": "HC"},
]

def _validate_plages(plages: list[dict]) -> list[dict]:
    # Minimal validation: keys and HH:MM
    import re
    hhmm = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
    out = []
    for p in plages:
        st = str(p.get("start","")).strip()
        en = str(p.get("end","")).strip()
        state = str(p.get("state", STATE_HC)).strip().upper()
        if not (hhmm.match(st) and hhmm.match(en)):
            raise vol.Invalid("start/end must be HH:MM")
        if state not in (STATE_HP, STATE_HC, STATE_HSC):
            raise vol.Invalid("state must be HP/HC/HSC")
        out.append({"start": st, "end": en, "state": state})
    return out

class TarificationConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is None:
            schema = vol.Schema({
                vol.Optional(CONF_NAME, default=DEFAULT_NAME): str,
            })
            return self.async_show_form(step_id="user", data_schema=schema)

        title = user_input.get(CONF_NAME, DEFAULT_NAME)
        return self.async_create_entry(title=title, data={CONF_NAME: title})

    @callback
    def async_get_options_flow(self, config_entry):
        return TarificationOptionsFlow(config_entry)

class TarificationOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, entry):
        self.entry = entry

    async def async_step_init(self, user_input=None):
        if user_input is None:
            opts = self.entry.options
            plages = opts.get(CONF_PLAGES, DEFAULT_PLAGES)
            default_state = opts.get(CONF_DEFAULT_STATE, DEFAULT_STATE)
            prices = opts.get(CONF_PRICES, {"HP": 0.0, "HC": 0.0, "HSC": 0.0})

            schema = vol.Schema({
                vol.Optional(CONF_DEFAULT_STATE, default=default_state): vol.In([STATE_HP, STATE_HC, STATE_HSC]),
                vol.Optional(CONF_PLAGES, default=plages): list,
                vol.Optional(CONF_PRICES, default=prices): dict,
                vol.Optional(CONF_TEMPO_TODAY_ENTITY, default=opts.get(CONF_TEMPO_TODAY_ENTITY, "")): str,
                vol.Optional(CONF_TEMPO_TOMORROW_ENTITY, default=opts.get(CONF_TEMPO_TOMORROW_ENTITY, "")): str,
            })
            return self.async_show_form(step_id="init", data_schema=schema)

        # Validate plages
        plages_in = user_input.get(CONF_PLAGES, [])
        plages = _validate_plages(plages_in)

        prices_in = user_input.get(CONF_PRICES, {}) or {}
        # sanitize prices
        prices = {}
        for k, v in prices_in.items():
            kk = str(k).upper()
            if kk in (STATE_HP, STATE_HC, STATE_HSC):
                try:
                    prices[kk] = float(v)
                except Exception:
                    prices[kk] = 0.0

        return self.async_create_entry(title="", data={
            CONF_DEFAULT_STATE: user_input.get(CONF_DEFAULT_STATE, DEFAULT_STATE),
            CONF_PLAGES: plages,
            CONF_PRICES: prices,
            CONF_TEMPO_TODAY_ENTITY: user_input.get(CONF_TEMPO_TODAY_ENTITY) or None,
            CONF_TEMPO_TOMORROW_ENTITY: user_input.get(CONF_TEMPO_TOMORROW_ENTITY) or None,
        })
