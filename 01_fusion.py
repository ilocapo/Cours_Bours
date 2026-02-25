# ============================================================
# BIBLIOTHÈQUES UTILISÉES
# pandas  : manipulation de tableaux de données (comme Excel en Python)
# os      : interaction avec le système de fichiers (chemins, dossiers)
# re      : expressions régulières, pour filtrer les noms de fichiers
# glob    : recherche de fichiers selon un motif (ex: "*.xls*")
# ============================================================
import pandas as pd
import os
import re
from glob import glob

# Dossier de référence : là où se trouve ce script Python.
# Tous les fichiers Excel doivent être dans ce même dossier.
DATA_PATH = os.path.dirname(os.path.abspath(__file__))


def fusion_of_excel_files():
    """
    Lit tous les fichiers de cours boursiers journaliers (nommés JJ-MM-AAAA.xls ou .xlsx)
    et les fusionne en un seul grand tableau.

    Structure attendue de chaque fichier Excel :
      - Lignes 0 à 17 : métadonnées (titre, date de cotation, indices BRVM...) → ignorées
      - Ligne 18       : noms des colonnes (Code symbole, ISIN, Cours moyen, etc.)
      - Lignes 19+     : une ligne par titre coté ce jour-là

    Résultat retourné : un tableau avec une colonne "Date" + toutes les colonnes du fichier.
    """

    # Liste vide qui va accumuler les données de chaque fichier au fur et à mesure
    all_data = []

    # Filtre : on accepte uniquement les fichiers dont le nom suit exactement
    # le format JJ-MM-AAAA.xls ou JJ-MM-AAAA.xlsx (ex: 14-09-2023.xls)
    # Cela exclut les fichiers de référence comme "2025_Point Titres Suspendus MF.xlsx"
    pattern = re.compile(r"^\d{2}-\d{2}-\d{4}\.xlsx?$")

    # Recherche de tous les fichiers Excel dans le dossier,
    # puis filtrage selon le motif de nom, et tri chronologique par nom
    files = sorted([
        f for f in glob(os.path.join(DATA_PATH, "*.xls*"))
        if pattern.match(os.path.basename(f))
    ])

    print(f"{len(files)} fichiers trouvés.")

    # Lecture de chaque fichier un par un
    for file in files:
        try:
            # Récupération du nom du fichier seul (sans le chemin du dossier)
            filename = os.path.basename(file)

            # Extraction de la date depuis les 10 premiers caractères du nom (JJ-MM-AAAA)
            date = pd.to_datetime(filename[:10], format="%d-%m-%Y")

            # Choix du moteur de lecture selon l'extension :
            #   - .xlsx → openpyxl (format Excel moderne)
            #   - .xls  → xlrd    (format Excel ancien)
            engine = "openpyxl" if file.endswith(".xlsx") else "xlrd"

            # Lecture du fichier en sautant les 18 premières lignes de métadonnées.
            # header=18 signifie : "utilise la ligne 18 comme en-tête de colonnes"
            df = pd.read_excel(file, header=18, engine=engine)

            # Suppression des lignes entièrement vides (présentes parfois en fin de fichier)
            df.dropna(how="all", inplace=True)

            # Ajout d'une colonne "Date" en première position, avec la date du fichier
            df.insert(0, "Date", date)

            # Ajout du tableau de ce jour à la liste générale
            all_data.append(df)

        except Exception as e:
            # En cas d'erreur sur un fichier, on l'affiche et on continue avec les suivants
            print(f"Erreur fichier {filename}: {e}")

    # Si aucun fichier n'a pu être lu, on retourne un tableau vide
    if not all_data:
        print("Aucune donnée chargée.")
        return pd.DataFrame()

    # Concaténation de tous les tableaux journaliers en un seul grand tableau
    # ignore_index=True : réinitialise la numérotation des lignes de 0 à N
    result = pd.concat(all_data, ignore_index=True)

    print(f"Fusion terminée : {len(result)} lignes, {result['Date'].nunique()} jours de cotation.")
    return result