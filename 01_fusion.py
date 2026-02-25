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

# Chemins de sortie
OUTPUT_CSV = os.path.join(DATA_PATH, "cours_boursiers_fusion.csv")
OUTPUT_XLSX = os.path.join(DATA_PATH, "cours_boursiers_fusion.xlsx")


def find_header_row(file, engine, max_rows=30):
    """
    Détecte dynamiquement la ligne d'en-tête contenant 'Code symbole'.
    La position varie selon l'année (ligne 16 en 2017, 18 en 2023, 24+ en 2025)
    car le nombre d'indices BRVM a évolué au fil du temps.
    """
    df_raw = pd.read_excel(file, header=None, engine=engine, nrows=max_rows)
    for i, row in df_raw.iterrows():
        first_cell = str(row.iloc[0]).strip().lower()
        if first_cell == "code symbole":
            return i
    return None


def fusion_of_excel_files():
    """
    Lit tous les fichiers de cours boursiers journaliers (nommés JJ-MM-AAAA.xls ou .xlsx)
    et les fusionne en un seul grand tableau.

    Structure attendue de chaque fichier Excel :
      - Premières lignes  : métadonnées (titre, date de cotation, indices BRVM...)
      - Ligne variable    : noms des colonnes (Code symbole, ISIN, Cours moyen, etc.)
      - Lignes suivantes  : une ligne par titre coté ce jour-là

    Résultat retourné : un tableau avec une colonne "Date" + toutes les colonnes du fichier.
    """

    # Liste vide qui va accumuler les données de chaque fichier au fur et à mesure
    all_data = []
    errors = []

    # Filtre : on accepte uniquement les fichiers dont le nom suit exactement
    # le format JJ-MM-AAAA.xls ou JJ-MM-AAAA.xlsx (ex: 14-09-2023.xls)
    # Cela exclut les fichiers de référence comme "2025_Point Titres Suspendus MF.xlsx"
    pattern = re.compile(r"^\d{2}-\d{2}-\d{4}\.xlsx?$")

    # Recherche de tous les fichiers Excel dans le dossier,
    # puis filtrage selon le motif de nom, et tri chronologique par nom
    files = sorted([
        f for f in glob(os.path.join(DATA_PATH, "*.xls")) + glob(os.path.join(DATA_PATH, "*.xlsx"))
        if pattern.match(os.path.basename(f))
    ])

    print(f"{len(files)} fichiers trouvés.")

    # Lecture de chaque fichier un par un
    for idx, file in enumerate(files):
        filename = os.path.basename(file)
        try:
            # Extraction de la date depuis les 10 premiers caractères du nom (JJ-MM-AAAA)
            date = pd.to_datetime(filename[:10], format="%d-%m-%Y")

            # Choix du moteur de lecture selon l'extension :
            #   - .xlsx → openpyxl (format Excel moderne)
            #   - .xls  → xlrd    (format Excel ancien)
            engine = "openpyxl" if file.endswith(".xlsx") else "xlrd"

            # Détection dynamique de la ligne d'en-tête
            header_row = find_header_row(file, engine)
            if header_row is None:
                errors.append(f"  ⚠ {filename}: en-tête 'Code symbole' introuvable, ignoré")
                continue

            # Lecture du fichier avec la bonne ligne d'en-tête
            df = pd.read_excel(file, header=header_row, engine=engine)

            # Suppression des lignes entièrement vides (présentes parfois en fin de fichier)
            df.dropna(how="all", inplace=True)

            # Ajout d'une colonne "Date" en première position, avec la date du fichier
            df.insert(0, "Date", date)

            # Ajout du tableau de ce jour à la liste générale
            all_data.append(df)

            # Progression tous les 200 fichiers
            if (idx + 1) % 200 == 0:
                print(f"  ... {idx + 1}/{len(files)} fichiers traités")

        except Exception as e:
            errors.append(f"  ✗ {filename}: {e}")

    # Affichage des erreurs
    if errors:
        print(f"\n{len(errors)} fichier(s) avec erreurs :")
        for err in errors[:20]:
            print(err)
        if len(errors) > 20:
            print(f"  ... et {len(errors) - 20} autres erreurs")

    # Si aucun fichier n'a pu être lu, on retourne un tableau vide
    if not all_data:
        print("Aucune donnée chargée.")
        return pd.DataFrame()

    # Concaténation de tous les tableaux journaliers en un seul grand tableau
    # ignore_index=True : réinitialise la numérotation des lignes de 0 à N
    result = pd.concat(all_data, ignore_index=True)

    print(f"\nFusion terminée : {len(result)} lignes, {result['Date'].nunique()} jours de cotation.")
    return result


def save_results(df):
    """
    Sauvegarde le tableau fusionné en CSV et en XLSX.
    Utilise xlsxwriter pour une meilleure compatibilité avec Excel/LibreOffice.
    """
    if df.empty:
        print("Tableau vide, rien à sauvegarder.")
        return

    # Convertir la colonne Date en string pour éviter les problèmes de format Excel
    df_save = df.copy()
    df_save["Date"] = df_save["Date"].dt.strftime("%d/%m/%Y")

    # --- Sauvegarde CSV (séparateur ; pour Excel français) ---
    print(f"Sauvegarde CSV → {OUTPUT_CSV} ...")
    df_save.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig", sep=";")
    size_csv = os.path.getsize(OUTPUT_CSV) / 1024 / 1024
    print(f"  ✓ CSV sauvegardé ({size_csv:.1f} Mo)")

    # --- Sauvegarde XLSX avec xlsxwriter (meilleure compatibilité) ---
    print(f"Sauvegarde XLSX → {OUTPUT_XLSX} ...")
    with pd.ExcelWriter(OUTPUT_XLSX, engine="xlsxwriter") as writer:
        df_save.to_excel(writer, index=False, sheet_name="Cours Boursiers")
        # Ajuster la largeur des colonnes pour une meilleure lisibilité
        worksheet = writer.sheets["Cours Boursiers"]
        for i, col in enumerate(df_save.columns):
            max_len = max(df_save[col].astype(str).str.len().max(), len(col)) + 2
            max_len = min(max_len, 40)  # Limiter à 40 caractères
            worksheet.set_column(i, i, max_len)
    size_xlsx = os.path.getsize(OUTPUT_XLSX) / 1024 / 1024
    print(f"  ✓ XLSX sauvegardé ({size_xlsx:.1f} Mo)")


if __name__ == "__main__":
    # Exécution de la fusion
    final_table = fusion_of_excel_files()

    # Aperçu rapide
    if not final_table.empty:
        print("\n--- Aperçu (5 premières lignes) ---")
        print(final_table.head())
        print(f"\nColonnes : {list(final_table.columns)}")

    # Sauvegarde en CSV et XLSX
    save_results(final_table)
    print("\n✅ Terminé !")