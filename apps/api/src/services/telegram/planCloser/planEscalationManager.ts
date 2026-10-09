import { and, desc, eq, lte, or, sql } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import { treatmentPlans } from "../../../db/schema.js";
import { sendTelegramTextMessage } from "../../../telegramTransport.js";
import { DEFAULT_FOLLOW_UP_MIN_HOURS } from "./constants.js";
import { getPendingPlanById } from "./planCallbackProcessor.js";
import { getPlanCloserRootScreen } from "./planMessagePresenter.js";
import type { PendingTreatmentPlanSummary } from "./types.js";

/**
 * Находит всех кандидатов на бережный follow-up через 48 часов после сметы.
 */
export async function findFollowUpCandidates(
	organizationId?: string,
	minHoursSinceCreation = DEFAULT_FOLLOW_UP_MIN_HOURS,
): Promise<PendingTreatmentPlanSummary[]> {
	try {
		const thresholdDate = new Date(Date.now() - minHoursSinceCreation * 3600 * 1000);

		const conditions = [
			or(
				eq(treatmentPlans.status, "Draft"),
				sql`${treatmentPlans.status}::text IN ('Draft', 'Proposed', 'draft', 'proposed')`,
			),
			lte(treatmentPlans.createdAt, thresholdDate),
		];

		if (organizationId) {
			conditions.push(eq(treatmentPlans.organizationId, organizationId));
		}

		const runner = organizationId
			? (fn: (tx: any) => Promise<any>) => withTenantCtx(organizationId, fn)
			: (fn: (tx: any) => Promise<any>) => withSuperuserBypass(fn);

		const candidates = await runner(async (tx) => {
			return await tx
				.select({
					id: treatmentPlans.id,
					patientId: treatmentPlans.patientId,
					organizationId: treatmentPlans.organizationId,
				})
				.from(treatmentPlans)
				.where(and(...conditions))
				.orderBy(desc(treatmentPlans.createdAt))
				.limit(50);
		});

		const results: PendingTreatmentPlanSummary[] = [];
		for (const cand of candidates) {
			const plan = await getPendingPlanById(cand.id, cand.organizationId);
			if (plan && plan.telegramChatLinked) {
				results.push(plan);
			}
		}

		return results;
	} catch (err) {
		console.error("[TelegramTreatmentPlanCloserService] findFollowUpCandidates error:", err);
		return [];
	}
}

/**
 * Отправляет автоматический follow-up через Telegram пациенту.
 */
export async function sendPlanFollowUpMessage(options: {
	planId: string;
	botToken: string;
	organizationId?: string | undefined;
	force?: boolean | undefined;
}): Promise<{ ok: boolean; messageId?: number | null; error?: string }> {
	const plan = await getPendingPlanById(options.planId, options.organizationId);
	if (!plan) {
		return { ok: false, error: "Treatment plan not found" };
	}

	if (!plan.followUpEligible && !options.force) {
		return { ok: false, error: "Plan is not eligible for follow-up (less than 48 hours)" };
	}

	if (!plan.telegramChatId) {
		return { ok: false, error: "Patient does not have a linked Telegram chat" };
	}

	const screen = getPlanCloserRootScreen(plan);
	const sendResult = await sendTelegramTextMessage({
		botToken: options.botToken,
		chatId: plan.telegramChatId,
		text: screen.text,
		replyMarkup: screen.replyMarkup,
	});

	if (!sendResult.ok) {
		return { ok: false, error: sendResult.details || "Failed to send Telegram message" };
	}

	return { ok: true, messageId: sendResult.telegramMessageId };
}
