/**
 * Thin shim: the canonical survey storage now lives in src/lib/surveyStorage.ts
 * (shared by /encuesta, /mapa and /dashboard). This module only re-exports it
 * so the encuesta feature keeps its public surface unchanged.
 */
export {
  SURVEY_STORAGE_KEY,
  appendSurveyResponse,
  createSurveyResponse,
  isSurveyResponse,
  loadSurveyResponses,
  saveSurveyResponses,
} from '../../lib/surveyStorage'