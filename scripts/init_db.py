import pandas as pd
import sqlite3
import os

def load_csv_to_db():
    csv_path = "cleaned_mht_cet_cutoffs.csv"
    db_dir = "backend"
    db_path = os.path.join(db_dir, "database.db")
    
    if not os.path.exists(csv_path):
        print("Error: 'cleaned_mht_cet_cutoffs.csv' nahi mili! Pehle parser run karein.")
        return
        
    # Ensure backend folder exists
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    print("Reading data from CSV...")
    df = pd.read_csv(csv_path)
    
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    
    # Write the data into a relational table named 'cutoffs'
    print("Writing data to SQL table...")
    df.to_sql("cutoffs", conn, if_exists="replace", index=False)
    
    # Speed optimization ke liye indexes banana
    print("Creating indexes for lightning-fast frontend searches...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_percentile ON cutoffs(cutoff_percentile);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_seat_type ON cutoffs(seat_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cap_round ON cutoffs(cap_round);")
    
    conn.commit()
    conn.close()
    print("SUCCESS: Database initialized successfully inside backend/database.db!")

if __name__ == "__main__":
    load_csv_to_db()