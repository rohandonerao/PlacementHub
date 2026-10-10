import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / "trained_model.pkl"

with open(MODEL_FILE, "rb") as file:
    model = pickle.load(file)

examples = [
    (
        "Java Spring Boot SQL REST APIs Git",
        "Java Developer: Required skills include Java, SQL, Spring Boot and REST APIs"
    ),
    (
        "Flutter Dart Firebase mobile applications",
        "Java Developer: Required skills include Java, SQL, Spring Boot and Hibernate"
    )
]

for resume, job in examples:
    text = resume + " [SEP] " + job

    prediction = int(model.predict([text])[0])
    probabilities = model.predict_proba([text])[0]
    classes = list(model.classes_)

    relevant_probability = probabilities[classes.index(1)]

    print("\nJob description:", job)
    print("Prediction:", "Relevant" if prediction == 1 else "Less relevant")
    print("Model relevance score:", round(float(relevant_probability) * 100, 2), "%")

print("\nTrained model loaded and tested successfully.")