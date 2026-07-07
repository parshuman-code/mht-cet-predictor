import pdfplumber
import re
import csv
import os

def clean_text(text):
    return " ".join(text.split()) if text else ""

def parse_cutoff_pdf(pdf_path, round_name):
    records = []
    
    # Robust Patterns (Ab 9 aur 10 dono digits ke choice codes scan honge)
    college_pattern = re.compile(r"^\s*(\d{4,5})\s*-\s*(.+)$")
    branch_pattern = re.compile(r"^\s*(\d{9,10})\s*-\s*(.+)$")
    status_pattern = re.compile(r"Status:\s*(.*?)(?:Home University\s*:\s*(.*))?$")
    
    # Catching seat headers (GOPENH, LOPENH, GOBCS, EWS, TFWS, etc.)
    seat_headers_pattern = re.compile(r"\b(GOPEN[HOS]?|LOPEN[HOS]?|G[A-Z0-9]+[HOS]|L[A-Z0-9]+[HOS]|EWS|TFWS)\b")
    
    current_college_code = None
    current_college_name = None
    current_choice_code = None
    current_branch_name = None
    current_status = None
    current_home_university = None
    current_quota = "State Level"

    print(f"Analyzing {pdf_path}...")
    
    if not os.path.exists(pdf_path):
        print(f"⚠️ Warning: File {pdf_path} nahi mili. Skipping.")
        return []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split("\n")
            active_headers = []
            
            for i in range(len(lines)):
                line_str = clean_text(lines[i])
                if not line_str:
                    continue
                
                # 1. Match College Metadata
                college_match = college_pattern.match(line_str)
                if college_match:
                    current_college_code = college_match.group(1)
                    current_college_name = college_match.group(2)
                    continue
                
                # 2. Match Branch Code (9 or 10 digits)
                branch_match = branch_pattern.match(line_str)
                if branch_match:
                    current_choice_code = branch_match.group(1)
                    current_branch_name = branch_match.group(2)
                    active_headers = [] 
                    continue
                
                # 3. Match Institute Status
                if "Status:" in line_str:
                    status_match = status_pattern.search(line_str)
                    if status_match:
                        current_status = status_match.group(1).strip()
                        current_home_university = status_match.group(2).strip() if status_match.group(2) else ""
                    continue
                
                # 4. Context Quota Allocation
                if "Home University Seats Allotted to Home University" in line_str:
                    current_quota = "HU-to-HU"
                elif "Other Than Home University" in line_str:
                    current_quota = "OHU-to-OHU"
                elif "State Level" in line_str:
                    current_quota = "State Level"
                
                # 5. Extract Category Headers List
                found_headers = seat_headers_pattern.findall(line_str)
                if found_headers and len(found_headers) > 1:
                    active_headers = found_headers
                    continue
                
                # 6. Process Block: Look for Stage indicators ('I' or 'II')
                words = line_str.split()
                if words and (words[0] == "I" or words[0] == "II") and len(words) > 1:
                    stage_id = words[0]
                    
                    ranks = re.findall(r"\b\d+\b", " ".join(words[1:]))
                    
                    percentiles = []
                    if i + 1 < len(lines):
                        next_line_str = clean_text(lines[i + 1])
                        percentiles = re.findall(r"\(([\d\.]+)\)", next_line_str)
                    
                    match_count = min(len(ranks), len(percentiles), len(active_headers))
                    
                    for idx in range(match_count):
                        if current_choice_code:
                            records.append({
                                "cap_round": round_name,
                                "college_code": current_college_code,
                                "college_name": current_college_name,
                                "choice_code": current_choice_code,
                                "branch_name": current_branch_name,
                                "status": current_status,
                                "home_university": current_home_university,
                                "quota_allocation": current_quota,
                                "seat_type": active_headers[idx],
                                "stage": stage_id,
                                "cutoff_rank": int(ranks[idx]),
                                "cutoff_percentile": float(percentiles[idx])
                            })
    return records

if __name__ == "__main__":
    pdf_files = {
        "mht-cet-2025-26-cap1.pdf": "Round 1",
        "mht-cet-2025-26-cap2.pdf": "Round 2",
        "mht-cet-2025-26-cap3.pdf": "Round 3",
        "mht-cet-2025-26-cap4.pdf": "Round 4"
    }
    
    master_records = []
    
    print("\n--- STARTING ULTIMATE MULTI-ROUND EXTRACTION ---")
    for file_name, round_tag in pdf_files.items():
        if not os.path.exists(file_name):
            print(f"⚠️ Skipping: '{file_name}' nahi mila.")
            continue
            
        round_data = parse_cutoff_pdf(file_name, round_tag)
        master_records.extend(round_data)
        print(f"-> Total {len(round_data)} records extracted from {round_tag}.\n")
        
    output_csv = "cleaned_mht_cet_cutoffs.csv"
    
    if master_records:
        fieldnames = ["cap_round", "college_code", "college_name", "choice_code", "branch_name", "status", 
                      "home_university", "quota_allocation", "seat_type", "stage", "cutoff_rank", "cutoff_percentile"]
        
        with open(output_csv, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(master_records)
            
        print(f"🎉 BOOM! Total {len(master_records)} rows perfectly generated inside '{output_csv}'!")
    else:
        print("❌ Kuch bhi extract nahi hua. Files check karein.")