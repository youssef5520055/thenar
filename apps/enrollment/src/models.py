"""
@file apps/enrollment/src/models.py
@description Pydantic request and response schemas for the Python Enrollment Service.
"""

from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

class FitTrial(BaseModel):
    features: Dict[str, float]

class FitRequest(BaseModel):
    trials: List[FitTrial] = Field(..., min_length=3)
    percentile: float = Field(5.0, ge=1.0, le=50.0)
    model: Literal["mahalanobis_shrinkage", "ocsvm", "knn"] = "mahalanobis_shrinkage"

class Diagnostics(BaseModel):
    genuineScores: List[float]
    looScores: List[float]
    trialCounts: List[int]
    stabilityScores: List[float]

class ModelExport(BaseModel):
    schemaVersion: int = 1
    modelType: Literal["mahalanobis_shrinkage", "ocsvm", "knn"] = "mahalanobis_shrinkage"
    featureNames: List[str]
    mean: List[float]
    covInv: List[List[float]]
    scalingMean: List[float]
    scalingStd: List[float]
    tau: float
    diagnostics: Optional[Diagnostics] = None

class ScoreRequest(BaseModel):
    model: ModelExport
    features: Dict[str, float]

class ScoreResponse(BaseModel):
    score: float
    rawDistance: float
    accept: bool
    thresholdTau: float

class CHeaderRequest(BaseModel):
    model: ModelExport

class CHeaderResponse(BaseModel):
    headerText: str
    filename: str = "thenar_model.h"
