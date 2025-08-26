import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def scale_features(df: pd.DataFrame, numeric_cols: list) -> pd.DataFrame:
    """
    Scale numeric features using StandardScaler.
    """
    if not numeric_cols:
        print("[INFO] No numeric columns provided for scaling. Skipping...")
        return df
    valid_cols = [col for col in numeric_cols if col in df.columns]
    if not valid_cols:
        print("[INFO] None of the numeric columns exist in dataframe. Skipping scaling...")
        return df
    try:
        df[valid_cols] = StandardScaler().fit_transform(df[valid_cols])
        print(f"[INFO] Scaled numeric columns: {valid_cols}")
    except Exception as e:
        print(f"[WARNING] Skipping scaling due to error: {e}")
    return df

def encode_categorical(df: pd.DataFrame, categorical_cols: list) -> pd.DataFrame:
    """
    One-hot encode categorical features.
    """
    if not categorical_cols:
        print("[INFO] No categorical columns provided for encoding. Skipping...")
        return df
    valid_cols = [col for col in categorical_cols if col in df.columns]
    if not valid_cols:
        print("[INFO] None of the categorical columns exist in dataframe. Skipping encoding...")
        return df
    try:
        encoder = OneHotEncoder(drop=None, sparse_output=False, handle_unknown="ignore")
        encoded = encoder.fit_transform(df[valid_cols])
        encoded_df = pd.DataFrame(encoded, columns=encoder.get_feature_names_out(valid_cols), index=df.index)
        df = pd.concat([df.drop(columns=valid_cols), encoded_df], axis=1)
        print(f"[INFO] Encoded categorical columns: {valid_cols}")
    except Exception as e:
        print(f"[WARNING] Skipping encoding due to error: {e}")
    return df

def feature_engineering(df: pd.DataFrame, categorical_cols: list, numeric_cols: list) -> pd.DataFrame:
    """
    Apply feature engineering: scaling numeric and encoding categorical features.
    """
    print("[INFO] Starting feature engineering...")
    df = scale_features(df.copy(), numeric_cols)
    df = encode_categorical(df, categorical_cols)
    print("[INFO] Feature engineering completed.")
    return df

