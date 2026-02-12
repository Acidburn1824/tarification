# Widget Tarification ⚡

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/Acidburn1824/widget-tarification)](https://github.com/Acidburn1824/widget-tarification/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Carte Lovelace custom pour **Home Assistant** permettant de visualiser et configurer les plages d'**Heures Creuses** (HC), **Heures Pleines** (HP) et **Heures Super Creuses** (HSC) de votre contrat d'électricité français.

---

## ✨ Fonctionnalités

- 📊 **Affichage temps réel** — Barre de timeline 24h avec curseur dynamique
- 🔄 **Statut en direct** — HP / HC / HSC en cours avec compte à rebours avant le prochain changement
- 📅 **Jours spécifiques** — Configuration de jours en HC 24h/24 (week-end, jours fériés, mercredi…)
- ❄️☀️ **Saisonnalité** — Plages différenciées hiver (1er nov → 31 mars) / été (1er avr → 31 oct)
- 🔢 **1 à 3 plages HC** configurables par période
- 🔵 **Heures Super Creuses** — Support de l'offre CHARGE'HEURES Total Énergies et similaires
- 🇫🇷 **Jours fériés français** — Détection automatique (incluant Pâques, Ascension, Pentecôte)
- 💾 **Persistance** — localStorage + entités HA `input_text` optionnelles

---

## 📸 Captures d'écran

### Affichage principal
> Barre de timeline avec plages colorées et curseur temps réel indiquant le statut actuel.

<!-- ![Display](screenshots/display.png) -->

### Configuration - Page 1
> Jours spécifiques, saisonnalité, nombre de plages et heures super creuses.

<!-- ![Config Page 1](screenshots/config-page1.png) -->

### Configuration - Page 2
> Réglage des heures de début et durées des plages HC.

<!-- ![Config Page 2](screenshots/config-page2.png) -->

---

## 📦 Installation

### HACS (recommandé)

1. Ouvrir **HACS** → **Frontend**
2. Menu **⋮** → **Dépôts personnalisés**
3. Ajouter : `https://github.com/Acidburn1824/widget-tarification`
4. Catégorie : **Lovelace**
5. Cliquer **Installer**
6. **Redémarrer** Home Assistant
7. Vider le cache du navigateur (Ctrl+F5)

### Installation manuelle

1. Télécharger `widget-tarification.js` depuis la [dernière release](https://github.com/Acidburn1824/widget-tarification/releases)
2. Copier dans `/config/www/widget-tarification/`
3. Ajouter la ressource dans **Paramètres → Tableaux de bord → Ressources** :

```yaml
URL: /local/widget-tarification/widget-tarification.js
Type: Module JavaScript
```

4. Redémarrer Home Assistant

---

## 🔧 Configuration

### Carte basique

```yaml
type: custom:widget-tarification
```

### Avec options

```yaml
type: custom:widget-tarification
title: "Mon contrat EDF"
entity_base: input_text.widget_tarif
theme: default
show_legend: true
show_date: true
show_countdown: true
```

### Options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `title` | string | `Widget tarification` | Titre personnalisé de la carte |
| `entity_base` | string | `input_text.widget_tarif` | Préfixe des entités `input_text` pour la persistance HA |
| `theme` | string | `default` | Thème couleur : `default`, `blue`, `dark`, `minimal` |
| `show_legend` | boolean | `true` | Afficher la légende HP/HC/HSC |
| `show_date` | boolean | `true` | Afficher la date et l'heure |
| `show_countdown` | boolean | `true` | Afficher le compte à rebours |

> 💡 **Toutes ces options sont configurables via l'éditeur visuel Lovelace** — pas besoin de YAML ! Cliquez sur "Modifier" sur votre tableau de bord puis sur la carte pour accéder à l'éditeur.

### Persistance HA (optionnel)

Par défaut, la configuration est sauvegardée en `localStorage` dans le navigateur. Pour une persistance qui survit aux redémarrages de HA et fonctionne sur tous vos appareils, créez ces entités `input_text` dans votre `configuration.yaml` :

```yaml
input_text:
  widget_tarif_meta:
    name: Widget Tarif Meta
    max: 255
  widget_tarif_0:
    name: Widget Tarif Data 0
    max: 255
  widget_tarif_1:
    name: Widget Tarif Data 1
    max: 255
  widget_tarif_2:
    name: Widget Tarif Data 2
    max: 255
  widget_tarif_3:
    name: Widget Tarif Data 3
    max: 255
```

---

## 📖 Utilisation

1. Cliquer sur l'icône **⚙** en haut à droite de la carte
2. **Page 1** :
   - Activer les **jours spécifiques** et sélectionner les jours concernés
   - Activer la **saisonnalité** si votre contrat le prévoit
   - Définir le **nombre de plages HC** (1 à 3)
   - Activer les **heures super creuses** si applicable
3. **Page 2** : Régler les **heures de début** et **durées** de chaque plage HC
4. **Page 3** : (si saisonnalité) Régler les plages de la période estivale
5. Cliquer **Valider** pour sauvegarder

### Exemples de configurations courantes

**EDF Tempo / HC-HP classique** (1 plage) :
- 1 plage HC : 22h30 → 06h30 (8h00)

**2 plages HC** :
- HC1 : 03h36 → 07h36 (4h00)
- HC2 : 12h36 → 16h36 (4h00)

**Total Énergies CHARGE'HEURES** :
- HC : 23h00 → 02h00 (3h00) + 06h00 → 07h00 (1h00)
- HSC : 02h00 → 06h00 (4h00)

---

## 🗺️ Roadmap

- [ ] Configuration spécifique par jour (plages différentes selon le jour)
- [ ] Intégration avec les sensors de consommation Linky
- [ ] Notifications au changement de tarif
- [ ] Automatisations HA basées sur le statut HC/HP
- [ ] Support multi-langues

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

## 📄 Licence

MIT © [Acidburn1824](https://github.com/Acidburn1824)
