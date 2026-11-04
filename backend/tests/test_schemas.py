import pytest
from pydantic import ValidationError

from app.schemas import SurveyCreate


def test_survey_create_allows_optional_description() -> None:
    payload = SurveyCreate(
        barrio="  La Esperanza  ",
        category="seguridad",
        severity="alta",
    )
    assert payload.barrio == "La Esperanza"
    assert payload.description is None


def test_survey_create_trims_optional_fields() -> None:
    payload = SurveyCreate(
        barrio="La Esperanza",
        category="seguridad",
        severity="alta",
        description="  Hay hurtos  ",
        encuestador="  Ana  ",
    )
    assert payload.description == "Hay hurtos"
    assert payload.encuestador == "Ana"


def test_survey_create_rejects_blank_barrio() -> None:
    with pytest.raises(ValidationError):
        SurveyCreate(barrio="   ", category="seguridad", severity="alta")


def test_survey_create_accepts_location_pair() -> None:
    payload = SurveyCreate(
        barrio="La Esperanza",
        category="seguridad",
        severity="alta",
        lat=10.4721,
        lng=-73.2405,
        accuracy=10,
        consent=True,
        consent_version="2026-11-v1",
    )
    assert (payload.lat, payload.lng) == (10.4721, -73.2405)


def test_survey_create_location_is_optional() -> None:
    payload = SurveyCreate(barrio="La Esperanza", category="seguridad", severity="alta")
    assert payload.lat is None and payload.lng is None


@pytest.mark.parametrize(
    "extra",
    [{"lat": 10.47}, {"lng": -73.24}, {"lat": 95, "lng": -73.24}, {"lat": 10.47, "lng": -200}],
)
def test_survey_create_rejects_partial_or_out_of_range_location(extra: dict) -> None:
    with pytest.raises(ValidationError):
        SurveyCreate(barrio="La Esperanza", category="seguridad", severity="alta", **extra)
