<div align="center">

# ⚡ Widget Tarification

**Carte Lovelace pour Home Assistant**
Visualisez vos plages Heures Creuses / Heures Pleines / Super Creuses en temps réel

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![Release](https://img.shields.io/github/v/release/Acidburn1824/widget-tarification?style=for-the-badge)](https://github.com/Acidburn1824/widget-tarification/releases)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Fonctionnalités

| | Fonctionnalité | Description |
|---|---|---|
| 📊 | **Timeline 24h** | Barre visuelle avec curseur temps réel |
| 🔄 | **Statut en direct** | HP / HC / HSC en cours + compte à rebours |
| ⚡ | **ZLinky / Linky TIC** | Tarif en temps réel depuis votre compteur Linky |
| 🎨 | **Tempo / EJP** | Affichage couleur Tempo (Bleu/Blanc/Rouge) et EJP |
| 📅 | **Jours spécifiques** | Jours en HC 24h (week-end, fériés, mercredi…) |
| ❄️☀️ | **Saisonnalité** | Plages différenciées hiver / été |
| 🔢 | **1 à 3 plages HC** | Configurables par période |
| 🔵 | **Super Creuses** | Support CHARGE'HEURES Total Énergies et similaires |
| 🇫🇷 | **Jours fériés** | Détection automatique (incluant Pâques, Ascension…) |
| 🎨 | **4 thèmes** | Default, Bleu, Sombre, Minimaliste |
| 💾 | **Persistance** | localStorage + entités HA optionnelles |

---

## 📸 Captures d'écran

### Affichage principal
> Barre de timeline avec plages colorées et curseur temps réel indiquant le statut actuel.

<!-- ![Display](screenshots/display.png) -->

### Avec ZLinky
> Le badge ⚡ ZLinky indique que le statut provient directement du compteur Linky. Support Tempo avec couleur du jour.

<!-- ![ZLinky](screenshots/zlinky.png) -->

### Configuration
> Assistant de configuration intégré accessible via l'icône ⚙

<!-- ![Config](screenshots/config.png) -->

---

## 📦 Installation

### HACS (recommandé)

<details>
<summary><b>3 étapes simples</b></summary>

1. **HACS** → **Frontend** → ⋮ → **Dépôts personnalisés**
2. URL : `https://github.com/Acidburn1824/widget-tarification` — Catégorie : **Lovelace**
3. Cliquer **Installer** → **Redémarrer HA** → Vider le cache (`Ctrl+F5`)

</details>

### Installation manuelle

<details>
<summary>Cliquer pour voir</summary>

1. Télécharger `widget-tarification.js` depuis la [dernière release](https://github.com/Acidburn1824/widget-tarification/releases)
2. Copier dans `/config/www/widget-tarification/`
3. **Paramètres → Tableaux de bord → Ressources** → Ajouter :

```
URL: /local/widget-tarification/widget-tarification.js
Type: Module JavaScript
```

4. Redémarrer Home Assistant

</details>

---

## 🔧 Configuration

### Carte basique

```yaml
type: custom:widget-tarification
```

### Avec ZLinky (recommandé si vous avez un module LiXee)

```yaml
type: custom:widget-tarification
sensor_ptec: sensor.zlinky_active_register_tier_delivered
```

### Toutes les options

```yaml
type: custom:widget-tarification
title: "Mon contrat EDF"
sensor_ptec: sensor.zlinky_active_register_tier_delivered
entity_base: input_text.widget_tarif
theme: default
show_legend: true
show_date: true
show_countdown: true
```

> 💡 **Toutes ces options sont configurables via l'éditeur visuel Lovelace** — pas besoin de YAML !

### Options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `title` | string | `Widget tarification` | Titre personnalisé |
| `sensor_ptec` | string | — | Entité ZLinky/Linky TIC pour le tarif en cours |
| `entity_base` | string | — | Préfixe des entités `input_text` pour la persistance |
| `theme` | string | `default` | Thème : `default`, `blue`, `dark`, `minimal` |
| `show_legend` | boolean | `true` | Afficher la légende HP/HC/HSC |
| `show_date` | boolean | `true` | Afficher la date et l'heure |
| `show_countdown` | boolean | `true` | Afficher le compte à rebours |

---

## ⚡ ZLinky / Linky TIC

Le widget peut se connecter à votre compteur Linky via un module **ZLinky** (LiXee) ou toute intégration fournissant un sensor PTEC (Période Tarifaire En Cours).

### Entités compatibles

| Intégration | Entité type | Valeurs |
|---|---|---|
| **ZLinky** (Z2M) | `sensor.zlinky_active_register_tier_delivered` | `HC..`, `HP..` |
| **ZLinky** (ZHA) | `sensor.lixee_zlinky_tic_active_register_tier_delivered` | `HC..`, `HP..` |
| **Linky TIC** (hekmon) | `sensor.linky_ptec` | `HC..`, `HP..` |

### Contrats supportés

| Contrat | Valeurs PTEC reconnues |
|---|---|
| **Base / HC-HP** | `HC..`, `HP..` |
| **Tempo** | `HCJB`, `HPJB` (Bleu), `HCJW`, `HPJW` (Blanc), `HCJR`, `HPJR` (Rouge) |
| **EJP** | `HN..` (Heures Normales), `PM..` (Pointe Mobile) |

### Comment ça marche ?

1. Le widget lit la valeur du sensor PTEC à chaque mise à jour
2. Le badge de statut affiche le tarif **en temps réel** depuis le compteur
3. Pour Tempo, un badge couleur supplémentaire indique le jour (Bleu/Blanc/Rouge)
4. Les plages configurées manuellement restent affichées sur la timeline
5. Le widget fonctionne parfaitement **sans** ZLinky — la configuration manuelle suffit

---

## 💾 Persistance (optionnel)

Par défaut, la configuration est sauvegardée en `localStorage` (navigateur). Pour une persistance multi-appareils, créez ces entités dans votre `configuration.yaml` :

<details>
<summary><b>Voir la configuration input_text</b></summary>

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

</details>

---

## 📖 Utilisation

1. Cliquer sur l'icône **⚙** en haut à droite de la carte
2. **Page 1** — Jours spécifiques, saisonnalité, nombre de plages, super creuses
3. **Page 2** — Heures de début et durées de chaque plage HC
4. **Page 3** — (si saisonnalité) Plages de la période estivale
5. **Valider** pour sauvegarder

### Exemples de contrats

| Contrat | Configuration |
|---|---|
| **EDF HC-HP classique** | 1 plage : 22h30 → 06h30 (8h) |
| **2 plages HC** | HC1 : 03h36 → 07h36 (4h) — HC2 : 12h36 → 16h36 (4h) |
| **Total Énergies CHARGE'HEURES** | HC : 23h → 02h (3h) + 06h → 07h (1h) — HSC : 02h → 06h (4h) |

---

## 🗺️ Roadmap

- [x] ~~Intégration avec les sensors Linky~~ → **v1.2.0 : support ZLinky**
- [ ] Configuration spécifique par jour
- [ ] Notifications au changement de tarif
- [ ] Automatisations HA basées sur le statut HC/HP
- [ ] Support multi-langues

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une [issue](https://github.com/Acidburn1824/widget-tarification/issues) ou une pull request.

---

## 📄 Licence

MIT © [Acidburn1824](https://github.com/Acidburn1824)
