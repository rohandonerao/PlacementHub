import csv
import pickle
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "training_data_cleaned.csv"
MODEL_FILE = BASE_DIR / "trained_model.pkl"

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

model = Pipeline([
    (
        "features",
        FeatureUnion([
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    max_features=20000
                )
            ),
            (
                "character",
                TfidfVectorizer(
                    analyzer="char",
                    ngram_range=(3, 5),
                    sublinear_tf=True,
                    max_features=30000
                )
            )
        ])
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

print("Training examples:", len(X_train))
print("Testing examples:", len(X_test))
print("Test accuracy:", round(accuracy_score(y_test, predictions), 3))
print(classification_report(y_test, predictions, zero_division=0))

with open(MODEL_FILE, "wb") as file:
    pickle.dump(model, file)

print("Improved model saved to:", MODEL_FILE)