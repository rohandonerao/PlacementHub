import csv
import random
from pathlib import Path

random.seed(42)

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "training_data.csv"
OUTPUT_FILE = BASE_DIR / "training_data_improved.csv"

roles = {
    "Java Developer": [
        "Java", "Spring Boot", "SQL", "Hibernate", "REST APIs", "Maven"
    ],
    "Flutter Developer": [
        "Flutter", "Dart", "Firebase", "Android", "JSON", "state management"
    ],
    "Machine Learning Engineer": [
        "Python", "scikit-learn", "pandas", "NumPy", "model evaluation"
    ],
    "Data Analyst": [
        "SQL", "Excel", "Power BI", "Tableau", "data visualization"
    ],
    "Frontend Developer": [
        "JavaScript", "React", "HTML", "CSS", "TypeScript"
    ],
    "Cybersecurity Analyst": [
        "network security", "SIEM", "incident response", "Linux", "Wireshark"
    ]
}

resume_templates = [
    "My project experience includes {}. I have practiced these technologies in academic work.",
    "Technical background: {}. Built coursework projects and documented the results.",
    "Skills demonstrated in personal projects include {}. Familiar with testing and debugging.",
    "Completed academic exercises using {}. Interested in software development and problem solving."
]

job_templates = [
    "The position requires {}. Responsibilities include development, testing, and documentation.",
    "Candidates should understand {} and apply these skills to practical engineering tasks.",
    "Required technical background includes {}. The role involves maintaining and testing applications."
]

rows = []

for role, skills in roles.items():
    for i in range(50):
        selected = random.sample(skills, k=min(3 + i % 3, len(skills)))

        resume = random.choice(resume_templates).format(", ".join(selected))
        job = f"{role}. " + random.choice(job_templates).format(", ".join(skills))

        rows.append({
            "resume_text": resume,
            "job_description": job,
            "label": 1
        })

        unrelated_roles = [name for name in roles if name != role]
        unrelated_role = random.choice(unrelated_roles)
        unrelated_skills = roles[unrelated_role]

        negative_resume = random.choice(resume_templates).format(
            ", ".join(random.sample(unrelated_skills, k=min(3, len(unrelated_skills))))
        )

        rows.append({
            "resume_text": negative_resume,
            "job_description": job,
            "label": 0
        })

with open(INPUT_FILE, "r", encoding="utf-8", newline="") as file:
    existing = list(csv.DictReader(file))

combined = existing + rows

with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["resume_text", "job_description", "label"]
    )
    writer.writeheader()
    writer.writerows(combined)

print("Original examples:", len(existing))
print("New examples:", len(rows))
print("Total examples:", len(combined))
print("Saved to:", OUTPUT_FILE)
print("Original dataset remains unchanged.")