import { useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";

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

export const VIEW_CANONICAL_NAMES: Record<
	string,
	{ labelRu: string; canonicalKey: string }
> = {
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
	scanner: { labelRu: "СанПиН", canonicalKey: "SanPiN" },
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
	const capitalized = raw
		? raw.charAt(0).toUpperCase() + raw.slice(1)
		: "Workspace";
	return { canonicalKey: capitalized, labelRu: capitalized };
}

/**
 * Formats a standardized UI Context header for Copilot turn messages:
 * e.g. [UI Context: View='Odontogram', PatientId='uuid', ActiveTooth=36, ActiveDoctor='Dr. Иванов', ToothFormula='...', Diagnoses='...', Form043='...', Allergies='...']
 */
export function formatCopilotUiContextHeader(
	ctx?: Partial<CopilotUiContext>,
): string {
	const canonical = getCanonicalViewName(ctx?.view ?? "Odontogram");
	const viewVal = ctx?.view
		? (VIEW_CANONICAL_NAMES[ctx.view.toLowerCase()]?.canonicalKey ??
			ctx.view)
		: canonical.canonicalKey;

	const patientIdVal = ctx?.patientId
		? `'${String(ctx.patientId).replace(/'/g, "\\'")}'`
		: "null";

	let toothVal = "null";
	if (ctx?.activeTooth !== null && ctx?.activeTooth !== undefined) {
		const num = Number(ctx.activeTooth);
		if (!Number.isNaN(num) && num > 0) {
			toothVal = String(num);
		} else {
			toothVal = `'${String(ctx.activeTooth).replace(/'/g, "\\'")}'`;
		}
	}

	const doctorVal = ctx?.activeDoctor
		? `'${String(ctx.activeDoctor).replace(/'/g, "\\'")}'`
		: "null";

	const parts: string[] = [
		`View='${viewVal}'`,
		`PatientId=${patientIdVal}`,
		`ActiveTooth=${toothVal}`,
		`ActiveDoctor=${doctorVal}`,
	];

	if (ctx?.toothFormula && Object.keys(ctx.toothFormula).length > 0) {
		const serialized = JSON.stringify(ctx.toothFormula).replace(/'/g, "\\'");
		parts.push(`ToothFormula='${serialized}'`);
	}

	if (ctx?.diagnosesByTooth && Object.keys(ctx.diagnosesByTooth).length > 0) {
		const serialized = JSON.stringify(ctx.diagnosesByTooth).replace(/'/g, "\\'");
		parts.push(`Diagnoses='${serialized}'`);
	}

	if (ctx?.clinical043Context && Object.keys(ctx.clinical043Context).length > 0) {
		const serialized = JSON.stringify(ctx.clinical043Context).replace(/'/g, "\\'");
		parts.push(`Form043='${serialized}'`);
	}

	if (ctx?.allergies && ctx.allergies.length > 0) {
		const serialized = JSON.stringify(ctx.allergies).replace(/'/g, "\\'");
		parts.push(`Allergies='${serialized}'`);
	}

	return `[UI Context: ${parts.join(", ")}]`;
}

export interface ParsedCopilotMessage {
	context: CopilotUiContext | null;
	cleanText: string;
	rawHeader: string | null;
}

/**
 * Parses out UI context from a full message string if present.
 */
export function parseCopilotUiContextHeader(
	fullText: string,
): ParsedCopilotMessage {
	if (!fullText || typeof fullText !== "string") {
		return { context: null, cleanText: "", rawHeader: null };
	}

	const headerMatch = fullText.match(
		/^\[UI Context:\s*([\s\S]*?)\](?:\r?\n)?/i,
	);

	if (!headerMatch) {
		return { context: null, cleanText: fullText, rawHeader: null };
	}

	const rawHeader = headerMatch[0];
	const headerBody = headerMatch[1] ?? "";

	const viewMatch = headerBody.match(/View='([^']*)'/i);
	const patientIdMatch = headerBody.match(/PatientId=(null|'[^']*')/i);
	const activeToothMatch = headerBody.match(/ActiveTooth=(null|[0-9]+|'[^']*')/i);
	const activeDoctorMatch = headerBody.match(/ActiveDoctor=(null|'[^']*')/i);
	const toothFormulaMatch = headerBody.match(/ToothFormula='([^']*)'/i);
	const diagnosesMatch = headerBody.match(/Diagnoses='([^']*)'/i);
	const form043Match = headerBody.match(/Form043='([^']*)'/i);
	const allergiesMatch = headerBody.match(/Allergies='([^']*)'/i);

	const rawView = viewMatch?.[1] ?? "";
	const rawPatientId = patientIdMatch?.[1] ?? "null";
	const rawActiveTooth = activeToothMatch?.[1] ?? "null";
	const rawActiveDoctor = activeDoctorMatch?.[1] ?? "null";

	const canonical = getCanonicalViewName(rawView);

	const patientId =
		rawPatientId === "null"
			? null
			: rawPatientId.replace(/^'|'$/g, "").replace(/\\'/g, "'");

	let activeTooth: number | string | null = null;
	if (rawActiveTooth !== "null") {
		const unquoted = rawActiveTooth
			.replace(/^'|'$/g, "")
			.replace(/\\'/g, "'");
		const num = Number(unquoted);
		activeTooth = !Number.isNaN(num) && num > 0 ? num : unquoted;
	}

	const activeDoctor =
		rawActiveDoctor === "null"
			? null
			: rawActiveDoctor.replace(/^'|'$/g, "").replace(/\\'/g, "'");

	let toothFormula: Record<string, string> | undefined = undefined;
	if (toothFormulaMatch?.[1]) {
		try {
			toothFormula = JSON.parse(toothFormulaMatch[1].replace(/\\'/g, "'"));
		} catch {}
	}

	let diagnosesByTooth: Record<string, string> | undefined = undefined;
	if (diagnosesMatch?.[1]) {
		try {
			diagnosesByTooth = JSON.parse(diagnosesMatch[1].replace(/\\'/g, "'"));
		} catch {}
	}

	let clinical043Context: Clinical043Snapshot | undefined = undefined;
	if (form043Match?.[1]) {
		try {
			clinical043Context = JSON.parse(form043Match[1].replace(/\\'/g, "'"));
		} catch {}
	}

	let allergies: string[] | undefined = undefined;
	if (allergiesMatch?.[1]) {
		try {
			allergies = JSON.parse(allergiesMatch[1].replace(/\\'/g, "'"));
		} catch {}
	}

	const cleanText = fullText.slice(rawHeader.length).trimStart();

	return {
		context: {
			view: canonical.canonicalKey,
			viewLabel: canonical.labelRu,
			patientId,
			patientName: null,
			allergies,
			activeTooth,
			activeDoctor,
			toothFormula,
			diagnosesByTooth,
			clinical043Context,
		},
		cleanText,
		rawHeader,
	};
}

/**
 * Enriches a user message by attaching the current UI context header.
 */
export function enrichMessageWithUiContext(
	message: string,
	customCtx?: Partial<CopilotUiContext>,
): string {
	const trimmed = (message ?? "").trim();
	if (!trimmed) return "";

	// If message already contains a UI context header, replace or keep it
	if (trimmed.startsWith("[UI Context:")) {
		return trimmed;
	}

	const header = formatCopilotUiContextHeader(
		customCtx ?? getCurrentCopilotUiContext(),
	);
	return `${header}\n${trimmed}`;
}

/**
 * Returns current snapshot of Copilot UI context from Zustand stores and window globals.
 */
export function getCurrentCopilotUiContext(): CopilotUiContext {
	const appStore = useAppStore.getState();
	const patientStore = usePatientStore.getState();
	const visitStore = useVisitStore.getState();

	const rawView = String(appStore.currentView ?? "shift");
	const canonical = getCanonicalViewName(rawView);

	const patientId =
		patientStore.selectedPatientId ??
		appStore.activePatientId ??
		appStore.dashboard?.activeVisit?.patientId ??
		null;

	let patientName: string | null = null;
	let allergies: string[] | undefined = undefined;

	if (patientId && appStore.dashboard?.patients) {
		const found = (appStore.dashboard.patients as Array<{
			id: string;
			fullName?: string;
			allergies?: string[];
		}>).find((p) => p.id === patientId);
		if (found?.fullName) {
			patientName = found.fullName;
		}
		if (Array.isArray(found?.allergies) && found.allergies.length > 0) {
			allergies = found.allergies;
		}
	}

	const activeTooth = appStore.activeTooth ?? null;

	let activeDoctor: string | null = appStore.activeDoctorName ?? null;
	if (!activeDoctor && appStore.dashboard?.clinicSettings?.staff) {
		const staff = appStore.dashboard.clinicSettings.staff;
		const doc = staff.find(
			(m: { role?: string; active?: boolean; fullName?: string }) =>
				m.role === "doctor" && m.active,
		);
		if (doc?.fullName) {
			activeDoctor = doc.fullName;
		}
	}

	// Active tooth formula from visitStore (filter out 'idle')
	const toothFormula: Record<string, string> = {};
	if (visitStore.visitToothStateByCode) {
		for (const [code, state] of Object.entries(visitStore.visitToothStateByCode)) {
			if (state && state !== "idle") {
				toothFormula[code] = state;
			}
		}
	}

	// Active diagnoses by tooth
	const diagnosesByTooth: Record<string, string> = {};
	if (visitStore.visitAiDiagnosesByCode) {
		for (const [code, diag] of Object.entries(visitStore.visitAiDiagnosesByCode)) {
			if (diag && diag.trim()) {
				diagnosesByTooth[code] = diag.trim();
			}
		}
	}

	// Active 043/u clinical diary form fields
	const vForm = visitStore.visitNoteForm;
	let clinical043Context: Clinical043Snapshot | undefined = undefined;
	if (vForm) {
		const hasContent =
			Boolean(vForm.complaint?.trim()) ||
			Boolean(vForm.anamnesis?.trim()) ||
			Boolean(vForm.objectiveStatus?.trim()) ||
			Boolean(vForm.diagnosis?.trim()) ||
			Boolean(vForm.treatmentPlan?.trim());

		if (hasContent) {
			clinical043Context = {
				complaints: vForm.complaint?.trim() || undefined,
				anamnesis: vForm.anamnesis?.trim() || undefined,
				objectiveStatus: vForm.objectiveStatus?.trim() || undefined,
				diagnosis: vForm.diagnosis?.trim() || undefined,
				treatmentPlan: vForm.treatmentPlan?.trim() || undefined,
			};
		}
	}

	return {
		view: canonical.canonicalKey,
		viewLabel: canonical.labelRu,
		patientId,
		patientName,
		allergies,
		activeTooth,
		activeDoctor,
		toothFormula: Object.keys(toothFormula).length > 0 ? toothFormula : undefined,
		diagnosesByTooth: Object.keys(diagnosesByTooth).length > 0 ? diagnosesByTooth : undefined,
		clinical043Context,
	};
}

declare global {
	interface Window {
		__denteCopilotContext?: CopilotUiContext;
		__denteSetCopilotContext?: (ctx: Partial<CopilotUiContext>) => void;
	}
}

/**
 * Synchronizes context snapshot to window global for test runners & automation.
 */
export function syncCopilotContextToWindow(ctx: CopilotUiContext): void {
	if (typeof window !== "undefined") {
		window.__denteCopilotContext = ctx;
	}
}

/**
 * Reactive React hook for two-way UI Context synchronization with Copilot.
 */
export function useCopilotContextSync() {
	const storeCurrentView = useAppStore((s) => s.currentView);
	const storeActiveTooth = useAppStore((s) => s.activeTooth);
	const storeActiveDoctorName = useAppStore((s) => s.activeDoctorName);
	const storeAppActivePatientId = useAppStore((s) => s.activePatientId);
	const storeSelectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const storeDashboard = useAppStore((s) => s.dashboard);
	const storeToothStates = useVisitStore((s) => s.visitToothStateByCode);
	const storeAiDiagnoses = useVisitStore((s) => s.visitAiDiagnosesByCode);
	const storeVisitNoteForm = useVisitStore((s) => s.visitNoteForm);

	const setActiveTooth = useAppStore((s) => s.setActiveTooth);
	const setActiveDoctorName = useAppStore((s) => s.setActiveDoctorName);
	const setActivePatientId = useAppStore((s) => s.setActivePatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	// Ensure live state resolution even under SSR / renderToString
	const currentView = storeCurrentView ?? useAppStore.getState().currentView ?? "shift";
	const activeTooth = storeActiveTooth ?? useAppStore.getState().activeTooth ?? null;
	const activeDoctorName = storeActiveDoctorName ?? useAppStore.getState().activeDoctorName ?? null;
	const appActivePatientId = storeAppActivePatientId ?? useAppStore.getState().activePatientId ?? null;
	const selectedPatientId = storeSelectedPatientId ?? usePatientStore.getState().selectedPatientId ?? null;
	const dashboard = storeDashboard ?? useAppStore.getState().dashboard ?? null;

	const toothStates = storeToothStates ?? useVisitStore.getState().visitToothStateByCode ?? {};
	const aiDiagnoses = storeAiDiagnoses ?? useVisitStore.getState().visitAiDiagnosesByCode ?? {};
	const visitNoteForm = storeVisitNoteForm ?? useVisitStore.getState().visitNoteForm ?? null;

	const canonical = useMemo(
		() => getCanonicalViewName(currentView),
		[currentView],
	);

	const effectivePatientId = useMemo(
		() =>
			selectedPatientId ??
			appActivePatientId ??
			dashboard?.activeVisit?.patientId ??
			null,
		[selectedPatientId, appActivePatientId, dashboard?.activeVisit?.patientId],
	);

	const patientRecord = useMemo(() => {
		if (!effectivePatientId || !dashboard?.patients) return null;
		return (
			(dashboard.patients as Array<{
				id: string;
				fullName?: string;
				allergies?: string[];
			}>).find((p) => p.id === effectivePatientId) ?? null
		);
	}, [effectivePatientId, dashboard?.patients]);

	const patientName = patientRecord?.fullName ?? null;
	const allergies = useMemo(() => {
		if (
			Array.isArray(patientRecord?.allergies) &&
			patientRecord.allergies.length > 0
		) {
			return patientRecord.allergies;
		}
		return undefined;
	}, [patientRecord?.allergies]);

	const effectiveDoctor = useMemo(() => {
		if (activeDoctorName) return activeDoctorName;
		if (dashboard?.clinicSettings?.staff) {
			const doc = dashboard.clinicSettings.staff.find(
				(m: { role?: string; active?: boolean; fullName?: string }) =>
					m.role === "doctor" && m.active,
			);
			return doc?.fullName ?? null;
		}
		return null;
	}, [activeDoctorName, dashboard?.clinicSettings?.staff]);

	const toothFormula = useMemo(() => {
		const res: Record<string, string> = {};
		if (toothStates) {
			for (const [code, state] of Object.entries(toothStates)) {
				if (state && state !== "idle") {
					res[code] = state;
				}
			}
		}
		return Object.keys(res).length > 0 ? res : undefined;
	}, [toothStates]);

	const diagnosesByTooth = useMemo(() => {
		const res: Record<string, string> = {};
		if (aiDiagnoses) {
			for (const [code, diag] of Object.entries(aiDiagnoses)) {
				if (diag && diag.trim()) {
					res[code] = diag.trim();
				}
			}
		}
		return Object.keys(res).length > 0 ? res : undefined;
	}, [aiDiagnoses]);

	const clinical043Context = useMemo((): Clinical043Snapshot | undefined => {
		if (!visitNoteForm) return undefined;
		const hasContent =
			Boolean(visitNoteForm.complaint?.trim()) ||
			Boolean(visitNoteForm.anamnesis?.trim()) ||
			Boolean(visitNoteForm.objectiveStatus?.trim()) ||
			Boolean(visitNoteForm.diagnosis?.trim()) ||
			Boolean(visitNoteForm.treatmentPlan?.trim());

		if (!hasContent) return undefined;

		return {
			complaints: visitNoteForm.complaint?.trim() || undefined,
			anamnesis: visitNoteForm.anamnesis?.trim() || undefined,
			objectiveStatus: visitNoteForm.objectiveStatus?.trim() || undefined,
			diagnosis: visitNoteForm.diagnosis?.trim() || undefined,
			treatmentPlan: visitNoteForm.treatmentPlan?.trim() || undefined,
		};
	}, [visitNoteForm]);

	const context: CopilotUiContext = useMemo(
		() => ({
			view: canonical.canonicalKey,
			viewLabel: canonical.labelRu,
			patientId: effectivePatientId,
			patientName,
			allergies,
			activeTooth,
			activeDoctor: effectiveDoctor,
			toothFormula,
			diagnosesByTooth,
			clinical043Context,
		}),
		[
			canonical.canonicalKey,
			canonical.labelRu,
			effectivePatientId,
			patientName,
			allergies,
			activeTooth,
			effectiveDoctor,
			toothFormula,
			diagnosesByTooth,
			clinical043Context,
		],
	);

	const contextHeader = useMemo(
		() => formatCopilotUiContextHeader(context),
		[context],
	);

	// Synchronize to window global
	useEffect(() => {
		syncCopilotContextToWindow(context);
		if (typeof window !== "undefined") {
			window.__denteSetCopilotContext = (partial) => {
				if (partial.activeTooth !== undefined)
					setActiveTooth(partial.activeTooth);
				if (partial.activeDoctor !== undefined)
					setActiveDoctorName(partial.activeDoctor);
				if (partial.patientId !== undefined) {
					setActivePatientId(partial.patientId);
					setSelectedPatientId(partial.patientId);
				}
			};
		}
		return () => {
			if (typeof window !== "undefined") {
				delete window.__denteSetCopilotContext;
			}
		};
	}, [
		context,
		setActiveTooth,
		setActiveDoctorName,
		setActivePatientId,
		setSelectedPatientId,
	]);

	const enrichMessage = useCallback(
		(messageText: string) =>
			enrichMessageWithUiContext(messageText, context),
		[context],
	);

	const setContext = useCallback(
		(partial: Partial<CopilotUiContext>) => {
			if (partial.activeTooth !== undefined)
				setActiveTooth(partial.activeTooth);
			if (partial.activeDoctor !== undefined)
				setActiveDoctorName(partial.activeDoctor);
			if (partial.patientId !== undefined) {
				setActivePatientId(partial.patientId);
				setSelectedPatientId(partial.patientId);
			}
		},
		[
			setActiveTooth,
			setActiveDoctorName,
			setActivePatientId,
			setSelectedPatientId,
		],
	);

	return {
		context,
		contextHeader,
		enrichMessage,
		setContext,
		setActiveTooth,
		setActiveDoctor: setActiveDoctorName,
		setActivePatient: useCallback(
			(id: string | null) => {
				setActivePatientId(id);
				setSelectedPatientId(id);
			},
			[setActivePatientId, setSelectedPatientId],
		),
	};
}
