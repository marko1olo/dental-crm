/**
 * useSoundNotifications — Feature #49: дифференцированные звуковые уведомления.
 *
 * ДВА СЦЕНАРИЯ:
 * 1. Администратор: новая онлайн-запись с виджета → двойной восходящий сигнал.
 * 2. Врач: за 5 минут до конца своего приёма → одиночный нисходящий сигнал.
 *
 * РЕАЛИЗАЦИЯ БЕЗ АУДИО-ФАЙЛОВ. Web Audio API + OscillatorNode даёт надёжный
 * кросс-браузерный звук без зависимостей. MP3/WAV требовали бы хостинга файлов
 * и CORS-заголовков — лишняя точка отказа.
 *
 * ПОЛИТИКА БРАУЗЕРА. autoplay policy запрещает аудио до первого жеста
 * пользователя. AudioContext создаётся отложенно: при первом звуке. Если
 * контекст заблокирован — ошибка проглатывается тихо (нет смысла ронять UI).
 *
 * ИДЕМПОТЕНТНОСТЬ. Каждый тип уведомления кулдаунится на COOLDOWN_MS: даже
 * при пачке событий за секунду звук играет не чаще раза.
 */

import { useCallback, useEffect, useRef } from "react";
import { useWebsocket } from "./useWebsocket";

// Минимальный интервал между одинаковыми звуками (мс).
const COOLDOWN_MS = 3_000;

// За сколько миллисекунд до конца слота врача играть сигнал.
const SLOT_END_WARNING_MS = 5 * 60 * 1_000;

// Как часто проверять приём (мс). 30 секунд достаточно.
const SLOT_CHECK_INTERVAL_MS = 30_000;

type AudioCtxRef = AudioContext | null;

function getOrCreateCtx(ref: React.MutableRefObject<AudioCtxRef>): AudioContext | null {
	if (ref.current) return ref.current;
	try {
		ref.current = new AudioContext();
		return ref.current;
	} catch {
		return null;
	}
}

/**
 * Проигрывает последовательность тонов.
 * @param tones - массив { freq, duration } в миллисекундах
 */
function playTones(
	ctx: AudioContext,
	tones: { freq: number; durationMs: number; startMs?: number }[],
): void {
	const now = ctx.currentTime;
	let cursor = now;
	for (const tone of tones) {
		const start = tone.startMs !== undefined ? now + tone.startMs / 1000 : cursor;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = "sine";
		osc.frequency.setValueAtTime(tone.freq, start);

		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, start + tone.durationMs / 1000);

		osc.start(start);
		osc.stop(start + tone.durationMs / 1000 + 0.05);
		cursor = start + tone.durationMs / 1000;
	}
}

/**
 * Звук «новая онлайн-запись» для администратора.
 * Двойной восходящий аккорд — 440 Гц → 660 Гц, два тона подряд.
 */
function playOnlineBookingChime(ctx: AudioContext): void {
	playTones(ctx, [
		{ freq: 440, durationMs: 180, startMs: 0 },
		{ freq: 660, durationMs: 280, startMs: 200 },
	]);
}

/**
 * Звук «5 минут до конца слота» для врача.
 * Одиночный нисходящий сигнал — 880 Гц → 660 Гц, мягкий.
 */
function playSlotEndWarningChime(ctx: AudioContext): void {
	playTones(ctx, [
		{ freq: 880, durationMs: 150, startMs: 0 },
		{ freq: 660, durationMs: 350, startMs: 170 },
	]);
}

type UseSoundNotificationsOptions = {
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
	const audioCtxRef = useRef<AudioCtxRef>(null);
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

		const ctx = getOrCreateCtx(audioCtxRef);
		if (!ctx) return;
		// AudioContext может быть suspended до жеста пользователя.
		if (ctx.state === "suspended") {
			ctx.resume().then(() => playOnlineBookingChime(ctx)).catch(() => undefined);
		} else {
			playOnlineBookingChime(ctx);
		}
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
				const ctx = getOrCreateCtx(audioCtxRef);
				if (!ctx) break;
				if (ctx.state === "suspended") {
					ctx.resume().then(() => playSlotEndWarningChime(ctx)).catch(() => undefined);
				} else {
					playSlotEndWarningChime(ctx);
				}
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

	// Очищаем AudioContext при размонтировании.
	useEffect(() => {
		return () => {
			audioCtxRef.current?.close().catch(() => undefined);
		};
	}, []);

	/**
	 * Тестовая функция для ручной проверки звука в настройках.
	 */
	const testOnlineBookingSound = useCallback(() => {
		const ctx = getOrCreateCtx(audioCtxRef);
		if (!ctx) return;
		if (ctx.state === "suspended") {
			ctx.resume().then(() => playOnlineBookingChime(ctx)).catch(() => undefined);
		} else {
			playOnlineBookingChime(ctx);
		}
	}, []);

	const testSlotEndSound = useCallback(() => {
		const ctx = getOrCreateCtx(audioCtxRef);
		if (!ctx) return;
		if (ctx.state === "suspended") {
			ctx.resume().then(() => playSlotEndWarningChime(ctx)).catch(() => undefined);
		} else {
			playSlotEndWarningChime(ctx);
		}
	}, []);

	return { testOnlineBookingSound, testSlotEndSound };
}
