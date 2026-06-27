from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os

app = FastAPI(title="MHT-CET Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

@app.get("/")
def home():
    return {"status": "running", "message": "MHT-CET Predictor Backend is Live!"}

@app.get("/api/predict")
def predict_colleges(
    percentile: float,
    category: str,
    gender: str,
    cap_round: str = "Round 1",
    min_percentile: float = 0.0,
    page: int = 1,          
    limit: int = 20         
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    category = category.upper()
    gender = gender.lower()
    
    if min_percentile is None:
        min_percentile = 0.0
    
    # Base Query structure without string concat bugs
    base_query = """
        FROM cutoffs 
        WHERE cap_round = ? 
        AND cutoff_percentile <= ?
        AND cutoff_percentile >= ?
        AND seat_type LIKE ?
    """
    params = [cap_round, percentile, min_percentile, f"%{category}%"]
    
    # Gender logic integration safely
    if gender == "male":
        base_query += " AND NOT (seat_type LIKE 'L%')"
        
    # 1. Total records count calculation
    count_cursor = conn.cursor()
    count_query = f"SELECT COUNT(DISTINCT choice_code) {base_query}"
    count_cursor.execute(count_query, params)
    total_records = count_cursor.fetchone()[0]
    
    # 2. Offset math index calculation
    offset = (page - 1) * limit
    
    # Clean injection of the query schema parameters
    data_query = f"""
        SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                        status, home_university, quota_allocation, seat_type, 
                        stage, cutoff_rank, cutoff_percentile 
        {base_query}
        ORDER BY cutoff_percentile DESC 
        LIMIT ? OFFSET ?
    """
    
    # Merging parameters arrays seamlessly
    cursor.execute(data_query, params + [limit, offset])
    rows = cursor.fetchall()
    conn.close()
    
    predictions = [dict(row) for row in rows]
    
    return {
        "status": "success",
        "total_count": total_records,
        "page": page,
        "limit": limit,
        "predictions": predictions
    }
