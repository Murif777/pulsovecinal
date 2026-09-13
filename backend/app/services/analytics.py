"""Agregaciones de mapa y dashboard: misma semántica que `src/lib/mockData.ts`."""

from dataclasses import dataclass

from app.domain import ALL_CATEGORIES, ALL_SEVERITIES, SEVERITY_WEIGHTS, Category, Severity


@dataclass(frozen=True)
class SurveyFact:
    barrio: str
    comuna: str
    category: Category
    severity: Severity
    date: str
    lat: float | None = None
    lng: float | None = None


def max_severity(left: Severity, right: Severity) -> Severity:
    return left if SEVERITY_WEIGHTS[left] >= SEVERITY_WEIGHTS[right] else right


def build_map_reports(facts: list[SurveyFact]) -> list[dict]:
    groups: dict[str, dict] = {}
    for item in facts:
        if item.lat is None or item.lng is None:
            raise ValueError(f'Barrio sin coordenadas registradas: "{item.barrio}"')
        key = f"{item.barrio}::{item.category}"
        existing = groups.get(key)
        if existing:
            existing["count"] += 1
            existing["severity"] = max_severity(existing["severity"], item.severity)
            if item.date > existing["lastReportedAt"]:
                existing["lastReportedAt"] = item.date
            continue
        groups[key] = {
            "id": key,
            "barrio": item.barrio,
            "comuna": item.comuna,
            "lat": item.lat,
            "lng": item.lng,
            "category": item.category,
            "severity": item.severity,
            "count": 1,
            "lastReportedAt": item.date,
        }

    def sort_key(report: dict) -> tuple[str, int]:
        return (report["barrio"], ALL_CATEGORIES.index(report["category"]))

    return sorted(groups.values(), key=sort_key)


def _top_category(counts: dict[Category, int]) -> Category:
    best: Category | None = None
    for category in ALL_CATEGORIES:
        count = counts.get(category, 0)
        best_count = -1 if best is None else counts.get(best, 0)
        if count > 0 and count > best_count:
            best = category
    if best is None:
        raise ValueError("No se pudo determinar la categoría principal de un barrio")
    return best


def _period(facts: list[SurveyFact]) -> dict[str, str]:
    if not facts:
        return {"start": "", "end": ""}
    dates = [item.date for item in facts]
    return {"start": min(dates), "end": max(dates)}


def build_dashboard_summary(facts: list[SurveyFact]) -> dict:
    by_category = {category: 0 for category in ALL_CATEGORIES}
    by_severity = {level: 0 for level in ALL_SEVERITIES}
    barrios: dict[str, dict] = {}

    for item in facts:
        by_category[item.category] += 1
        by_severity[item.severity] += 1
        existing = barrios.get(item.barrio)
        if existing:
            existing["score"] += SEVERITY_WEIGHTS[item.severity]
            existing["categoryCounts"][item.category] = (
                existing["categoryCounts"].get(item.category, 0) + 1
            )
            continue
        barrios[item.barrio] = {
            "barrio": item.barrio,
            "comuna": item.comuna,
            "score": SEVERITY_WEIGHTS[item.severity],
            "categoryCounts": {item.category: 1},
        }

    critical = [
        {
            "barrio": entry["barrio"],
            "comuna": entry["comuna"],
            "score": entry["score"],
            "topCategory": _top_category(entry["categoryCounts"]),
        }
        for entry in barrios.values()
    ]
    critical.sort(key=lambda row: (-row["score"], row["barrio"]))

    return {
        "totalResponses": len(facts),
        "byCategory": by_category,
        "bySeverity": by_severity,
        "criticalBarrios": critical,
        "period": _period(facts),
    }
