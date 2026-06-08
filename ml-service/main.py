"""ClimateTrust AI — ML validation service."""

from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline import (
    DEFAULT_LATITUDE,
    DEFAULT_LONGITUDE,
    list_demo_sensors,
    load_demo_sensor,
    parse_uploaded_csv,
    run_analysis,
)
from reference import fetch_reference

app = FastAPI(
    title="ClimateTrust AI",
    description="Automated validation pipeline for environmental sensor data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeJsonRequest(BaseModel):
    sensor_name: str = "Uploaded Sensor"
    latitude: float = Field(default=DEFAULT_LATITUDE)
    longitude: float = Field(default=DEFAULT_LONGITUDE)
    use_open_meteo: bool = True
    csv_text: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "climatetrust-ml"}


@app.get("/demos")
async def demos() -> list[dict[str, str]]:
    return list_demo_sensors()


@app.get("/demo/{sensor_id}")
async def analyze_demo(
    sensor_id: str,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE,
) -> dict:
    try:
        df, name = load_demo_sensor(sensor_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Demo CSVs include embedded reference data for reliable offline demos.
    return await run_analysis(
        sensor_df=df,
        sensor_name=name,
        latitude=latitude,
        longitude=longitude,
        use_open_meteo=False,
    )


@app.post("/analyze")
async def analyze_upload(
    file: Annotated[UploadFile, File()],
    sensor_name: Annotated[str, Form()] = "Uploaded Sensor",
    latitude: Annotated[float, Form()] = DEFAULT_LATITUDE,
    longitude: Annotated[float, Form()] = DEFAULT_LONGITUDE,
    use_open_meteo: Annotated[bool, Form()] = True,
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = await file.read()
    try:
        df = parse_uploaded_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}") from exc

    return await run_analysis(
        sensor_df=df,
        sensor_name=sensor_name,
        latitude=latitude,
        longitude=longitude,
        use_open_meteo=use_open_meteo,
    )


@app.post("/analyze/json")
async def analyze_json(body: AnalyzeJsonRequest) -> dict:
    try:
        df = parse_uploaded_csv(body.csv_text.encode("utf-8"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return await run_analysis(
        sensor_df=df,
        sensor_name=body.sensor_name,
        latitude=body.latitude,
        longitude=body.longitude,
        use_open_meteo=body.use_open_meteo,
    )


@app.get("/reference")
async def reference(
    start_date: str,
    end_date: str,
    latitude: float = DEFAULT_LATITUDE,
    longitude: float = DEFAULT_LONGITUDE,
) -> dict:
    try:
        df = await fetch_reference(start_date, end_date, latitude, longitude)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Open-Meteo fetch failed: {exc}") from exc

    return {
        "count": len(df),
        "data": df.to_dict(orient="records"),
    }
