from src.data_loader import load_data, clean_data
from src.feature_engineering import feature_engineering
from src.clustering import run_kmeans
import os
import pandas as pd

# 0. Data Preprocessing Pipeline
print("[INFO] Starting data preprocessing pipeline...")

# Create directories if they don't exist
os.makedirs("data/processed", exist_ok=True)

# Check if processed data already exists
processed_file = "data/processed/wildlife_processed.csv"

if not os.path.exists(processed_file):
    print("[INFO] Processed data not found. Creating from raw data...")
    
    # Try to load from raw data (check multiple possible locations)
    raw_data_paths = [
        "data/wildlife_mock.csv",
        "data/raw/wildlife_mock.csv", 
        "data/wildlife.csv"
    ]
    
    df_raw = None
    for path in raw_data_paths:
        try:
            df_raw = load_data(path)
            print(f"[INFO] Loaded raw data from: {path}")
            break
        except FileNotFoundError:
            continue
    
    if df_raw is None:
        raise FileNotFoundError(f"No raw data found in any of these locations: {raw_data_paths}")
    
    # Clean the data
    df_cleaned = clean_data(df_raw)
    
    # Save processed data
    df_cleaned.to_csv(processed_file, index=False)
    print(f"[INFO] Processed data saved to: {processed_file}")
    print(f"[INFO] Original shape: {df_raw.shape}, Cleaned shape: {df_cleaned.shape}")
else:
    print(f"[INFO] Using existing processed data: {processed_file}")

# 1. Load processed data
df = load_data(processed_file)

# 2. Feature Engineering
categorical = ["State", "Animal", "Incident", "Severity", "Monetary_Impact"]  # Treat both as categorical for now
numeric = []  # No numeric columns for now

df_processed = feature_engineering(df, categorical, numeric)

# 3. Select features for clustering
# Use only the encoded categorical columns (they should have numeric values now)
print("Available columns after feature engineering:", df_processed.columns.tolist())

# Select only encoded features (exclude original categorical and other non-numeric columns)
original_cols = ["State", "Animal", "Incident", "Severity", "Monetary_Impact", "Month", "Year"]
features = [col for col in df_processed.columns if col not in original_cols]

print("Selected features for clustering:", features)

if not features:
    raise ValueError("No features available for clustering after preprocessing.")

# 4. Run clustering
clustered_df, score = run_kmeans(df_processed, features, n_clusters=3)

print("Clustering complete!")
print(clustered_df.head())
print(f"Silhouette Score: {score:.4f}")

# 5. Create Advanced Map Visualization
print("\n[INFO] Creating advanced map visualization...")
from src.map_generator import generate_advanced_map

# Generate the advanced interactive map
map_path = generate_advanced_map(clustered_df, "reports/figures/wildlife_clustering_map.html")
print(f"🌍 Advanced interactive map created!")
print(f"📂 Location: {map_path}")
print(f"🌐 Open in browser to view the interactive map with filters!")
