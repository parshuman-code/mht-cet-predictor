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
    page: int = 1,          # Naya parameter: Default page 1 hoga
    limit: int = 20         # Naya parameter: Har page par 20 colleges
):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    category = category.upper()
    gender = gender.lower()
    
    # Base Query data filter karne ke liye
    base_query = """
        FROM cutoffs 
        WHERE cap_round = ? 
        AND cutoff_percentile <= ?
        AND cutoff_percentile >= ?
    """
    params = [cap_round, percentile, min_percentile]
    
    # Category Filter
    base_query += " AND seat_type LIKE ?"
    params.append(f"%{category}%")
    
    # Gender Filter
    if gender == "male":
        base_query += " AND NOT (seat_type LIKE 'L%')"
        
    # 1. Pehle hum Total Count nikalenge taaki frontend ko pata chale kitne total pages banenge
    count_cursor = conn.cursor()
    count_cursor.execute(f"SELECT COUNT(DISTINCT choice_code) {base_query}", params)
    total_records = count_cursor.fetchone()[0]
    
    # 2. Ab Pagination logic lagakar actual data nikalenge (OFFSET math formula)
    offset = (page - 1) * limit
    
    data_query = f"""
        SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                        status, home_university, quota_allocation, seat_type, 
                        stage, cutoff_rank, cutoff_percentile 
        {base_query}
        ORDER BY cutoff_percentile DESC 
        LIMIT ? OFFSET ?
    """
    
    cursor.execute(data_query, params + [limit, offset])
    rows = cursor.fetchall()
    conn.close()
    
    predictions = [dict(row) for row in rows]
    
    return {
        "status": "success",
        "total_count": total_records,  # Total kitne colleges mile
        "page": page,
        "limit": limit,
        "predictions": predictions
    }