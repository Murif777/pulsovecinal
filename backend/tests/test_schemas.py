import pytest
from pydantic import ValidationError

from app.schemas import SurveyCreate


def test_survey_create_trims_required_fields() -> None:
    payload = SurveyCreate(
        barrio="  La Esperanza  ",
        category="seguridad",
        severity="alta",
        description="  Hay hurtos  ",
        encuestador="  Ana  ",
    )
    assert payload.barrio == "La Esperanza"
    assert payload.description == "Hay hurtos"
    assert payload.encuestador == "Ana"


def test_survey_create_rejects_blank_description() -> None:
    with pytest.raises(ValidationError):
        SurveyCreate(
            barrio="La Esperanza",
            category="seguridad",
            severity="alta",
            description="   ",
        )
