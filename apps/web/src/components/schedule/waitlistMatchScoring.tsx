import React from "react";
import {
	AlertTriangle,
	CalendarDays,
	ClipboardList,
	Clock,
	Star,
} from "lucide-react";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";

export type WaitlistPriority =
	| "urgent"
	| "acute_pain"
	| "treatment_plan"
	| "vip"
	| "routine"
	| "high"
	| "medium"
	| "low";

export type PreferredTimeOfDay = "morning" | "day" | "evening" | "any";
export type PreferredDaysType = "weekdays" | "weekend" | "any" | "specific";

export interface WaitlistPatientEntry {
	id: string;
	patientId: string;
	patientName: string | null;
	patientPhone: string | null;
	preferredDoctorId: string | null;
	preferredDoctorName: string | null;
	priorityLevel: WaitlistPriority;
	treatmentCategory?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: JSONB metadata from server or draft
	preferredTimeRanges?: any;
	preferredDays?: string[] | string;
	preferredTimeOfDay?: PreferredTimeOfDay[];
	notes?: string | null;
	expiryDate?: string | null;
	status: "active" | "waiting" | "fulfilled" | "cancelled" | string;
	createdAt: string;
	updatedAt?: string;
	alreadyBooked?: boolean;
}

export const DEMO_SHOWCASE_WAITLIST_ENTRIES: WaitlistPatientEntry[] = [
	{
		id: "demo-waitlist-1",
		patientId: "demo-patient-volkov",
		patientName: "Волков Сергей Николаевич",
		patientPhone: "+7 (916) 111-22-33",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "acute_pain",
		treatmentCategory: "Терапия",
		preferredDays: "weekdays",
		preferredTimeOfDay: ["morning", "day"],
		notes: "Острая боль 4.6, просит принять как можно раньше",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
	},
	{
		id: "demo-waitlist-2",
		patientId: "demo-patient-morozova",
		patientName: "Морозова Елена Викторовна",
		patientPhone: "+7 (926) 444-55-66",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "treatment_plan",
		treatmentCategory: "Ортодонтия",
		preferredDays: "any",
		preferredTimeOfDay: ["day", "evening"],
		notes: "Активация дуги по плану лечения",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
	},
];

export interface MatchScoringResult {
	score: number; // 0 to 100
	rating: "excellent" | "good" | "moderate" | "low";
	ratingLabel: string;
	priorityRank: number;
	matchReasons: string[];
	mismatchReasons: string[];
	sameDoctor: boolean;
	timeFits: boolean;
	dayFits: boolean;
	categoryFits: boolean;
}

export const PRIORITY_CONFIG: Record<
	string,
	{ label: string; badgeClass: string; weight: number }
> = {
	urgent: {
		label: "Острая боль",
		badgeClass:
			"bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
		weight: 100,
	},
	acute_pain: {
		label: "Острая боль",
		badgeClass:
			"bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
		weight: 100,
	},
	high: {
		label: "Срочно",
		badgeClass:
			"bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
		weight: 100,
	},
	treatment_plan: {
		label: "Незавершённый план",
		badgeClass:
			"bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-bold",
		weight: 75,
	},
	vip: {
		label: "VIP",
		badgeClass:
			"bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/35 font-bold",
		weight: 60,
	},
	routine: {
		label: "Плановый",
		badgeClass:
			"bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35 font-bold",
		weight: 25,
	},
	medium: {
		label: "Плановый",
		badgeClass:
			"bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35 font-bold",
		weight: 25,
	},
	low: {
		label: "Лист ожидания",
		badgeClass:
			"bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25 font-medium",
		weight: 10,
	},
};

export function renderPriorityIcon(priorityKey: string, size = 12) {
	switch (priorityKey) {
		case "urgent":
		case "acute_pain":
		case "high":
			return <AlertTriangle size={size} className="shrink-0 text-rose-500" />;
		case "treatment_plan":
			return <ClipboardList size={size} className="shrink-0 text-amber-500" />;
		case "vip":
			return <Star size={size} className="shrink-0 text-purple-500" />;
		case "routine":
		case "medium":
			return <CalendarDays size={size} className="shrink-0 text-sky-500" />;
		default:
			return <Clock size={size} className="shrink-0 text-slate-400" />;
	}
}

export const TREATMENT_CATEGORIES = [
	"Терапия (кариес, пломба)",
	"Эндодонтия (каналы, пульпит)",
	"Хирургия (удаление, имплантация)",
	"Ортопедия (коронки, виниры)",
	"Ортодонтия (брекеты, элайнеры)",
	"Пародонтология (дёсны)",
	"Профгигиена и отбеливание",
	"Детская стоматология",
	"Консультация и осмотр",
];

export const DEFAULT_PRIORITY_CFG = {
	label: "Плановый",
	badgeClass:
		"bg-[var(--paper-strong)] text-[var(--ink-2)] border-[var(--line)]",
	weight: 25,
};

/**
 * Calculates match score between a waitlist patient and target opening.
 */
export function calculateMatchScore(
	patient: WaitlistPatientEntry,
	slot?: TargetSlotInfo | null,
): MatchScoringResult {
	const priorityCfg =
		PRIORITY_CONFIG[patient.priorityLevel] ??
		PRIORITY_CONFIG.routine ??
		DEFAULT_PRIORITY_CFG;
	const matchReasons: string[] = [];
	const mismatchReasons: string[] = [];

	if (!slot?.startsAt) {
		const score = Math.min(100, priorityCfg.weight);
		return {
			score,
			rating: score >= 80 ? "excellent" : score >= 50 ? "good" : "moderate",
			ratingLabel: score >= 80 ? "Высокий приоритет" : "Стандартный приоритет",
			priorityRank: priorityCfg.weight,
			matchReasons: [priorityCfg.label],
			mismatchReasons: [],
			sameDoctor: false,
			timeFits: true,
			dayFits: true,
			categoryFits: true,
		};
	}

	const slotDate = new Date(slot.startsAt);
	const datePartMatch = /^(\d{4}-\d{2}-\d{2})/.exec(slot.startsAt);
	const slotDayDate = datePartMatch
		? new Date(`${datePartMatch[1]}T12:00:00`)
		: slotDate;
	const slotDay = slotDayDate.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
	const isWeekend = slotDay === 0 || slotDay === 6;

	let totalScore = 0;

	// 1. Doctor Match (30 pts max)
	let sameDoctor = false;
	if (
		patient.preferredDoctorId &&
		slot.doctorUserId &&
		patient.preferredDoctorId === slot.doctorUserId
	) {
		sameDoctor = true;
		totalScore += 30;
		matchReasons.push("Желаемый врач совпадает");
	} else if (!patient.preferredDoctorId) {
		sameDoctor = true;
		totalScore += 20;
		matchReasons.push("Согласен на любого врача");
	} else {
		mismatchReasons.push("Просил другого специалиста");
	}

	// 2. Day of Week Match (25 pts max)
	let dayFits = true;
	const prefDays = Array.isArray(patient.preferredDays)
		? patient.preferredDays
		: typeof patient.preferredDays === "string"
			? [patient.preferredDays]
			: [];

	if (prefDays.length > 0) {
		const wantsWeekend =
			prefDays.includes("weekend") || prefDays.includes("Выходные");
		const wantsWeekdays =
			prefDays.includes("weekdays") || prefDays.includes("Будни");
		const wantsAny = prefDays.includes("any") || prefDays.includes("Любые дни");

		if (wantsAny) {
			totalScore += 25;
			matchReasons.push("Подходят любые дни недели");
		} else if (isWeekend && wantsWeekend) {
			totalScore += 25;
			matchReasons.push("Подходит выходной день");
		} else if (!isWeekend && wantsWeekdays) {
			totalScore += 25;
			matchReasons.push("Подходит будний день (Пн-Пт)");
		} else {
			dayFits = false;
			mismatchReasons.push(
				isWeekend ? "Предпочитает будни" : "Предпочитает выходные",
			);
		}
	} else {
		totalScore += 20;
		matchReasons.push("Дни недели не ограничены");
	}

	// 3. Time of Day Match (25 pts max)
	let timeFits = true;
	const wallMatch = /T(\d{2}):(\d{2})/.exec(slot.startsAt);
	const slotHours = wallMatch ? Number(wallMatch[1]) : slotDate.getHours();
	const slotMinutes = wallMatch ? Number(wallMatch[2]) : slotDate.getMinutes();
	const slotMinuteTotal =
		(Number.isFinite(slotHours) ? slotHours : slotDate.getHours()) * 60 +
		(Number.isFinite(slotMinutes) ? slotMinutes : slotDate.getMinutes());

	const isMorning = slotMinuteTotal >= 8 * 60 && slotMinuteTotal < 12 * 60;
	const isDay = slotMinuteTotal >= 12 * 60 && slotMinuteTotal < 17 * 60;
	const isEvening = slotMinuteTotal >= 17 * 60 && slotMinuteTotal <= 21 * 60;

	const prefTimes = Array.isArray(patient.preferredTimeOfDay)
		? patient.preferredTimeOfDay
		: [];

	if (prefTimes.length > 0) {
		const matchedTime =
			prefTimes.includes("any") ||
			(isMorning && prefTimes.includes("morning")) ||
			(isDay && prefTimes.includes("day")) ||
			(isEvening && prefTimes.includes("evening"));

		if (matchedTime) {
			totalScore += 25;
			const timeLabel = isMorning ? "Утро" : isDay ? "День" : "Вечер";
			matchReasons.push(`Подходит время приёма (${timeLabel})`);
		} else {
			timeFits = false;
			mismatchReasons.push("Время вне желаемого интервала");
		}
	} else {
		totalScore += 20;
		matchReasons.push("Любое время приёма");
	}

	// 4. Treatment Category Match (10 pts)
	let categoryFits = false;
	if (
		patient.treatmentCategory &&
		slot.treatmentCategory &&
		patient.treatmentCategory
			.toLowerCase()
			.includes(slot.treatmentCategory.toLowerCase())
	) {
		categoryFits = true;
		totalScore += 10;
		matchReasons.push(`Направление: ${patient.treatmentCategory}`);
	} else if (!patient.treatmentCategory) {
		categoryFits = true;
		totalScore += 5;
	}

	// 5. Priority Bonus (10 pts)
	if (
		patient.priorityLevel === "urgent" ||
		patient.priorityLevel === "acute_pain" ||
		patient.priorityLevel === "high"
	) {
		totalScore += 10;
		matchReasons.push("Острая боль / Срочный вызов");
	} else if (patient.priorityLevel === "treatment_plan") {
		totalScore += 7;
		matchReasons.push("Незавершённый план лечения");
	} else if (patient.priorityLevel === "vip") {
		totalScore += 5;
		matchReasons.push("VIP клиент");
	}

	const finalScore = Math.min(100, Math.max(0, totalScore));
	const rating =
		finalScore >= 80
			? "excellent"
			: finalScore >= 60
				? "good"
				: finalScore >= 40
					? "moderate"
					: "low";

	const ratingLabel =
		finalScore >= 80
			? "Отличное совпадение"
			: finalScore >= 60
				? "Хорошее совпадение"
				: finalScore >= 40
					? "Частичное совпадение"
					: "Низкое совпадение";

	return {
		score: finalScore,
		rating,
		ratingLabel,
		priorityRank: priorityCfg.weight + finalScore,
		matchReasons,
		mismatchReasons,
		sameDoctor,
		timeFits,
		dayFits,
		categoryFits,
	};
}

/**
 * Generates WhatsApp/SMS message offering the opened slot.
 */
export function generateWhatsAppOfferMessage(params: {
	patientName: string;
	doctorName?: string | null;
	slotStartsAt: string;
	clinicName?: string;
}): string {
	const dateObj = new Date(params.slotStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "стоматологической клинике DENTE";

	return `Здравствуйте, ${params.patientName}! В ${clinic} освободилось окно на приём${doctor}: ${formattedDate} в ${formattedTime}. Записать вас на это время? Ответьте ДА или позвоните нам.`;
}

/**
 * Opens WhatsApp chat via wa.me link.
 */
export function openWhatsAppChat(phone: string, text: string) {
	const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
	const encodedText = encodeURIComponent(text);
	window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, "_blank");
}

/**
 * Opens Telegram chat/share link offering the opened slot.
 */
export function openTelegramChat(phone: string, text: string) {
	const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
	const encodedText = encodeURIComponent(text);
	window.open(`https://t.me/share/url?text=${encodedText}`, "_blank");
}
