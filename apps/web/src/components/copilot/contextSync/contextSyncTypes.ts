export interface Clinical043Snapshot {
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
}

export interface CopilotUiContext {
	/** Canonical view key (e.g. 'Odontogram', 'Schedule', 'Patients', 'Finance', 'Inventory') */
	view: string;
	/** Human-readable localized view label in Russian */
	viewLabel: string;
	/** Active Patient UUID if selected/active */
	patientId: string | null;
	/** Active Patient Full Name if available */
	patientName: string | null;
	/** Patient allergies if known */
	allergies?: string[] | undefined;
	/** Currently selected tooth FDI number (e.g. 36, 16, 21) */
	activeTooth: number | string | null;
	/** Active Doctor Full Name (e.g. "Dr. Иванов") */
	activeDoctor: string | null;
	/** Active tooth statuses/pathologies map (e.g. { "36": "treatment", "16": "planned" }) */
	toothFormula?: Record<string, string> | undefined;
	/** Active diagnoses by tooth code (e.g. { "36": "K02.1 Кариес дентина (глубокий)" }) */
	diagnosesByTooth?: Record<string, string> | undefined;
	/** Active 043/u clinical diary form fields */
	clinical043Context?: Clinical043Snapshot | undefined;
	/** Optional additional context metadata */
	additionalContext?: Record<string, unknown> | undefined;
}

export type CopilotContextState = CopilotUiContext;

export interface ParsedCopilotMessage {
	context: CopilotUiContext | null;
	cleanText: string;
	rawHeader: string | null;
}

export const VIEW_CANONICAL_NAMES: Record<string, { labelRu: string; canonicalKey: string }> = {
	shift: { labelRu: "Смена", canonicalKey: "Shift" },
	schedule: { labelRu: "Расписание", canonicalKey: "Schedule" },
	patients: { labelRu: "Пациенты", canonicalKey: "Patients" },
	imaging: { labelRu: "Снимки / КЛКТ", canonicalKey: "Imaging" },
	visit: { labelRu: "Одонтограмма", canonicalKey: "Odontogram" },
	odontogram: { labelRu: "Одонтограмма", canonicalKey: "Odontogram" },
	documents: { labelRu: "Документы", canonicalKey: "Documents" },
	finance: { labelRu: "Финансы", canonicalKey: "Finance" },
	analytics: { labelRu: "Аналитика", canonicalKey: "Analytics" },
	communications: { labelRu: "Связь", canonicalKey: "Communications" },
	inventory: { labelRu: "Склад", canonicalKey: "Inventory" },
	scanner: { labelRu: "Сканер документов", canonicalKey: "Scanner" },
	leads: { labelRu: "Обращения", canonicalKey: "Leads" },
	settings: { labelRu: "Настройки", canonicalKey: "Settings" },
	marketing: { labelRu: "Маркетинг", canonicalKey: "Marketing" },
};

/**
 * Resolves canonical view key and Russian label from raw view name.
 */
export function getCanonicalViewName(viewKey: string | null | undefined): {
	canonicalKey: string;
	labelRu: string;
} {
	const raw = String(viewKey ?? "").toLowerCase().trim();
	if (VIEW_CANONICAL_NAMES[raw]) {
		return VIEW_CANONICAL_NAMES[raw];
	}
	const capitalized = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Workspace";
	return { canonicalKey: capitalized, labelRu: capitalized };
}
