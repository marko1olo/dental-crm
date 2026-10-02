import { CRM_COMPONENT_REGISTRY } from "./crmComponentRegistry.js";
import type {
	CrmComponentKnowledge,
	KnowledgeSearchOptions,
	KnowledgeSearchResult,
} from "./schemas.js";

/**
 * Knowledge Search Engine & LLM Context Retrieval
 * DENTE Dental CRM — Mandates 8l (Knowledge Inquisitor), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8b (Anti-Monolith <800 lines)
 */

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}\s_-]/gu, " ")
		.trim();
}

const STOP_WORDS = new Set([
	"по", "как", "где", "что", "это", "на", "при", "из", "под", "или", "для", "до", "от",
	"за", "со", "ко", "же", "ли", "мы", "вы", "он", "она", "оно", "они", "был", "быть",
	"есть", "а", "но", "да", "не", "нет", "то", "так", "все", "всех", "всей", "чем",
	"data", "tour", "testid", "btn", "action", "модуль", "компонент", "система",
	"the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by", "how", "where", "what",
]);

export function stemWord(word: string): string {
	if (word.length <= 3) return word;
	return word.replace(
		/(иями|ями|ами|ого|его|ому|ему|ыми|ими|ую|юю|ей|ой|ий|ый|ое|ее|ая|яя|ов|ев|ей|ам|ям|ах|ях|ом|ем|а|я|о|е|у|ю|ы|и|ь)$/iu,
		"",
	);
}

function tokenize(text: string, filterStopWords = true): string[] {
	const normalized = normalizeText(text);
	const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 1);
	const subTokens = normalized.split(/[\s_-]+/).filter((t) => t.length > 1);
	const combined = Array.from(new Set([...rawTokens, ...subTokens]));
	if (!filterStopWords) return combined;
	const filtered = combined.filter((t) => !STOP_WORDS.has(t));
	return filtered.length > 0 ? filtered : combined;
}


/**
 * Retrieves a component by exact ID
 */
export function getComponentKnowledgeById(
	id: string,
): CrmComponentKnowledge | undefined {
	return CRM_COMPONENT_REGISTRY.find((c) => c.id === id);
}

/**
 * Returns all registered components
 */
export function listAllComponents(): readonly CrmComponentKnowledge[] {
	return CRM_COMPONENT_REGISTRY;
}

/**
 * Returns the default guided tour track ID for a CRM component
 */
export function getTourTrackForComponentId(componentId: string): string {
	switch (componentId) {
		case "cbct_mpr_studio":
			return "imaging_diagnostics";
		case "schedule_grid":
		case "patient_card_record":
		case "analytics_dashboard":
		case "leads_telephony":
			return "reception_admin";
		default:
			return "solo_doctor";
	}
}


/**
 * Searches components by natural language query, role, category, hotkey, or selector
 */
export function findComponentKnowledge(
	query: string,
	options: KnowledgeSearchOptions = {},
): KnowledgeSearchResult[] {
	const { role, category, limit = 5, minRelevance = 10 } = options;
	const normalizedQuery = normalizeText(query);
	const queryTokens = tokenize(query);
	const rawQueryLower = query.toLowerCase().trim();

	const scoredResults: KnowledgeSearchResult[] = [];

	for (const component of CRM_COMPONENT_REGISTRY) {
		// Filter by role if specified
		if (
			role &&
			role !== "all" &&
			!component.primaryRole.includes(role) &&
			!component.primaryRole.includes("all")
		) {
			continue;
		}

		// Filter by category if specified
		if (category && component.category !== category) {
			continue;
		}

		let score = 0;
		const matchedTerms: string[] = [];

		// Exact ID match: highest priority
		const compIdLower = component.id.toLowerCase();
		const compIdClean = compIdLower.replace(/[_-]/g, " ");
		const queryClean = normalizedQuery.replace(/[_-]/g, " ");
		if (compIdLower === normalizedQuery || compIdClean === queryClean) {
			score += 100;
			matchedTerms.push(component.id);
		} else if (
			compIdLower.includes(normalizedQuery) ||
			compIdClean.includes(queryClean)
		) {
			score += 50;
			matchedTerms.push(component.id);
		}

		// Exact name match
		const normName = normalizeText(component.name);
		const normShortName = normalizeText(component.shortName);
		if (normName === normalizedQuery || normShortName === normalizedQuery) {
			score += 80;
			matchedTerms.push(component.name);
		} else if (
			normName.includes(normalizedQuery) ||
			normShortName.includes(normalizedQuery)
		) {
			score += 40;
			matchedTerms.push(component.shortName);
		}

		// Check exact hotkeys in component.hotkeys
		if (component.hotkeys) {
			for (const [hk, desc] of Object.entries(component.hotkeys)) {
				const normHk = normalizeText(hk);
				const isExact =
					normHk === normalizedQuery ||
					hk.toLowerCase() === rawQueryLower;
				const isToken =
					queryTokens.includes(normHk) ||
					queryTokens.includes(hk.toLowerCase());
				const isSubstr =
					normHk.length > 2 &&
					(normHk.includes(normalizedQuery) ||
						(normalizedQuery.length > 2 &&
							normalizedQuery.includes(normHk)));
				if (isExact || isToken || isSubstr) {
					score += 55;
					matchedTerms.push(hk);
				}
			}
		}

		// Check selectors
		for (const [selKey, selVal] of Object.entries(component.selectors)) {
			const selValLower = selVal.toLowerCase();
			if (selValLower === rawQueryLower) {
				score += 200;
				matchedTerms.push(selKey);
			} else if (selValLower.includes(rawQueryLower)) {
				score += 150;
				matchedTerms.push(selKey);
			} else if (rawQueryLower.length > 5 && rawQueryLower.includes(selValLower)) {
				score += 60;
				matchedTerms.push(selKey);
			}
		}

		// Check primaryActions selectors directly
		for (const act of component.primaryActions) {
			const actSelLower = act.selector.toLowerCase();
			if (actSelLower === rawQueryLower) {
				score += 200;
				matchedTerms.push(act.selector);
			} else if (actSelLower.includes(rawQueryLower)) {
				score += 150;
				matchedTerms.push(act.selector);
			}
		}

		// Keywords matching
		for (const kw of component.keywords) {
			const normKw = normalizeText(kw);
			if (normKw === normalizedQuery) {
				score += 60;
				matchedTerms.push(kw);
			} else if (
				normKw.includes(normalizedQuery) ||
				(normKw.length > 2 && normalizedQuery.includes(normKw)) ||
				queryTokens.includes(normKw)
			) {
				score += 25;
				matchedTerms.push(kw);
			}
		}

		// Token-based matching
		for (const token of queryTokens) {
			const stemToken = stemWord(token);
			const hasStem = stemToken.length >= 3;

			if (component.id.toLowerCase().includes(token) || (hasStem && component.id.toLowerCase().includes(stemToken))) {
				score += 25;
				matchedTerms.push(token);
			}
			if (normName.includes(token) || (hasStem && normName.includes(stemToken))) {
				score += 25;
				matchedTerms.push(token);
			}
			for (const kw of component.keywords) {
				const normKw = normalizeText(kw);
				if (normKw.includes(token) || (hasStem && (normKw.includes(stemToken) || stemWord(normKw).includes(stemToken)))) {
					score += 25;
					matchedTerms.push(kw);
				}
			}
			if (normalizeText(component.description).includes(token) || (hasStem && normalizeText(component.description).includes(stemToken))) {
				score += 10;
				matchedTerms.push(token);
			}
			// Search in hotkeys
			if (component.hotkeys) {
				for (const [hk, desc] of Object.entries(component.hotkeys)) {
					if (
						normalizeText(hk).includes(token) ||
						normalizeText(desc).includes(token)
					) {
						score += 18;
						matchedTerms.push(hk);
					}
				}
			}
			// Search in actions: label, effect, selector, hotkey
			for (const act of component.primaryActions) {
				const normLabel = normalizeText(act.label);
				const normEffect = normalizeText(act.effect);
				if (
					normLabel.includes(token) ||
					normEffect.includes(token) ||
					(hasStem && (normLabel.includes(stemToken) || normEffect.includes(stemToken)))
				) {
					score += 20;
					matchedTerms.push(act.label);
				}
				if (act.hotkey && normalizeText(act.hotkey).includes(token)) {
					score += 18;
					matchedTerms.push(act.hotkey);
				}
				if (act.selector.toLowerCase().includes(token)) {
					score += 15;
					matchedTerms.push(act.selector);
				}
			}
			// Search in troubleshooting: symptom, solution, recoverySelector
			for (const tr of component.troubleshooting) {
				const normSym = normalizeText(tr.symptom);
				const normSol = normalizeText(tr.solution);
				if (
					normSym.includes(token) ||
					normSol.includes(token) ||
					(hasStem && (normSym.includes(stemToken) || normSol.includes(stemToken)))
				) {
					score += 20;
					matchedTerms.push(tr.symptom);
				}
				if (
					tr.recoverySelector &&
					tr.recoverySelector.toLowerCase().includes(token)
				) {
					score += 15;
					matchedTerms.push(tr.recoverySelector);
				}
			}
			// Search in FAQ
			for (const item of component.faq) {
				if (
					normalizeText(item.question).includes(token) ||
					normalizeText(item.answer).includes(token)
				) {
					score += 10;
					matchedTerms.push(item.question);
				}
			}
		}

		if (score >= minRelevance) {
			scoredResults.push({
				component,
				score,
				matchedTerms: Array.from(new Set(matchedTerms)),
				highlightSnippet: component.description,
			});
		}
	}

	// Sort descending by score
	scoredResults.sort((a, b) => b.score - a.score);
	return scoredResults.slice(0, limit);
}

export interface TroubleshootingSearchResult {
	componentId: string;
	componentName: string;
	symptom: string;
	cause: string;
	solution: string;
	recoverySelector?: string;
	score: number;
}

/**
 * Rapid troubleshooting lookup by clinical symptom or error message
 */
export function findTroubleshooting(
	query: string,
	limit = 5,
): TroubleshootingSearchResult[] {
	const normalizedQuery = normalizeText(query);
	const queryTokens = tokenize(query);
	const results: TroubleshootingSearchResult[] = [];

	for (const comp of CRM_COMPONENT_REGISTRY) {
		for (const tr of comp.troubleshooting) {
			let score = 0;
			const normSymptom = normalizeText(tr.symptom);
			const normSolution = normalizeText(tr.solution);

			if (
				normSymptom.includes(normalizedQuery) ||
				normSolution.includes(normalizedQuery)
			) {
				score += 50;
			}

			for (const token of queryTokens) {
				const stemToken = stemWord(token);
				const hasStem = stemToken.length >= 3;

				if (normSymptom.includes(token) || (hasStem && normSymptom.includes(stemToken))) score += 25;
				if (normSolution.includes(token) || (hasStem && normSolution.includes(stemToken))) score += 20;
				if (normalizeText(tr.cause).includes(token) || (hasStem && normalizeText(tr.cause).includes(stemToken))) score += 12;
				if (
					tr.recoverySelector &&
					(tr.recoverySelector.toLowerCase().includes(token) || (hasStem && tr.recoverySelector.toLowerCase().includes(stemToken)))
				) {
					score += 20;
				}
			}

			if (score >= 10) {
				results.push({
					componentId: comp.id,
					componentName: comp.name,
					symptom: tr.symptom,
					cause: tr.cause,
					solution: tr.solution,
					...(tr.recoverySelector ? { recoverySelector: tr.recoverySelector } : {}),
					score,
				});
			}
		}
	}

	results.sort((a, b) => b.score - a.score);
	return results.slice(0, limit);
}

/**
 * Formats a component's operational knowledge into a clean Markdown block
 * specifically tailored for AI Agent prompts (Chairside Copilot, external LLMs)
 */
export function formatComponentForLLMContext(
	componentIdOrQuery: string,
	maxBudgetChars = 6000,
): string {
	let comp = getComponentKnowledgeById(componentIdOrQuery);
	if (!comp) {
		const search = findComponentKnowledge(componentIdOrQuery, {
			limit: 1,
			minRelevance: 30,
		});
		if (search.length > 0 && search[0]) {
			comp = search[0].component;
		}
	}

	if (!comp) {
		return `[Знания CRM]: Компонент "${componentIdOrQuery}" не найден в реестре.`;
	}

	const lines: string[] = [
		`### [КОМПОНЕНТ CRM: ${comp.name} (id: ${comp.id})]`,
		`- **Категория:** ${comp.categoryRu} (роут: \`${comp.route}\`, Tier: ${comp.tier})`,
		`- **Навигация:** ${comp.navigationHint || `Вкладка #${comp.route}`}`,
		`- **Роль:** ${comp.primaryRole.join(", ")}`,
		`- **Назначение:** ${comp.description}`,
		`- **Клинический сценарий (Workflow):** ${comp.clinicalWorkflow}`,
	];

	if (comp.quickTips && comp.quickTips.length > 0) {
		lines.push("", "#### Быстрые советы и клинические инварианты:");
		for (const tip of comp.quickTips) {
			lines.push(`  * ${tip}`);
		}
	}

	if (comp.hotkeys && Object.keys(comp.hotkeys).length > 0) {
		lines.push("", "#### Горячие клавиши экрана (Hotkeys):");
		for (const [key, desc] of Object.entries(comp.hotkeys)) {
			lines.push(`  * **${key}**: ${desc}`);
		}
	}

	lines.push("", "#### Доступные действия и проверенные селекторы для UI-автоматизации:");

	for (const action of comp.primaryActions) {
		const hotkeyStr = action.hotkey ? ` [Хоткей: ${action.hotkey}]` : "";
		const confirmStr = action.requiresConfirmation ? " *(требует подтверждения)*" : "";
		lines.push(
			`  * **${action.label}**${hotkeyStr}: селектор \`${action.selector}\` — ${action.effect}${confirmStr}`,
		);
	}

	if (Object.keys(comp.selectors).length > 0) {
		lines.push("", "#### Ключевые селекторы экрана:");
		for (const [key, sel] of Object.entries(comp.selectors)) {
			lines.push(`  * \`${key}\`: \`${sel}\``);
		}
	}

	if (comp.troubleshooting.length > 0) {
		lines.push("", "#### Диагностика и устранение проблем (Troubleshooting):");
		for (const tr of comp.troubleshooting) {
			lines.push(`  * **Симптом:** ${tr.symptom}`);
			lines.push(`    - *Причина:* ${tr.cause}`);
			lines.push(`    - *Решение:* ${tr.solution}`);
			if (tr.recoverySelector) {
				lines.push(`    - *Селектор восстановления:* \`${tr.recoverySelector}\``);
			}
		}
	}

	if (comp.faq.length > 0) {
		lines.push("", "#### Частые вопросы (FAQ):");
		for (const q of comp.faq) {
			lines.push(`  * **В:** ${q.question}`);
			lines.push(`    **О:** ${q.answer}`);
		}
	}

	lines.push(
		"",
		`- **Суверенитет масштаба (Мандат 8n):** ${comp.scaleAdaptability}`,
	);

	if (comp.complianceNotes) {
		lines.push(`- **Регламенты РФ:** ${comp.complianceNotes}`);
	}

	const tourTrack = getTourTrackForComponentId(comp.id);
	lines.push(
		"",
		"#### Интерактивное обучение и тур:",
		`  * **Режим обучения:** \`${tourTrack}\``,
		`  * [Запустить обучение по этому разделу](action:launch-tour:${tourTrack}:${comp.id})`,
	);

	const result = lines.join("\n");
	return result.length > maxBudgetChars
		? `${result.slice(0, maxBudgetChars)}...\n[Усечено по бюджету контекста]`
		: result;
}

/**
 * Returns an ultra-compact summary of all CRM modules for inclusion in LLM system prompt.
 * Enables AI agents to know every capability, route, hotkey and primary action in the CRM.
 */
export function formatKnowledgeBaseOverviewForLLM(): string {
	const lines: string[] = [
		"# КАРТА ЗНАНИЙ И КОМПОНЕНТОВ CRM DENTE (FOR AI AGENTS & COPILOT)",
		"В системе заложены следующие канонические компоненты с проверенными селекторами и хоткеями:",
	];

	for (const c of CRM_COMPONENT_REGISTRY) {
		const acts = c.primaryActions
			.map((a) => {
				const hk = a.hotkey ? ` [${a.hotkey}]` : "";
				return `[${a.label}${hk}: ${a.selector}]`;
			})
			.join(", ");
		const nav = c.navigationHint ? ` | Навигация: ${c.navigationHint}` : "";
		lines.push(
			`- **${c.name}** (\`${c.id}\`, роут: \`${c.route}\`, Tier ${c.tier}${nav}): ${c.shortName}. Действия: ${acts || "—"}. Ключи: ${c.keywords.slice(0, 5).join(", ")}.`,
		);
	}

	return lines.join("\n");
}

/**
 * Exports registry as plain JSON string for external telemetry or offline cache
 */
export function exportKnowledgeRegistryAsJson(): string {
	return JSON.stringify(CRM_COMPONENT_REGISTRY, null, 2);
}
