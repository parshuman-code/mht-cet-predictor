from fastapi import FastAPI
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
    
    # Standardizing parameters
    category_upper = f"%{category.upper()}%"
    gender_lower = gender.lower()
    
    if min_percentile is None:
        min_percentile = 0.0

    # 1. PEHLE TOTAL COUNT NIKALENGE (Purely Hardcoded Structure for No 500 Crashes)
    if gender_lower == "male":
        count_query = """
            SELECT COUNT(DISTINCT choice_code) FROM cutoffs 
            WHERE cap_round = ? 
            AND cutoff_percentile <= ? 
            AND cutoff_percentile >= ? 
            AND seat_type LIKE ? 
            AND NOT (seat_type LIKE 'L%')
        """
        count_params = [cap_round, percentile, min_percentile, category_upper]
    else:
        count_query = """
            SELECT COUNT(DISTINCT choice_code) FROM cutoffs 
            WHERE cap_round = ? 
            AND cutoff_percentile <= ? 
            AND cutoff_percentile >= ? 
            AND seat_type LIKE ?
        """
        count_params = [cap_round, percentile, min_percentile, category_upper]

    cursor.execute(count_query, count_params)
    total_records = cursor.fetchone()[0]
    
    # 2. OFFSET FOR PAGINATION
    offset = (page - 1) * limit
    
    # 3. ACTUAL DATA FETCH QUERY
    if gender_lower == "male":
        data_query = """
            SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                            status, home_university, quota_allocation, seat_type, 
                            stage, cutoff_rank, cutoff_percentile 
            FROM cutoffs 
            WHERE cap_round = ? 
            AND cutoff_percentile <= ? 
            AND cutoff_percentile >= ? 
            AND seat_type LIKE ? 
            AND NOT (seat_type LIKE 'L%')
            ORDER BY cutoff_percentile DESC 
            LIMIT ? OFFSET ?
        """
        data_params = [cap_round, percentile, min_percentile, category_upper, limit, offset]
    else:
        data_query = """
            SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                            status, home_university, quota_allocation, seat_type, 
                            stage, cutoff_rank, cutoff_percentile 
            FROM cutoffs 
            WHERE cap_round = ? 
            AND cutoff_percentile <= ? 
            AND cutoff_percentile >= ? 
            AND seat_type LIKE ? 
            ORDER BY cutoff_percentile DESC 
            LIMIT ? OFFSET ?
        """
        data_params = [cap_round, percentile, min_percentile, category_upper, limit, offset]
        
    cursor.execute(data_query, data_params)
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
