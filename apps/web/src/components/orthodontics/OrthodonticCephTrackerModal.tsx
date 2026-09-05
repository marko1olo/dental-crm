/**
 * OrthodonticCephTrackerModal.tsx — Канонический ре-экспорт единого модуля ТРГ
 * 
 * Устранено дублирование между CephalometricAnalysisModal и OrthodonticCephTrackerModal.
 * Единый канонический компонент CephalometricAnalysisModal объединяет:
 * - Укладку 16 анатомических ориентиров ТРГ (Штайнер, Твид, Даунс, Риккетс)
 * - Голосовую диктовку ориентиров через globalDentalVoiceEngine
 * - Полифонический Web Audio фидбек через SoundFeedbackService
 * - Автоматический переход к следующему неустановленному ориентиру
 * - 1-клик вставку в карту 043/у и сохранение консультации без ТРГ (Мандат 8e)
 */

export {
	CephalometricAnalysisModal as OrthodonticCephTrackerModal,
	type CephalometricAnalysisModalProps as OrthodonticCephTrackerModalProps,
} from "./CephalometricAnalysisModal";
