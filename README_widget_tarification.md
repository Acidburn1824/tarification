
# ⚡ Widget Tarification – Home Assistant

Carte Lovelace avancée pour afficher les périodes tarifaires EDF  
(HP / HC / Tempo / Super‑creuses) avec support Linky/Zlinky.

---

## ✨ Fonctionnalités

- Affichage période actuelle
- Mode planning interne
- Mode Linky temps réel (PTEC)
- Fallback automatique
- Configurable depuis l’UI Lovelace
- Badge LINKY LIVE
- Compatible HACS
- localStorage

---

## 📦 Installation HACS

Ajouter repo custom :

https://github.com/TON_REPO/widget-tarification

Type : Lovelace

Puis installer la carte.

---

## 📦 Installation manuelle

Copier :
/www/widget-tarification.js

Ajouter dans resources :

url: /local/widget-tarification.js  
type: module

---

## 🧱 Utilisation simple

type: custom:widget-tarification

---

## ⚡ Mode Linky

Activer dans l’éditeur :

- Activer source Linky  
- Choisir entité période tarifaire  

Exemple :

sensor.zlinky_ptec

---

## YAML exemple

type: custom:widget-tarification  
linky:  
  enabled: true  
  period_entity: sensor.zlinky_ptec  
  fallback_to_planning: true  
  show_badge: true  

---

## 🔌 Entités compatibles

sensor.zlinky_ptec  
sensor.linky_ptec  
sensor.tic_period  

---

## 🔁 Fallback

Si Linky indisponible → planning interne utilisé.

---

## 👨‍💻 Auteur

Acidburn1824

