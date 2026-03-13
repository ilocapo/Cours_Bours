import pandas as pd
import os
from glob import glob
import sys

# Ajouter le répertoire parent au chemin pour l'import de config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import DATA_PATH

def charge_and_clean_data():
    """
    Charge les données fusionnées depuis le fichier CSV, puis nettoie les données en supprimant les lignes avec des valeurs manquantes.
    
    Returns:
        pd.DataFrame: DataFrame nettoyé contenant les données fusionnées.
    """
    """ Charger les données depuis le fichier CSV, puis supprimer les lignes avec des valeurs manquantes """
    df = pd.read_csv(DATA_PATH, sep=";", low_memory=False)

    # Supprimer les lignes avec des valeurs manquantes dans les colonnes critiques
    # NOTÉE: dropna() sans colonnes enlèverait TOUTES les lignes car beaucoup de colonnes sont vides
    df_cleaned = df.dropna(subset=['Date', 'Code symbole', 'Cours moyen']).copy()
    
    # Convertir le Cours moyen en float (peut être en texte avec virgule)
    df_cleaned['Cours moyen'] = pd.to_numeric(
        df_cleaned['Cours moyen'].astype(str).str.replace(',', '.'),
        errors='coerce'
    )
    
    # Supprimer les lignes où la conversion numérique a échoué
    df_cleaned = df_cleaned.dropna(subset=['Cours moyen'])
    
    # Convertir la colonne Date en format datetime
    df_cleaned['Date'] = pd.to_datetime(df_cleaned['Date'], format='%d/%m/%Y', errors='coerce')
    
    # Supprimer les lignes où la conversion de date a échoué
    df_cleaned = df_cleaned.dropna(subset=['Date'])
    
    # Trier les données chronologiquement pour les calculs de rolling accurate
    df_cleaned = df_cleaned.sort_values(by=['Code symbole', 'Date']).reset_index(drop=True)
    
    return df_cleaned

def calculate_zscore(df):
    """
    Calcule le z-score pour chaque valeur de la colonne "Cours moyen" du DataFrame.
    La moyenne mobile et l'écart-type sont calculés sur une fenêtre de 200 jours de trading,
    groupés par symbole d'action.
    
    Args:
        df (pd.DataFrame): DataFrame contenant les colonnes 'Code symbole' et 'Cours moyen'.
        
    Returns:
        pd.DataFrame: DataFrame avec les colonnes 'Moyenne_Mobile', 'Ecart_Type' et 'Z_Score'.
    """
    window_size = 200
    
    # 1. Calculer la moyenne mobile (centre de gravité)
    df['Moyenne_Mobile'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=window_size, min_periods=20).mean()
    )
    
    # 2. Calculer l'écart-type mobile (volatilité normale)
    df['Ecart_Type'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=window_size, min_periods=20).std()
    )
    
    # 3. Appliquer la formule du Z-Score (Anomaly Score)
    # Z = (Prix actuel - Prix moyen) / Écart-type
    df['Z_Score'] = (df['Cours moyen'] - df['Moyenne_Mobile']) / df['Ecart_Type']
    
    return df

def signals_generation(df):
    """
    Génère des signaux d'achat ou de vente basés sur les z-scores avec les seuils précis:
    
    Z <= -3.0: SIGNAL D'ACHAT FORT (Opportunité rare, on investit une grosse part du capital alloué)
    Z <= -2.0: SIGNAL D'ACHAT STANDARD (Anomalie confirmée, on commence à acheter)
    -1.5 < Z < 1.5: HOLD (C'est le bruit de fond, on ne fait rien)
    Z >= 2.0: SIGNAL DE VENTE STANDARD (On prend ses bénéfices)
    Z >= 3.0: SIGNAL DE VENTE FORT (On liquide toute la position immédiatement)
    Z <= -1.0: WATCHLIST (Mise sous surveillance, en attente de signal d'achat)
    
    Args:
        df (pd.DataFrame): DataFrame contenant une colonne "Z_Score".
        
    Returns:
        pd.DataFrame: DataFrame avec les colonnes "Signal" et "Watchlist".
    """
    def get_signal(z_score):
        if pd.isna(z_score):
            return 'Hold'
        if z_score <= -3.0:
            return 'Strong Buy'
        elif z_score <= -2.0:
            return 'Buy'
        elif z_score >= 3.0:
            return 'Strong Sell'
        elif z_score >= 2.0:
            return 'Sell'
        else:
            return 'Hold'
    
    def get_watchlist(z_score):
        if pd.isna(z_score):
            return 'No'
        if z_score <= -1.0:
            return 'Yes'
        else:
            return 'No'
    
    df['Signal'] = df['Z_Score'].apply(get_signal)
    df['Watchlist'] = df['Z_Score'].apply(get_watchlist)
    
    return df


def add_filters(df, window_volatility=20, min_volume=1000, trend_period=50):
    """
    Ajoute des filtres supplémentaires pour améliorer la qualité des signaux:
    - Filtre de volatilité: évite les titres trop volatiles ou pas assez liquides
    - Filtre de volume: s'assure qu'il y a suffisamment de liquidité
    - Filtre de tendance: vérifie s'il y a une tendance baissière (pour acheter) ou haussière (pour vendre)
    
    Args:
        df (pd.DataFrame): DataFrame avec Z_Score et Signal
        window_volatility (int): Fenêtre pour calculer la volatilité historique
        min_volume (int): Volume transigé minimum pour considérer le titre comme liquide
        trend_period (int): Période pour calculer la tendance (50 jours = 2 mois)
        
    Returns:
        pd.DataFrame: DataFrame avec colonnes de filtres additionnels
    """
    
    # 1. FILTRE DE VOLATILITÉ
    # Calculer la volatilité historique sur 20 jours
    df['Rendement_Quotidien'] = df.groupby('Code symbole')['Cours moyen'].pct_change()
    df['Volatilite_Historique'] = df.groupby('Code symbole')['Rendement_Quotidien'].transform(
        lambda x: x.rolling(window=window_volatility, min_periods=5).std() * 100
    )
    
    # Filtre: volatilité entre 5% et 80% annualisée (√252 ajustement)
    # BRVM: volatilité annualisée moyenne ~30%, fourchette typique 10-60%
    df['Volatilite_Ann'] = df['Volatilite_Historique'] * (252 ** 0.5)
    df['Filtre_Volatilite'] = (df['Volatilite_Ann'] > 5) & (df['Volatilite_Ann'] < 80)
    
    # 2. FILTRE DE VOLUME
    # Vérifier que le volume transigé (total) est suffisant
    if 'Transactions (total)' in df.columns:
        df['Filtre_Volume'] = df['Transactions (total)'] >= min_volume
    else:
        # Si la colonne n'existe pas, on ne peut pas confirmer la liquidité
        df['Filtre_Volume'] = False
    
    # 3. FILTRE DE TENDANCE
    # Calculer la tendance sur les 50 derniers jours
    df['SMA_Court'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=20, min_periods=5).mean()
    )
    df['SMA_Long'] = df.groupby('Code symbole')['Cours moyen'].transform(
        lambda x: x.rolling(window=50, min_periods=10).mean()
    )
    
    # Tendance baissière: prix < SMA court < SMA long (bon pour acheter)
    df['Tendance_Baissiere'] = (df['Cours moyen'] < df['SMA_Court']) & (df['SMA_Court'] < df['SMA_Long'])
    
    # Tendance haussière: prix > SMA court > SMA long (bon pour vendre)
    df['Tendance_Haussiere'] = (df['Cours moyen'] > df['SMA_Court']) & (df['SMA_Court'] > df['SMA_Long'])
    
    # 4. SIGNAL FILTRÉ - Appliquer les conditions additionnelles
    def apply_filters(row):
        signal = row.get('Signal', 'Hold')
        filtre_volatilite = row.get('Filtre_Volatilite', True)
        filtre_volume = row.get('Filtre_Volume', True)
        tendance_baiss = row.get('Tendance_Baissiere', False)
        tendance_hauss = row.get('Tendance_Haussiere', False)
        z_score = row.get('Z_Score', 0)
        
        # Appliquer les filtres (plus assouplls pour allow trades même sans conditions optimales)
        if signal == 'Strong Buy' or z_score <= -3.0:
            # Les signaux d'achat TRÈS forts (Z <= -3.0) passent toujours
            if z_score <= -3.0:
                return 'Strong Buy_FILTERED'
            # Strong Buy normal nécessite juste la volatilité raisonnable
            elif filtre_volatilite:
                return 'Strong Buy_FILTERED'
            else:
                return 'Hold'
        
        elif signal == 'Buy' or (-2.0 >= z_score > -3.0):
            # Buy nécessite une volatilité raisonnable (le Z-Score ≤ -2 est déjà le filtre principal)
            if filtre_volatilite:
                return 'Buy_FILTERED'
            else:
                return 'Hold'
        
        elif signal == 'Strong Sell' or z_score >= 3.0:
            # Les signaux de vente TRÈS forts (Z >= 3.0) passent toujours
            if z_score >= 3.0:
                return 'Strong Sell_FILTERED'
            # Strong Sell normal nécessite juste la volatilité raisonnable
            elif filtre_volatilite:
                return 'Strong Sell_FILTERED'
            else:
                return 'Hold'
        
        elif signal == 'Sell' or (2.0 <= z_score < 3.0):
            # Sell nécessite une volatilité raisonnable (le Z-Score ≥ 2 est déjà le filtre principal)
            if filtre_volatilite:
                return 'Sell_FILTERED'
            else:
                return 'Hold'
        
        else:
            return signal
    
    df['Signal_Filtre'] = df.apply(apply_filters, axis=1)
    
    return df

if __name__ == "__main__":
    # Charger les données fusionnées depuis le fichier CSV
    df = charge_and_clean_data()
    # Calculer les z-scores
    df = calculate_zscore(df)
    # Générer les signaux d'achat/vente
    df = signals_generation(df)
    # Afficher les premières lignes du DataFrame final
    print(df.head())