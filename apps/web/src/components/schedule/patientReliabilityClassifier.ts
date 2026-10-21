import type {
	ClassifierParams,
	PatientReliabilityBadge,
	ReliabilityCategory,
	ReliabilityStatus,
} from "./patientReliabilityTypes";

export interface ClassifierResult {
	category: ReliabilityCategory;
	status: ReliabilityStatus;
	score: number;
	badge: PatientReliabilityBadge;
	receptionistAlert?: string | undefined;
}

export function classifyReliability(params: ClassifierParams): ClassifierResult {
	const {
		totalFinished, completedCount, noShowCount,
		consecutiveNoShows, maxConsecutiveNoShows, lateCount,
		cancelledCount, attendanceRatePercent, onTimeRatePercent,
		isInsightHighRisk,
	} = params;

	if (totalFinished === 0) {
		const badge: PatientReliabilityBadge = {
			category: "new",
			status: "new",
			badgeText: "Новый пациент (история визитов формируется)",
			shortLabel: "Новый",
			emoji: "new",
			recommendation: "Первичный прием: запросить паспорт и оформить согласие на лечение.",
			summary: "История визитов формируется",
			badgeClass: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/40",
			requiresTwoHourConfirmation: false,
		};
		return {
			category: "new",
			status: "new",
			score: 0,
			badge,
			receptionistAlert: "Первичный визит. Оформить договор и согласие на лечение (или распечатать бланк со строками _______).",
		};
	}

	if (consecutiveNoShows >= 2 || noShowCount >= 3 || (maxConsecutiveNoShows >= 2 && attendanceRatePercent < 60) || (isInsightHighRisk && noShowCount >= 2)) {
		const score = Math.max(0, Math.min(45, 100 - noShowCount * 30 - consecutiveNoShows * 15 - lateCount * 10));
		const summary = consecutiveNoShows >= 2 ? `${consecutiveNoShows} неявки подряд. Высокий риск отмены.` : `${noShowCount} неявок из ${totalFinished} визитов.`;
		const badge: PatientReliabilityBadge = {
			category: "risk",
			status: "high_risk",
			badgeText: "Риск неявки",
			shortLabel: "Риск неявки",
			emoji: "high_risk",
			recommendation: "Требуется подтверждение за 2 часа",
			summary,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
			requiresTwoHourConfirmation: true,
		};
		return {
			category: "risk",
			status: "high_risk",
			score,
			badge,
			receptionistAlert: `[Внимание] Рекомендуется подтвердить визит за 2 часа до приема: у пациента ${consecutiveNoShows >= 2 ? `${consecutiveNoShows} неявки подряд` : `${noShowCount} неявок`}.`,
		};
	}

	if (noShowCount >= 1 || lateCount >= 2 || (lateCount === 1 && noShowCount === 1) || attendanceRatePercent < 90 || onTimeRatePercent < 90 || cancelledCount >= 3) {
		const score = Math.max(46, Math.min(80, 100 - noShowCount * 25 - lateCount * 15 - cancelledCount * 8));
		const reasonParts: string[] = [];
		if (noShowCount > 0) reasonParts.push(`${noShowCount} пропуск(а)`);
		if (lateCount > 0) reasonParts.push(`${lateCount} опоздани(е/й) >15м`);
		if (cancelledCount >= 2) reasonParts.push(`${cancelledCount} отмен`);
		const summary = reasonParts.join(", ") || `${onTimeRatePercent}% визитов вовремя`;
		const badge: PatientReliabilityBadge = {
			category: "attention",
			status: "attention",
			badgeText: "Зона внимания",
			shortLabel: "Внимание",
			emoji: "attention",
			recommendation: "Рекомендуется контрольный звонок накануне визита",
			summary,
			badgeClass: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40",
			requiresTwoHourConfirmation: false,
		};
		return {
			category: "attention",
			status: "attention",
			score,
			badge,
			receptionistAlert: `Рекомендуется контрольный звонок накануне: ${summary}.`,
		};
	}

	const score = Math.min(100, Math.max(90, 95 + completedCount));
	const badge: PatientReliabilityBadge = {
		category: "reliable",
		status: "reliable",
		badgeText: "Надежный пациент",
		shortLabel: "Надежный",
		emoji: "reliable",
		recommendation: "Высокая дисциплина визитов. Стандартная запись.",
		summary: `${onTimeRatePercent}% визитов вовремя (${completedCount}/${totalFinished}), 0 срывов`,
		badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40",
		requiresTwoHourConfirmation: false,
	};
	return { category: "reliable", status: "reliable", score, badge };
}
