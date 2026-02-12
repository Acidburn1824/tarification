#!/bin/bash
# ============================================
# Script de mise en place du dépôt GitHub
# Widget Tarification pour Home Assistant / HACS
# ============================================

echo "🔧 Initialisation du dépôt widget-tarification..."
echo ""

# Vérifier que git est configuré
if [ -z "$(git config --global user.name)" ]; then
    echo "⚠️  Configurez d'abord git :"
    echo "   git config --global user.name \"Votre Nom\""
    echo "   git config --global user.email \"votre@email.com\""
    echo ""
fi

# Init repo
git init
git add .
git commit -m "🎉 Initial release - Widget Tarification v1.1.0"

# IMPORTANT: HACS nécessite un tag de version valide
git tag -a v1.1.0 -m "Version 1.1.0 - Release initiale avec éditeur visuel"

echo ""
echo "✅ Dépôt local créé avec succès !"
echo ""
echo "════════════════════════════════════════════"
echo "  📋 ÉTAPES À SUIVRE"
echo "════════════════════════════════════════════"
echo ""
echo "1️⃣  Créez le dépôt sur GitHub :"
echo "   → https://github.com/new"
echo "   → Nom : widget-tarification"
echo "   → Public ✓"
echo "   → NE PAS cocher 'Add a README' (on l'a déjà)"
echo "   → Cliquer 'Create repository'"
echo ""
echo "2️⃣  Liez et poussez :"
echo ""
echo "   git remote add origin https://github.com/Acidburn1824/widget-tarification.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo "   git push origin v1.1.0"
echo ""
echo "3️⃣  IMPORTANT - Créer la Release manuellement"
echo "   (si la GitHub Action ne se déclenche pas) :"
echo ""
echo "   → https://github.com/Acidburn1824/widget-tarification/releases/new"
echo "   → Tag : v1.1.0"
echo "   → Title : v1.1.0"
echo "   → Glissez-déposez le fichier widget-tarification.js"
echo "   → Cliquer 'Publish release'"
echo ""
echo "4️⃣  Dans HACS :"
echo "   → HACS → Frontend → ⋮ → Dépôts personnalisés"
echo "   → URL : https://github.com/Acidburn1824/widget-tarification"
echo "   → Catégorie : Lovelace"
echo "   → Installer"
echo ""
echo "5️⃣  Ajouter la carte :"
echo "   → Modifier un dashboard → + Ajouter une carte"
echo "   → Chercher 'Widget Tarification'"
echo "   → Ou en YAML : type: custom:widget-tarification"
echo ""
echo "🎉 C'est tout !"
