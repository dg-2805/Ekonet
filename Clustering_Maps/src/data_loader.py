import pandas as pd
from pathlib import Path

def load_data(filepath: str) -> pd.DataFrame:
    """
    Load CSV data into a pandas DataFrame.
    
    Args:
        filepath (str): Path to the CSV file.
    
    Returns:
        pd.DataFrame: Loaded dataset.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {filepath}")
    
    df = pd.read_csv(path)
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and preprocess the dataset:
    - Drop duplicates
    - Handle missing values (basic strategy: drop)
    
    Args:
        df (pd.DataFrame): Raw dataset
    
    Returns:
        pd.DataFrame: Cleaned dataset
    """
    df = df.drop_duplicates()
    df = df.dropna()  # later you can replace with imputing
    return df


def preprocess(filepath: str) -> pd.DataFrame:
    """
    Full preprocessing pipeline:
    1. Load data
    2. Clean data
    
    Args:
        filepath (str): Path to the CSV file
    
    Returns:
        pd.DataFrame: Processed dataset
    """
    df = load_data(filepath)
    df = clean_data(df)
    return df


if __name__ == "__main__":
    # Example usage for testing directly
    data = preprocess("../data/wildlife_mock.csv")
    print("Preview of processed data:")
    print(data.head())