#!/usr/bin/env python3
"""
Generate improved wildlife clustering map with UI fixes
"""

import pandas as pd
import sys
import os
from pathlib import Path

def setup_imports():
    """Set up the import path and import required modules"""
    # Get the absolute path to the src directory
    current_dir = Path(__file__).parent.absolute()
    src_dir = current_dir / 'src'
    
    # Add src directory to Python path
    if str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))
    
    try:
        # Import with type hints for better IDE support
        from clustering import run_hierarchical_clustering  # type: ignore
        from map_generator import generate_advanced_map    # type: ignore  
        from feature_engineering import feature_engineering  # type: ignore
        return run_hierarchical_clustering, generate_advanced_map, feature_engineering
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("Please ensure you're running this script from the project root directory.")
        print(f"Expected src directory at: {src_dir}")
        sys.exit(1)

def main():
    """Generate the improved wildlife clustering map"""
    # Set up imports
    run_hierarchical_clustering, generate_advanced_map, feature_engineering = setup_imports()
    
    try:
        # Load the processed data
        data_path = "data/processed/wildlife_processed.csv"
        print(f"Loading data from {data_path}...")
        
        if not Path(data_path).exists():
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        df = pd.read_csv(data_path)
        print(f"Data loaded successfully. Shape: {df.shape}")
        
        # Validate data
        if df.empty:
            raise ValueError("Loaded dataset is empty")
        
        print(f"Columns: {df.columns.tolist()}")
        
        # Display sample data
        print("\nSample data:")
        print(df.head())
        
        # Apply feature engineering
        print("\nApplying feature engineering...")
        categorical_cols = ['State', 'Incident', 'Animal', 'Severity']
        numeric_cols = ['Month', 'Year', 'Monetary_Impact']
        
        # Validate required columns exist
        missing_cols = []
        for col in categorical_cols + numeric_cols:
            if col not in df.columns:
                missing_cols.append(col)
        
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Apply feature engineering
        df_processed = feature_engineering(df, categorical_cols, numeric_cols)
        print(f"Processed data shape: {df_processed.shape}")
        
        # Validate processed data
        if df_processed.empty:
            raise ValueError("Processed dataset is empty after feature engineering")
        
        # Get feature columns (all one-hot encoded categorical + scaled numeric)
        feature_cols = [col for col in df_processed.columns if col not in ['Unnamed: 0']]
        print(f"\nFeature columns for clustering: {len(feature_cols)} features")
        
        if len(feature_cols) == 0:
            raise ValueError("No feature columns available for clustering")
        
        # Apply hierarchical clustering
        print("\nApplying hierarchical clustering...")
        clustered_df, sil_score = run_hierarchical_clustering(df_processed, feature_cols, n_clusters=3)
        
        print(f"Clustering completed!")
        print(f"Silhouette Score: {sil_score:.4f}")
        print(f"Cluster distribution:")
        print(clustered_df['Cluster'].value_counts().sort_index())
        
        # Generate the improved map
        print("\nGenerating improved interactive map...")
        map_path = generate_advanced_map(clustered_df)
        
        print(f"\n✅ Map with UI improvements generated successfully!")
        print(f"📍 Map location: {map_path}")
        print(f"\n🎨 UI Improvements made:")
        print("  • Fixed text contrast - automatic black/white text based on background color")
        print("  • Consistent circle sizes (32px for all clusters)")
        print("  • Improved color palette for better visibility")
        print("  • Enhanced borders and shadows")
        print("  • Better hover effects")
        print("  • Improved font styling with text shadows")
        
        return map_path
        
    except FileNotFoundError as e:
        print(f"❌ Error: Data file not found - {e}")
        print("Please ensure the wildlife_processed.csv file exists in data/processed/")
        return None
    except ValueError as e:
        print(f"❌ Data Validation Error: {e}")
        return None
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("Please check that all required modules are available in the src/ directory")
        return None
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return None

if __name__ == "__main__":
    main()
