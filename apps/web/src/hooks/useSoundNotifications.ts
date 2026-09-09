/**
 * useSoundNotifications — Feature #49: дифференцированные звуковые уведомления.
 *
 * ДВА СЦЕНАРИЯ:
 * 1. Администратор: новая онлайн-запись с виджета → двойной восходящий сигнал.
 * 2. Врач: за 5 минут до конца своего приёма → одиночный нисходящий сигнал.
 *
 * ЦЕНТРАЛИЗОВАННОЕ ВОСПРОИЗВЕДЕНИЕ. Звуковые сигналы синтезируются через единый синглтон
 * SoundFeedbackService (Web Audio API: OscillatorNode + GainNode + Haptics) без создания
 * дублирующих AudioContext и без риска утечек памяти при размонтировании.
 *
 * ИДЕМПОТЕНТНОСТЬ. Каждый тип уведомления кулдаунится на COOLDOWN_MS: даже
 * при пачке событий за секунду звук играет не чаще раза.
 */

import { useCallback, useEffect, useRef } from "react";
import { SoundFeedbackService } from "../services/audio/SoundFeedbackService";
import { useWebsocket } from "./useWebsocket";

// Минимальный интервал между одинаковыми звуками (мс).
const COOLDOWN_MS = 3_000;

// За сколько миллисекунд до конца слота врача играть сигнал.
const SLOT_END_WARNING_MS = 5 * 60 * 1_000;

// Как часто проверять приём (мс). 30 секунд достаточно.
const SLOT_CHECK_INTERVAL_MS = 30_000;

export type UseSoundNotificationsOptions = {
	/** ID текущего врача. Если задан — включаем таймер 5 минут до конца слота. */
	currentDoctorUserId?: string | null;
	/**
	 * Список активных приёмов врача сегодня (пары startsAt/endsAt).
	 * Передаётся из расписания или визита врача.
	 */
	doctorTodaySlots?: { endsAt: Date | string }[];
	/** Отключить все звуки (настройка пользователя). */
	muted?: boolean;
};

export function useSoundNotifications({
	currentDoctorUserId,
	doctorTodaySlots,
	muted = false,
}: UseSoundNotificationsOptions = {}) {
	const lastOnlineChimeAt = useRef(0);
	const lastSlotWarningAt = useRef(0);
	// Множество endsAt (ISO-строка) приёмов, по которым сигнал уже прозвучал.
	const warnedSlots = useRef<Set<string>>(new Set());

	// WS-соединение расписания — то же, что у useScheduleRealtime.
	const wsUrl = (() => {
		const configured = (
			import.meta as unknown as { env?: Record<string, string> }
		).env?.VITE_WS_URL;
		if (configured) return configured;
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	})();

	const { lastMessage } = useWebsocket(wsUrl);

	// Звук при новой онлайн-записи (ONLINE_APPOINTMENT_CREATED из publicBooking.ts).
	useEffect(() => {
		if (muted) return;
		if (lastMessage?.type !== "ONLINE_APPOINTMENT_CREATED") return;
		const now = Date.now();
		if (now - lastOnlineChimeAt.current < COOLDOWN_MS) return;
		lastOnlineChimeAt.current = now;

		void SoundFeedbackService.getInstance().playOnlineBookingChime();
	}, [lastMessage, muted]);

	// Таймер «5 минут до конца слота» для врача.
	const checkSlotEnd = useCallback(() => {
		if (muted) return;
		if (!currentDoctorUserId || !doctorTodaySlots?.length) return;

		const now = Date.now();
		if (now - lastSlotWarningAt.current < COOLDOWN_MS) return;

		for (const slot of doctorTodaySlots) {
			const endsAt = typeof slot.endsAt === "string"
				? new Date(slot.endsAt).getTime()
				: slot.endsAt.getTime();
			const key = String(endsAt);
			if (warnedSlots.current.has(key)) continue;

			const diff = endsAt - now;
			// Окно: от 5:30 до 4:30 минут до конца (чтобы не пропустить за 30-сек цикл).
			if (diff > 0 && diff <= SLOT_END_WARNING_MS && diff > SLOT_END_WARNING_MS - SLOT_CHECK_INTERVAL_MS) {
				warnedSlots.current.add(key);
				lastSlotWarningAt.current = now;
				void SoundFeedbackService.getInstance().playSlotEndWarningChime();
				break;
			}
		}
	}, [currentDoctorUserId, doctorTodaySlots, muted]);

	useEffect(() => {
		if (!currentDoctorUserId || !doctorTodaySlots?.length) return;
		checkSlotEnd();
		const timer = setInterval(checkSlotEnd, SLOT_CHECK_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [currentDoctorUserId, doctorTodaySlots, checkSlotEnd]);

	/**
	 * Тестовая функция для ручной проверки звука в настройках.
	 */
	const testOnlineBookingSound = useCallback(() => {
		void SoundFeedbackService.getInstance().playOnlineBookingChime();
	}, []);

	const testSlotEndSound = useCallback(() => {
		void SoundFeedbackService.getInstance().playSlotEndWarningChime();
	}, []);

	return { testOnlineBookingSound, testSlotEndSound };
}
