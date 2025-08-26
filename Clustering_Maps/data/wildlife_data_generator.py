import pandas as pd
import numpy as np
import random
from collections import defaultdict

# Seed for reproducibility
np.random.seed(42)
random.seed(42)

# Lists of possible values with weighted distributions
states = {
    "Maharashtra": 0.15, "Karnataka": 0.12, "Tamil Nadu": 0.11, 
    "Uttar Pradesh": 0.14, "Rajasthan": 0.08, "West Bengal": 0.09,
    "Assam": 0.07, "Kerala": 0.06, "Madhya Pradesh": 0.10, "Odisha": 0.08
}

animals = {
    "Elephant": 0.12, "Tiger": 0.08, "Leopard": 0.10, "Rhino": 0.05, "Bear": 0.07,
    "Deer": 0.15, "Monkey": 0.18, "Crocodile": 0.06, "Snake": 0.11, "Wild Boar": 0.08
}

incidents = {
    "Poaching": 0.10, "Smuggling": 0.08, "Illegal trade": 0.07, 
    "Wild animal entering populated area": 0.25, 
    "Conflict with humans": 0.20, "Injury/Death": 0.15, "Trap/Accident": 0.15
}

months = list(range(1, 13))
years = list(range(2018, 2026))

# Create weighted lists for random choices
def create_weighted_list(weighted_dict):
    items = list(weighted_dict.keys())
    weights = list(weighted_dict.values())
    return items, weights

state_items, state_weights = create_weighted_list(states)
animal_items, animal_weights = create_weighted_list(animals)
incident_items, incident_weights = create_weighted_list(incidents)

# Generate base dataset
num_records = 5000
print("Generating base dataset...")

data = {
    "State": random.choices(state_items, weights=state_weights, k=num_records),
    "Month": np.random.choice(months, num_records),
    "Year": random.choices(years, weights=[0.08, 0.10, 0.12, 0.15, 0.18, 0.15, 0.12, 0.10], k=num_records),
    "Incident": random.choices(incident_items, weights=incident_weights, k=num_records),
    "Animal": random.choices(animal_items, weights=animal_weights, k=num_records)
}

df = pd.DataFrame(data)

# Apply patterns using vectorized operations (MUCH faster)
print("Applying realistic patterns...")

# Regional patterns - North East
northeast_mask = df["State"].isin(["Assam", "West Bengal"])
northeast_count = northeast_mask.sum()
df.loc[northeast_mask, "Animal"] = random.choices(
    ["Elephant", "Rhino", "Tiger"], 
    weights=[0.5, 0.3, 0.2], 
    k=northeast_count
)

# Regional patterns - Central India
central_mask = df["State"].isin(["Rajasthan", "Madhya Pradesh"])
central_count = central_mask.sum()
df.loc[central_mask, "Animal"] = random.choices(
    ["Leopard", "Bear", "Deer"], 
    weights=[0.4, 0.3, 0.3], 
    k=central_count
)

# Seasonal patterns - Monsoon
monsoon_mask = df["Month"].isin([6, 7, 8, 9])
monsoon_count = monsoon_mask.sum()
df.loc[monsoon_mask, "Incident"] = "Wild animal entering populated area"

# Animal-specific patterns
elephant_mask = df["Animal"] == "Elephant"
elephant_count = elephant_mask.sum()
df.loc[elephant_mask, "Incident"] = random.choices(
    ["Wild animal entering populated area", "Conflict with humans"], 
    weights=[0.6, 0.4], 
    k=elephant_count
)

snake_mask = df["Animal"] == "Snake"
snake_count = snake_mask.sum()
df.loc[snake_mask, "Incident"] = random.choices(
    ["Injury/Death", "Conflict with humans"], 
    weights=[0.6, 0.4], 
    k=snake_count
)

big_cat_mask = df["Animal"].isin(["Tiger", "Leopard"])
big_cat_count = big_cat_mask.sum()
df.loc[big_cat_mask, "Incident"] = random.choices(
    ["Poaching", "Conflict with humans", "Illegal trade"], 
    weights=[0.4, 0.4, 0.2], 
    k=big_cat_count
)

# Temporal trends
recent_mask = df["Year"] >= 2022
poaching_mask = df["Incident"].isin(["Poaching", "Illegal trade"])
combined_mask = recent_mask & poaching_mask
combined_count = combined_mask.sum()

smuggling_indices = df[combined_mask].sample(frac=0.3, random_state=42).index
df.loc[smuggling_indices, "Incident"] = "Smuggling"

# Add noise and outliers
print("Adding noise and outliers...")
num_outliers = int(len(df) * 0.05)

# Random state changes for outliers
outlier_indices = random.sample(range(len(df)), num_outliers)
df.loc[outlier_indices, "State"] = random.choices(
    ["Goa", "Himachal Pradesh", "Uttarakhand"], 
    k=num_outliers
)

# Extreme animal values
extreme_indices = random.sample(range(len(df)), num_outliers // 2)
df.loc[extreme_indices, "Animal"] = random.choices(
    ["Lion", "Cheetah", "Wolf"], 
    k=len(extreme_indices)
)

# Add severity levels and monetary values
print("Adding additional features...")
severity_levels = ["Low", "Medium", "High", "Critical"]
df["Severity"] = random.choices(severity_levels, weights=[0.4, 0.3, 0.2, 0.1], k=len(df))

# Vectorized monetary impact calculation
severity_multipliers = {"Low": 1, "Medium": 2, "High": 5, "Critical": 10}
df["Monetary_Impact"] = (
    np.random.randint(5, 101, len(df)) * 
    df["Severity"].map(severity_multipliers) + 
    np.random.randint(0, 51, len(df))
)

# Save to CSV
print("Saving to CSV...")
df.to_csv("wildlife_mock.csv", index=False)

print(f'Enhanced mock dataset created with {len(df)} records.')
print("\nSample data:")
print(df.head(10))

print("\nDistribution overview:")
print("States:", df["State"].value_counts().head())
print("\nAnimals:", df["Animal"].value_counts().head())
print("\nIncidents:", df["Incident"].value_counts().head())
print("\nYears:", df["Year"].value_counts().sort_index())