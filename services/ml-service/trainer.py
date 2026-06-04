from data import get_training_data
from decision_tree import admission_tree
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


def train_and_evaluate(n_professions: int = 4) -> None:
    df = get_training_data(n_professions)
    X = df[
        [
            "age",
            "has_skill_match",
            "best_profession_score",
            "profession_match_coverage",
            "health_score",
        ]
    ].values
    y = df["decision"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    admission_tree.classifier.fit(X_train, y_train)
    admission_tree.trained = True

    y_pred = admission_tree.classifier.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print("=" * 50)
    print(f"Accuracy: {accuracy * 100:.1f}%")
    print("=" * 50)
    print(classification_report(y_test, y_pred))


if __name__ == "__main__":
    train_and_evaluate()
