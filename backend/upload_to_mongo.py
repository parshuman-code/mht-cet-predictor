import pandas as pd
from pymongo import MongoClient

# Connection String
uri = "mongodb+srv://admin_prashant:Prashant123@cluster0.jursxle.mongodb.net/?appName=Cluster0"
client = MongoClient(uri)
db = client["MHTCET_DB"]
collection = db["cutoffs"]

# CSV Load
df = pd.read_csv("../cleaned_mht_cet_cutoffs.csv") # Path check karein
data = df.to_dict('records')

# Insert
collection.insert_many(data)
print(f"Success! {len(data)} records uploaded.")