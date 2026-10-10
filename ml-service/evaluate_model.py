import csv
from pathlib import Path
from collections import Counter

from sklearn.model_selection import GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "training_data.csv"

texts = []
labels = []
groups = []

with open(DATA_FILE, "r", encoding="utf-8", newline="") as file:
    reader = csv.DictReader(file)

    for row in reader:
        resume = row["resume_text"].strip()
        job = row["job_description"].strip()

        if not resume or not job:
            continue

        texts.append(resume + " [SEP] " + job)
        labels.append(int(row["label"]))
        groups.append(resume)

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

print("Training examples:", len(X_train))
print("Testing examples:", len(X_test))
print("Training labels:", Counter(y_train))
print("Testing labels:", Counter(y_test))

if len(set(y_train)) < 2 or len(set(y_test)) < 2:
    raise ValueError("Both classes must appear in training and testing data.")

baseline = DummyClassifier(strategy="most_frequent")
baseline.fit(X_train, y_train)
baseline_predictions = baseline.predict(X_test)

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000,
            random_state=42
        )
    )
])

model.fit(X_train, y_train)
predictions = model.predict(X_test)

print("\nBASELINE RESULTS")
print("Accuracy:", round(accuracy_score(y_test, baseline_predictions), 3))
print(confusion_matrix(y_test, baseline_predictions))

print("\nLOGISTIC REGRESSION RESULTS")
print("Accuracy:", round(accuracy_score(y_test, predictions), 3))
print(confusion_matrix(y_test, predictions))
print(classification_report(y_test, predictions, zero_division=0))