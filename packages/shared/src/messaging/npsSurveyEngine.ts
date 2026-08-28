/**
 * npsSurveyEngine.ts — Net Promoter Score (NPS) & Service Quality Automation Engine.
 *
 * Implements:
 * 1. Automatic survey dispatch scheduling at T+1.5h (90 minutes) after visit completion.
 * 2. Net Promoter Score calculation: % Promoters (9-10) - % Detractors (1-6).
 * 3. Automatic routing of Detractor ratings (<= 6) into urgent CRM tasks and alerts for Chief Doctor & Clinic Manager.
 * 4. Multi-channel survey payload generators for WhatsApp (WABA) and Telegram Bot API.
 */

import { z } from "zod";

// ─── Enums & Schemas ───

export const npsScoreSchema = z.number().int().min(1).max(10);
export type NpsScore = z.infer<typeof npsScoreSchema>;

export const npsCategorySchema = z.enum(["promoter", "passive", "detractor"]);
export type NpsCategory = z.infer<typeof npsCategorySchema>;

export const npsQualityGradeSchema = z.enum([
	"world_class",
	"excellent",
	"good",
	"needs_improvement",
	"critical",
]);
export type NpsQualityGrade = z.infer<typeof npsQualityGradeSchema>;

export const npsSurveyContextSchema = z.object({
	visitId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientFirstName: z.string().optional(),
	patientPhone: z.string().min(6),
	telegramChatId: z.union([z.string(), z.number()]).optional().nullable(),
	doctorFullName: z.string().min(1),
	doctorSpecialty: z.string().optional(),
	clinicName: z.string().default("DENTE Clinic"),
	visitCompletedAt: z.string().min(1), // ISO 8601 string
	servicesRendered: z.array(z.string()).optional(),
});
export type NpsSurveyContext = z.input<typeof npsSurveyContextSchema>;
export type NpsSurveyContextOutput = z.output<typeof npsSurveyContextSchema>;

export const npsResponseEntrySchema = z.object({
	id: z.string().optional(),
	visitId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().optional(),
	patientPhone: z.string().optional(),
	doctorId: z.string().optional(),
	doctorFullName: z.string().optional(),
	score: npsScoreSchema,
	comment: z.string().max(2000).optional().nullable(),
	createdAt: z.string().optional(),
	channel: z.enum(["whatsapp", "telegram", "sms", "web"]).default("telegram"),
});
export type NpsResponseEntry = z.infer<typeof npsResponseEntrySchema>;

export const npsDetractorAlertSchema = z.object({
	alertId: z.string(),
	visitId: z.string(),
	patientId: z.string(),
	patientFullName: z.string(),
	patientPhone: z.string(),
	doctorFullName: z.string(),
	doctorSpecialty: z.string().optional(),
	score: npsScoreSchema,
	feedbackComment: z.string().optional(),
	category: z.literal("detractor"),
	severity: z.enum(["critical", "high"]),
	targetRoles: z.array(z.string()),
	slaMinutes: z.number().int(),
	deadline: z.string(),
	createdAt: z.string(),
	crmTask: z.object({
		title: z.string(),
		description: z.string(),
		priority: z.enum(["urgent", "high", "normal"]),
		status: z.literal("open"),
		assignedRole: z.string(),
	}),
	telegramAlertText: z.string(),
});
export type NpsDetractorAlert = z.infer<typeof npsDetractorAlertSchema>;

export interface NpsCalculationResult {
	totalResponses: number;
	promotersCount: number;
	promotersPercent: number;
	passivesCount: number;
	passivesPercent: number;
	detractorsCount: number;
	detractorsPercent: number;
	npsScore: number;
	npsScoreFormatted: string;
	averageScore: number;
	qualityGrade: NpsQualityGrade;
	qualityGradeRu: string;
	scoreDistribution: Record<number, number>;
}

// ─── Survey Scheduling Engine ───

export const DEFAULT_NPS_DELAY_MINUTES = 90; // 1.5 hours post-visit

/**
 * Calculates exact survey dispatch time at T+1.5h (90 min) after visit completion.
 */
export function calculateNpsSurveyDispatchTime(
	visitCompletedAt: Date | string,
	delayMinutes = DEFAULT_NPS_DELAY_MINUTES,
): Date {
	const base = typeof visitCompletedAt === "string" ? new Date(visitCompletedAt) : visitCompletedAt;
	const timestamp = base.getTime() + delayMinutes * 60 * 1000;
	return new Date(timestamp);
}

// ─── Survey Message Builders ───

/**
 * Builds Telegram survey payload with 1..10 inline rating keyboard.
 */
export function buildTelegramNpsSurveyPayload(contextInput: NpsSurveyContext) {
	const context = npsSurveyContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || context.patientFullName.split(/\s+/)[1] || context.patientFullName;
	const visitId = context.visitId;

	const text =
		`🌟 <b>Оценка качества визита в стоматологию ${context.clinicName}</b>\n\n` +
		`Здравствуйте, <b>${firstName}</b>!\n` +
		`Благодарим вас за выбор нашей клиники. Пожалуйста, оцените ваш сегодняшний прием у доктора <b>${context.doctorFullName}</b>:\n\n` +
		`<i>Насколько вероятно, что вы порекомендуете клинику ${context.clinicName} своим друзьям и близким по шкале от 1 до 10?</i>\n` +
		`(1 — точно нет, 10 — обязательно порекомендую)`;

	return {
		chat_id: context.telegramChatId || context.patientPhone,
		text,
		parse_mode: "HTML" as const,
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "1 😡", callback_data: `nps:rate:${visitId}:1` },
					{ text: "2 😠", callback_data: `nps:rate:${visitId}:2` },
					{ text: "3 🙁", callback_data: `nps:rate:${visitId}:3` },
					{ text: "4 😐", callback_data: `nps:rate:${visitId}:4` },
					{ text: "5 😐", callback_data: `nps:rate:${visitId}:5` },
				],
				[
					{ text: "6 😐", callback_data: `nps:rate:${visitId}:6` },
					{ text: "7 🙂", callback_data: `nps:rate:${visitId}:7` },
					{ text: "8 😊", callback_data: `nps:rate:${visitId}:8` },
					{ text: "9 😃", callback_data: `nps:rate:${visitId}:9` },
					{ text: "10 🤩", callback_data: `nps:rate:${visitId}:10` },
				],
			],
		},
	};
}

/**
 * Builds WhatsApp WABA interactive survey payload.
 */
export function buildWhatsappNpsSurveyPayload(contextInput: NpsSurveyContext) {
	const context = npsSurveyContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || context.patientFullName.split(/\s+/)[1] || context.patientFullName;
	const visitId = context.visitId;

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Благодарим вас за визит в клинику ${context.clinicName} к доктору ${context.doctorFullName}.\n\n` +
		`Пожалуйста, оцените качество приема по шкале от 1 до 10, нажав кнопку ниже:`;

	return {
		messaging_product: "whatsapp" as const,
		recipient_type: "individual" as const,
		to: context.patientPhone,
		type: "interactive" as const,
		interactive: {
			type: "button" as const,
			header: {
				type: "text" as const,
				text: `Оценка качества ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Ваш отзыв помогает нам становиться лучше",
			},
			action: {
				buttons: [
					{
						type: "reply" as const,
						reply: {
							id: `nps_${visitId}_10`,
							title: "10 — Отлично! 🌟",
						},
					},
					{
						type: "reply" as const,
						reply: {
							id: `nps_${visitId}_8`,
							title: "8 — Хорошо 😊",
						},
					},
					{
						type: "reply" as const,
						reply: {
							id: `nps_${visitId}_5`,
							title: "1-6 — Есть замечания 🙁",
						},
					},
				],
			},
		},
	};
}

// ─── Classification & NPS Math ───

/**
 * Classifies an individual NPS score into standard category.
 */
export function classifyNpsScore(score: number): NpsCategory {
	if (score >= 9) return "promoter";
	if (score >= 7) return "passive";
	return "detractor";
}

/**
 * Evaluates human quality grade based on Net Promoter Score.
 */
export function evaluateNpsGrade(npsScore: number): {
	grade: NpsQualityGrade;
	gradeRu: string;
} {
	if (npsScore >= 70) {
		return { grade: "world_class", gradeRu: "Мировой уровень лояльности (World-Class)" };
	}
	if (npsScore >= 50) {
		return { grade: "excellent", gradeRu: "Отличный уровень сервиса (Excellent)" };
	}
	if (npsScore >= 30) {
		return { grade: "good", gradeRu: "Хороший уровень (Good)" };
	}
	if (npsScore >= 0) {
		return { grade: "needs_improvement", gradeRu: "Требует внимания и улучшений (Needs Improvement)" };
	}
	return { grade: "critical", gradeRu: "Критический уровень оттока пациентов (Critical)" };
}

/**
 * Calculates Net Promoter Score (NPS) across a collection of score entries.
 *
 * Formula:
 * NPS = % Promoters (9-10) - % Detractors (1-6)
 */
export function calculateNetPromoterScore(
	entries: Array<NpsResponseEntry | number>,
): NpsCalculationResult {
	const distribution: Record<number, number> = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
		7: 0,
		8: 0,
		9: 0,
		10: 0,
	};

	let totalCount = 0;
	let promotersCount = 0;
	let passivesCount = 0;
	let detractorsCount = 0;
	let scoreSum = 0;

	for (const entry of entries) {
		const score = typeof entry === "number" ? entry : entry.score;
		if (score < 1 || score > 10 || !Number.isInteger(score)) {
			continue;
		}

		totalCount += 1;
		scoreSum += score;
		distribution[score] = (distribution[score] || 0) + 1;

		const category = classifyNpsScore(score);
		if (category === "promoter") {
			promotersCount += 1;
		} else if (category === "passive") {
			passivesCount += 1;
		} else {
			detractorsCount += 1;
		}
	}

	if (totalCount === 0) {
		return {
			totalResponses: 0,
			promotersCount: 0,
			promotersPercent: 0,
			passivesCount: 0,
			passivesPercent: 0,
			detractorsCount: 0,
			detractorsPercent: 0,
			npsScore: 0,
			npsScoreFormatted: "0.0",
			averageScore: 0,
			qualityGrade: "needs_improvement",
			qualityGradeRu: "Нет данных для расчета",
			scoreDistribution: distribution,
		};
	}

	const promotersPercent = Math.round((promotersCount / totalCount) * 1000) / 10;
	const passivesPercent = Math.round((passivesCount / totalCount) * 1000) / 10;
	const detractorsPercent = Math.round((detractorsCount / totalCount) * 1000) / 10;

	// NPS = % Promoters - % Detractors
	const npsScore = Math.round((promotersPercent - detractorsPercent) * 10) / 10;
	const averageScore = Math.round((scoreSum / totalCount) * 10) / 10;

	const { grade, gradeRu } = evaluateNpsGrade(npsScore);
	const sign = npsScore > 0 ? "+" : "";
	const npsScoreFormatted = `${sign}${npsScore.toFixed(1)}`;

	return {
		totalResponses: totalCount,
		promotersCount,
		promotersPercent,
		passivesCount,
		passivesPercent,
		detractorsCount,
		detractorsPercent,
		npsScore,
		npsScoreFormatted,
		averageScore,
		qualityGrade: grade,
		qualityGradeRu: gradeRu,
		scoreDistribution: distribution,
	};
}

// ─── Detractor Escalation & CRM Alert Routing ───

/**
 * Creates Detractor Alert & CRM Urgent Task when patient gives score <= 6.
 */
export function createNpsDetractorAlert(params: {
	visitId: string;
	patientId: string;
	patientFullName: string;
	patientPhone: string;
	doctorFullName: string;
	doctorSpecialty?: string;
	score: number;
	feedbackComment?: string;
	now?: Date;
}): NpsDetractorAlert {
	const {
		visitId,
		patientId,
		patientFullName,
		patientPhone,
		doctorFullName,
		doctorSpecialty = "Врач-стоматолог",
		score,
		feedbackComment,
		now = new Date(),
	} = params;

	if (score > 6) {
		throw new Error(`Оценка ${score} не является детрактором (детрактор: оценка <= 6)`);
	}

	// 1-3: Critical (SLA 15 min), 4-6: High (SLA 30 min)
	const isCritical = score <= 3;
	const severity = isCritical ? "critical" : "high";
	const slaMinutes = isCritical ? 15 : 30;

	const deadlineDate = new Date(now.getTime() + slaMinutes * 60 * 1000);
	const deadlineIso = deadlineDate.toISOString();
	const createdAtIso = now.toISOString();

	const deadlineHours = String(deadlineDate.getHours()).padStart(2, "0");
	const deadlineMins = String(deadlineDate.getMinutes()).padStart(2, "0");
	const deadlineFormatted = `${deadlineHours}:${deadlineMins}`;

	const commentText = feedbackComment?.trim() ? feedbackComment.trim() : "Без текстового комментария";

	const alertId = `alert_nps_${visitId}_${now.getTime()}`;

	const crmTask = {
		title: `🚨 ТРЕВОГА NPS (${score}/10): ${patientFullName}`,
		description:
			`Пациент ${patientFullName} (тел: ${patientPhone}) поставил оценку ${score}/10 за прием у доктора ${doctorFullName} (${doctorSpecialty}).\n` +
			`Отзыв пациента: "${commentText}"\n` +
			`Срочно связаться до ${deadlineFormatted} (SLA: ${slaMinutes} мин) для урегулирования претензии и сохранения лояльности!`,
		priority: "urgent" as const,
		status: "open" as const,
		assignedRole: "chief_doctor",
	};

	const telegramAlertText =
		`🚨 <b>ТРЕВОГА NPS: НЕГАТИВНЫЙ ОТЗЫВ (${score}/10)</b>\n\n` +
		`👤 <b>Пациент:</b> ${patientFullName}\n` +
		`📞 <b>Телефон:</b> <a href="tel:${patientPhone}">${patientPhone}</a>\n` +
		`👨‍⚕️ <b>Лечащий врач:</b> ${doctorFullName} (${doctorSpecialty})\n` +
		`💬 <b>Отзыв:</b> «<i>${commentText}</i>»\n\n` +
		`⏱️ <b>SLA реагирования:</b> <b>${slaMinutes} минут</b> (до <b>${deadlineFormatted}</b>)\n` +
		`🎯 <b>Целевые роли:</b> Главный врач, Управляющий клиники\n\n` +
		`<i>Задача автоматически создана в CRM. Пожалуйста, оперативно свяжитесь с пациентом.</i>`;

	return {
		alertId,
		visitId,
		patientId,
		patientFullName,
		patientPhone,
		doctorFullName,
		doctorSpecialty,
		score,
		feedbackComment: commentText,
		category: "detractor",
		severity,
		targetRoles: ["chief_doctor", "clinic_manager"],
		slaMinutes,
		deadline: deadlineIso,
		createdAt: createdAtIso,
		crmTask,
		telegramAlertText,
	};
}
