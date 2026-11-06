"""
@file apps/enrollment/src/main.py
@description FastAPI application serving the offline enrollment toolchain and model export endpoints.

WHY THIS EXISTS:
Exposes scikit-learn and Ledoit-Wolf statistical shrinkage fitting over HTTP to the Gateway,
enabling one-click biometric calibration directly from the Companion Web App.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    FitRequest,
    ModelExport,
    ScoreRequest,
    ScoreResponse,
    CHeaderRequest,
    CHeaderResponse
)
from .algorithms import (
    fit_mahalanobis_shrinkage,
    compute_model_score,
    generate_c_header_string
)

app = FastAPI(
    title="Thenar Enrollment Service",
    description="Offline statistical biometric calibration and C-header synthesis service.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "thenar-enrollment",
        "modelSupported": ["mahalanobis_shrinkage", "ocsvm", "knn"]
    }

@app.post("/fit", response_model=ModelExport)
def fit_model(req: FitRequest):
    if len(req.trials) < 3:
        raise HTTPException(
            status_code=400,
            detail="At least 3 genuine calibration trials are required for covariance shrinkage."
        )

    trials_features = [t.features for t in req.trials]
    model_export = fit_mahalanobis_shrinkage(trials_features, percentile=req.percentile)
    return model_export

@app.post("/score", response_model=ScoreResponse)
def score_features(req: ScoreRequest):
    score, d_m, accept = compute_model_score(req.model, req.features)
    return ScoreResponse(
        score=score,
        rawDistance=d_m,
        accept=accept,
        thresholdTau=req.model.tau
    )

@app.post("/export/c-header", response_model=CHeaderResponse)
def export_c_header(req: CHeaderRequest):
    header_str = generate_c_header_string(req.model)
    return CHeaderResponse(
        headerText=header_str,
        filename="thenar_model.h"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
