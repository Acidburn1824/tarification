from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, DEFAULT_NAME
from .coordinator import TarificationCoordinator

SENSOR_TYPES: list[SensorEntityDescription] = [
    SensorEntityDescription(key="current", name="État actuel"),
    SensorEntityDescription(key="next", name="Prochain état"),
    SensorEntityDescription(key="next_change", name="Prochain changement"),
    SensorEntityDescription(key="remaining", name="Temps restant"),
    SensorEntityDescription(key="price_now", name="Prix actuel"),
    SensorEntityDescription(key="period", name="Période"),
]

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: TarificationCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([TarificationSensor(coordinator, entry, desc) for desc in SENSOR_TYPES])

class TarificationSensor(CoordinatorEntity[TarificationCoordinator], SensorEntity):
    def __init__(self, coordinator: TarificationCoordinator, entry: ConfigEntry, desc: SensorEntityDescription) -> None:
        super().__init__(coordinator)
        self.entity_description = desc
        name = entry.title or DEFAULT_NAME
        self._attr_name = f"{name} {desc.name}"
        self._attr_unique_id = f"{entry.entry_id}_{desc.key}"

    @property
    def native_value(self):
        snap = self.coordinator.data
        k = self.entity_description.key
        if snap is None:
            return None
        if k == "current":
            return snap.current_state
        if k == "next":
            return snap.next_state
        if k == "next_change":
            return snap.next_change.isoformat() if snap.next_change else None
        if k == "remaining":
            return snap.remaining_s
        if k == "price_now":
            return snap.price_now
        if k == "period":
            return snap.period
        return None

    @property
    def extra_state_attributes(self):
        snap = self.coordinator.data
        if not snap:
            return {}
        return {
            "now": snap.now.isoformat(),
            "debug": snap.debug,
        }
