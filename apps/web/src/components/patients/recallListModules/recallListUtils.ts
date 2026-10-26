/**
 * recallListUtils.ts
 * Formatting and invitation builder utilities for Recall List.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import type { RecallCandidate } from "@dental/shared";

export function formatDate(value: string | null): string {
	if (!value) return "приёмов не было";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("ru-RU");
}

export function invitationText(candidate: RecallCandidate, clinicName: string): string {
	const rawName = typeof candidate?.fullName === "string" ? candidate.fullName.trim() : "";
	const name = rawName.split(" ")[1] || rawName || "Пациент";
	return `${name}, здравствуйте! ${clinicName}: прошло больше полугода с последнего осмотра — самое время проверить зубы. Записаться можно по телефону клиники.`;
}

export function deriveClinicalBadge(reason: string, months: number | null): { text: string; cls: string } {
	const lower = (reason || "").toLowerCase();
	if (lower.includes("гигиен") || lower.includes("air-flow") || lower.includes("чистк")) {
		return { text: "Пора на гигиену • 6 мес", cls: "ops-state--ok" };
	}
	if (lower.includes("ортопед") || lower.includes("коронк") || lower.includes("винир")) {
		return { text: "Осмотр после ортопедии • 1 год", cls: "ops-state--ok" };
	}
	if (lower.includes("имплант") || lower.includes("синус")) {
		return { text: "Контроль импланта • 3 мес", cls: "ops-state--ok" };
	}
	if (months !== null && months > 12) {
		return { text: "Пропущен плановый осмотр", cls: "ops-state--warn" };
	}
	return { text: "Плановый профосмотр", cls: "ops-state--ok" };
}
