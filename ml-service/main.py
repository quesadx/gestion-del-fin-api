from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from decision_tree import admission_tree
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    admission_tree.train()
    yield


app = FastAPI(title="Admission Decision Tree", lifespan=lifespan)


class AdmissionRequest(BaseModel):
    age: int | None = None
    skills: str | None = None
    health_notes: str | None = None
    camp_weights: dict = {}


class AdmissionResponse(BaseModel):
    decision: str
    confidence: float
    reasoning_path: list[str]
    profession_category: str


@app.get("/health")
def health():
    return {"status": "ok", "model_trained": admission_tree.trained}


@app.post("/evaluate", response_model=AdmissionResponse)
def evaluate(request: AdmissionRequest):
    try:
        result = admission_tree.predict(
            age=request.age,
            skills=request.skills,
            health_notes=request.health_notes,
            camp_weights=request.camp_weights,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))