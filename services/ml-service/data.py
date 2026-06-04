import random

import pandas as pd


def get_training_data(n_professions: int = 4) -> pd.DataFrame:
    random.seed(42)
    data = []

    for _ in range(1000):
        age = random.choices(
            population=range(10, 66),
            weights=[2 if x < 18 else 1 for x in range(10, 66)],
            k=1,
        )[0]

        if age < 18:
            has_skill_match = random.choice([0, 1])
        else:
            has_skill_match = random.choices([0, 1], weights=[0.25, 0.75])[0]

        if has_skill_match == 0:
            profession_match_coverage = 0.00
        else:
            matched = random.randint(1, n_professions)
            profession_match_coverage = round(matched / n_professions, 3)

        if has_skill_match == 0:
            best_profession_score = round(random.uniform(0.00, 0.15), 2)
        else:
            tier = random.choices(
                ["low", "medium", "high", "gray"], weights=[0.1, 0.25, 0.45, 0.2]
            )[0]
            if tier == "low":
                best_profession_score = round(random.uniform(0.20, 0.35), 2)
            elif tier == "medium":
                best_profession_score = round(random.uniform(0.40, 0.60), 2)
            elif tier == "high":
                best_profession_score = round(random.uniform(0.75, 0.95), 2)
            else:
                best_profession_score = round(random.uniform(0.25, 0.55), 2)

        if age < 18:
            health_score = round(random.uniform(0.40, 0.99), 2)
        else:
            health_score = round(random.uniform(0.05, 0.99), 2)

        if age < 18:
            decision = "ACCEPTED"
        else:
            if has_skill_match == 0:
                decision = "REJECTED"
            elif health_score < 0.40:
                decision = "REJECTED"
            else:
                S = best_profession_score + health_score + profession_match_coverage
                if age > 55:
                    S -= 0.10
                elif age > 45:
                    S -= 0.05

                if S > 1.85:
                    decision = "ACCEPTED"
                elif S < 1.05:
                    decision = "REJECTED"
                else:
                    S_noisy = S + random.uniform(-0.15, 0.15)
                    decision = "ACCEPTED" if S_noisy > 1.25 else "REJECTED"

        data.append(
            (
                age,
                has_skill_match,
                best_profession_score,
                profession_match_coverage,
                health_score,
                decision,
            )
        )

    return pd.DataFrame(
        data,
        columns=[  # type: ignore[call-overload]
            "age",
            "has_skill_match",
            "best_profession_score",
            "profession_match_coverage",
            "health_score",
            "decision",
        ],
    )
