"""Dominios del negocio: mismos valores que el frontend (`src/lib/types.ts`)."""

from typing import Literal

Category = Literal[
    "seguridad",
    "alcantarillado",
    "energia",
    "vias",
    "espacios_publicos",
    "otros",
]
Severity = Literal["baja", "media", "alta", "critica"]

ALL_CATEGORIES: tuple[Category, ...] = (
    "seguridad",
    "alcantarillado",
    "energia",
    "vias",
    "espacios_publicos",
    "otros",
)
ALL_SEVERITIES: tuple[Severity, ...] = ("baja", "media", "alta", "critica")

SEVERITY_WEIGHTS: dict[Severity, int] = {
    "baja": 1,
    "media": 2,
    "alta": 3,
    "critica": 4,
}

# Precisión máxima aceptada para guardar una ubicación (radio, en metros).
MAX_LOCATION_ACCURACY_M = 20.0
# Versión vigente del texto legal que el ciudadano acepta (ver src/features/legal).
LEGAL_VERSION = "2026-11-v1"

CATEGORY_VALUES = set(ALL_CATEGORIES)
SEVERITY_VALUES = set(ALL_SEVERITIES)
