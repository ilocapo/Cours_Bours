"""
Daily Market Update Script

Récupère les données quotidiennes de la BRVM,
calcule les valeurs du portefeuille CORE + SATELLITE,
et met à jour YTD_2026.csv
"""

import requests
import pandas as pd
from datetime import datetime
from bs4 import BeautifulSoup
from pathlib import Path

# Configuration
CORE_TICKERS = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]
INITIAL_CAPITAL = 10_000_000
CORE_ALLOCATION = 0.70
SATELLITE_ALLOCATION = 0.30

CORE_VALUE_INITIAL = INITIAL_CAPITAL * CORE_ALLOCATION  # 7M
SATELLITE_VALUE_INITIAL = INITIAL_CAPITAL * SATELLITE_ALLOCATION  # 3M

# Capital initial par action du core
CORE_PER_STOCK = CORE_VALUE_INITIAL / len(CORE_TICKERS)  # 1.4M chacun

# URL BRVM pour scraper
BRVM_URL = "https://www.brvm.org"

def fetch_stock_price(ticker: str) -> dict:
    """
    Récupère le dernier prix d'un stock via scraping BRVM
    """
    try:
        # Aller sur la page des cours du jour
        url = f"{BRVM_URL}/en/cours-actions/"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Chercher la ligne du ticker dans la table
        # Structure BRVM: <table> avec rows contenant le ticker
        tables = soup.find_all("table")
        
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if cells and len(cells) > 0:
                    # Première colonne = ticker
                    cell_text = cells[0].get_text(strip=True).upper()
                    if ticker.upper() in cell_text:
                        # Récupérer le prix de fermeture (habituellement colonne 6-7)
                        if len(cells) >= 7:
                            close_text = cells[6].get_text(strip=True)
                            try:
                                close_price = float(close_text.replace(",", "."))
                                return {
                                    "ticker": ticker.upper(),
                                    "close": close_price,
                                    "success": True
                                }
                            except ValueError:
                                continue
        
        print(f"⚠️  Pas de données trouvées pour {ticker}")
        return {"ticker": ticker, "success": False}
            
    except Exception as e:
        print(f"❌ Erreur scraping pour {ticker}: {e}")
        return {"ticker": ticker, "success": False}


def calculate_portfolio_value() -> dict:
    """
    Calcule les valeurs CORE et SATELLITE du portefeuille
    """
    
    print(f"📊 Récupération des données... {datetime.now().strftime('%H:%M:%S')}")
    
    # Récupérer les prix des 5 stocks du core
    core_prices = {}
    core_value = 0
    
    for ticker in CORE_TICKERS:
        data = fetch_stock_price(ticker)
        
        if data.get("success"):
            close_price = data["close"]
            core_prices[ticker] = close_price
            
            # Valeur = nombre d'actions × prix
            # Nombre d'actions = capital initial / prix initial (approximation)
            # Pour simplifier: on utilise le prix actuel et le capital initial
            qty = CORE_PER_STOCK / close_price if close_price > 0 else 0
            stock_value = qty * close_price
            core_value += stock_value
            
            print(f"  ✓ {ticker}: {close_price:,.0f} FCFA → {stock_value:,.0f} FCFA")
        else:
            print(f"  ✗ {ticker}: Erreur")
    
    # Valeur satellite (simplifié: on suppose croissance constante)
    # À améliorer avec trading réel
    satellite_value = SATELLITE_VALUE_INITIAL  # Placeholder
    
    total_value = core_value + satellite_value
    ytd_return_pct = ((total_value / INITIAL_CAPITAL) - 1) * 100 if INITIAL_CAPITAL > 0 else 0
    
    return {
        "date": datetime.now().strftime("%d/%m/%Y"),
        "core_value": core_value,
        "satellite_value": satellite_value,
        "total_value": total_value,
        "ytd_return_pct": ytd_return_pct,
        "trades_count": 0  # À récupérer depuis logs
    }


def update_ytd_csv(portfolio_data: dict):
    """
    Ajoute une ligne à YTD_2026.csv
    """
    csv_path = Path("YTD_2026.csv")
    
    # Créer le dataframe avec la nouvelle ligne
    new_row = pd.DataFrame([{
        "Date": portfolio_data["date"],
        "Core_Value": int(portfolio_data["core_value"]),
        "Satellite_Value": int(portfolio_data["satellite_value"]),
        "Total_Value": int(portfolio_data["total_value"]),
        "YTD_Return_%": round(portfolio_data["ytd_return_pct"], 2),
        "Trades_Count": int(portfolio_data["trades_count"]),
        "Status": "AHEAD" if portfolio_data["ytd_return_pct"] >= 1.4 else "ON_TRACK"
    }])
    
    # Charger le fichier existant ou créer un nouveau
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        df = pd.concat([df, new_row], ignore_index=True)
    else:
        df = new_row
    
    # Sauvegarder
    df.to_csv(csv_path, index=False)
    print(f"\n✅ YTD_2026.csv mis à jour")
    print(f"   Dernière ligne: {portfolio_data['date']} | {portfolio_data['total_value']:,.0f} FCFA | +{portfolio_data['ytd_return_pct']:.1f}%")


def main():
    """
    Lancer le script complet
    """
    print("=" * 60)
    print("DAILY MARKET UPDATE - YTD 2026 TRACKER")
    print("=" * 60)
    
    try:
        # Calculer les valeurs
        portfolio = calculate_portfolio_value()
        
        print("\n📈 RÉSULTAT:")
        print(f"  Core Value:      {portfolio['core_value']:>12,.0f} FCFA")
        print(f"  Satellite Value: {portfolio['satellite_value']:>12,.0f} FCFA")
        print(f"  Total Value:     {portfolio['total_value']:>12,.0f} FCFA")
        print(f"  YTD Return:      {portfolio['ytd_return_pct']:>12.2f}%")
        print(f"  Status:          {portfolio['total_value'] > INITIAL_CAPITAL * 1.014 and '✅ AHEAD' or '⚠️  ON_TRACK'}")
        
        # Mettre à jour le CSV
        update_ytd_csv(portfolio)
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
