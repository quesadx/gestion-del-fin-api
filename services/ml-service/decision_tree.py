import logging
import re
import unicodedata
from typing import cast

import numpy as np
import pandas as pd
from data import get_training_data
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.tree import DecisionTreeClassifier, export_text

FEATURE_NAMES = [
    "age",
    "has_skill_match",
    "best_profession_score",
    "profession_match_coverage",
    "health_score",
]

logger = logging.getLogger("admission_ml_service.decision_tree")

HEALTH_RISK_REFERENCES = [
    # Infectious Diseases and Symptoms
    "severe laceration, bleeding heavily, signs of shock",
    "persistent cough, coughing up blood, labored breathing",
    "unexplained rash, swollen lymph nodes, extreme fatigue",
    "gangrene setting in, foul odor, blackened necrotic tissue",
    "pale skin, unnatural dark veins, craving raw meat, unresponsive",
    "infected scratch, red streaks radiating from wound, hot to touch",
    "parasitic infection, severe cramps, rapid dangerous weight loss",
    "rabies symptoms, hydrophobia, excessive salivation, confusion",
    "radiation sickness, hair falling out, bleeding gums, nausea",
    "tetanus symptoms, lockjaw, severe uncontrollable muscle spasms",
    "zombie bite on torso, spreading black veins, sweating profusely",
    "unexplained bruising, bleeding gums, suspected hemorrhagic fever",
    "respiratory distress, wheezing, cyanosis in lips and nails",
    # Physical Trauma and Injuries
    "untreated stump, severe phantom pain, high infection risk",
    "third-degree burns, blistered skin, extreme risk of sepsis",
    "exposed bone, compound fracture, immobile and in agony",
    "frostbite, necrotic extremities, complete loss of sensation",
    "vomiting blood, severe abdominal pain, internal bleeding suspected",
    "untreated head trauma, concussed, unequal pupil size",
    "deep puncture wound, rusted metal, high fever developing",
    "deep animal bite, crushing damage to muscle, high rabies risk",
    "infected blisters, weeping pus, inability to wear footwear",
    # Mental and Neurological Deterioration
    "hallucinations, paranoia, erratic and violent movements",
    "severe dehydration, sunken eyes, unresponsive to stimuli",
    "chronic wasting, skeletal appearance, too weak to stand",
    "severe allergic reaction, swelling airways, struggling to breathe",
    "muttering incoherently, catatonic state, staring blankly",
    "infested with maggots, open festering sores, severe neglect",
    "suspected poisoning, blue lips, convulsions, pinpoint pupils",
    "severe malnutrition, hair loss, weakened immune response",
]

HEALTH_SAFE_REFERENCES = [
    # General health indicators
    "well-rested, hydrated, normal heart rate and temperature",
    "well-nourished, strong immune system, high energy levels",
    "strong cardiovascular health, excellent stamina, normal blood pressure",
    "regular appetite, digesting rations normally, good hydration",
    "negative blood test, normal white blood cell count, robust",
    "excellent dental hygiene, no signs of scurvy or vitamin deficiency",
    "clean clothing, good personal hygiene, no lice or fleas",
    # Inmunity and Vaccinations
    "fully vaccinated, immune to local strains, clear skin",
    "cleared by medical officer, negative for all known pathogens",
    "recent tetanus booster, up to date on all survival inoculations",
    "cleared from quarantine, negative swabs, zero contagion risk",
    "mild seasonal allergies, managed with antihistamines, clear airways",
    # Minor Injuries and Adaptation to Environment
    "minor bruising, fading scars, excellent mobility",
    "superficial burns, properly bandaged, healing without infection",
    "minor sprain, heavily taped, fully weight-bearing and stable",
    "minor sunburn, aloe treated, peeling but completely painless",
    "superficial frostnip, skin pink and warm, no tissue damage",
    "minor insect bites, treated with ointment, no swelling or itching",
    "shallow razor nicks, stopped bleeding, healing normally",
    "minor paper cuts and scrapes, cleaned and ignored, no risk",
    # Physical and Mental Resilience
    "slight fatigue, easily resolved with rest, mentally sharp",
    "calloused hands, minor blisters, accustomed to harsh conditions",
    "stable prosthetics, well-maintained, no discomfort or chafing",
    "steady hands, sharp reflexes, high situational awareness",
    "properly dressed for weather, core temperature perfectly normal",
    "psychological evaluation passed, resilient, calm under pressure",
    "mild muscle soreness from travel, stretching it out, no injury",
    "minor altitude sickness, acclimatizing well, oxygen levels normal",
    "recent mild cold, fully recovered, no lingering symptoms",
    "mild headache, dissipating, fully capable of physical exertion",
]

STOPWORDS = {
    "and",
    "or",
    "the",
    "a",
    "an",
    "for",
    "with",
    "from",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "general",
    "labor",
    "worker",
    "works",
    "work",
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(
        char for char in normalized if not unicodedata.combining(char)
    )
    return without_accents.lower()


def tokenize_text(value: str | None) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", normalize_text(value))
    return {token for token in tokens if len(token) > 2 and token not in STOPWORDS}


class HealthEmbeddingScorer:
    def __init__(self, model: SentenceTransformer):
        self._model = model
        self._risk_embeddings = model.encode(HEALTH_RISK_REFERENCES)
        self._safe_embeddings = model.encode(HEALTH_SAFE_REFERENCES)

    def score(self, health_notes: str | None) -> float:
        if not health_notes:
            return 0.8
        notes_emb = self._model.encode(health_notes)
        risk_sim = float(cosine_similarity([notes_emb], self._risk_embeddings).max())
        safe_sim = float(cosine_similarity([notes_emb], self._safe_embeddings).max())

        if risk_sim > safe_sim:
            raw = (safe_sim - risk_sim) * 2.0
        else:
            raw = (safe_sim - risk_sim) * 1.2

        return float(np.clip((raw + 1) / 2, 0.05, 0.95))


class ProfessionEmbeddingCache:
    def __init__(self):
        self._model = SentenceTransformer("all-MiniLM-L6-v2")
        self._cache: dict[int, np.ndarray] = {}
        self._model.encode("warmup")
        self.health_scorer = HealthEmbeddingScorer(self._model)

    def score(self, skills: str, profession: dict) -> float:
        profession_id: int | None = profession.get("id")
        text = f"{profession.get('name', '')}. {profession.get('description', '')}"

        if profession_id is not None and profession_id in self._cache:
            profession_emb = self._cache[profession_id]
            skills_emb = self._model.encode(skills)
        else:
            embeddings = self._model.encode([skills, text])
            skills_emb = embeddings[0]
            profession_emb = embeddings[1]
            if profession_id is not None:
                self._cache[profession_id] = profession_emb

        return float(cosine_similarity([skills_emb], [profession_emb])[0][0])

    def invalidate(self, profession_id: int) -> None:
        self._cache.pop(profession_id, None)


profession_cache = ProfessionEmbeddingCache()


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
    health_score = profession_cache.health_scorer.score(health_notes)
    if camp_weights.get("strict_health_check"):
        health_score *= 0.7

    scored_professions = get_profession_scores(skills, professions)
    best_profession_score = (
        scored_professions[0]["score"] if scored_professions else 0.0
    )
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
    if not skills:
        return 0.0
    return profession_cache.score(skills, profession)


def select_profession(skills: str | None, professions: list[dict]) -> dict | None:
    if not professions:
        return None

    scored_professions = get_profession_scores(skills, professions)
    if not scored_professions:
        return professions[0]

    best_name = scored_professions[0]["name"]
    return next(
        (
            profession
            for profession in professions
            if str(profession.get("name") or "") == best_name
        ),
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

    def train(self, n_professions: int = 4) -> None:
        df = get_training_data(n_professions)
        X = df[FEATURE_NAMES].values
        y = df["decision"].values
        self.classifier.fit(X, y)
        self.trained = True
        self._trained_with_n_professions = n_professions
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

        n = len(professions)
        if not self.trained or getattr(self, "_trained_with_n_professions", None) != n:
            logger.info("Retraining decision tree for n_professions=%d", n)
            self.train(n_professions=n)

        selected_profession = select_profession(skills, professions)
        profession_label = (
            selected_profession["name"] if selected_profession else "general"
        )

        # Minor → automatic acceptance
        if age is not None and age < 18:
            return {
                "decision": "ACCEPTED",
                "confidence": 1.0,
                "reasoning_path": [
                    "Applicant is a minor — automatic protection policy applied"
                ],
                "profession_category": profession_label,
            }

        features = extract_features(
            age, skills, health_notes, camp_weights, professions
        )
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
        proba = cast(np.ndarray, self.classifier.predict_proba(X))
        confidence = float(proba.max())
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
        (
            age,
            has_skill_match,
            best_profession_score,
            profession_match_coverage,
            health_score,
        ) = features
        reasons = []

        # Age
        reasons.append(
            f"Age ({int(age)}) — {'meets' if age >= 18 else 'below'} adult threshold (18)"
        )

        # Skills
        if has_skill_match >= 1:
            reasons.append(
                "Skills match active camp professions "
                f"(best score: {best_profession_score:.2f}, coverage: {profession_match_coverage:.2f}) ✓"
            )
        else:
            reasons.append(
                "No relevant match against current camp profession catalog ✗"
            )

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
