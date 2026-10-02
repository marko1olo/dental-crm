/**
 * Web Client Knowledge Service
 * Connects shared CRM Component Knowledge Registry with Web UI & Copilot
 * DENTE Dental CRM — Mandates 8l (Knowledge Inquisitor), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8b (Anti-Monolith <800 lines)
 */

import {
	CRM_COMPONENT_REGISTRY,
	type CrmComponentCategory,
	type CrmComponentKnowledge,
	type CrmUserRole,
	type KnowledgeSearchResult,
	type TroubleshootingSearchResult,
	findComponentKnowledge,
	findTroubleshooting,
	formatComponentForLLMContext,
	formatKnowledgeBaseOverviewForLLM,
	getComponentKnowledgeById,
	getTourTrackForComponentId,
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

export interface SelfHealingResult {
	healed: boolean;
	symptom: string;
	solution: string;
	recoverySelector?: string | undefined;
	actionTaken: "clicked" | "focused" | "escaped" | "none";
	details: string;
}

export interface CopilotKnowledgeAnswer {
	found: boolean;
	componentId?: string | undefined;
	componentName?: string | undefined;
	tourTrackId?: string | undefined;
	route?: string | undefined;
	formattedContext: string;
	summaryRu: string;
	quickSteps: string[];
	hotkeys: Record<string, string>;
	primaryAction?: { label: string; selector: string; hotkey?: string | undefined } | undefined;
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
	 * Gets a component by route
	 */
	static getComponentByRoute(route: string): CrmComponentKnowledge | undefined {
		return listAllComponents().find((c) => c.route === route);
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
	 * Instant search in knowledge base with relevance scoring (supports keywords, hotkeys, and selectors)
	 */
	static search(
		query: string,
		options?: { role?: CrmUserRole; category?: CrmComponentCategory; limit?: number },
	): KnowledgeSearchResult[] {
		return findComponentKnowledge(query, options);
	}

	/**
	 * Rapid troubleshooting search by clinical symptom or error message
	 */
	static searchTroubleshooting(
		query: string,
		limit = 5,
	): TroubleshootingSearchResult[] {
		return findTroubleshooting(query, limit);
	}

	/**
	 * Returns map of hotkeys for a given component
	 */
	static getHotkeysForComponent(componentId: string): Record<string, string> {
		const comp = getComponentKnowledgeById(componentId);
		return comp?.hotkeys || {};
	}

	/**
	 * Returns clinical quick tips for a given component
	 */
	static getQuickTipsForComponent(componentId: string): string[] {
		const comp = getComponentKnowledgeById(componentId);
		return comp?.quickTips || [];
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
				...(guide.badgeText ? { badgeText: guide.badgeText } : {}),
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

	/**
	 * Returns recommended interactive quest tour track ID for component
	 */
	static getTourTrackForComponent(componentId: string): string {
		return getTourTrackForComponentId(componentId);
	}

	/**
	 * Dispatches a client-side event to launch the interactive game quest tour
	 */
	static launchInteractiveTour(componentIdOrTrack: string): boolean {
		if (typeof window === "undefined") return false;
		const trackId =
			componentIdOrTrack === "solo_doctor" ||
			componentIdOrTrack === "reception_admin" ||
			componentIdOrTrack === "imaging_diagnostics"
				? componentIdOrTrack
				: getTourTrackForComponentId(componentIdOrTrack);

		window.dispatchEvent(
			new CustomEvent("dente:start-doctor-tour", {
				detail: { trackId, componentId: componentIdOrTrack },
			}),
		);
		return true;
	}

	/**
	 * Instant structured clinical guidance for Chairside Doctor & Staff prompts:
	 * e.g. "Как оформить возврат?", "Где смотреть снимок КТ?", "Как применить скидку по гарантии?"
	 */
	static getQuickAnswerForDoctor(query: string): CopilotKnowledgeAnswer {
		const searchResults = findComponentKnowledge(query, {
			limit: 1,
			minRelevance: 20,
		});

		if (searchResults.length === 0 || !searchResults[0]) {
			return {
				found: false,
				formattedContext: `По запросу "${query}" точных компонентов не найдено.`,
				summaryRu: "Информация не найдена в базе знаний CRM.",
				quickSteps: [],
				hotkeys: {},
			};
		}

		const comp = searchResults[0].component;
		const tourTrackId = getTourTrackForComponentId(comp.id);
		const hotkeys = comp.hotkeys || {};
		const primaryAction = comp.primaryActions[0]
			? {
					label: comp.primaryActions[0].label,
					selector: comp.primaryActions[0].selector,
					hotkey: comp.primaryActions[0].hotkey,
			  }
			: undefined;

		const quickSteps: string[] = [];
		if (comp.navigationHint) {
			quickSteps.push(`Перейдите в раздел: ${comp.navigationHint}`);
		}
		if (primaryAction) {
			const hk = primaryAction.hotkey ? ` (горячая клавиша ${primaryAction.hotkey})` : "";
			quickSteps.push(`Нажмите кнопку «${primaryAction.label}»${hk}`);
		}
		if (comp.quickTips && comp.quickTips.length > 0 && comp.quickTips[0]) {
			quickSteps.push(comp.quickTips[0]);
		}
		if (comp.troubleshooting.length > 0 && comp.troubleshooting[0]) {
			quickSteps.push(comp.troubleshooting[0].solution);
		}

		const summaryRu = `${comp.name} (${comp.shortName}): ${comp.description}`;
		const formattedContext = formatComponentForLLMContext(comp.id);

		return {
			found: true,
			componentId: comp.id,
			componentName: comp.name,
			tourTrackId,
			route: comp.route,
			formattedContext,
			summaryRu,
			quickSteps,
			hotkeys,
			primaryAction,
		};
	}

	/**
	 * Autonomous Self-Healing Engine for AI Agents & Stalled Interfaces:
	 * Recovers focus, dismisses blocking modals, clicks recoverySelectors when errors occur.
	 */
	static attemptAgentSelfHealing(
		symptomOrError: string,
		rootElement?: Document | HTMLElement,
	): SelfHealingResult {
		const doc = rootElement || (typeof document !== "undefined" ? document : null);
		if (!doc) {
			return {
				healed: false,
				symptom: symptomOrError,
				solution: "DOM context is not available.",
				actionTaken: "none",
				details: "Window/document is undefined in current environment.",
			};
		}

		const troubles = findTroubleshooting(symptomOrError, 3);
		const candidate = troubles.find((t) => t.recoverySelector) || troubles[0];

		if (!candidate) {
			// Fallback generic escape
			if (typeof doc.dispatchEvent === "function") {
				doc.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Escape",
						code: "Escape",
						keyCode: 27,
						bubbles: true,
						cancelable: true,
					}),
				);
				return {
					healed: true,
					symptom: symptomOrError,
					solution: "Отправлен глобальный сигнал Esc для сброса активного оверлея.",
					actionTaken: "escaped",
					details: "Выполнен сброс состояния клавишей Escape.",
				};
			}

			return {
				healed: false,
				symptom: symptomOrError,
				solution: "Не удалось локализовать симптом в базе знаний.",
				actionTaken: "none",
				details: "Симптом не сопоставлен с известными recoverySelectors.",
			};
		}

		const rawSelectors = candidate.recoverySelector
			? candidate.recoverySelector.split(",").map((s) => s.trim())
			: [];

		for (const sel of rawSelectors) {
			try {
				const el = doc.querySelector(sel) as HTMLElement | null;
				if (el) {
					// If button or link, trigger click
					if (
						el.tagName === "BUTTON" ||
						el.tagName === "A" ||
						el.getAttribute("role") === "button" ||
						el.getAttribute("type") === "button" ||
						el.getAttribute("type") === "submit"
					) {
						el.click();
						return {
							healed: true,
							symptom: candidate.symptom,
							solution: candidate.solution,
							recoverySelector: sel,
							actionTaken: "clicked",
							details: `Успешно выполнен клик по селектору восстановления: ${sel}`,
						};
					}

					// If input or focusable, set focus
					if (typeof el.focus === "function") {
						el.focus();
						return {
							healed: true,
							symptom: candidate.symptom,
							solution: candidate.solution,
							recoverySelector: sel,
							actionTaken: "focused",
							details: `Успешно возвращён фокус на элемент: ${sel}`,
						};
					}
				}
			} catch {
				// Continue to next selector
			}
		}

		// If specific element not in DOM, attempt modal escape if symptom indicates overlay/freeze
		const lower = symptomOrError.toLowerCase();
		if (
			lower.includes("модал") ||
			lower.includes("завис") ||
			lower.includes("перекрыт") ||
			lower.includes("фокус") ||
			lower.includes("оверлей") ||
			lower.includes("окно")
		) {
			if (typeof doc.dispatchEvent === "function") {
				doc.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Escape",
						code: "Escape",
						keyCode: 27,
						bubbles: true,
						cancelable: true,
					}),
				);
				return {
					healed: true,
					symptom: candidate.symptom,
					solution: candidate.solution,
					recoverySelector: candidate.recoverySelector,
					actionTaken: "escaped",
					details: "Нажата клавиша Escape для закрытия блокирующего модального слоя.",
				};
			}
		}

		return {
			healed: false,
			symptom: candidate.symptom,
			solution: candidate.solution,
			recoverySelector: candidate.recoverySelector,
			actionTaken: "none",
			details: `Селекторы восстановления (${candidate.recoverySelector || "отсутствуют"}) не обнаружены в текущем DOM дереве.`,
		};
	}
}

