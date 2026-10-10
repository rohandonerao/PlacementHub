import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "trained_model_improved.pkl", "rb") as file:
    model = pickle.load(file)

cases = [
    (
        "Java",
        "Java Spring Boot Hibernate Maven SQL REST APIs",
        "Java Developer requires Java Spring Boot Hibernate Maven SQL REST APIs"
    ),
    (
        "Java vs Flutter",
        "Java Spring Boot Hibernate Maven SQL REST APIs",
        "Flutter Developer requires Flutter Dart Firebase Android mobile development"
    ),
    (
        "Flutter",
        "Flutter Dart Firebase Android mobile development",
        "Flutter Developer requires Flutter Dart Firebase Android mobile development"
    ),
    (
        "Flutter vs Java",
        "Flutter Dart Firebase Android mobile development",
        "Java Developer requires Java Spring Boot Hibernate Maven backend development"
    ),
    (
        "Cybersecurity vs Frontend",
        "Network security SIEM incident response Linux Wireshark",
        "Frontend Developer requires React JavaScript HTML CSS responsive design"
    ),
    (
        "Data Analyst",
        "SQL Excel Power BI Tableau data visualization reporting",
        "Data Analyst requires SQL Excel Power BI Tableau data visualization"
    )
]

for name, resume, job in cases:
    text = resume + " [SEP] " + job
    prediction = int(model.predict([text])[0])
    probability = model.predict_proba([text])[0][1]

    print(f"\n{name}")
    print("Prediction:", "Relevant" if prediction else "Not Relevant")
    print("Relevant probability:", f"{probability:.2%}")