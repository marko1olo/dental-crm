import { useEffect, useRef } from "react";
import { useWebsocket } from "./useWebsocket";

/**
 * Подписка расписания на живые обновления.
 *
 * Маршрут /api/api/appointments раньше не рассылал ничего, хотя эндпоинт
 * живых обновлений так и называется — /api/ws/schedule. Два администратора
 * в расписании не видели действий друг друга до перезагрузки страницы:
 * один освобождал слот, другой продолжал считать его занятым, и наоборот —
 * прямой путь к двойной записи на один слот.
 *
 * События, на которые реагируем: APPOINTMENT_CREATED и APPOINTMENT_UPDATED
 * из routes/schedule.ts, а также APPOINTMENT_CREATED из routes/leads.ts
 * (запись, созданная из заявки).
 */
const SCHEDULE_EVENTS = new Set(["APPOINTMENT_CREATED", "APPOINTMENT_UPDATED"]);

/** Схлопывание пачки событий в одно обновление. */
const REFRESH_DEBOUNCE_MS = 600;

export function useScheduleRealtime(
	onScheduleChanged: (() => void) | undefined,
) {
	const wsUrl = (() => {
		const configured = (
			import.meta as unknown as { env?: Record<string, string> }
		).env?.VITE_WS_URL;
		if (configured) return configured;
		// Через хост страницы, а не жёстко на :4100: так работает и прокси
		// разработки, и боевая сборка за одним доменом.
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	})();

	const { lastMessage } = useWebsocket(wsUrl);

	// Обработчик приходит новым на каждом рендере — держим в ref, иначе
	// таймер пересоздавался бы постоянно.
	const handlerRef = useRef(onScheduleChanged);
	handlerRef.current = onScheduleChanged;
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!lastMessage?.type || !SCHEDULE_EVENTS.has(lastMessage.type)) return;
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			handlerRef.current?.();
		}, REFRESH_DEBOUNCE_MS);
	}, [lastMessage]);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);
}
