/**
 * Web Client Knowledge Service
 * Connects shared CRM Component Knowledge Registry with Web UI & Copilot
 * DENTE Dental CRM — Mandates 8l (Knowledge Inquisitor), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty)
 */

import {
	CRM_COMPONENT_REGISTRY,
	type CrmComponentCategory,
	type CrmComponentKnowledge,
	type CrmUserRole,
	type KnowledgeSearchResult,
	findComponentKnowledge,
	formatComponentForLLMContext,
	formatKnowledgeBaseOverviewForLLM,
	getComponentKnowledgeById,
	listAllComponents,
} from "@dental/shared";

export interface ComponentTourStep {
	targetSelector: string;
	title: string;
	content: string;
	placement?: "top" | "bottom" | "left" | "right" | "center";
	highlightType: "pulse" | "outline" | "arrow" | "pill";
	badgeText?: string;
	actionId?: string;
}

export interface ComponentInteractiveTour {
	componentId: string;
	componentName: string;
	route: string;
	steps: ComponentTourStep[];
}

export class KnowledgeService {
	/**
	 * Returns all components from the registry
	 */
	static getAllComponents(): readonly CrmComponentKnowledge[] {
		return listAllComponents();
	}

	/**
	 * Gets a single component by ID
	 */
	static getComponentById(id: string): CrmComponentKnowledge | undefined {
		return getComponentKnowledgeById(id);
	}

	/**
	 * Returns components grouped by categories for Knowledge Base UI tabs
	 */
	static getComponentsByCategory(
		category?: CrmComponentCategory,
	): CrmComponentKnowledge[] {
		const all = listAllComponents();
		if (!category) return [...all];
		return all.filter((c) => c.category === category);
	}

	/**
	 * Returns components relevant for a specific clinical role
	 */
	static getComponentsByRole(role: CrmUserRole): CrmComponentKnowledge[] {
		const all = listAllComponents();
		if (role === "all") return [...all];
		return all.filter(
			(c) => c.primaryRole.includes(role) || c.primaryRole.includes("all"),
		);
	}

	/**
	 * Instant search in knowledge base with relevance scoring
	 */
	static search(
		query: string,
		options?: { role?: CrmUserRole; category?: CrmComponentCategory; limit?: number },
	): KnowledgeSearchResult[] {
		return findComponentKnowledge(query, options);
	}

	/**
	 * Generates game-like "lead by hand" step-by-step interactive tour for a component
	 * with selectors, visual cues, pulsing circles and action highlights.
	 */
	static generateInteractiveTour(componentId: string): ComponentInteractiveTour | null {
		const comp = getComponentKnowledgeById(componentId);
		if (!comp) return null;

		const steps: ComponentTourStep[] = [];

		// 1. Initial overview step
		const mainSelector = Object.values(comp.selectors)[0] || `[data-route="${comp.route}"]`;
		steps.push({
			targetSelector: mainSelector,
			title: `Знакомство: ${comp.name}`,
			content: `${comp.description} Нажмите 'Далее', чтобы изучить ключевые кнопки и рабочий процесс.`,
			placement: "center",
			highlightType: "outline",
			badgeText: `Tier ${comp.tier}`,
		});

		// 2. Action steps based on visual guides & primary actions
		for (const guide of comp.visualGuides) {
			steps.push({
				targetSelector: guide.selector,
				title: guide.element,
				content: guide.description,
				placement: "bottom",
				highlightType: guide.highlightType,
				badgeText: guide.badgeText,
			});
		}

		for (const action of comp.primaryActions) {
			// Avoid duplicate selectors
			if (steps.some((s) => s.targetSelector === action.selector)) continue;

			steps.push({
				targetSelector: action.selector,
				title: action.label,
				content: `${action.effect}${action.hotkey ? ` Быстрый доступ: ${action.hotkey}.` : ""}`,
				placement: "bottom",
				highlightType: "pulse",
				badgeText: action.hotkey || "Действие",
				actionId: action.id,
			});
		}

		// 3. Final summary step
		steps.push({
			targetSelector: mainSelector,
			title: "Готово к работе!",
			content: `Клинический сценарий: ${comp.clinicalWorkflow}. При возникновении вопросов вы всегда можете спросить ассистента ДЕНТА.`,
			placement: "center",
			highlightType: "pill",
			badgeText: "Успех",
		});

		return {
			componentId: comp.id,
			componentName: comp.name,
			route: comp.route,
			steps,
		};
	}

	/**
	 * Formats markdown knowledge context for Chairside Copilot or external LLMs
	 */
	static getLLMContextForQuery(query: string): string {
		return formatComponentForLLMContext(query);
	}

	/**
	 * Formats system overview of the entire CRM for Copilot initial prompt
	 */
	static getCRMSystemOverview(): string {
		return formatKnowledgeBaseOverviewForLLM();
	}
}
