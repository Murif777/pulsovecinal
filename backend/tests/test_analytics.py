import pytest

from app.services.analytics import SurveyFact, build_dashboard_summary, build_map_reports


def _fact(
    *,
    barrio: str = "La Esperanza",
    comuna: str = "Comuna 2",
    category: str = "alcantarillado",
    severity: str = "critica",
    date: str = "2026-08-01T14:30:00.000Z",
    lat: float | None = 10.4721,
    lng: float | None = -73.2405,
) -> SurveyFact:
    return SurveyFact(
        barrio=barrio,
        comuna=comuna,
        category=category,  # type: ignore[arg-type]
        severity=severity,  # type: ignore[arg-type]
        date=date,
        lat=lat,
        lng=lng,
    )


def test_map_reports_group_by_barrio_and_category() -> None:
    reports = build_map_reports(
        [
            _fact(),
            _fact(category="seguridad", severity="media", date="2026-08-02T16:05:00.000Z"),
            _fact(severity="alta", date="2026-08-20T10:00:00.000Z"),
        ]
    )
    assert [item["id"] for item in reports] == [
        "La Esperanza::seguridad",
        "La Esperanza::alcantarillado",
    ]
    sewer = reports[1]
    assert sewer["count"] == 2
    assert sewer["severity"] == "critica"
    assert sewer["lastReportedAt"] == "2026-08-20T10:00:00.000Z"


def test_map_reports_require_coordinates() -> None:
    with pytest.raises(ValueError, match="sin coordenadas"):
        build_map_reports([_fact(lat=None, lng=None)])


def test_dashboard_summary_weights_and_top_category_tie() -> None:
    summary = build_dashboard_summary(
        [
            _fact(),
            _fact(category="seguridad", severity="media", date="2026-08-02T16:05:00.000Z"),
            _fact(category="energia", severity="baja", date="2026-08-19T13:55:00.000Z"),
        ]
    )
    assert summary["totalResponses"] == 3
    assert summary["byCategory"]["alcantarillado"] == 1
    assert summary["bySeverity"]["critica"] == 1
    assert summary["criticalBarrios"][0]["score"] == 7
    assert summary["criticalBarrios"][0]["topCategory"] == "seguridad"
    assert summary["period"] == {
        "start": "2026-08-01T14:30:00.000Z",
        "end": "2026-08-19T13:55:00.000Z",
    }


def test_dashboard_summary_empty() -> None:
    summary = build_dashboard_summary([])
    assert summary["totalResponses"] == 0
    assert summary["criticalBarrios"] == []
    assert summary["period"] == {"start": "", "end": ""}
