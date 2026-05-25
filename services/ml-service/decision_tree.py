import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.preprocessing import LabelEncoder
import pandas as pd
from data import get_training_data

FEATURE_NAMES = [
    "age",
    "has_technical",
    "has_medical",
    "has_scout",
    "has_agricultural",
    "has_security",
    "health_score",
]

SKILL_KEYWORDS = {
    "technical":    ["engineer", "mechanic", "electrician", "technical", "builder", "programmer"],
    "medical":      ["doctor", "nurse", "medic", "medical", "surgeon", "pharmacist"],
    "scout":        ["scout", "explorer", "tracker", "spy", "ranger"],
    "agricultural": ["farmer", "cook", "botanist", "agriculture", "gardener", "fisher"],
    "security":     ["soldier", "guard", "military", "security", "fighter", "police"],
}

DANGEROUS_HEALTH_KEYWORDS = [
    "infected", "terminal", "contagious", "plague",
    "rabies", "undead", "dying", "critical"
]


def extract_features(
    age: int | None,
    skills: str | None,
    health_notes: str | None,
    camp_weights: dict,
) -> list[float]:
    """Convert raw applicant data into numeric features for the tree."""

    # Age
    resolved_age = age if age is not None else 25

    # Skills → binary flags
    skills_lower = (skills or "").lower()
    skill_flags = {
        category: int(any(kw in skills_lower for kw in keywords))
        for category, keywords in SKILL_KEYWORDS.items()
    }

    # Apply camp weights to skill flags
    for category in skill_flags:
        weight_key = f"weight_{category}"
        if weight_key in camp_weights:
            skill_flags[category] *= camp_weights[weight_key]

    # Health score
    health_lower = (health_notes or "").lower()
    if any(kw in health_lower for kw in DANGEROUS_HEALTH_KEYWORDS):
        health_score = 0.1
    elif health_notes:
        health_score = 0.7  # Has notes but nothing dangerous
    else:
        health_score = 0.8  # No notes = assumed healthy

    # Apply strict health check from camp weights
    if camp_weights.get("strict_health_check") and health_score < 0.6:
        health_score *= 0.5

    return [
        resolved_age,
        skill_flags["technical"],
        skill_flags["medical"],
        skill_flags["scout"],
        skill_flags["agricultural"],
        skill_flags["security"],
        health_score,
    ]


def detect_profession_category(skills: str | None) -> str:
    """Detect the most relevant profession category from skills."""
    skills_lower = (skills or "").lower()
    for category, keywords in SKILL_KEYWORDS.items():
        if any(kw in skills_lower for kw in keywords):
            return category
    return "general"


class AdmissionDecisionTree:
    def __init__(self):
        self.classifier = DecisionTreeClassifier(
            max_depth=6,
            min_samples_split=2,
            random_state=42,
        )
        self.trained = False

    def train(self):
        df = get_training_data()
        X = df[FEATURE_NAMES].values
        y = df["decision"].values
        self.classifier.fit(X, y)
        self.trained = True
        print("✓ Decision tree trained successfully")
        print(export_text(self.classifier, feature_names=FEATURE_NAMES))

    def predict(
        self,
        age: int | None,
        skills: str | None,
        health_notes: str | None,
        camp_weights: dict,
    ) -> dict:
        if not self.trained:
            raise RuntimeError("Model not trained yet")

        # Minor → automatic acceptance
        if age is not None and age < 18:
            return {
                "decision": "ACCEPTED",
                "confidence": 1.0,
                "reasoning_path": ["Applicant is a minor — automatic protection policy applied"],
                "profession_category": detect_profession_category(skills) or "general",
            }

        features = extract_features(age, skills, health_notes, camp_weights)
        X = np.array([features])

        decision = self.classifier.predict(X)[0]
        confidence = float(self.classifier.predict_proba(X).max())
        reasoning_path = self._build_reasoning(features, decision, confidence)
        profession_category = detect_profession_category(skills)

        return {
            "decision": decision,
            "confidence": round(confidence, 2),
            "reasoning_path": reasoning_path,
            "profession_category": profession_category,
        }

    def _build_reasoning(
        self,
        features: list[float],
        decision: str,
        confidence: float,
    ) -> list[str]:
        """Build a human-readable reasoning path from the features evaluated."""
        age, has_technical, has_medical, has_scout, has_agricultural, has_security, health_score = features
        reasons = []

        # Age
        reasons.append(f"Age ({int(age)}) — {'meets' if age >= 18 else 'below'} adult threshold (18)")

        # Skills
        skill_map = {
            "Technical":    has_technical,
            "Medical":      has_medical,
            "Scout":        has_scout,
            "Agricultural": has_agricultural,
            "Security":     has_security,
        }
        detected = [name for name, val in skill_map.items() if val > 0]
        if detected:
            reasons.append(f"Skills detected: {', '.join(detected)} ✓")
        else:
            reasons.append("No critical survival skills detected ✗")

        # Health
        if health_score >= 0.7:
            reasons.append(f"Health status acceptable (score: {health_score:.2f}) ✓")
        else:
            reasons.append(f"Health status is a risk (score: {health_score:.2f}) ✗")

        # Final
        reasons.append(f"Decision: {decision} (confidence: {confidence * 100:.0f}%)")

        return reasons


# Singleton
admission_tree = AdmissionDecisionTree()