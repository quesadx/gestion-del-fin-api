# ML Service

FastAPI microservice that evaluates refugee admission decisions using a decision tree model.

## Layout

- `main.py`: FastAPI app with `/health` and `/evaluate`
- `decision_tree.py`: feature extraction, training, and inference logic
- `trainer.py`: standalone training/evaluation script
- `data.py`: synthetic training dataset
- `requirements.txt`: Python dependencies
- `Dockerfile`: container image for the service

## Run locally

From this folder:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Train the model

```bash
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
    "skills": "mechanic, builder",
    "health_notes": "stable",
    "camp_weights": {
      "weight_technical": 1.2,
      "strict_health_check": true
    }
  }'
```

## Docker

Build and run from the repository root using the Compose service defined in `docker-compose.yml`:

```bash
docker compose up -d ml
```

The container listens on port `8000` and is reachable from the API as `http://ml:8000` inside the Compose network.

## Notes

- If you use the service in production or Railway, set `ML_SERVICE_URL` to the deployed URL of the service.
- The folder lives under `services/ml-service/` because this repository treats deployable components as separate services.
