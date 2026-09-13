"""Parseo de query params ISO (from/to inclusive)."""

from datetime import datetime, time, timezone


def parse_iso(value: str | None, *, end_of_day: bool = False) -> datetime | None:
    if value is None:
        return None
    raw = value.strip()
    if not raw:
        return None
    if len(raw) == 10:
        day = datetime.fromisoformat(raw).date()
        clock = time.max if end_of_day else time.min
        return datetime.combine(day, clock, tzinfo=timezone.utc)
    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed
