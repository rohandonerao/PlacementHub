import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / "trained_model_improved.pkl"

with open(MODEL_FILE, "rb") as file:
    model = pickle.load(file)

cases = [
    {
        "name": "Strong Java match",
        "resume": "Java Spring Boot SQL Hibernate REST APIs Maven Git",
        "job": "Java Developer requires Java Spring Boot SQL Hibernate REST APIs Maven",
        "expected": 1
    },
    {
        "name": "Unrelated Flutter resume",
        "resume": "Flutter Dart Firebase Android mobile application development",
        "job": "Java Developer requires Java Spring Boot Hibernate Maven backend development",
        "expected": 0
    },
    {
        "name": "Strong Data Analyst match",
        "resume": "SQL Excel Power BI Tableau data visualization reporting",
        "job": "Data Analyst requires SQL Excel Power BI Tableau data visualization",
        "expected": 1
    },
    {
        "name": "Unrelated Cybersecurity resume",
        "resume": "Network security SIEM incident response Linux Wireshark",
        "job": "Frontend Developer requires React JavaScript HTML CSS responsive design",
        "expected": 0
    },
    {
        "name": "Strong Machine Learning match",
        "resume": "Python pandas NumPy scikit-learn machine learning model evaluation",
        "job": "Machine Learning Engineer requires Python pandas NumPy scikit-learn model evaluation",
        "expected": 1
    },
    {
        "name": "Unrelated Java resume",
        "resume": "Java Spring Boot Hibernate Maven backend development",
        "job": "Flutter Developer requires Flutter Dart Firebase Android mobile development",
        "expected": 0
    }
]

correct = 0

for case in cases:
    text = case["resume"] + " [SEP] " + case["job"]

    prediction = int(model.predict([text])[0])
    probability = model.predict_proba([text])[0][1]

    passed = prediction == case["expected"]
    correct += int(passed)

    print("\nTest:", case["name"])
    print("Expected:", "Relevant" if case["expected"] else "Not Relevant")
    print("Predicted:", "Relevant" if prediction else "Not Relevant")
    print("Relevant probability:", f"{probability:.2%}")
    print("Result:", "PASS" if passed else "FAIL")

print(f"\nTest accuracy: {correct}/{len(cases)} ({correct / len(cases):.2%})")