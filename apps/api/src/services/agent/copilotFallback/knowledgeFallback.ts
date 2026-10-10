/**
 * knowledgeFallback.ts — Statutory Clinical Knowledge Answers & Tour Navigation Links.
 * Formats rich guidance answers for CRM navigation, hotkeys, and troubleshooting (Mandates 8l, 8e, 8n).
 */

import {
	findComponentKnowledge,
	getTourTrackForComponentId,
	type KnowledgeSearchResult,
} from "@dental/shared";

/**
 * Formats a rich, statutory clinical knowledge response for Copilot fallback streaming.
 */
export function formatCopilotKnowledgeAnswer(
	match: KnowledgeSearchResult,
	userText: string,
): string {
	const comp = match.component;
	const lower = userText.toLowerCase();
	const tourTrack = getTourTrackForComponentId(comp.id);

	// Check if any FAQ specifically answers this question
	const relevantFaq = comp.faq.find((f) => {
		const qLower = f.question.toLowerCase();
		const words = lower.split(/\s+/).filter((w) => w.length > 3);
		return words.some((w) => qLower.includes(w));
	});

	const lines: string[] = [];
	lines.push(`### ${comp.name}`);
	lines.push(`**Раздел:** \`${comp.route}\` (${comp.shortName})`);
	if (comp.navigationHint) {
		lines.push(`**Навигация:** ${comp.navigationHint}`);
	}

	if (relevantFaq) {
		lines.push("", `**Ответ:** ${relevantFaq.answer}`);
	} else {
		lines.push("", `**Описание:** ${comp.description}`);
	}

	lines.push("", "**Пошаговый регламент:**");
	if (comp.clinicalWorkflow) {
		lines.push(comp.clinicalWorkflow);
	}

	if (comp.primaryActions.length > 0) {
		lines.push("", "**Действия и селекторы интерфейса:**");
		for (const act of comp.primaryActions.slice(0, 4)) {
			const hk = act.hotkey ? ` (клавиша \`${act.hotkey}\`)` : "";
			lines.push(`- **${act.label}**${hk}: селектор \`${act.selector}\``);
		}
	}

	if (comp.hotkeys && Object.keys(comp.hotkeys).length > 0) {
		lines.push("", "**Горячие клавиши:**");
		for (const [key, desc] of Object.entries(comp.hotkeys)) {
			lines.push(`- \`${key}\`: ${desc}`);
		}
	}

	if (comp.troubleshooting.length > 0) {
		const tr =
			comp.troubleshooting.find((t) => {
				const sLower = t.symptom.toLowerCase();
				return lower
					.split(/\s+/)
					.some((w) => w.length > 3 && sLower.includes(w));
			}) || comp.troubleshooting[0];
		if (tr) {
			lines.push("", `**Решение проблем:** ${tr.solution}`);
		}
	}

	lines.push(
		"",
		`[Запустить обучение по этому разделу](action:launch-tour:${tourTrack}:${comp.id})`,
	);

	return lines.join("\n");
}

/**
 * Checks if query is a knowledge inquiry and returns formatted answer if found.
 */
export function tryResolveKnowledgeInquiry(
	userText: string,
	lower: string,
): string | null {
	const isHowToQuestion =
		/^(?:как(?:\s|$)|где(?:\s|$)|куда(?:\s|$)|инструкци|мануал|руководств|помощь|обучени)/i.test(
			lower,
		);

	const isLiveOperationalQuery =
		!isHowToQuestion &&
		(lower.includes("кто следующий") ||
			lower.includes("кто записан") ||
			lower.includes("что делали") ||
			lower.includes("прошлый прием") ||
			lower.includes("прошлом приеме") ||
			lower.includes("баланс") ||
			lower.includes("депозит") ||
			lower.includes("долг") ||
			lower.includes("выручк") ||
			lower.includes("заработ") ||
			lower.includes("пациенты сегодня") ||
			lower.includes("пациентов сегодня") ||
			lower.includes("сколько пациентов") ||
			lower.includes("расписание") ||
			lower.includes("график") ||
			lower.includes("скидк") ||
			lower.includes("кариес") ||
			lower.includes("пульпит") ||
			lower.includes("периодонтит"));

	const isQuestionOrInquiry =
		isHowToQuestion ||
		/^(?:подскажи|расскажи|справк[аеу]|что делать)(?:\s|$)/i.test(lower);

	if (isQuestionOrInquiry && !isLiveOperationalQuery) {
		const knowledgeMatches = findComponentKnowledge(userText, { limit: 1 });
		if (
			knowledgeMatches.length > 0 &&
			knowledgeMatches[0] &&
			knowledgeMatches[0].score >= 35
		) {
			return formatCopilotKnowledgeAnswer(knowledgeMatches[0], userText);
		}
	}

	return null;
}

/**
 * Direct knowledge lookup for high-confidence component queries (score >= 100).
 */
export function tryResolveDirectComponentKnowledge(
	userText: string,
): string | null {
	const fallbackKnowledgeMatches = findComponentKnowledge(userText, {
		limit: 1,
	});
	if (
		fallbackKnowledgeMatches.length > 0 &&
		fallbackKnowledgeMatches[0] &&
		fallbackKnowledgeMatches[0].score >= 100
	) {
		return formatCopilotKnowledgeAnswer(fallbackKnowledgeMatches[0], userText);
	}
	return null;
}
