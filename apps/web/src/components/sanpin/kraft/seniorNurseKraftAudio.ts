/**
 * ============================================================================
 * SENIOR NURSE KRAFT AUDIO FEEDBACK ENGINE (WEB AUDIO API)
 * "БАБУШКА-PROOF" / Звуковая сигнализация стерильности крафт-пакетов
 * Делегирует в централизованный SoundFeedbackService
 * ============================================================================
 */

import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";

export function disposeSeniorNurseKraftAudio(): void {
	// No-op: централизованный SoundFeedbackService управляет жизненным циклом AudioContext
}

/**
 * Чистый, приятный мажорный звуковой сигнал (Бип-Успех / Стерильно OK)
 */
export function playSterileSuccessTone(force = false): void {
	if (typeof window === "undefined") return;
	try {
		const service = SoundFeedbackService.getInstance();
		if (!force && !service.isEnabled()) return;
		void service.playActionSuccess();
	} catch (err) {
		console.warn("[Dente Audio] Sterile tone fallback", err);
	}
}

/**
 * Предупреждающий тональный сигнал (Гудок-Ошибка / ПРОСРОЧЕНО!)
 */
export function playExpiredErrorTone(force = false): void {
	if (typeof window === "undefined") return;
	try {
		const service = SoundFeedbackService.getInstance();
		if (!force && !service.isEnabled()) return;
		void service.playWarningAlert();
	} catch (err) {
		console.warn("[Dente Audio] Expired tone fallback", err);
	}
}

