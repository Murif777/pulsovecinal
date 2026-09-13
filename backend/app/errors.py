"""Errores de negocio que las rutas traducen a HTTP."""


class NotFoundError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
