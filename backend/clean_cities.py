"""
Improved city extraction script with data cleaning.

This version:
1. Extracts city names from college_name
2. Cleans up inconsistencies (extra periods, case normalization)
3. Removes common data quality issues
4. Creates a standardized 'city' column for reliable filtering
"""

import pandas as pd
import os
import re

# File path
csv_file = os.path.join(os.path.dirname(__file__), 'cleaned_mht_cet_cutoffs.csv')

# Load the CSV
print(f"Loading {csv_file}...")
df = pd.read_csv(csv_file)
print(f"Loaded {len(df)} rows\n")

def clean_city(raw_city):
    """
    Clean and standardize city names.
    
    Handles:
    - Removes trailing periods
    - Standardizes spacing
    - Removes known non-city suffixes
    - Handles special cases
    """
    if pd.isna(raw_city) or not raw_city:
        return "Special"
    
    city = str(raw_city).strip()
    
    # Remove trailing periods
    city = city.rstrip('.')
    
    # Remove "Dist" prefixes and similar markers
    city = re.sub(r'^Dist[.:]?\s+', '', city, flags=re.IGNORECASE)
    city = re.sub(r'^Tal[.:]?\s+', '', city, flags=re.IGNORECASE)
    city = re.sub(r'^Mouza\s+', '', city, flags=re.IGNORECASE)
    
    # Remove bracketed portions (e.g., "(Off Campus-Induri)" → keep base name)
    city = re.sub(r'\s*\([^)]*\)\s*$', '', city)
    
    # If it looks like a PIN code or all numbers, mark as Special
    if re.match(r'^\d+$', city):
        return "Special"
    
    # If it's very long and contains organization indicators, mark as Special
    if len(city) > 50 or any(org_word in city for org_word in ['Institute', 'Group of', 'College of']):
        return "Special"
    
    # Standardize case: Title Case
    city = city.title()
    
    # Final check: must have at least some alphabetic content
    if not any(c.isalpha() for c in city):
        return "Special"
    
    return city if city else "Special"


def extract_city(college_name):
    """Extract city from college_name and clean it."""
    if pd.isna(college_name):
        return "Special"
    
    college_name_str = str(college_name).strip()
    
    # Extract text after the last comma
    if ',' in college_name_str:
        raw_city = college_name_str.rsplit(',', 1)[-1].strip()
    else:
        # No comma: use entire name as potential city
        raw_city = college_name_str
    
    return clean_city(raw_city)


# Apply the improved extraction
print("Extracting and cleaning cities...")
df['city'] = df['college_name'].apply(extract_city)

# Display unique cities for verification
unique_cities = sorted(df['city'].unique())
print(f"\nCleaned to {len(unique_cities)} unique cities:\n")

# Show top 30 cities by frequency
city_counts = df['city'].value_counts().sort_values(ascending=False)
print("Top 30 cities by entry count:")
for i, (city, count) in enumerate(city_counts.head(30).items(), 1):
    print(f"  {i:2d}. {city:35s} ({count:5d} entries)")

print(f"\n... and {len(unique_cities) - 30} more cities")
print(f"\nAll cities (alphabetical):")
for city in unique_cities:
    count = len(df[df['city'] == city])
    if count < 50:  # Only show count for less frequent cities
        print(f"  • {city} ({count})")
    else:
        print(f"  • {city}")

# Save the updated CSV
output_file = csv_file
print(f"\nSaving cleaned CSV to {output_file}...")
df.to_csv(output_file, index=False)
print("✓ Successfully saved!\n")

# Display sample rows
print("Sample rows with cleaned 'city' column:")
print(df[['college_code', 'college_name', 'city', 'branch_name', 'cutoff_percentile']].head(10).to_string())
