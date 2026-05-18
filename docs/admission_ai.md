# Admission AI System

Documentation for the hybrid AI admission evaluation system used in **Gestión del Fin**.

## Overview

The admission system uses a **hybrid architecture** that combines classical Machine Learning with a generative AI parser. The core decision is never made by a generative AI — it is made by a Decision Tree Classifier, which is deterministic, explainable, and free of hallucination.

```
ai_context_prompt (free text)
        │
        ▼
Groq — Context Parser
Converts camp rules to structured weights
        │
        ▼
Decision Tree Classifier (scikit-learn)
Evaluates the applicant profile + weights
→ ACCEPTED / REJECTED
→ Confidence score
→ Reasoning path
→ Profession category
        │
        ▼
Express API
Maps profession category → real DB profession ID
Saves result to Supabase
```

Groq appears only once — as a **structured parser**, never as a decision-maker.

---

## Architecture

### Why not a generative AI for decisions?

Generative AI (LLMs) tend to hallucinate and produce biased decisions when evaluating people, because their output is based on patterns learned from internet text rather than explicit, auditable rules. A Decision Tree Classifier avoids this because:

- It follows rules learned from structured data, not language patterns
- The same input always produces the same output (deterministic)
- Every decision can be traced step by step through the tree
- It produces a confidence score alongside every decision

### Why Groq at all?

The `ai_context_prompt` field on each camp is free text written by an admin. The Decision Tree cannot interpret natural language — it needs numeric weights. Groq is used as a **parser** to convert that text into a structured JSON object that the tree can consume.

This is a pattern known as **LLM as a structured parser** — using generative AI only where it excels (language interpretation), and keeping critical decisions in a deterministic system.

---

## ML Service (`ml-service/`)

A standalone Python microservice built with FastAPI and scikit-learn.

### Files

```
ml-service/
├── main.py           # FastAPI server and endpoints
├── decision_tree.py  # DecisionTreeClassifier model and feature extraction
├── trainer.py        # Training script with evaluation metrics
├── data.py           # Synthetic training data
├── requirements.txt
└── Dockerfile
```

### How the model works

The classifier is trained on synthetic survivor profiles with known outcomes. Each profile is converted into numeric features:

| Feature            | Type    | Description                     |
| ------------------ | ------- | ------------------------------- |
| `age`              | integer | Applicant age                   |
| `has_technical`    | 0 or 1  | Has engineering/mechanic skills |
| `has_medical`      | 0 or 1  | Has medical skills              |
| `has_scout`        | 0 or 1  | Has scouting/exploration skills |
| `has_agricultural` | 0 or 1  | Has farming/cooking skills      |
| `has_security`     | 0 or 1  | Has combat/security skills      |
| `health_score`     | 0.0–1.0 | Derived from health notes       |

The tree the model learned (printed on startup):

```
¿health_score <= 0.47?
├── Yes → REJECTED
└── No → ¿age <= 19.5? (minor)
          ├── Yes → ACCEPTED
          └── No → ¿has_medical?
                    ├── Yes → ACCEPTED
                    └── No → ¿has_security?
                              ├── Yes → ACCEPTED
                              └── No → ¿has_technical?
                                        ├── Yes → ACCEPTED
                                        └── No → ¿has_agricultural?
                                                  ├── Yes → ACCEPTED
                                                  └── No → REJECTED
```

### Model metrics

Trained on 80 synthetic profiles, evaluated on 20:

```
Accuracy: 94.1%

              precision  recall  f1-score
ACCEPTED          1.00    0.89      0.94
REJECTED          0.89    1.00      0.94
```

The model has perfect recall on REJECTED — it never lets through someone who should be rejected. This is the desired behavior for a post-apocalyptic camp security context.

### Installing Python dependencies

**With Nix** — dependencies are provided automatically by the flake.

**Without Nix** — use a virtual environment:

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running the trainer

```bash
cd ml-service
python trainer.py
```

This trains the model and prints the full evaluation report. Useful for verifying the model after modifying training data.

### API endpoints

**`GET /health`**
Returns the service status and whether the model is trained.

**`POST /evaluate`**
Evaluates an applicant profile.

Request:

```json
{
  "age": 28,
  "skills": "mechanic and electrician",
  "health_notes": "good health, no injuries",
  "camp_weights": {
    "weight_technical": 0.9,
    "weight_medical": 0.4,
    "strict_health_check": true
  }
}
```

Response:

```json
{
  "decision": "ACCEPTED",
  "confidence": 1.0,
  "reasoning_path": [
    "Age (28) — meets adult threshold (18)",
    "Skills detected: Technical ✓",
    "Health status acceptable (score: 0.70) ✓",
    "Decision: ACCEPTED (confidence: 100%)"
  ],
  "profession_category": "technical"
}
```

---

## Express Integration (`src/ai/`)

### Files

```
src/ai/
└── admission-evaluator.ts   # Main evaluator — orchestrates Groq + ML service
```

### `admission-evaluator.ts`

Orchestrates the full evaluation pipeline:

1. **`parseCampWeights(campContext)`** — calls Groq to parse the camp's `ai_context_prompt` into structured weights. Output is validated with Zod to prevent prompt injection.
2. **`evaluateWithDecisionTree(data, campWeights)`** — calls the ML service with the applicant profile and weights. Has a 5-second timeout.
3. **`mapCategoryToProfession(category, professions)`** — maps the profession category returned by the tree to a real profession record from the database.
4. Assembles and returns the final `AdmissionAIResult`.

---

## Security

### Prompt injection protection

The `ai_context_prompt` field is free text written by admins. Before sending it to Groq, the evaluator:

1. Strips common injection patterns (`ignore previous instructions`, `you are now`, etc.)
2. Truncates the input to 500 characters
3. Validates the Groq output with a strict Zod schema — any field not in the allowed list or any value out of range is rejected

```typescript
const campWeightsSchema = z
  .object({
    weight_technical: z.number().min(0).max(1).optional(),
    weight_medical: z.number().min(0).max(1).optional(),
    weight_scout: z.number().min(0).max(1).optional(),
    weight_agricultural: z.number().min(0).max(1).optional(),
    weight_security: z.number().min(0).max(1).optional(),
    strict_health_check: z.boolean().optional(),
    minimum_age: z.number().int().min(0).max(100).optional(),
  })
  .strict();
```

### Rate limiting

The admission endpoint is rate-limited to **10 requests per minute per IP** to prevent abuse and protect Groq API quotas. Returns `429 Too Many Requests` when exceeded.

### ML service timeout

Calls to the ML service time out after **5 seconds** using `AbortSignal.timeout(5000)`. On timeout, the system falls back to the rule-based evaluator automatically.

---

## Environment variables

| Variable         | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `ML_SERVICE_URL` | URL of the Python ML microservice (default: `http://localhost:8000`) |
| `GROQ_API_KEY`   | API key for Groq (used only for context parsing)                     |

---

## Adding or modifying training data

Training data lives in `ml-service/data.py`. Each row represents a synthetic applicant profile:

```python
# (age, has_technical, has_medical, has_scout, has_agricultural, has_security, health_score, decision, profession_category)
(28, 1, 0, 0, 0, 0, 0.90, "ACCEPTED", "technical"),
```

After modifying data, re-run the trainer to verify the model still performs well:

```bash
cd ml-service
python trainer.py
```

If accuracy drops significantly, review the new data for inconsistencies.

---

## Adding new profession categories

If new profession types are added to the system, update two places:

**`ml-service/decision_tree.py`** — add the category to `SKILL_KEYWORDS`:

```python
SKILL_KEYWORDS = {
  "technical":    ["engineer", "mechanic", ...],
  "medical":      ["doctor", "nurse", ...],
  "your_new_cat": ["keyword1", "keyword2"],  # ← add here
}
```

**`src/ai/admission-evaluator.ts`** — add the fallback keyword map:

```typescript
const fallbackMap: Record<string, string[]> = {
  technical:    ['engineer', 'mechanic', ...],
  your_new_cat: ['keyword1', 'keyword2'],  // ← add here
};
```
