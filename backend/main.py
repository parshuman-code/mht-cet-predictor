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
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    offset = (page - 1) * limit
    
    if percentile < 0:
        # Default Search Mode (No Sidebar Filters Applied)
        base_cond = "WHERE (college_name LIKE ? OR college_code LIKE ?)"
        search_pattern = f"%{search.strip()}%"
        count_params = [search_pattern, search_pattern]
    else:
        # Filtered Search Mode (Sidebar Filters Applied)
        category_upper = f"%{category.upper()}%"
        gender_lower = gender.lower()
        if min_percentile is None:
            min_percentile = 0.0
            
        base_cond = """
            WHERE cutoff_percentile <= ? 
            AND cutoff_percentile >= ? 
            AND seat_type LIKE ?
        """
        count_params = [percentile, min_percentile, category_upper]
        
        if cap_round and cap_round != "All Rounds":
            base_cond += " AND cap_round = ?"
            count_params.append(cap_round)
            
        if gender_lower == "male":
            base_cond += " AND NOT (seat_type LIKE 'L%')"
            
        if search and search.strip():
            base_cond += " AND branch_name LIKE ?"
            search_pattern = f"%{search.strip()}%"
            count_params.append(search_pattern)

    # TOTAL COUNT QUERY
    count_query = f"""
        SELECT COUNT(*) FROM (
            SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                            status, home_university, quota_allocation, seat_type, 
                            stage, cutoff_rank, cutoff_percentile, cap_round 
            FROM cutoffs 
            {base_cond}
        )
    """
    cursor.execute(count_query, count_params)
    total_records = cursor.fetchone()[0]
    
    # ACTUAL DATA FETCH QUERY
    data_query = f"""
        SELECT DISTINCT college_code, college_name, choice_code, branch_name, 
                        status, home_university, quota_allocation, seat_type, 
                        stage, cutoff_rank, cutoff_percentile, cap_round 
        FROM cutoffs 
        {base_cond}
        ORDER BY cutoff_percentile DESC 
        LIMIT ? OFFSET ?
    """
    data_params = list(count_params) + [limit, offset]
        
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
