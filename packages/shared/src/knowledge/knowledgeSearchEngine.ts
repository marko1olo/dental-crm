import { CRM_COMPONENT_REGISTRY } from "./crmComponentRegistry.js";
import type {
	CrmComponentKnowledge,
	KnowledgeSearchOptions,
	KnowledgeSearchResult,
} from "./schemas.js";

/**
 * Knowledge Search Engine & LLM Context Retrieval
 * DENTE Dental CRM — Mandates 8l (Knowledge Inquisitor), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty)
 */

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}\s_-]/gu, " ")
		.trim();
}

function tokenize(text: string): string[] {
	const normalized = normalizeText(text);
	const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 1);
	const subTokens = normalized.split(/[\s_-]+/).filter((t) => t.length > 1);
	return Array.from(new Set([...rawTokens, ...subTokens]));
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
 * Searches components by natural language query, role, or category
 */
export function findComponentKnowledge(
	query: string,
	options: KnowledgeSearchOptions = {},
): KnowledgeSearchResult[] {
	const { role, category, limit = 5, minRelevance = 10 } = options;
	const normalizedQuery = normalizeText(query);
	const queryTokens = tokenize(query);

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

		// Keywords matching
		for (const kw of component.keywords) {
			const normKw = normalizeText(kw);
			if (normKw === normalizedQuery) {
				score += 60;
				matchedTerms.push(kw);
			} else if (normKw.includes(normalizedQuery) || normalizedQuery.includes(normKw)) {
				score += 25;
				matchedTerms.push(kw);
			}
		}

		// Token-based matching
		for (const token of queryTokens) {
			if (component.id.toLowerCase().includes(token)) {
				score += 20;
				matchedTerms.push(token);
			}
			if (normName.includes(token)) {
				score += 15;
				matchedTerms.push(token);
			}
			for (const kw of component.keywords) {
				if (normalizeText(kw).includes(token)) {
					score += 15;
					matchedTerms.push(kw);
				}
			}
			if (normalizeText(component.description).includes(token)) {
				score += 8;
				matchedTerms.push(token);
			}
			// Search in actions
			for (const act of component.primaryActions) {
				if (
					normalizeText(act.label).includes(token) ||
					normalizeText(act.effect).includes(token)
				) {
					score += 10;
					matchedTerms.push(act.label);
				}
			}
			// Search in troubleshooting
			for (const tr of component.troubleshooting) {
				if (
					normalizeText(tr.symptom).includes(token) ||
					normalizeText(tr.solution).includes(token)
				) {
					score += 12;
					matchedTerms.push(tr.symptom);
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

/**
 * Formats a component's operational knowledge into a clean Markdown block
 * specifically tailored for AI Agent prompts (Chairside Copilot, external LLMs)
 */
export function formatComponentForLLMContext(
	componentIdOrQuery: string,
	maxBudgetChars = 3000,
): string {
	let comp = getComponentKnowledgeById(componentIdOrQuery);
	if (!comp) {
		const search = findComponentKnowledge(componentIdOrQuery, { limit: 1 });
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
		`- **Роль:** ${comp.primaryRole.join(", ")}`,
		`- **Назначение:** ${comp.description}`,
		`- **Клинический сценарий (Workflow):** ${comp.clinicalWorkflow}`,
		"",
		"#### Доступные действия и проверенные селекторы для UI-автоматизации:",
	];

	for (const action of comp.primaryActions) {
		const hotkeyStr = action.hotkey ? ` [Хоткей: ${action.hotkey}]` : "";
		lines.push(
			`  * **${action.label}**${hotkeyStr}: селектор \`${action.selector}\` — ${action.effect}`,
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

	const result = lines.join("\n");
	return result.length > maxBudgetChars
		? `${result.slice(0, maxBudgetChars)}...\n[Усечено по бюджету контекста]`
		: result;
}

/**
 * Returns an ultra-compact summary of all CRM modules for inclusion in LLM system prompt.
 * Enables AI agents to know every capability, route and primary action in the CRM.
 */
export function formatKnowledgeBaseOverviewForLLM(): string {
	const lines: string[] = [
		"# КАРТА ЗНАНИЙ И КОМПОНЕНТОВ CRM DENTE (FOR AI AGENTS & COPILOT)",
		"В системе заложены следующие канонические компоненты:",
	];

	for (const c of CRM_COMPONENT_REGISTRY) {
		const acts = c.primaryActions.map((a) => `[${a.label}: ${a.selector}]`).join(", ");
		lines.push(
			`- **${c.name}** (\`${c.id}\`, роут: \`${c.route}\`, Tier ${c.tier}): ${c.shortName}. Действия: ${acts || "—"}. Ключи: ${c.keywords.slice(0, 5).join(", ")}.`,
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
