# ML Service — Admission Decision Engine

FastAPI microservice that evaluates refugee admission decisions using a decision tree classifier trained on synthetic data with semantic embeddings.

## Layout

- `main.py` — FastAPI app with `/health` and `/evaluate` endpoints
- `decision_tree.py` — feature extraction, embedding cache, tree training and inference
- `trainer.py` — standalone training/evaluation script with train/test split
- `data.py` — synthetic training dataset generator (1000 samples)
- `requirements.txt` — Python dependencies
- `Dockerfile` — container image for the service

## Architecture

```
Request (age, skills, health_notes, professions)
  │
  ├─ batch_score_professions() ────────────────────┐
  │    ├─ SentenceTransformer(all-MiniLM-L6-v2)    │
  │    ├─ skills embedding cached per unique string │
  │    └─ profession descriptions batch-encoded     │
  │                                                 │
  ├─ HealthEmbeddingScorer.score() ─────────────────┤
  │    ├─ encode health_notes                       │
  │    └─ cosine similarity vs risk/safe references  │
  │                                                 │
  ├─ extract_features()  ───────────────────────────┤
  │    age, has_skill_match, best_profession_score, │
  │    profession_match_coverage, health_score       │
  │                                                 │
  ├─ DecisionTreeClassifier.predict_proba() ────────┘
  │
  └─ Response: decision, confidence, reasoning_path
```

## Embedding System

### Profession Matching (`ProfessionEmbeddingCache`)

Uses SentenceTransformer (`all-MiniLM-L6-v2`) to compute cosine similarity between applicant skills and profession descriptions.

- **Skills embedding** is cached per unique skills string (`_skills_cache`) — avoids re-encoding the same skills text across multiple profession comparisons.
- **Profession embeddings** are cached by profession ID (`_profession_cache`) — persist across requests so the first request warms the cache and subsequent ones skip encoding entirely.
- **Batch encoding**: uncached professions are encoded in a single `model.encode(texts)` call instead of one-by-one.

### Health Scoring (`HealthEmbeddingScorer`)

Encodes health notes and compares via cosine similarity against two curated reference sets:

- `HEALTH_RISK_REFERENCES` (37 entries) — infection symptoms, trauma, neurological deterioration
- `HEALTH_SAFE_REFERENCES` (36 entries) — good health, minor issues, travel fatigue

The final score is `clip((safe_sim - risk_sim + 1) / 2, 0.1, 0.95)`. Risk is penalized only when `risk_sim > safe_sim + 0.15` to prevent false rejections from minor symptoms.

### Performance

Per-request SentenceTransformer encodes (before → after):

| Scenario | Before | After |
|----------|--------|-------|
| All professions cached, skills seen | ~9 | **1** (health only) |
| Skills new, professions cached | ~9 | **2** (health + skills) |
| Everything new (first request) | ~17 | **3** (health + skills + batch) |

## Feature Engineering

Five numeric features fed to the decision tree:

| Feature | Description | Source |
|---------|-------------|--------|
| `age` | Applicant age (default 25 if null) | Raw input |
| `has_skill_match` | Binary: best profession score >= 0.25 | Tier quantization |
| `best_profession_score` | Quantized to tiers: 0.0 / 0.35 / 0.60 / 0.80 / 0.90 | Profession similarity |
| `profession_match_coverage` | Fraction of professions scoring >= 0.25 (capped at 5) | Profession similarity |
| `health_score` | Semantic health assessment (0.1–0.95) | Health embedding |

### Profession Score Tier Quantization

Raw cosine similarity scores (0–1) are quantized to discrete tiers:

| Raw Score | Tier | Feature Value |
|-----------|------|---------------|
| >= 0.65 | Very High | 0.90 |
| >= 0.50 | High | 0.80 |
| >= 0.35 | Medium | 0.60 |
| >= 0.25 | Low | 0.35 |
| < 0.25 | None | 0.00 |

This makes the model robust across different profession catalog sizes — a score of 0.55 means "high match" regardless of whether there are 3 or 20 professions.

## Confidence Calibration

The training dataset is generated synthetically with **8% label noise** (random flips on adults). This prevents the decision tree from creating perfectly pure leaves, so `predict_proba` returns meaningful probabilities (e.g. 0.87, 0.92) instead of always 1.00.

Minor applicants (< 18) bypass the tree entirely and return confidence 1.0 with a hardcoded ACCEPTED decision (automatic protection policy).

### Tree Constraints

- `max_depth=4` — shallow tree, prevents overfitting
- `min_samples_split=15` — requires sufficient samples to split
- `min_samples_leaf=8` — each leaf must represent at least 8 samples

This combination with the synthetic noise produces leaves with mixed classes, giving calibrated probability estimates.

## Synthetic Training Data (`data.py`)

Generates 1000 samples with the following decision logic:

1. **Minors (< 18)** → always ACCEPTED
2. **Adults with no skill match** → REJECTED
3. **Adults with health_score < 0.40** → REJECTED
4. **Adults with composite score** `S = best_profession_score + health_score + profession_match_coverage`
   - Age penalty: 55+ → -0.10, 45-55 → -0.05
   - `S > 1.85` → ACCEPTED
   - `S < 1.05` → REJECTED
   - Otherwise → noisy boundary with `S_noisy = S + U(-0.15, 0.15)`, threshold at 1.25
5. **8% random label flip** for adults → calibrated confidence

## Run locally

```bash
cd services/ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Train the model

```bash
cd services/ml-service
python trainer.py
```

## Health check

```bash
curl http://localhost:8000/health
```

## Evaluate a candidate

```bash
curl -X POST http://localhost:8000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "age": 28,
    "skills": "mechanic, engine repair, welding",
    "health_notes": "Minor fatigue, stable vitals, no injuries",
    "camp_weights": {
      "strict_health_check": true
    },
    "professions": [
      { "id": 1, "name": "Mechanic", "description": "Repairs engines and machinery" },
      { "id": 2, "name": "Medic", "description": "Provides medical support" },
      { "id": 3, "name": "Scout", "description": "Reconnaissance and exploration" },
      { "id": 4, "name": "Chef", "description": "Food preparation and rationing" }
    ]
  }'
```

## Docker

```bash
docker compose up -d ml
```

The container listens on port `8000` and is reachable from the API as `http://ml:8000` inside the Compose network.

## Response Format

```json
{
  "decision": "ACCEPTED",
  "confidence": 0.87,
  "reasoning_path": [
    "Age (28) — meets adult threshold (18)",
    "Skills match active camp professions (best score: 0.80, coverage: 0.20) ✓",
    "Health status acceptable (score: 0.88) ✓",
    "Decision: ACCEPTED (confidence: 87%)"
  ],
  "profession_category": "Mechanic"
}
```

## Notes

- Set `ML_SERVICE_URL` in production to point to the deployed endpoint.
- The service auto-retrains the tree on first request if the profession count changes.
- Embedding caches persist in memory for the lifetime of the process; restart to clear.
- Health reference lists are curated; update `HEALTH_RISK_REFERENCES` / `HEALTH_SAFE_REFERENCES` in `decision_tree.py` for domain-specific scenarios.
