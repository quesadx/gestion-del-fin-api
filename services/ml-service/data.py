import pandas as pd

LEGACY_SKILL_COLUMNS = [
    "has_technical",
    "has_medical",
    "has_scout",
    "has_agricultural",
    "has_security",
]


def get_training_data() -> pd.DataFrame:
    data = [
        # (age, has_skill_match, best_profession_score, profession_match_coverage, health_score, decision)
        # Strong match → scores altos pero en escala coseno (0.0–1.0)
        (28, 1, 0.85, 0.40, 0.90, "ACCEPTED"),
        (35, 1, 0.90, 0.33, 0.95, "ACCEPTED"),
        (22, 1, 0.80, 0.33, 0.85, "ACCEPTED"),
        (40, 1, 0.78, 0.33, 0.80, "ACCEPTED"),
        (30, 1, 0.82, 0.33, 0.90, "ACCEPTED"),
        (25, 1, 0.75, 0.67, 0.85, "ACCEPTED"),
        (45, 1, 0.88, 0.33, 0.75, "ACCEPTED"),
        (19, 1, 0.83, 0.33, 0.95, "ACCEPTED"),
        (33, 1, 0.79, 0.67, 0.88, "ACCEPTED"),
        (27, 1, 0.91, 0.67, 0.92, "ACCEPTED"),
        (38, 1, 0.86, 0.67, 0.87, "ACCEPTED"),
        (24, 1, 0.77, 0.67, 0.83, "ACCEPTED"),
        (50, 1, 0.84, 0.33, 0.78, "ACCEPTED"),
        (29, 1, 0.80, 0.67, 0.91, "ACCEPTED"),
        (36, 1, 0.76, 0.33, 0.82, "ACCEPTED"),
        # Minors → ACCEPTED independiente de skills
        (15, 0, 0.00, 0.00, 0.50, "ACCEPTED"),
        (12, 0, 0.00, 0.00, 0.60, "ACCEPTED"),
        (10, 0, 0.00, 0.00, 0.70, "ACCEPTED"),
        (17, 1, 0.70, 0.33, 0.90, "ACCEPTED"),
        (16, 0, 0.00, 0.00, 0.75, "ACCEPTED"),
        # Sin skills + mala salud → REJECTED
        (30, 0, 0.10, 0.00, 0.30, "REJECTED"),
        (45, 0, 0.08, 0.00, 0.20, "REJECTED"),
        (28, 0, 0.12, 0.00, 0.40, "REJECTED"),
        (50, 0, 0.05, 0.00, 0.15, "REJECTED"),
        (36, 0, 0.09, 0.00, 0.25, "REJECTED"),
        (41, 0, 0.07, 0.00, 0.10, "REJECTED"),
        # Con skills pero muy enfermo → REJECTED
        (32, 1, 0.82, 0.33, 0.10, "REJECTED"),
        (40, 1, 0.88, 0.33, 0.05, "REJECTED"),
        (25, 1, 0.75, 0.33, 0.15, "REJECTED"),
        (38, 1, 0.79, 0.33, 0.12, "REJECTED"),
        (44, 1, 0.85, 0.67, 0.10, "REJECTED"),
        # Sin skills pero sano → REJECTED
        (35, 0, 0.11, 0.00, 0.85, "REJECTED"),
        (42, 0, 0.09, 0.00, 0.90, "REJECTED"),
        (29, 0, 0.13, 0.00, 0.80, "REJECTED"),
        (55, 0, 0.08, 0.00, 0.75, "REJECTED"),
        (48, 0, 0.10, 0.00, 0.88, "REJECTED"),
        # ── Zona gris — estos son los que bajan el confidence ──
        # Skills parciales + salud borderline
        (34, 1, 0.28, 0.33, 0.52, "REJECTED"),  # fever borderline
        (31, 1, 0.30, 0.33, 0.55, "ACCEPTED"),  # similar pero aceptado
        (27, 1, 0.26, 0.33, 0.48, "REJECTED"),
        (40, 1, 0.32, 0.33, 0.58, "ACCEPTED"),
        (38, 1, 0.29, 0.33, 0.50, "REJECTED"),
        (33, 1, 0.31, 0.33, 0.53, "ACCEPTED"),
        # Skills medias + salud media
        (45, 1, 0.45, 0.33, 0.60, "ACCEPTED"),
        (29, 1, 0.42, 0.33, 0.55, "REJECTED"),
        (52, 1, 0.48, 0.33, 0.65, "ACCEPTED"),
        (36, 1, 0.40, 0.33, 0.58, "REJECTED"),
    ]

    df = pd.DataFrame(
        data,
        columns=[
            "age",
            "has_skill_match",
            "best_profession_score",
            "profession_match_coverage",
            "health_score",
            "decision",
        ],
    )

    return df[
        [
            "age",
            "has_skill_match",
            "best_profession_score",
            "profession_match_coverage",
            "health_score",
            "decision",
        ]
    ]
