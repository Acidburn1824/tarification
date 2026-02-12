from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, DEFAULT_NAME, BINARY_IS_HC, BINARY_IS_HSC, STATE_HC, STATE_HSC
from .coordinator import TarificationCoordinator

BINARY_TYPES: list[BinarySensorEntityDescription] = [
    BinarySensorEntityDescription(key=BINARY_IS_HC, name="Est en HC"),
    BinarySensorEntityDescription(key=BINARY_IS_HSC, name="Est en HSC"),
]

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: TarificationCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([TarificationBinarySensor(coordinator, entry, desc) for desc in BINARY_TYPES])

class TarificationBinarySensor(CoordinatorEntity[TarificationCoordinator], BinarySensorEntity):
    def __init__(self, coordinator: TarificationCoordinator, entry: ConfigEntry, desc: BinarySensorEntityDescription) -> None:
        super().__init__(coordinator)
        self.entity_description = desc
        name = entry.title or DEFAULT_NAME
        self._attr_name = f"{name} {desc.name}"
        self._attr_unique_id = f"{entry.entry_id}_{desc.key}"

    @property
    def is_on(self) -> bool | None:
        snap = self.coordinator.data
        if snap is None:
            return None
        if self.entity_description.key == BINARY_IS_HC:
            return snap.current_state == STATE_HC
        if self.entity_description.key == BINARY_IS_HSC:
            return snap.current_state == STATE_HSC
        return None
