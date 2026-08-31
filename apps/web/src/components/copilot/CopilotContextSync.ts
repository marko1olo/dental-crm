import { useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";

export interface CopilotUiContext {
	/** Canonical view key (e.g. 'Odontogram', 'Schedule', 'Patients', 'Finance', 'Inventory') */
	view: string;
	/** Human-readable localized view label in Russian */
	viewLabel: string;
	/** Active Patient UUID if selected/active */
	patientId: string | null;
	/** Active Patient Full Name if available */
	patientName: string | null;
	/** Currently selected tooth FDI number (e.g. 36, 16, 21) */
	activeTooth: number | string | null;
	/** Active Doctor Full Name (e.g. "Dr. Иванов") */
	activeDoctor: string | null;
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
 * e.g. [UI Context: View='Odontogram', PatientId='uuid', ActiveTooth=36, ActiveDoctor='Dr. Иванов']
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

	return `[UI Context: View='${viewVal}', PatientId=${patientIdVal}, ActiveTooth=${toothVal}, ActiveDoctor=${doctorVal}]`;
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
		/^\[UI Context:\s*View='([^']*)',\s*PatientId=(null|'[^']*'),\s*ActiveTooth=(null|[0-9]+|'[^']*'),\s*ActiveDoctor=(null|'[^']*')\](?:\r?\n)?/i,
	);

	if (!headerMatch) {
		return { context: null, cleanText: fullText, rawHeader: null };
	}

	const rawHeader = headerMatch[0];
	const rawView = headerMatch[1] ?? "";
	const rawPatientId = headerMatch[2] ?? "null";
	const rawActiveTooth = headerMatch[3] ?? "null";
	const rawActiveDoctor = headerMatch[4] ?? "null";

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

	const cleanText = fullText.slice(rawHeader.length).trimStart();

	return {
		context: {
			view: canonical.canonicalKey,
			viewLabel: canonical.labelRu,
			patientId,
			patientName: null,
			activeTooth,
			activeDoctor,
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

	const rawView = String(appStore.currentView ?? "shift");
	const canonical = getCanonicalViewName(rawView);

	const patientId =
		patientStore.selectedPatientId ??
		appStore.activePatientId ??
		appStore.dashboard?.activeVisit?.patientId ??
		null;

	let patientName: string | null = null;
	if (patientId && appStore.dashboard?.patients) {
		const found = appStore.dashboard.patients.find(
			(p: { id: string; fullName?: string }) => p.id === patientId,
		);
		if (found?.fullName) {
			patientName = found.fullName;
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

	return {
		view: canonical.canonicalKey,
		viewLabel: canonical.labelRu,
		patientId,
		patientName,
		activeTooth,
		activeDoctor,
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

	const patientName = useMemo(() => {
		if (!effectivePatientId || !dashboard?.patients) return null;
		const found = dashboard.patients.find(
			(p: { id: string; fullName?: string }) => p.id === effectivePatientId,
		);
		return found?.fullName ?? null;
	}, [effectivePatientId, dashboard?.patients]);

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

	const context: CopilotUiContext = useMemo(
		() => ({
			view: canonical.canonicalKey,
			viewLabel: canonical.labelRu,
			patientId: effectivePatientId,
			patientName,
			activeTooth,
			activeDoctor: effectiveDoctor,
		}),
		[
			canonical.canonicalKey,
			canonical.labelRu,
			effectivePatientId,
			patientName,
			activeTooth,
			effectiveDoctor,
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
