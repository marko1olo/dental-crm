import { formatDoctorGenitive } from "./doctorGenitiveFormatter";
import type { CohortTreatmentCategory } from "./recallCohortCalculator";

export { formatDoctorGenitive } from "./doctorGenitiveFormatter";

export type ChurnRiskBand = "due_6m" | "overdue_12m" | "critical_24m";

export interface ChurnRiskProfile {
	readonly band: ChurnRiskBand;
	readonly bandLabel: string;
	readonly badgeTone: "ok" | "warn" | "bad";
	readonly recommendedService: string;
}

export function classifyChurnRisk(
	daysSinceLastVisit: number,
	category: CohortTreatmentCategory = "sanitation",
): ChurnRiskProfile {
	const days = Number.isFinite(daysSinceLastVisit) ? Math.max(0, daysSinceLastVisit) : 0;

	if (days >= 730) {
		return {
			band: "critical_24m",
			bandLabel: "Критический отток (>2 лет)",
			badgeTone: "bad",
			recommendedService: "Комплексный перезапуск лечения и профосмотр ведущего стоматолога",
		};
	}
	if (days >= 365) {
		return {
			band: "overdue_12m",
			bandLabel: "Пропущен осмотр (12+ мес)",
			badgeTone: "warn",
			recommendedService:
				category === "implantation"
					? "КТ-контроль остеоинтеграции имплантов + осмотр хирурга"
					: "Годовой профосмотр + диагностика скрытого кариеса",
		};
	}
	return {
		band: "due_6m",
		bandLabel: "Срок профгигиены (6+ мес)",
		badgeTone: "ok",
		recommendedService:
			category === "implantation"
				? "Профгигиена имплантов (Air-Flow глицин) + полировка"
				: "Профессиональная гигиена Air-Flow + реминерализация",
	};
}

export interface PersonalizedOfferResult {
	readonly title: string;
	readonly messageText: string;
	readonly recommendedService: string;
	readonly urgencyText: string;
	readonly channelSuggestions: readonly ("sms" | "whatsapp" | "phone")[];
}

export function generatePersonalizedOffer(params: {
	patientName: string;
	clinicName?: string | undefined;
	daysSinceLastVisit: number;
	category?: CohortTreatmentCategory | undefined;
	doctorName?: string | undefined;
}): PersonalizedOfferResult {
	const rawName = (params.patientName || "").trim();
	const nameParts = rawName.split(/\s+/).filter(Boolean);
	const firstName = nameParts.length >= 2 ? nameParts[1] : nameParts[0] || "Уважаемый пациент";
	const patronymic = nameParts.length >= 3 ? ` ${nameParts[2]}` : "";
	const greeting = `${firstName}${patronymic}`.trim();

	const clinic = params.clinicName || "Стоматологическая клиника";
	const category = params.category || "sanitation";
	const days = Number.isFinite(params.daysSinceLastVisit) ? Math.max(0, params.daysSinceLastVisit) : 0;
	const genitiveDoctor = formatDoctorGenitive(params.doctorName);
	const doctor = genitiveDoctor ? ` у д-ра ${genitiveDoctor}` : "";
	const risk = classifyChurnRisk(days, category);

	let messageText = "";
	let title = "";

	if (category === "implantation") {
		if (risk.band === "critical_24m") {
			title = "Приглашение на ревизию имплантов и КТ-контроль";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло более двух лет с момента установки имплантов/протезирования. Приглашаем на контрольный 3D-снимок и осмотр хирурга${doctor}.`;
		} else if (risk.band === "overdue_12m") {
			title = "Годовой контроль остеоинтеграции имплантов";
			messageText = `${greeting}, добрый день! ${clinic}: прошёл 1 год с момента имплантации/протезирования. Рекомендуем пройти контрольный осмотр${doctor}.`;
		} else {
			title = "Плановая гигиена в области имплантов";
			messageText = `${greeting}, здравствуйте! ${clinic}: подошёл 6-месячный срок специализированной гигиены в зоне имплантов (Air-Flow мягким порошком). Записаться можно по телефону клиники.`;
		}
	} else if (category === "sanitation") {
		if (risk.band === "critical_24m") {
			title = "Приглашение на повторную диагностику после санации";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло более двух лет после завершения санации полости рта. Приглашаем на комплексный осмотр${doctor}.`;
		} else if (risk.band === "overdue_12m") {
			title = "Годовой профилактический осмотр";
			messageText = `${greeting}, добрый день! ${clinic}: прошло больше года с вашего последнего визита. Напоминаем о плановом профосмотра${doctor}.`;
		} else {
			title = "Плановая профгигиена через 6 месяцев";
			messageText = `${greeting}, здравствуйте! ${clinic}: прошло 6 месяцев после завершения лечения — самое время для плановой профгигиены Air-Flow и осмотра терапевта${doctor}.`;
		}
	} else {
		title = "Плановый профилактический осмотр";
		messageText = `${greeting}, здравствуйте! ${clinic}: прошло более полугода с последнего визита. Приглашаем на плановый осмотр к вашему лечащему врачу${doctor}.`;
	}

	const cleanMessageText = messageText.replace(/\.{2,}/g, ".").replace(/\.\s*\./g, ".");

	return {
		title,
		messageText: cleanMessageText,
		recommendedService: risk.recommendedService,
		urgencyText: risk.bandLabel,
		channelSuggestions: ["whatsapp", "sms", "phone"],
	};
}
