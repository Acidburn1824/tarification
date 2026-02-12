Tarification V3 (squelette) - Home Assistant

Installation (manuel):
1) Copiez le dossier custom_components/tarification dans /config/custom_components/tarification
2) Redémarrez Home Assistant
3) Paramètres > Appareils & services > Ajouter une intégration > Tarification
4) Ouvrez Options et configurez:
   - default_state: HP (par défaut)
   - plages: liste de dicts {start:'HH:MM', end:'HH:MM', state:'HC|HSC|HP'}
   - prices: dict {HP:0.0, HC:0.0, HSC:0.0}
   - tempo_today_entity (optionnel)

Entités créées:
- sensor.<nom> État actuel
- sensor.<nom> Prochain état
- sensor.<nom> Prochain changement
- sensor.<nom> Temps restant (secondes)
- sensor.<nom> Prix actuel
- binary_sensor.<nom> Est en HC
- binary_sensor.<nom> Est en HSC

Carte:
1) Placez custom_components/tarification/frontend/tarification-card.js dans /config/www/ (ou servez-le via HACS plus tard)
2) Ajoutez la ressource /local/tarification-card.js
3) Utilisez:
   type: custom:tarification-card
   entity_current: sensor.tarification_état_actuel
   ...
