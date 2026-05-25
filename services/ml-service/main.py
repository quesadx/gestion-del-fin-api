from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from decision_tree import admission_tree
from contextlib import asynccontextmanager
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("admission_ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Admission ML Service...")
    admission_tree.train()
    logger.info("Decision tree model trained and ready")
    yield
    logger.info("Shutting down Admission ML Service")


app = FastAPI(title="Admission Decision Tree", lifespan=lifespan)


class AdmissionRequest(BaseModel):
    age: int | None = None
    skills: str | None = None
    health_notes: str | None = None
    camp_weights: dict = Field(default_factory=dict)
    professions: list[dict] = Field(default_factory=list)


class AdmissionResponse(BaseModel):
    decision: str
    confidence: float
    reasoning_path: list[str]
    profession_category: str


@app.get("/health")
def health():
    status = {"status": "ok", "model_trained": admission_tree.trained}
    logger.info(f"Health check - model_trained: {admission_tree.trained}")
    return status


@app.post("/evaluate", response_model=AdmissionResponse)
def evaluate(request: AdmissionRequest):
    try:
        logger.info(
            f"Evaluating admission - age: {request.age}, skills: {request.skills}, health: {request.health_notes}"
        )
        result = admission_tree.predict(
            age=request.age,
            skills=request.skills,
            health_notes=request.health_notes,
            camp_weights=request.camp_weights,
            professions=request.professions,
        )
        logger.info(
            f"Evaluation complete - decision: {result['decision']}, confidence: {result['confidence']:.2f}"
        )
        return result
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))