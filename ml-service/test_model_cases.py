import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "trained_model.pkl", "rb") as file:
    model = pickle.load(file)

test_cases = [
    {
        "name": "Strong Java Match",
        "resume": "Java Spring Boot SQL Hibernate REST APIs Git",
        "job": "Java Developer requiring Java Spring Boot SQL Hibernate REST APIs"
    },
    {
        "name": "Unrelated Flutter Resume",
        "resume": "Flutter Dart Firebase mobile app development",
        "job": "Java Developer requiring Java Spring Boot SQL Hibernate"
    },
    {
        "name": "Partial Java Match",
        "resume": "Java SQL Git HTML CSS",
        "job": "Java Developer requiring Java Spring Boot SQL Hibernate Docker"
    },
    {
        "name": "Unrelated Data Analyst Resume",
        "resume": "Excel Power BI Tableau data visualization dashboards",
        "job": "Cybersecurity Analyst requiring network security SIEM incident response"
    },
    {
        "name": "Partial Machine Learning Match",
        "resume": "Python pandas NumPy statistics",
        "job": "Machine Learning Engineer requiring Python scikit-learn model evaluation"
    }
]

for case in test_cases:
    text = case["resume"] + " [SEP] " + case["job"]

    prediction = int(model.predict([text])[0])
    probabilities = model.predict_proba([text])[0]
    classes = list(model.classes_)
    score = float(probabilities[classes.index(1)]) * 100

    print("\nTest:", case["name"])
    print("Prediction:", "Relevant" if prediction == 1 else "Less relevant")
    print("Model relevance score:", round(score, 2), "%")