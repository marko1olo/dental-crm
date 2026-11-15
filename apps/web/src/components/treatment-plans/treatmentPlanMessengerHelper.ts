/**
 * treatmentPlanMessengerHelper.ts — Экспорт и копирование сметы выбранного тарифа для пациента в мессенджеры.
 * Формирует чистый понятный текст без канцелярита и микро-расходников для WhatsApp / Telegram.
 */

import type { TreatmentPlanTier } from "./treatmentPlanTypes.js";
import { formatRubles } from "./treatmentPlanTypes.js";

export interface PlanBudgetShareOptions {
	readonly planId?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly openMessengerWindow?: boolean | undefined;
}

export function buildPlanBudgetText(tier: TreatmentPlanTier): string {
	const sanitizedTitle = (tier.title || "План лечения").replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");
	const lines: string[] = [
		`📋 Предварительный план лечения: ${sanitizedTitle}`,
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

	lines.push("", "Клиника DENTE · Забота о здоровье вашей улыбки");
	return lines.join("\n");
}

export async function createAndSharePlanBudgetLink(
	tier: TreatmentPlanTier,
	options?: PlanBudgetShareOptions,
): Promise<string> {
	const text = buildPlanBudgetText(tier);

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

	return text;
}
