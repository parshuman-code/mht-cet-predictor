from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import os

app = FastAPI(title="MHT-CET Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Render ke Environment Variables se connection string uthayein
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://admin_prashant:Prashant123@cluster0.jursxle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URI)
db = client["MHTCET_DB"]
collection = db["cutoffs"]

@app.get("/")
def home():
    return {"status": "running", "message": "Backend is Live with MongoDB!"}

@app.get("/predict")
def predict_colleges(
    percentile: float = -1.0,
    category: str = "OPEN",
    gender: str = "Male",
    cap_round: str = "Round 1",
    min_percentile: float = 0.0,
    search: str = "",
    page: int = 1,
    limit: int = 20
):
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
    elif search.strip():
        regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [{"college_name": regex}, {"college_code": {"$regex": search.strip()}}]

    try:
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
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "total_count": 0,
            "page": page,
            "limit": limit,
            "predictions": []
        }
