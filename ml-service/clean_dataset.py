import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "training_data_improved.csv"
OUTPUT_FILE = BASE_DIR / "training_data_cleaned.csv"

with open(INPUT_FILE, "r", encoding="utf-8", newline="") as file:
    reader = csv.DictReader(file)
    rows = list(reader)

seen = set()
cleaned = []

for row in rows:
    resume = row["resume_text"].strip()
    job = row["job_description"].strip()
    label = row["label"].strip()

    if not resume or not job or label not in {"0", "1"}:
        continue

    key = (resume, job, label)

    if key not in seen:
        seen.add(key)
        cleaned.append({
            "resume_text": resume,
            "job_description": job,
            "label": label
        })

with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["resume_text", "job_description", "label"]
    )
    writer.writeheader()
    writer.writerows(cleaned)

print("Original records:", len(rows))
print("Cleaned records:", len(cleaned))
print("Duplicates removed:", len(rows) - len(cleaned))
print("Output file:", OUTPUT_FILE)