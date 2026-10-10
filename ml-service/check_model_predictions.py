import csv
import pickle
from pathlib import Path
from sklearn.metrics import confusion_matrix, classification_report

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "trained_model_improved.pkl", "rb") as file:
    model = pickle.load(file)

with open(BASE_DIR / "training_data_cleaned.csv", "r", encoding="utf-8", newline="") as file:
    rows = list(csv.DictReader(file))

texts = [
    row["resume_text"] + " [SEP] " + row["job_description"]
    for row in rows
]

labels = [int(row["label"]) for row in rows]
predictions = model.predict(texts)

print("Dataset evaluation")
print("Total examples:", len(rows))
print("Predicted labels:", {label: list(predictions).count(label) for label in [0, 1]})
print("\nClassification report:")
print(classification_report(
    labels,
    predictions,
    target_names=["Not Relevant", "Relevant"],
    zero_division=0
))
print("Confusion matrix:")
print(confusion_matrix(labels, predictions))