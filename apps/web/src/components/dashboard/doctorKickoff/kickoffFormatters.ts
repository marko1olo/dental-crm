import { countLabel } from "../../../lib/russianPlural";
import { getCachedActiveStaffUser } from "../../../lib/offlineStorage";

/**
 * Вычисляет приветствие по текущему времени суток
 */
export function getKickoffTimeGreeting(customHour?: number): string {
	const hour = customHour ?? new Date().getHours();
	if (hour >= 5 && hour < 12) return "Доброе утро";
	if (hour >= 12 && hour < 18) return "Добрый день";
	if (hour >= 18 && hour < 23) return "Добрый вечер";
	return "Доброй ночи";
}

/**
 * Формирует персонализированное приветствие: «Доброе утро, доктор [Имя]!»
 */
export function formatDoctorGreeting(
	rawDoctorName?: string | null,
	customHour?: number,
): string {
	const greeting = getKickoffTimeGreeting(customHour);
	let name = (rawDoctorName ?? "").trim();
	if (!name) {
		const cached = getCachedActiveStaffUser() as { fullName?: string; name?: string } | null;
		name = (cached?.fullName || cached?.name || "").trim();
	}
	if (name) {
		const cleanName = name.replace(/^(доктор|д-р|врач)\s+/i, "").trim();
		return `${greeting}, доктор ${cleanName}!`;
	}
	return `${greeting}, доктор!`;
}

/**
 * Формирует дневную сводку:
 * «На сегодня запланировано 4 пациента, смена открыта, касса готова.»
 */
export function formatDailyKickoffSummary(params: {
	appointmentsCount: number;
	isShiftOpen: boolean;
	isCashReady: boolean;
}): string {
	const { appointmentsCount, isShiftOpen, isCashReady } = params;
	const patientsPart = countLabel(appointmentsCount, "пациент", "пациента", "пациентов");
	const shiftPart = isShiftOpen ? "смена открыта" : "смена ожидает открытия";
	const cashPart = isCashReady ? "касса готова" : "касса не открыта";
	return `На сегодня запланировано ${patientsPart}, ${shiftPart}, ${cashPart}.`;
}

/**
 * Возвращает текст и статус сетевой телеметрии (Мандат 8d: Quiet Telemetry)
 */
export function formatNetworkStatusInfo(isOffline: boolean): {
	statusText: string;
	badgeType: "online" | "offline";
	ariaLabel: string;
} {
	if (isOffline) {
		return {
			statusText: "📡 Автономный режим (Локальная сеть)",
			badgeType: "offline",
			ariaLabel: "Сетевой статус: Автономный режим (Локальная сеть)",
		};
	}
	return {
		statusText: "🟢 Сервер подключен",
		badgeType: "online",
		ariaLabel: "Сетевой статус: Сервер подключен и синхронизирован",
	};
}
