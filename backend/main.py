from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import re
import pandas as pd

app = FastAPI(title="MHT-CET Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CSV data
csv_path = os.path.join(os.path.dirname(__file__), "cleaned_mht_cet_cutoffs.csv")
try:
    df = pd.read_csv(csv_path)
    print(f"CSV loaded: {len(df)} records from {csv_path}")
    # Pre-compute unique sorted cities from CSV
    csv_cities = sorted(df["city"].unique().tolist(), key=lambda s: str(s).lower())
    print(f"Found {len(csv_cities)} unique cities from CSV")
except Exception as e:
    print(f"CSV not found or could not load: {e}")
    df = None
    csv_cities = []

# MongoDB connection for bookmarks (keep bookmarks in DB)
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://admin_prashant:Prashant123@cluster0.jursxle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client["MHTCET_DB"]
    bookmarks_collection = db["user_bookmarks"]
    # Try to connect
    client.server_info()
    collection = db["cutoffs"]  # Keep for fallback
    print("MongoDB connected")
except Exception as e:
    print(f"MongoDB not available: {e}")
    bookmarks_collection = None
    collection = None

class BookmarkAddRequest(BaseModel):
    user_id: str
    bookmark: Dict[str, Any]

class BookmarkRemoveRequest(BaseModel):
    user_id: str
    bookmark_id: str

class BookmarkReorderRequest(BaseModel):
    user_id: str
    bookmarks: List[Dict[str, Any]]

def clean_json_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cleaned = []
    for record in records:
        item = {}
        for key, value in record.items():
            if pd.isna(value):
                item[key] = None
            else:
                item[key] = value
        cleaned.append(item)
    return cleaned

@app.get("/")
def home():
    csv_status = "loaded" if df is not None else "not found"
    mongo_status = "connected" if collection is not None else "unavailable"
    return {
        "status": "running",
        "message": "Backend is Live!",
        "csv": csv_status,
        "mongodb": mongo_status
    }

@app.get("/cities")
def get_cities():
    try:
        if df is not None and len(csv_cities) > 0:
            # Use CSV cities (cleaned)
            return {"status": "success", "cities": csv_cities}
        elif collection is not None:
            # Fallback to MongoDB
            cities = collection.distinct("home_university")
            cities = [c for c in cities if c and str(c).strip()]
            cities_sorted = sorted(cities, key=lambda s: str(s).lower())
            return {"status": "success", "cities": cities_sorted}
        else:
            return {"status": "error", "message": "No data source available", "cities": []}
    except Exception as e:
        return {"status": "error", "message": str(e), "cities": []}

@app.get("/predict")
def predict_colleges(
    percentile: float = -1.0,
    category: str = "OPEN",
    gender: str = "Male",
    cap_round: str = "Round 1",
    min_percentile: float = 0.0,
    search: str = "",
    city: str = "All Cities",
    page: int = 1,
    limit: int = 20
):
    """
    Predict colleges based on filters.
    Uses CSV if available, otherwise falls back to MongoDB.
    """
    try:
        # Use CSV if available
        if df is not None and len(df) > 0:
            result_df = df.copy()
            
            # Apply percentile filter
            if percentile >= 0:
                result_df = result_df[
                    (result_df["cutoff_percentile"] <= percentile) &
                    (result_df["cutoff_percentile"] >= min_percentile)
                ]
                
                # Apply category/gender filter
                category_upper = category.upper()
                if category_upper == "OPEN":
                    seat_types = ['GOPENS', 'GOPENO', 'GOPENH']
                elif category_upper == "OBC":
                    seat_types = ['GOBCS', 'GOBCO', 'GOBCH']
                elif category_upper == "SC":
                    seat_types = ['GSCS', 'GSCO', 'GSCH']
                elif category_upper == "ST":
                    seat_types = ['GSTS', 'GSTO', 'GSTH']
                elif category_upper == "EWS":
                    seat_types = ['EWS']
                elif category_upper == "TFWS":
                    seat_types = ['TFWS']
                else:
                    seat_types = []
                    
                if seat_types:
                    # For male gender, exclude "L" prefixed (female reserved)
                    if gender.lower() == "male":
                        seat_types = [s for s in seat_types if not s.startswith("L")]
                    result_df = result_df[result_df["seat_type"].isin(seat_types)]
                
                # Apply CAP round filter
                if cap_round and cap_round != "All Rounds":
                    result_df = result_df[result_df["cap_round"] == cap_round]
                    
            elif search.strip():
                # Search mode: college name or code
                search_lower = search.strip().lower()
                result_df = result_df[
                    (result_df["college_name"].str.lower().str.contains(search_lower, na=False)) |
                    (result_df["college_code"].astype(str).str.contains(search_lower, na=False))
                ]
            
            # Apply city filter
            if city and city != "All Cities":
                result_df = result_df[result_df["city"] == city]
            
            result_df["cutoff_percentile"] = pd.to_numeric(result_df["cutoff_percentile"], errors="coerce")
            result_df = result_df.sort_values("cutoff_percentile", ascending=False, na_position="last")
            
            total_records = len(result_df)
            skip_count = (page - 1) * limit
            paged_df = result_df.iloc[skip_count : skip_count + limit]
            
            predictions = clean_json_records(paged_df.to_dict(orient="records"))
            
            return {
                "status": "success",
                "total_count": total_records,
                "page": page,
                "limit": limit,
                "predictions": predictions
            }
            
        # Fallback to MongoDB
        elif collection is not None:
            query = {}

            # Filter Logic
            if percentile >= 0:
                query["cutoff_percentile"] = {"$lte": percentile, "$gte": min_percentile}
                    
                category_upper = category.upper()
                seat_type_list = []
                if category_upper == "OPEN":
                    seat_type_list = ['GOPENH', 'GOPENO', 'GOPENS', 'LOPENH', 'LOPENO', 'LOPENS']
                elif category_upper == "OBC":
                    seat_type_list = ['GOBCH', 'GOBCO', 'GOBCS', 'LOBCH', 'LOBCO', 'LOBCS']
                elif category_upper == "SC":
                    seat_type_list = ['GSCH', 'GSCO', 'GSCS', 'LSCH', 'LSCO', 'LSCS']
                elif category_upper == "ST":
                    seat_type_list = ['GSTH', 'GSTO', 'GSTS', 'LSTH', 'LSTO', 'LSTS']
                elif category_upper == "EWS":
                    seat_type_list = ['EWS']
                elif category_upper == "TFWS":
                    seat_type_list = ['TFWS']
                    
                if seat_type_list:
                    if gender.lower() == "male":
                        seat_type_list = [s for s in seat_type_list if not s.startswith("L")]
                    query["seat_type"] = {"$in": seat_type_list}
                else:
                    query["seat_type"] = {"$regex": category, "$options": "i"}
                    if gender.lower() == "male":
                        query["seat_type"] = {"$not": {"$regex": "^L"}}

                if cap_round and cap_round != "All Rounds":
                    query["cap_round"] = cap_round
                if city and city != "All Cities":
                    escaped = re.escape(str(city).strip())
                    query["home_university"] = {"$regex": f"^{escaped}$", "$options": "i"}
            elif search.strip():
                regex = {"$regex": search.strip(), "$options": "i"}
                query["$or"] = [{"college_name": regex}, {"college_code": {"$regex": search.strip()}}]
                if city and city != "All Cities":
                    escaped = re.escape(str(city).strip())
                    query["home_university"] = {"$regex": f"^{escaped}$", "$options": "i"}

            # MongoDB Fetch
            if not query:
                total_records = collection.estimated_document_count()
            else:
                total_records = collection.count_documents(query)
                
            skip_count = (page - 1) * limit
            
            cursor = collection.find(query, {"_id": 0}).sort("cutoff_percentile", -1).skip(skip_count).limit(limit)
            predictions = list(cursor)
            
            import math
            # Clean up NaN values which cause json.dumps to crash
            for p in predictions:
                for k, v in p.items():
                    if isinstance(v, float) and math.isnan(v):
                        p[k] = None
            
            return {
                "status": "success",
                "total_count": total_records,
                "page": page,
                "limit": limit,
                "predictions": predictions
            }
        else:
            return {
                "status": "error",
                "message": "No data source available",
                "total_count": 0,
                "page": page,
                "limit": limit,
                "predictions": []
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "total_count": 0,
            "page": page,
            "limit": limit,
            "predictions": []
        }

@app.get("/bookmarks/{user_id}")
def get_bookmarks(user_id: str):
    try:
        if bookmarks_collection is None:
            return {"status": "warning", "message": "Bookmarks not available (MongoDB offline)", "bookmarks": []}
        
        doc = bookmarks_collection.find_one({"user_id": user_id}, {"_id": 0})
        if doc:
            return {"status": "success", "bookmarks": doc.get("bookmarks", [])}
        return {"status": "success", "bookmarks": []}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/bookmarks/add")
def add_bookmark(req: BookmarkAddRequest):
    try:
        if bookmarks_collection is None:
            return {"status": "error", "message": "Bookmarks not available (MongoDB offline)"}
        
        if "id" not in req.bookmark:
            return {"status": "error", "message": "Bookmark must have an id"}
        
        doc = bookmarks_collection.find_one({"user_id": req.user_id})
        if not doc:
            bookmarks_collection.insert_one({"user_id": req.user_id, "bookmarks": [req.bookmark]})
        else:
            bookmarks = doc.get("bookmarks", [])
            # Check duplicate by id or by college properties (college_name + seat_type)
            is_dup = False
            for b in bookmarks:
                if b.get("id") == req.bookmark["id"]:
                    is_dup = True
                    break
                # Duplicate = same choice_code + seat_type + cap_round + quota_allocation.
                if (
                    b.get("choice_code") == req.bookmark.get("choice_code")
                    and b.get("seat_type") == req.bookmark.get("seat_type")
                    and b.get("cap_round") == req.bookmark.get("cap_round")
                    and b.get("quota_allocation") == req.bookmark.get("quota_allocation")
                ):
                    is_dup = True
                    break
                    
            if is_dup:
                return {"status": "error", "message": "You have already added this college"}
                
            bookmarks_collection.update_one(
                {"user_id": req.user_id},
                {"$push": {"bookmarks": {"$each": [req.bookmark], "$position": 0}}}
            )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/bookmarks/remove")
def remove_bookmark(req: BookmarkRemoveRequest):
    try:
        if bookmarks_collection is None:
            return {"status": "error", "message": "Bookmarks not available (MongoDB offline)"}
        
        bookmarks_collection.update_one(
            {"user_id": req.user_id},
            {"$pull": {"bookmarks": {"id": req.bookmark_id}}}
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/bookmarks/reorder")
def reorder_bookmarks(req: BookmarkReorderRequest):
    try:
        if bookmarks_collection is None:
            return {"status": "error", "message": "Bookmarks not available (MongoDB offline)"}
        
        bookmarks_collection.update_one(
            {"user_id": req.user_id},
            {"$set": {"bookmarks": req.bookmarks}},
            upsert=True
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
