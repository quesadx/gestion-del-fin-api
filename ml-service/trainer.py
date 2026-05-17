from decision_tree import admission_tree
from data import get_training_data
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


def train_and_evaluate():
    """Train the model and print evaluation metrics."""
    df = get_training_data()

    X = df[["age", "has_technical", "has_medical", "has_scout",
            "has_agricultural", "has_security", "health_score"]].values
    y = df["decision"].values

    # Split data for evaluation
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train
    admission_tree.classifier.fit(X_train, y_train)
    admission_tree.trained = True

    # Evaluate
    y_pred = admission_tree.classifier.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print("=" * 50)
    print(f"Accuracy: {accuracy * 100:.1f}%")
    print("=" * 50)
    print(classification_report(y_test, y_pred))


if __name__ == "__main__":
    train_and_evaluate()