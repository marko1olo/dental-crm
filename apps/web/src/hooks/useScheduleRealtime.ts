import { useEffect, useRef } from "react";
import { useWebsocket } from "./useWebsocket";
import { playIntercomChime } from "../lib/intercomSound";
import { showToast } from "../components/GlobalToast";

/**
 * Подписка расписания на живые обновления.
 * DentalPRO expo26 Realtime Schedule Bar:
 * - APPOINTMENT_CREATED, APPOINTMENT_UPDATED
 * - INTERCOM_PING (пациент в холле, вызов у кресла)
 */
const SCHEDULE_EVENTS = new Set([
	"APPOINTMENT_CREATED",
	"APPOINTMENT_UPDATED",
	"INTERCOM_PING",
]);

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
		if (typeof window === "undefined") return "";
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

		// DentalPRO expo26 Realtime LAN-интерком: при сигнале о прибытии пациента
		if (lastMessage.type === "INTERCOM_PING") {
			const payload = lastMessage.payload as any;
			if (payload?.preset?.key === "patient_arrived") {
				playIntercomChime("urgent");
				showToast(payload?.ping?.content || "Пациент прибыл в холл клиники", "warning");
			}
		}

		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			handlerRef.current?.();
		}, REFRESH_DEBOUNCE_MS);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [lastMessage]);

	useEffect(
		() => () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		},
		[],
	);
}
