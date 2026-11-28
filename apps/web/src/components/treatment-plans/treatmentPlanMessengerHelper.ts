/**
 * treatmentPlanMessengerHelper.ts — Сквозная отправка сметы плана лечения пациенту
 * (публичная ссылка с 3 тарифами, WhatsApp и Telegram-бот).
 */

import { generateUuidV7 } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import type { TreatmentPlanTier } from "./treatmentPlanTypes.js";
import { formatRubles } from "./treatmentPlanTypes.js";

export interface PlanBudgetShareOptions {
	readonly planId?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly openMessengerWindow?: boolean | undefined;
}

export interface TelegramFollowupResult {
	readonly ok: boolean;
	readonly messageId?: string | undefined;
	readonly message?: string | undefined;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildPlanBudgetText(
	tier: TreatmentPlanTier,
	publicShareUrl?: string | null,
): string {
	const sanitizedTitle = (tier.title || "План лечения").replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");
	const lines: string[] = [
		`Предварительный план лечения: ${sanitizedTitle}`,
		`Итоговая стоимость: ${formatRubles(tier.totalRub)}`,
		`Гарантия клиники: ${tier.warrantyYears} ${tier.warrantyYears === 1 ? "год" : tier.warrantyYears === 3 ? "года" : "лет"}`,
	];

	if (tier.totalRub > 0) {
		const perMonth12 = Math.round(tier.totalRub / 12);
		lines.push(`Беспроцентная рассрочка 0%: от ${formatRubles(perMonth12)}/мес на 12 месяцев`);
	}

	if (tier.stages && tier.stages.length > 0) {
		lines.push("", "Этапы лечения:");
		tier.stages.forEach((stg, idx) => {
			lines.push(`${idx + 1}. ${stg.title} — ${formatRubles(stg.totalRub)}`);
		});
	}

	if (publicShareUrl) {
		lines.push("", `Сравнить варианты и согласовать онлайн: ${publicShareUrl}`);
	}

	lines.push("", "Клиника DENTE · Забота о здоровье вашей улыбки");
	return lines.join("\n");
}

function resolveAbsoluteShareUrl(rawUrl: string): string {
	if (/^https?:\/\//i.test(rawUrl)) {
		return rawUrl;
	}
	if (typeof window !== "undefined" && window.location?.origin) {
		const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
		return `${window.location.origin}${normalizedPath}`;
	}
	return rawUrl;
}

export async function createPlanBudgetPublicLink(
	planId: string,
): Promise<string | null> {
	if (!UUID_REGEX.test(planId.trim()) || isDemoShowcaseMode()) {
		return null;
	}
	try {
		const res = await fetch(`/api/v1/treatment-plans/${planId.trim()}/create-budget-link`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
				...getDenteAuthHeaders(),
			},
			body: JSON.stringify({}),
		});
		if (!res.ok) {
			logger.warn(`[treatmentPlanMessengerHelper] create-budget-link failed with HTTP ${res.status}`);
			return null;
		}
		const rawJson = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
		const payload = (rawJson?.data ?? rawJson) as Record<string, unknown>;
		const rawShareUrl =
			typeof payload.shareUrl === "string"
				? payload.shareUrl
				: typeof payload.publicUrl === "string"
					? payload.publicUrl
					: null;
		return rawShareUrl ? resolveAbsoluteShareUrl(rawShareUrl) : null;
	} catch (err) {
		logger.warn("[treatmentPlanMessengerHelper] Ошибка создания ссылки на смету:", err);
		return null;
	}
}

export async function createAndSharePlanBudgetLink(
	tier: TreatmentPlanTier,
	options?: PlanBudgetShareOptions,
): Promise<string> {
	let shareUrl: string | null = null;
	if (options?.planId) {
		shareUrl = await createPlanBudgetPublicLink(options.planId);
	}

	const text = buildPlanBudgetText(tier, shareUrl);

	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// fallback silently if clipboard permission is denied
		}
	}

	if (options?.openMessengerWindow && options?.patientPhone && typeof window !== "undefined") {
		const cleanPhone = options.patientPhone.replace(/\D/g, "");
		if (cleanPhone.length >= 10) {
			const formattedPhone = cleanPhone.startsWith("8") ? `7${cleanPhone.slice(1)}` : cleanPhone;
			const encodedText = encodeURIComponent(text);
			const waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
			window.open(waUrl, "_blank", "noopener,noreferrer");
		}
	}

	if (shareUrl) {
		showToast("Ссылка на интерактивную смету создана и скопирована", "success", 3500);
	}

	return text;
}

export async function sendTreatmentPlanTelegramFollowup(
	planId: string,
	force = false,
): Promise<TelegramFollowupResult> {
	if (!UUID_REGEX.test(planId.trim())) {
		return {
			ok: false,
			message: "Сохраните план лечения перед отправкой в Telegram.",
		};
	}

	try {
		const res = await fetch(`/api/telegram/treatment-plans/${planId.trim()}/send-followup`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
				...getDenteAuthHeaders(),
			},
			body: JSON.stringify(force ? { force: true } : {}),
		});

		let rawJson: ({ data?: Record<string, unknown> } & Record<string, unknown>) | Record<string, unknown> = {};
		try {
			rawJson = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
		} catch (parseErr) {
			logger.warn("[treatmentPlanMessengerHelper] Failed to parse Telegram followup JSON:", parseErr);
		}
		const payload = (rawJson?.data ?? rawJson) as Record<string, unknown>;

		if (!res.ok) {
			const msg =
				typeof payload.message === "string"
					? payload.message
					: `Не удалось отправить план в Telegram (HTTP ${res.status})`;
			return { ok: false, message: msg };
		}

		return {
			ok: true,
			messageId: typeof payload.messageId === "string" ? payload.messageId : undefined,
			message:
				typeof payload.message === "string"
					? payload.message
					: "План лечения отправлен пациенту в Telegram.",
		};
	} catch (err) {
		logger.warn("[treatmentPlanMessengerHelper] Telegram followup error:", err);
		return {
			ok: false,
			message: "Ошибка соединения при отправке плана в Telegram.",
		};
	}
}
