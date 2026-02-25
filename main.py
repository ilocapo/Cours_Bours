
import pandas as pd


import rarfile
import os
import shutil



# Extraction du fichier RAR avec gestion d'erreur et fallback sur unrar
def extract_rar(filepath, extract_to):
    try:
        with rarfile.RarFile(filepath) as archive:
            archive.extractall(extract_to)
        return True
    except Exception as e:
        print("Erreur avec rarfile :", e)
        print("Tentative d'extraction avec la commande unrar...")
        import subprocess
        try:
            result = subprocess.run([
                "unrar", "x", "-o+", filepath, extract_to
            ], capture_output=True, text=True)
            print(result.stdout)
            if result.returncode == 0:
                print("Extraction avec unrar réussie.")
                return True
            else:
                print("Échec de l'extraction avec unrar :", result.stderr)
                return False
        except FileNotFoundError:
            print("La commande 'unrar' n'est pas installée. Veuillez l'installer (sudo apt install unrar ou sudo dnf install unrar).")
            return False
        except Exception as e2:
            print("Erreur inattendue avec unrar :", e2)
            return False

RAR_PATH = "./Data BRVM.rar"
EXTRACT_PATH = "./ExtractedFiles"
success = extract_rar(RAR_PATH, EXTRACT_PATH)
if not success:
    exit(1)

    


# Parcours des fichiers extraits et filtrage
files_data = []
print("Début du filtrage des fichiers extraits...")
keywords = ["variation", "cours", "price", "close"]

for root, dirs, files in os.walk("./ExtractedFiles"):
    for filename in files:
        if not filename.endswith((".xls", ".xlsx", ".xlt", ".xml")):
            continue

        path = os.path.join(root, filename)
        filename_lower = filename.lower()
        full_path_lower = path.lower()

        # Vérifie si le nom du fichier ou du chemin contient un mot-clé
        found_by_name = any(word in full_path_lower for word in keywords)

        # Les fichiers .xml/.xlt numériques (ex: 16.xml) dans des dossiers mois/année sont des cours
        is_numeric_xml = filename.endswith((".xml", ".xlt")) and os.path.splitext(filename)[0].strip("+-").isdigit()

        found = found_by_name or is_numeric_xml
        if not found:
            # Analyse le contenu si le nom ne suffit pas
            try:
                xls = pd.ExcelFile(path)
                for sheet in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet, nrows=10)
                    colss = " ".join([str(c) for c in df.columns]).lower()
                    if any(word in colss for word in keywords):
                        found = True
                        break
                    for row in df.values:
                        row_text = " ".join([str(cell).lower() for cell in row if pd.notnull(cell)])
                        if any(word in row_text for word in keywords):
                            found = True
                            break
                    if found:
                        break
            except Exception as e:
                pass

        if found:
            year = None
            for y in range(2017, 2026):
                if str(y) in path:
                    year = y
                    break
            if year:
                files_data.append((year, path))
            else:
                files_data.append(("sans_annee", path))


# Trier par année ("sans_annee" à la fin)
def sort_key(x):
    try:
        return int(x[0])
    except:
        return 9999
files_data.sort(key=sort_key)

# Copier dans dossier final
OUTPUT_DIR = "./FinalFiles"
os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"Nombre de fichiers à copier : {len(files_data)}")

import re

MOIS_FR = {
    "janvier": "01", "jan": "01",
    "fevrier": "02", "février": "02", "fev": "02", "fév": "02",
    "mars": "03",
    "avril": "04",
    "mai": "05",
    "juin": "06",
    "juillet": "07",
    "aout": "08", "août": "08",
    "septembre": "09", "sep": "09",
    "octobre": "10", "oct": "10",
    "novembre": "11", "nov": "11",
    "decembre": "12", "décembre": "12", "dec": "12", "déc": "12",
}

def extract_date_from_path(filepath):
    filename = os.path.basename(filepath)
    name = os.path.splitext(filename)[0]

    # 1. Nom du fichier contient JJ mois(lettres) AAAA ex: "Cours au 01 janvier 2017"
    m = re.search(r'(\d{1,2})[- _]+([a-zA-Zéûèàê]+)[- _]+(20\d{2})', name, re.IGNORECASE)
    if m:
        day = m.group(1).zfill(2)
        month_word = m.group(2).lower()
        year = m.group(3)
        month = MOIS_FR.get(month_word)
        if month:
            return f"{day}-{month}-{year}"

    # 2. Nom du fichier contient JJ MM AAAA (tout en chiffres) ex: "Cours 01 12 2025"
    m = re.search(r'(\d{1,2})[- _]+(\d{1,2})[- _]+(20\d{2})', name)
    if m:
        day = m.group(1).zfill(2)
        month = m.group(2).zfill(2)
        year = m.group(3)
        if 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
            return f"{day}-{month}-{year}"

    # 3. Fichier numérique (ex: 16.xml) -> extraire depuis le chemin: .../2024/01_24/16.xml
    parts = filepath.replace("\\", "/").split("/")
    day_from_name = re.fullmatch(r'(\d{1,2})', name)
    if day_from_name:
        day = day_from_name.group(1).zfill(2)
        year, month = None, None
        for part in parts:
            # dossier type "01_24" ou "01 24"
            m2 = re.fullmatch(r'(\d{2})[ _](\d{2})', part)
            if m2:
                month = m2.group(1)
                year_short = m2.group(2)
                year = f"20{year_short}"
            # dossier type "2024"
            m3 = re.fullmatch(r'(20\d{2})', part)
            if m3:
                year = m3.group(1)
        if day and month and year:
            return f"{day}-{month}-{year}"

    return None

seen_names = {}
for year, path in files_data:
    base = os.path.basename(path)
    ext = os.path.splitext(base)[1]
    date_str = extract_date_from_path(path)
    if date_str:
        dest_name = f"{date_str}{ext}"
    elif year == "sans_annee":
        dest_name = f"sans_annee_{base}"
    else:
        dest_name = f"{year}_{base}"
    # Éviter les doublons (même date, plusieurs formats ex: .xls et .xml)
    if dest_name in seen_names:
        seen_names[dest_name] += 1
        dest_name = f"{os.path.splitext(dest_name)[0]}_{seen_names[dest_name]}{ext}"
    else:
        seen_names[dest_name] = 0
    dest_path = os.path.join(OUTPUT_DIR, dest_name)
    shutil.copy(path, dest_path)
print("Copie terminée.")

# Zipper le dossier FinalFiles
import zipfile

ZIP_PATH = "./ZippedFiles.zip"
print(f"Compression de {OUTPUT_DIR} dans {ZIP_PATH}...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
    for froot, fdirs, ffiles in os.walk(OUTPUT_DIR):
        for fname in ffiles:
            fpath = os.path.join(froot, fname)
            zipf.write(fpath, os.path.relpath(fpath, OUTPUT_DIR))
print(f"Compression terminée : {ZIP_PATH}")
