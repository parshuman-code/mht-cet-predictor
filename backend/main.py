from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, DESCENDING
import math
import os

app = FastAPI(title="MHT-CET Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://admin_prashant:Prashant123@cluster0.jursxle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
db = client["MHTCET_DB"]
collection = db["cutoffs"]

PROJECTION = {
    "_id": 0,
    "college_code": 1,
    "college_name": 1,
    "choice_code": 1,
    "branch_name": 1,
    "status": 1,
    "home_university": 1,
    "quota_allocation": 1,
    "seat_type": 1,
    "stage": 1,
    "cutoff_rank": 1,
    "cutoff_percentile": 1,
    "cap_round": 1
}

# Exact seat_type codes per category — used with $in to hit compound index
# (seat_type, cutoff_percentile) instead of slow regex scan
SEAT_TYPES = {
    "OPEN": ["GOPENH", "GOPENO", "GOPENS", "LOPENH", "LOPENO", "LOPENS"],
    "OBC":  ["GOBCH",  "GOBCO",  "GOBCS",  "LOBCH",  "LOBCO",  "LOBCS"],
    "SC":   ["GSCH",   "GSCO",   "GSCS",   "LSCH",   "LSCO",   "LSCS"],
    "ST":   ["GSTH",   "GSTO",   "GSTS",   "LSTH",   "LSTO",   "LSTS"],
    "NT1":  ["GNT1H",  "GNT1O",  "GNT1S",  "LNT1H",  "LNT1O",  "LNT1S"],
    "NT2":  ["GNT2H",  "GNT2O",  "GNT2S",  "LNT2H",  "LNT2O",  "LNT2S"],
    "NT3":  ["GNT3H",  "GNT3O",  "GNT3S",  "LNT3H",  "LNT3O",  "LNT3S"],
    "VJ":   ["GVJH",   "GVJO",   "GVJS",   "LVJH",   "LVJO",   "LVJS"],
    "SBC":  ["GSEBCH", "GSEBCO", "GSEBCS", "LSEBCH", "LSEBCO", "LSEBCS"],
    "EWS":  ["EWS"],
    "TFWS": ["TFWS"],
}

def sanitize(doc: dict) -> dict:
    """Replace NaN/Inf float values with None so JSON serialization doesn't crash."""
    result = {}
    for k, v in doc.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            result[k] = None
        else:
            result[k] = v
    return result

@app.get("/")
def home():
    return {"status": "running", "message": "MHT-CET Predictor Backend is Live! (MongoDB)"}

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
    offset = (page - 1) * limit
    search_str = search.strip()

    try:
        if percentile < 0:
            # ── Default / College Search Mode ──────────────────────────────────
            or_conditions = [
                {"college_name": {"$regex": search_str, "$options": "i"}}
            ]
            # If search string looks numeric, also match integer college_code
            try:
                numeric_code = int(search_str)
                or_conditions.append({"college_code": numeric_code})
                or_conditions.append({"choice_code": numeric_code})
            except ValueError:
                pass

            query = {"$or": or_conditions} if search_str else {}

        else:
            # ── Filtered / Branch Search Mode ──────────────────────────────────
            query = {
                "cutoff_percentile": {
                    "$lte": percentile,
                    "$gte": min_percentile
                }
            }

            # Use exact $in list — hits compound index (seat_type, cutoff_percentile)
            # 47x faster than regex scan; falls back to regex for unknown categories
            category_upper = category.upper()
            seat_type_list = SEAT_TYPES.get(category_upper)
            if seat_type_list:
                if gender.lower() == "male":
                    seat_type_list = [s for s in seat_type_list if not s.startswith("L")]
                query["seat_type"] = {"$in": seat_type_list}
            else:
                # Unknown category — fallback regex (slower but correct)
                query["seat_type"] = {"$regex": category_upper, "$options": "i"}
                if gender.lower() == "male":
                    query["$and"] = [
                        {"seat_type": {"$regex": category_upper, "$options": "i"}},
                        {"seat_type": {"$not": {"$regex": "^L"}}}
                    ]
                    del query["seat_type"]

            # CAP Round filter
            if cap_round and cap_round not in ("All Rounds", ""):
                query["cap_round"] = cap_round

            # Branch name search (within filtered results)
            if search_str:
                query["branch_name"] = {"$regex": search_str, "$options": "i"}

        # Count: use estimated for empty query (O(1)), capped for others
        # cap at 10 000 — far more than enough for pagination
        if not query:
            total_records = collection.estimated_document_count()
        else:
            total_records = collection.count_documents(query, limit=10_000)

        cursor = (
            collection
            .find(query, PROJECTION)
            .sort("cutoff_percentile", DESCENDING)
            .skip(offset)
            .limit(limit)
            .allow_disk_use(True)
        )
        predictions = [sanitize(doc) for doc in cursor]

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