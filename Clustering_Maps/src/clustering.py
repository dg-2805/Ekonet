import pandas as pd
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score
import numpy as np
from typing import Literal, Union


def run_hierarchical_clustering(
    df: pd.DataFrame, 
    feature_cols: Union[list[str], None] = None, 
    n_clusters: int = 3, 
    linkage: Literal['ward', 'complete', 'average', 'single'] = 'ward'
):
    """
    Apply Hierarchical clustering on the given dataframe.
    
    Args:
        df (pd.DataFrame): Input dataframe
        feature_cols (list[str] | None): List of feature columns to use for clustering. 
                                       If None, uses all numeric columns.
        n_clusters (int): Number of clusters
        linkage (str): Linkage criterion ('ward', 'complete', 'average', 'single')
    
    Returns:
        tuple:
            - pd.DataFrame: Dataframe with cluster labels
            - float: Silhouette score
    """
    # Handle feature column selection
    if feature_cols is None:
        # Use all numeric columns if no feature columns specified
        feature_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not feature_cols:
            raise ValueError("No numeric columns found for clustering")
    
    # Validate feature columns exist
    missing_cols = [col for col in feature_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in dataframe: {missing_cols}")
    
    X = df[feature_cols].values  # Convert to numpy array for sklearn
    
    if X.shape[1] == 0:
        raise ValueError("No features selected for clustering")

    hierarchical = AgglomerativeClustering(n_clusters=n_clusters, linkage=linkage)
    df_copy = df.copy()
    df_copy["Cluster"] = hierarchical.fit_predict(X)

    score = silhouette_score(X, df_copy["Cluster"])
    return df_copy, score


# Keep the old function name for backward compatibility
def run_kmeans(df: pd.DataFrame, feature_cols: Union[list[str], None] = None, n_clusters: int = 3, random_state: int = 42):
    """
    Apply Hierarchical clustering (renamed from KMeans for backward compatibility).
    
    Args:
        df (pd.DataFrame): Input dataframe
        feature_cols (list[str] | None): List of feature columns to use for clustering
        n_clusters (int): Number of clusters
        random_state (int): Not used in hierarchical clustering, kept for compatibility
    
    Returns:
        tuple:
            - pd.DataFrame: Dataframe with cluster labels
            - float: Silhouette score
    """
    return run_hierarchical_clustering(df, feature_cols, n_clusters)


if __name__ == "__main__":
    # Example test run
    sample_data = pd.DataFrame({
        "State": [0, 1, 2, 0, 1, 2],
        "Animal": [0, 1, 2, 1, 2, 0],
        "Incidents": [10, 20, 30, 15, 25, 35]
    })

    features = ["State", "Animal", "Incidents"]

    clustered_df, sil_score = run_hierarchical_clustering(sample_data, features, n_clusters=3)
    print("Clustered Data (Hierarchical):")
    print(clustered_df)
    print(f"Silhouette Score: {sil_score:.4f}")
    
    # Test backward compatibility
    clustered_df2, sil_score2 = run_kmeans(sample_data, features, n_clusters=3)
    print("\nBackward Compatibility Test:")
    print(f"Same results: {np.array_equal(clustered_df['Cluster'], clustered_df2['Cluster'])}")