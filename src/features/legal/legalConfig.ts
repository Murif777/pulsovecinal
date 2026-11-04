/**
 * Datos del texto legal que también viaja con cada ubicación enviada.
 *
 * Al cambiar el contenido de LegalPage.tsx en lo que respecta a la ubicación,
 * subir LEGAL_VERSION: el backend guarda la versión aceptada junto con la fecha
 * del consentimiento (evidencia exigida por la Ley 1581 de 2012).
 */
export const LEGAL_VERSION = '2026-11-v1'

/** Última revisión del texto, tal como se muestra en la página. */
export const LEGAL_UPDATED = 'noviembre de 2026'

/**
 * Correo para ejercer los derechos del titular. PENDIENTE: el equipo debe
 * definir un buzón real antes de publicar; mientras sea null la página lo avisa.
 */
export const LEGAL_CONTACT_EMAIL: string | null = null
