from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class LocationBase(BaseModel):
    lat: float
    lng: float


class SourceLocation(LocationBase):
    country: str


class TargetLocation(LocationBase):
    city: str
    country: str


class Attack(BaseModel):
    id: str
    source_ip: str
    target_location: TargetLocation
    source_location: SourceLocation
    severity: Literal["low", "medium", "high"]
    type: Literal["UDP Flood", "SYN Flood",
                  "HTTP Request", "DNS Amplification"]
    timestamp: str


class IngestRequest(BaseModel):
    """Raw data sent to the /ingest endpoint."""
    source_ip: str
    target_city: str = "Adelaide"
