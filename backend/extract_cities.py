"""
Script to extract city names from college_name column and add a new 'city' column to the CSV.

This script:
1. Reads cleaned_mht_cet_cutoffs.csv
2. Extracts city name from the end of college_name (after the last comma)
3. Adds a new 'city' column with the extracted city name
4. Handles edge cases (missing city → assigns "Special")
5. Saves the updated CSV
"""

import pandas as pd
import os

# File path
csv_file = os.path.join(os.path.dirname(__file__), 'cleaned_mht_cet_cutoffs.csv')

# Load the CSV
print(f"Loading {csv_file}...")
df = pd.read_csv(csv_file)
print(f"Loaded {len(df)} rows")

# Function to extract city from college_name
def extract_city(college_name):
    """
    Extract city from college_name.
    
    The city is the last part after the last comma.
    If no comma exists, return "Special".
    
    Examples:
        "Government College of Engineering, Amravati" → "Amravati"
        "Pimpri Chinchwad College, Pune" → "Pune"
        "Some College" → "Special"
    """
    if pd.isna(college_name):
        return "Special"
    
    college_name_str = str(college_name).strip()
    
    # Check if comma exists
    if ',' in college_name_str:
        # Extract text after the last comma and strip whitespace
        city = college_name_str.rsplit(',', 1)[-1].strip()
        # Return the city if it's not empty, else "Special"
        return city if city else "Special"
    else:
        # No comma found
        return "Special"

# Apply the function to create the 'city' column
print("\nExtracting cities from college_name column...")
df['city'] = df['college_name'].apply(extract_city)

# Display unique cities for verification
unique_cities = sorted(df['city'].unique())
print(f"\nExtracted {len(unique_cities)} unique cities:")
for city in unique_cities:
    count = len(df[df['city'] == city])
    print(f"  • {city}: {count} entries")

# Save the updated CSV with a new name first (backup approach)
output_file = os.path.join(os.path.dirname(__file__), 'cleaned_mht_cet_cutoffs.csv')
print(f"\nSaving updated CSV to {output_file}...")
df.to_csv(output_file, index=False)
print("✓ Successfully saved!")

# Display first few rows to verify
print("\nFirst 5 rows with new 'city' column:")
print(df[['college_code', 'college_name', 'city', 'branch_name']].head())
