import csv
import pickle
from pathlib import Path

from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.metrics import confusion_matrix

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "training_data_cleaned.csv"
MODEL_FILE = BASE_DIR / "trained_model_improved.pkl"

with open(DATA_FILE, "r", encoding="utf-8", newline="") as file:
    rows = list(csv.DictReader(file))

texts = [
    row["resume_text"] + " [SEP] " + row["job_description"]
    for row in rows
]
labels = [int(row["label"]) for row in rows]
groups = [row["resume_text"] for row in rows]

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.25,
    random_state=42
)

train_idx, test_idx = next(
    splitter.split(texts, labels, groups)
)

X_train = [texts[i] for i in train_idx]
X_test = [texts[i] for i in test_idx]
y_train = [labels[i] for i in train_idx]
y_test = [labels[i] for i in test_idx]

model = Pipeline([
    ("features", FeatureUnion([
        ("word", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=20000,
            sublinear_tf=True
        )),
        ("char", TfidfVectorizer(
            analyzer="char",
            ngram_range=(3, 5),
            max_features=30000,
            sublinear_tf=True
        ))
    ])),
    ("classifier", LogisticRegression(
        max_iter=1000,
        random_state=42
    ))
])

model.fit(X_train, y_train)
predictions = model.predict(X_test)

print("Total records:", len(rows))
print("Training records:", len(train_idx))
print("Testing records:", len(test_idx))
print("Unique resumes in training:", len(set(groups[i] for i in train_idx)))
print("Unique resumes in testing:", len(set(groups[i] for i in test_idx)))
print("Accuracy:", round(accuracy_score(y_test, predictions), 4))
print("\nClassification report:")
print(classification_report(
    y_test,
    predictions,
    labels=[0, 1],
    target_names=["Not Relevant", "Relevant"],
    zero_division=0
))
print("Confusion matrix:")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

with open(MODEL_FILE, "wb") as file:
    pickle.dump(model, file)

print("\nModel saved to:", MODEL_FILE)
print("Existing trained_model.pkl remains unchanged.")