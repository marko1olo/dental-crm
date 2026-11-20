import { useEffect, useRef } from "react";
import { useWebsocket } from "./useWebsocket";
import { playIntercomChime } from "../lib/intercomSound";
import { showToast } from "../components/GlobalToast";
import type { TargetSlotInfo } from "../components/schedule/waitlist/waitlistTypes";

/**
 * Подписка расписания на живые обновления.
 * DentalPRO expo26 Realtime Schedule Bar:
 * - APPOINTMENT_CREATED, APPOINTMENT_UPDATED
 * - INTERCOM_PING (пациент в холле, вызов у кресла)
 * - HOT_SLOT_FREED (освобождение окна при отмене с подбором листа ожидания)
 */
const SCHEDULE_EVENTS = new Set([
	"APPOINTMENT_CREATED",
	"APPOINTMENT_UPDATED",
	"INTERCOM_PING",
	"WAITLIST_UPDATED",
	"WAITLIST_DELETED",
	"HOT_SLOT_FREED",
]);

interface IntercomPingPayload {
	readonly preset?: { readonly key?: string | undefined } | undefined;
	readonly ping?: { readonly content?: string | undefined } | undefined;
}

interface HotSlotFreedPayload {
	readonly cancelledAppointmentId?: string | undefined;
	readonly id?: string | undefined;
	readonly slotStartsAt?: string | undefined;
	readonly slotEndsAt?: string | undefined;
	readonly durationMinutes?: number | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly chairId?: string | null | undefined;
	readonly chairName?: string | null | undefined;
}

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
			const payload = lastMessage.payload as IntercomPingPayload | undefined;
			if (payload?.preset?.key === "patient_arrived") {
				playIntercomChime("urgent");
				showToast(payload?.ping?.content || "Пациент прибыл в холл клиники", "warning");
			}
		}

		// Реактивный подбор из листа ожидания при отмене записи (Мандат 8d/8zq)
		if (lastMessage.type === "HOT_SLOT_FREED") {
			const payload = lastMessage.payload as HotSlotFreedPayload | undefined;
			playIntercomChime("urgent");
			showToast("Освободился слот для записи! Открыт подбор из листа ожидания", "info");

			if (typeof window !== "undefined") {
				const slotInfo: TargetSlotInfo = {
					appointmentId: payload?.cancelledAppointmentId || payload?.id || "freed-slot",
					startsAt: payload?.slotStartsAt || new Date().toISOString(),
					endsAt:
						payload?.slotEndsAt ||
						new Date(Date.now() + (payload?.durationMinutes || 60) * 60000).toISOString(),
					doctorUserId: payload?.doctorId ?? null,
					doctorName: payload?.doctorName ?? null,
					chairId: payload?.chairId ?? null,
					chairName: payload?.chairName ?? null,
					freedBecause: `Освободился слот (${payload?.durationMinutes || 60} мин)`,
				};
				window.dispatchEvent(
					new CustomEvent("dente:open-waitlist-for-slot", { detail: slotInfo })
				);
				window.dispatchEvent(
					new CustomEvent("dente-open-waitlist-for-slot", { detail: slotInfo })
				);
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

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleLabStatusSync = () => {
			handlerRef.current?.();
		};
		window.addEventListener("dente:lab:order-status-changed", handleLabStatusSync);
		window.addEventListener("dente:lab:order-created", handleLabStatusSync);
		window.addEventListener("dente-lab-order-ready", handleLabStatusSync);
		window.addEventListener("dente-lab-order-status-changed", handleLabStatusSync);
		return () => {
			window.removeEventListener("dente:lab:order-status-changed", handleLabStatusSync);
			window.removeEventListener("dente:lab:order-created", handleLabStatusSync);
			window.removeEventListener("dente-lab-order-ready", handleLabStatusSync);
			window.removeEventListener("dente-lab-order-status-changed", handleLabStatusSync);
		};
	}, []);

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
