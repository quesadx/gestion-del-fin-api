import pandas as pd

def get_training_data() -> pd.DataFrame:
    """
    Synthetic training data representing survivor profiles
    and their admission outcomes in a post-apocalyptic camp.
    """
    data = [
        # (age, has_technical, has_medical, has_scout, has_agricultural, has_security, health_score, decision, profession_category)

        # ── Strong skills + good health → ACCEPTED ──────────────────────
        (28, 1, 0, 0, 0, 0, 0.90, "ACCEPTED", "technical"),
        (35, 0, 1, 0, 0, 0, 0.95, "ACCEPTED", "medical"),
        (22, 0, 0, 1, 0, 0, 0.85, "ACCEPTED", "scout"),
        (40, 0, 0, 0, 1, 0, 0.80, "ACCEPTED", "agricultural"),
        (30, 0, 0, 0, 0, 1, 0.90, "ACCEPTED", "security"),
        (25, 1, 0, 0, 0, 1, 0.85, "ACCEPTED", "technical"),
        (45, 0, 1, 0, 0, 0, 0.75, "ACCEPTED", "medical"),
        (19, 1, 0, 0, 0, 0, 0.95, "ACCEPTED", "technical"),
        (33, 0, 0, 0, 1, 1, 0.88, "ACCEPTED", "security"),
        (27, 0, 1, 0, 1, 0, 0.92, "ACCEPTED", "medical"),
        (38, 1, 1, 0, 0, 0, 0.87, "ACCEPTED", "technical"),
        (24, 0, 0, 1, 0, 1, 0.83, "ACCEPTED", "scout"),
        (50, 0, 1, 0, 0, 0, 0.78, "ACCEPTED", "medical"),
        (29, 1, 0, 0, 1, 0, 0.91, "ACCEPTED", "technical"),
        (36, 0, 0, 0, 1, 0, 0.82, "ACCEPTED", "agricultural"),
        (42, 0, 0, 1, 0, 1, 0.86, "ACCEPTED", "security"),
        (31, 1, 0, 1, 0, 0, 0.89, "ACCEPTED", "technical"),
        (55, 0, 1, 0, 0, 0, 0.72, "ACCEPTED", "medical"),
        (26, 0, 0, 0, 1, 1, 0.93, "ACCEPTED", "security"),
        (34, 1, 0, 0, 0, 0, 0.84, "ACCEPTED", "technical"),
        (48, 0, 0, 0, 1, 0, 0.77, "ACCEPTED", "agricultural"),
        (23, 0, 1, 0, 0, 0, 0.96, "ACCEPTED", "medical"),
        (37, 0, 0, 1, 0, 0, 0.81, "ACCEPTED", "scout"),
        (44, 1, 0, 0, 0, 1, 0.88, "ACCEPTED", "technical"),
        (21, 0, 0, 0, 0, 1, 0.90, "ACCEPTED", "security"),
        (39, 0, 1, 0, 1, 0, 0.85, "ACCEPTED", "medical"),
        (52, 1, 0, 0, 0, 0, 0.73, "ACCEPTED", "technical"),
        (18, 0, 0, 1, 0, 0, 0.87, "ACCEPTED", "scout"),
        (43, 0, 0, 0, 1, 1, 0.91, "ACCEPTED", "agricultural"),
        (32, 1, 1, 0, 0, 0, 0.94, "ACCEPTED", "medical"),

        # ── Minors → always ACCEPTED ─────────────────────────────────────
        (15, 0, 0, 0, 0, 0, 0.50, "ACCEPTED", "general"),
        (12, 0, 0, 0, 0, 0, 0.60, "ACCEPTED", "general"),
        (10, 0, 0, 0, 0, 0, 0.70, "ACCEPTED", "general"),
        (17, 1, 0, 0, 0, 0, 0.90, "ACCEPTED", "technical"),
        (16, 0, 0, 0, 1, 0, 0.75, "ACCEPTED", "agricultural"),
        (14, 0, 0, 1, 0, 0, 0.65, "ACCEPTED", "scout"),
        (13, 0, 1, 0, 0, 0, 0.80, "ACCEPTED", "medical"),
        (11, 0, 0, 0, 0, 0, 0.55, "ACCEPTED", "general"),
        (9,  0, 0, 0, 0, 0, 0.60, "ACCEPTED", "general"),
        (8,  0, 0, 0, 0, 0, 0.70, "ACCEPTED", "general"),

        # ── No skills + unhealthy → REJECTED ─────────────────────────────
        (30, 0, 0, 0, 0, 0, 0.30, "REJECTED", "general"),
        (45, 0, 0, 0, 0, 0, 0.20, "REJECTED", "general"),
        (28, 0, 0, 0, 0, 0, 0.40, "REJECTED", "general"),
        (50, 0, 0, 0, 0, 0, 0.15, "REJECTED", "general"),
        (36, 0, 0, 0, 0, 0, 0.25, "REJECTED", "general"),
        (41, 0, 0, 0, 0, 0, 0.10, "REJECTED", "general"),
        (33, 0, 0, 0, 0, 0, 0.35, "REJECTED", "general"),
        (58, 0, 0, 0, 0, 0, 0.20, "REJECTED", "general"),
        (47, 0, 0, 0, 0, 0, 0.30, "REJECTED", "general"),
        (62, 0, 0, 0, 0, 0, 0.15, "REJECTED", "general"),
        (25, 0, 0, 0, 0, 0, 0.45, "REJECTED", "general"),
        (53, 0, 0, 0, 0, 0, 0.22, "REJECTED", "general"),

        # ── Has skills but very unhealthy → REJECTED ─────────────────────
        (32, 1, 0, 0, 0, 0, 0.10, "REJECTED", "technical"),
        (40, 0, 1, 0, 0, 0, 0.05, "REJECTED", "medical"),
        (25, 0, 0, 1, 0, 0, 0.15, "REJECTED", "scout"),
        (38, 0, 0, 0, 1, 0, 0.12, "REJECTED", "agricultural"),
        (29, 0, 0, 0, 0, 1, 0.08, "REJECTED", "security"),
        (44, 1, 1, 0, 0, 0, 0.10, "REJECTED", "technical"),
        (35, 0, 1, 0, 1, 0, 0.07, "REJECTED", "medical"),
        (27, 1, 0, 0, 0, 1, 0.09, "REJECTED", "technical"),
        (51, 0, 0, 1, 0, 0, 0.11, "REJECTED", "scout"),
        (46, 0, 0, 0, 1, 1, 0.06, "REJECTED", "agricultural"),

        # ── No skills but healthy → REJECTED ─────────────────────────────
        (35, 0, 0, 0, 0, 0, 0.85, "REJECTED", "general"),
        (42, 0, 0, 0, 0, 0, 0.90, "REJECTED", "general"),
        (29, 0, 0, 0, 0, 0, 0.80, "REJECTED", "general"),
        (55, 0, 0, 0, 0, 0, 0.75, "REJECTED", "general"),
        (48, 0, 0, 0, 0, 0, 0.88, "REJECTED", "general"),
        (37, 0, 0, 0, 0, 0, 0.92, "REJECTED", "general"),
        (26, 0, 0, 0, 0, 0, 0.78, "REJECTED", "general"),
        (60, 0, 0, 0, 0, 0, 0.70, "REJECTED", "general"),
        (31, 0, 0, 0, 0, 0, 0.83, "REJECTED", "general"),
        (43, 0, 0, 0, 0, 0, 0.76, "REJECTED", "general"),
        (57, 0, 0, 0, 0, 0, 0.82, "REJECTED", "general"),
        (24, 0, 0, 0, 0, 0, 0.87, "REJECTED", "general"),

        # ── Edge cases ───────────────────────────────────────────────────
        (18, 1, 0, 0, 0, 0, 0.50, "ACCEPTED", "technical"),
        (60, 0, 1, 0, 0, 0, 0.60, "ACCEPTED", "medical"),
        (22, 0, 0, 0, 0, 0, 0.45, "REJECTED", "general"),
        (31, 1, 0, 0, 0, 0, 0.35, "REJECTED", "technical"),
        (65, 0, 0, 0, 1, 0, 0.65, "ACCEPTED", "agricultural"),
        (70, 0, 1, 0, 0, 0, 0.60, "ACCEPTED", "medical"),
        (20, 0, 0, 0, 0, 0, 0.50, "REJECTED", "general"),
        (58, 1, 0, 0, 0, 0, 0.55, "ACCEPTED", "technical"),
        (19, 0, 0, 0, 0, 1, 0.88, "ACCEPTED", "security"),
        (66, 0, 0, 0, 0, 0, 0.40, "REJECTED", "general"),
    ]

    return pd.DataFrame(data, columns=[
        "age",
        "has_technical",
        "has_medical",
        "has_scout",
        "has_agricultural",
        "has_security",
        "health_score",
        "decision",
        "profession_category",
    ])