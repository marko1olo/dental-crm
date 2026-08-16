import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { communicationEvents } from "../../db/schema/communications.js";
import { patientTaskTickets } from "../../db/schema/patients.js";
import { withTenantCtx } from "../../db/rls.js";

export interface FeedbackMetrics {
	nps: number;
	csat: number;
	totalFeedback: number;
}

export class PatientFeedbackAggregator {
	/**
	 * Чистый расчет NPS: % Промоутеров (9-10) - % Детракторов (0-6)
	 */
	public static calculateNpsFromScores(scores: readonly number[]): number {
		if (scores.length === 0) return 0;
		const promoters = scores.filter((s) => s >= 9 && s <= 10).length;
		const detractors = scores.filter((s) => s >= 0 && s <= 6).length;
		const nps = ((promoters - detractors) / scores.length) * 100;
		return Number(nps.toFixed(1));
	}

	/**
	 * Чистый расчет среднего CSAT (1-5)
	 */
	public static calculateCsatFromScores(scores: readonly number[]): number {
		const validScores = scores.filter((s) => s >= 1 && s <= 5);
		if (validScores.length === 0) return 0;
		const total = validScores.reduce((sum, s) => sum + s, 0);
		return Number((total / validScores.length).toFixed(2));
	}

	/**
	 * Проверка необходимости эскалации детрактора (оценка <= 6)
	 */
	public static shouldEscalateNegativeFeedback(score: number): boolean {
		return score <= 6;
	}

	/**
	 * NPS из базы данных по организации
	 */
	public static async calculateNps(organizationId: string): Promise<number> {
		return withTenantCtx(organizationId, async (tx) => {
			const results = await tx
				.select({
					score: sql<number>`(message::json->>'score')::int`,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						sql`message::json->>'score' IS NOT NULL`,
					),
				);

			if (results.length === 0) return 0;
			return this.calculateNpsFromScores(results.map((r) => r.score));
		});
	}

	/**
	 * Avg CSAT (1-5) из базы данных
	 */
	public static async calculateCsat(organizationId: string): Promise<number> {
		return withTenantCtx(organizationId, async (tx) => {
			const results = await tx
				.select({
					score: sql<number>`(message::json->>'csat')::int`,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						sql`message::json->>'csat' IS NOT NULL`,
					),
				);

			if (results.length === 0) return 0;
			return this.calculateCsatFromScores(results.map((r) => r.score));
		});
	}

	/**
	 * Обработка отзыва и эскалация при необходимости
	 */
	public static async processFeedback(
		organizationId: string,
		patientId: string,
		score: number,
	): Promise<void> {
		if (this.shouldEscalateNegativeFeedback(score)) {
			await withTenantCtx(organizationId, async (tx) => {
				await tx.insert(patientTaskTickets).values({
					organizationId,
					patientId,
					title: "Отработка негатива пациента",
					description: `Пациент поставил низкую оценку NPS: ${score}. Срок отработки: 2 часа.`,
					priority: "high",
					status: "pending",
				});
			});
		}
	}
}
