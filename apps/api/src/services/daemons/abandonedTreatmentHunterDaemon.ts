/**
 * abandonedTreatmentHunterDaemon.ts — Weekly Retention & Abandoned Treatment Hunter Daemon.
 *
 * Scans the patient database on a weekly basis to detect broken clinical funnels:
 * 1. Implants placed >= 4 months ago without a scheduled orthopedic (crown/prosthetic) appointment.
 * 2. Endodontic treatments (root canals) >= 2 weeks ago without a scheduled permanent restoration.
 * 3. Preventive professional hygiene >= 6 months ago without a scheduled recall visit.
 *
 * Quantifies exact lost clinic revenue in RUB and generates an actionable retention campaign
 * with 1-click WhatsApp messaging approval for reception / care coordinators.
 */

import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	patients,
	visits,
} from "../../db/schema.js";

export interface AbandonedTreatmentRecord {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPhone: string | null;
	readonly funnelKind: "implant_without_crown" | "endo_without_restoration" | "hygiene_recall";
	readonly funnelTitleRu: string;
	readonly elapsedMonthsOrWeeks: string;
	readonly estimatedLostRevenueRub: number;
	readonly recommendedActionRu: string;
	readonly draftWhatsAppMessage: string;
}

export interface WeeklyRetentionSummary {
	readonly id: string;
	readonly organizationId: string;
	readonly scanDate: string;
	readonly totalAbandonedPatientsCount: number;
	readonly totalEstimatedLostRevenueRub: number;
	readonly funnels: {
		readonly implantsWithoutCrownCount: number;
		readonly implantsRevenueRub: number;
		readonly endoWithoutRestorationCount: number;
		readonly endoRevenueRub: number;
		readonly hygieneRecallCount: number;
		readonly hygieneRevenueRub: number;
	};
	readonly topPriorityPatients: AbandonedTreatmentRecord[];
	readonly createdAt: string;
}

/**
 * Runs the weekly retention scan for an organization.
 */
export async function runWeeklyRetentionScan(options?: {
	organizationId?: string | undefined;
	now?: Date | undefined;
}): Promise<WeeklyRetentionSummary[]> {
	try {
		const now = options?.now ?? new Date();
		const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
		const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
		const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

		// Get list of active patients
		const conditions = [eq(patients.status, "active")];
		if (options?.organizationId) {
			conditions.push(eq(patients.organizationId, options.organizationId));
		}

		const activePatients = await db
			.select({
				id: patients.id,
				organizationId: patients.organizationId,
				fullName: patients.fullName,
				phone: patients.phone,
				createdAt: patients.createdAt,
			})
			.from(patients)
			.where(and(...conditions))
			.limit(200);

		const orgMap = new Map<string, AbandonedTreatmentRecord[]>();

		for (const p of activePatients) {
			const orgId = p.organizationId;
			if (!orgMap.has(orgId)) {
				orgMap.set(orgId, []);
			}

			const patientFullName = p.fullName || "Пациент";

			// 1. Check if patient has future appointments
			const futureAppts = await db
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						eq(appointments.patientId, p.id),
						gte(appointments.startsAt, now),
						or(
							eq(appointments.status, "planned"),
							eq(appointments.status, "confirmed"),
						),
					),
				)
				.limit(1);

			if (futureAppts.length > 0) {
				// Patient is actively scheduled, skip retention alarm
				continue;
			}

			// 2. Check past completed visits for implants, endodontics, and hygiene
			const pastVisits = await db
				.select({
					id: visits.id,
					complaint: visits.complaint,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					doctorSummary: visits.doctorSummary,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.organizationId, orgId),
						eq(visits.patientId, p.id),
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(5);

			let identified = false;

			for (const v of pastVisits) {
				const textContext = `${v.complaint || ""} ${v.diagnosis || ""} ${v.treatmentPlan || ""} ${v.doctorSummary || ""}`.toLowerCase();

				// Case A: Implant placed >= 4 months ago
				if (v.createdAt <= fourMonthsAgo && (textContext.includes("имплант") || textContext.includes("установка имплантата") || textContext.includes("a16.07.054"))) {
					const months = Math.round((now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
					orgMap.get(orgId)!.push({
						patientId: p.id,
						patientFullName,
						patientPhone: p.phone,
						funnelKind: "implant_without_crown",
						funnelTitleRu: "Имплантат без постоянной коронки",
						elapsedMonthsOrWeeks: `${months} мес. назад`,
						estimatedLostRevenueRub: 55000,
						recommendedActionRu: "Пригласить на установку формирователя десны / снятие слепков под постоянную коронку",
						draftWhatsAppMessage: `Здравствуйте, ${patientFullName}! Прошло ${months} месяцев с момента установки дентального имплантата. Имплантат успешно остеоинтегрировался, и настало время завершить лечение — установить красивую постоянную коронку. Записать вас на консультацию к ортопеду?`,
					});
					identified = true;
					break;
				}

				// Case B: Endodontics >= 2 weeks ago
				if (!identified && v.createdAt <= twoWeeksAgo && (textContext.includes("пульпит") || textContext.includes("периодонтит") || textContext.includes("канал") || textContext.includes("временная пломба"))) {
					const weeks = Math.round((now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7));
					orgMap.get(orgId)!.push({
						patientId: p.id,
						patientFullName,
						patientPhone: p.phone,
						funnelKind: "endo_without_restoration",
						funnelTitleRu: "Лечение каналов без постоянной пломбы",
						elapsedMonthsOrWeeks: `${weeks} нед. назад`,
						estimatedLostRevenueRub: 12000,
						recommendedActionRu: "Записать на постоянную реставрацию зуба во избежание реинфекции",
						draftWhatsAppMessage: `Здравствуйте, ${patientFullName}! Вы проходили лечение корневых каналов ${weeks} недели назад. Чтобы защитить зуб от сколов и бактерий, необходимо поставить постоянную пломбу / коронку. Когда вам удобно подойти на прием?`,
					});
					identified = true;
					break;
				}

				// Case C: Hygiene >= 6 months ago
				if (!identified && v.createdAt <= sixMonthsAgo && (textContext.includes("гигиен") || textContext.includes("чистк") || textContext.includes("air-flow"))) {
					const months = Math.round((now.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
					orgMap.get(orgId)!.push({
						patientId: p.id,
						patientFullName,
						patientPhone: p.phone,
						funnelKind: "hygiene_recall",
						funnelTitleRu: "Пора на повторную профгигиену (6+ мес)",
						elapsedMonthsOrWeeks: `${months} мес. назад`,
						estimatedLostRevenueRub: 6500,
						recommendedActionRu: "Напомнить о плановом гигиеническом осмотре и чистке",
						draftWhatsAppMessage: `Здравствуйте, ${patientFullName}! Прошло ${months} месяцев с вашей последней профгигиены. Для сохранения здоровья десен и гарантии на пломбы врачи рекомендуют проходить чистку каждые 6 месяцев. Подберем удобное время?`,
					});
					identified = true;
					break;
				}
			}
		}

		const summaries: WeeklyRetentionSummary[] = [];

		for (const [orgId, records] of orgMap.entries()) {
			let totalRevenue = 0;
			let implantsCount = 0;
			let implantsRev = 0;
			let endoCount = 0;
			let endoRev = 0;
			let hygieneCount = 0;
			let hygieneRev = 0;

			for (const r of records) {
				totalRevenue += r.estimatedLostRevenueRub;
				if (r.funnelKind === "implant_without_crown") {
					implantsCount++;
					implantsRev += r.estimatedLostRevenueRub;
				} else if (r.funnelKind === "endo_without_restoration") {
					endoCount++;
					endoRev += r.estimatedLostRevenueRub;
				} else if (r.funnelKind === "hygiene_recall") {
					hygieneCount++;
					hygieneRev += r.estimatedLostRevenueRub;
				}
			}

			summaries.push({
				id: `retention_summary_${orgId}_${Date.now()}`,
				organizationId: orgId,
				scanDate: now.toLocaleDateString("ru-RU"),
				totalAbandonedPatientsCount: records.length,
				totalEstimatedLostRevenueRub: totalRevenue,
				funnels: {
					implantsWithoutCrownCount: implantsCount,
					implantsRevenueRub: implantsRev,
					endoWithoutRestorationCount: endoCount,
					endoRevenueRub: endoRev,
					hygieneRecallCount: hygieneCount,
					hygieneRevenueRub: hygieneRev,
				},
				topPriorityPatients: records.slice(0, 20),
				createdAt: now.toISOString(),
			});
		}

		return summaries;
	} catch {
		return [];
	}
}
