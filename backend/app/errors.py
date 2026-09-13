"""Errores de negocio que las rutas traducen a HTTP."""


class UnprocessableError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class UnauthorizedError(Exception):
    def __init__(self, message: str = "Credenciales inválidas") -> None:
        super().__init__(message)
        self.message = message
