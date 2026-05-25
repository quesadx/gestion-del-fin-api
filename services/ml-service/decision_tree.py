import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
import pandas as pd
import re
import unicodedata
import logging
from data import get_training_data

FEATURE_NAMES = [
    "age",
    "has_skill_match",
    "best_profession_score",
    "profession_match_coverage",
    "health_score",
]

logger = logging.getLogger("admission_ml_service.decision_tree")

DANGEROUS_HEALTH_KEYWORDS = [
    "infected", "terminal", "contagious", "plague",
    "rabies", "undead", "dying", "critical"
]

STOPWORDS = {
    "and", "or", "the", "a", "an", "for", "with", "from", "to", "of",
    "in", "on", "at", "by", "general", "labor", "worker", "works", "work",
}

CANONICAL_TOKEN_MAP = {
    "doctor": "medical",
    "doctora": "medical",
    "medic": "medical",
    "medico": "medical",
    "medica": "medical",
    "medical": "medical",
    "medicina": "medical",
    "medicine": "medical",
    "clinical": "medical",
    "clinico": "medical",
    "clinica": "medical",
    "surgeon": "medical",
    "surgical": "medical",
    "surgery": "medical",
    "cirujano": "medical",
    "cirujana": "medical",
    "cirugia": "medical",
    "cirugias": "medical",
    "medicinas": "medical",
    "enfermos": "medical",
    "heridos": "medical",
    "health": "health",
    "salud": "health",
    "hygiene": "hygiene",
    "higiene": "hygiene",
    "survival": "survival",
    "supervivencia": "survival",
    "wilderness": "survival",
    "explorer": "scout",
    "explorador": "scout",
    "exploradora": "scout",
    "navigation": "navigation",
    "navegacion": "navigation",
    "tracker": "tracking",
    "rastreador": "tracking",
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return without_accents.lower()


def tokenize_text(value: str | None) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", normalize_text(value))
    canonical_tokens = {
        CANONICAL_TOKEN_MAP.get(token, token)
        for token in tokens
        if len(token) > 2 and token not in STOPWORDS
    }
    return canonical_tokens


def get_profession_scores(skills: str | None, professions: list[dict]) -> list[dict]:
    score_rows = []
    for profession in professions:
        score_rows.append(
            {
                "id": profession.get("id"),
                "name": str(profession.get("name") or ""),
                "score": round(score_profession_match(skills, profession), 3),
            }
        )
    return sorted(score_rows, key=lambda row: row["score"], reverse=True)


def extract_features(
    age: int | None,
    skills: str | None,
    health_notes: str | None,
    camp_weights: dict,
    professions: list[dict],
) -> list[float]:
    """Convert raw applicant data into numeric features for the tree."""

    # Age
    resolved_age = age if age is not None else 25

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

    scored_professions = get_profession_scores(skills, professions)
    best_profession_score = scored_professions[0]["score"] if scored_professions else 0.0
    matched_professions = sum(1 for row in scored_professions if row["score"] >= 0.25)
    profession_match_coverage = (
        matched_professions / len(professions) if professions else 0.0
    )

    has_skill_match = int(best_profession_score >= 0.25)

    return [
        resolved_age,
        has_skill_match,
        round(best_profession_score, 2),
        round(profession_match_coverage, 3),
        health_score,
    ]


def score_profession_match(skills: str | None, profession: dict) -> float:
    skill_tokens = tokenize_text(skills)
    profession_name = str(profession.get("name") or "")
    profession_description = str(profession.get("description") or "")
    profession_tokens = tokenize_text(f"{profession_name} {profession_description}")

    if not skill_tokens or not profession_tokens:
        return 0.0

    exact_overlap = len(skill_tokens & profession_tokens) * 2.0

    fuzzy_overlap = 0.0
    for skill_token in skill_tokens:
        for profession_token in profession_tokens:
            if skill_token == profession_token:
                continue
            if skill_token in profession_token or profession_token in skill_token:
                fuzzy_overlap += 0.5
            elif skill_token[:4] == profession_token[:4]:
                fuzzy_overlap += 0.25

    if normalize_text(profession_name) and normalize_text(profession_name) in normalize_text(skills):
        exact_overlap += 2.0

    return exact_overlap + fuzzy_overlap


def select_profession(skills: str | None, professions: list[dict]) -> dict | None:
    if not professions:
        return None

    scored_professions = get_profession_scores(skills, professions)
    if not scored_professions:
        return professions[0]

    best_name = scored_professions[0]["name"]
    return next(
        (profession for profession in professions if str(profession.get("name") or "") == best_name),
        professions[0],
    )


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
        professions: list[dict],
    ) -> dict:
        if not self.trained:
            raise RuntimeError("Model not trained yet")

        selected_profession = select_profession(skills, professions)
        profession_label = selected_profession["name"] if selected_profession else "general"

        # Minor → automatic acceptance
        if age is not None and age < 18:
            return {
                "decision": "ACCEPTED",
                "confidence": 1.0,
                "reasoning_path": ["Applicant is a minor — automatic protection policy applied"],
                "profession_category": profession_label,
            }

        features = extract_features(age, skills, health_notes, camp_weights, professions)
        X = np.array([features])

        scored_professions = get_profession_scores(skills, professions)
        skill_tokens = sorted(tokenize_text(skills))
        logger.info(
            "decision_tree_parsing_audit | skills_tokens=%s | top_professions=%s | features=%s",
            skill_tokens,
            scored_professions[:5],
            [round(float(value), 3) for value in features],
        )

        decision = self.classifier.predict(X)[0]
        confidence = float(self.classifier.predict_proba(X).max())
        reasoning_path = self._build_reasoning(features, decision, confidence)

        return {
            "decision": decision,
            "confidence": round(confidence, 2),
            "reasoning_path": reasoning_path,
            "profession_category": profession_label,
        }

    def _build_reasoning(
        self,
        features: list[float],
        decision: str,
        confidence: float,
    ) -> list[str]:
        """Build a human-readable reasoning path from the features evaluated."""
        age, has_skill_match, best_profession_score, profession_match_coverage, health_score = features
        reasons = []

        # Age
        reasons.append(f"Age ({int(age)}) — {'meets' if age >= 18 else 'below'} adult threshold (18)")

        # Skills
        if has_skill_match >= 1:
            reasons.append(
                "Skills match active camp professions "
                f"(best score: {best_profession_score:.2f}, coverage: {profession_match_coverage:.2f}) ✓"
            )
        else:
            reasons.append("No relevant match against current camp profession catalog ✗")

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