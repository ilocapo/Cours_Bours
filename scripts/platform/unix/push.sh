#!/bin/bash
# ============================================
# BRVM Portfolio - Push rapide vers main
# Usage: ./push.sh
#        ./push.sh "mon message de commit"
# ============================================

set -e

# Couleurs
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${ORANGE}════════════════════════════════════════${NC}"
echo -e "${ORANGE}  BRVM Portfolio - Push vers main${NC}"
echo -e "${ORANGE}════════════════════════════════════════${NC}"
echo ""

# Se placer à la racine du projet
cd "$(dirname "$0")/../../.."

# Vérifier qu'on est dans un repo git
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}[ERREUR] Ce dossier n'est pas un repository git.${NC}"
    echo "         Initialisez avec : git init && git remote add origin <url>"
    exit 1
fi

# Vérifier s'il y a des changements
if [[ -z $(git status --porcelain) ]]; then
    echo -e "${CYAN}[INFO] Aucune modification détectée. Rien à pousser.${NC}"
    exit 0
fi

# Afficher le statut
echo -e "${CYAN}Fichiers modifiés :${NC}"
git status --short
echo ""

# Message de commit
if [[ -n "$1" ]]; then
    MSG="$1"
else
    read -p "Message de commit (Entrée pour auto) : " MSG
    if [[ -z "$MSG" ]]; then
        MSG="update: $(date '+%Y-%m-%d %H:%M')"
    fi
fi

echo ""
echo -e "${CYAN}[1/3] git add .${NC}"
git add .

echo -e "${CYAN}[2/3] git commit -m \"${MSG}\"${NC}"
git commit -m "$MSG"

echo -e "${CYAN}[3/3] git push origin main${NC}"
git push origin main

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Poussé sur main avec succès !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
