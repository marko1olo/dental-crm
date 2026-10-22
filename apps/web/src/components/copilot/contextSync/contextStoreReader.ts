import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import { type Clinical043Snapshot, type CopilotUiContext, getCanonicalViewName } from "./contextSyncTypes";
import { formatCopilotUiContextHeader } from "./contextHeaderFormatter";

declare global {
	interface Window {
		__denteCopilotContext?: CopilotUiContext;
		__denteSetCopilotContext?: (ctx: Partial<CopilotUiContext>) => void;
	}
}

export function syncCopilotContextToWindow(ctx: CopilotUiContext): void {
	if (typeof window !== "undefined") {
		window.__denteCopilotContext = ctx;
	}
}

export function enrichMessageWithUiContext(message: string, customCtx?: Partial<CopilotUiContext>): string {
	const trimmed = (message ?? "").trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("[UI Context:")) return trimmed;
	const header = formatCopilotUiContextHeader(customCtx ?? getCurrentCopilotUiContext());
	return `${header}\n${trimmed}`;
}

export function getCurrentCopilotUiContext(): CopilotUiContext {
	const appStore = useAppStore.getState();
	const patientStore = usePatientStore.getState();
	const visitStore = useVisitStore.getState();

	const rawView = String(appStore.currentView ?? "shift");
	const canonical = getCanonicalViewName(rawView);
	const patientId = patientStore.selectedPatientId ?? appStore.activePatientId ?? appStore.dashboard?.activeVisit?.patientId ?? null;

	let patientName: string | null = null;
	let allergies: string[] | undefined = undefined;

	if (patientId && appStore.dashboard?.patients) {
		const found = (appStore.dashboard.patients as Array<{ id: string; fullName?: string; allergies?: string[] }>).find((p) => p.id === patientId);
		if (found?.fullName) patientName = found.fullName;
		if (Array.isArray(found?.allergies) && found.allergies.length > 0) allergies = found.allergies;
	}

	const activeTooth = appStore.activeTooth ?? null;
	let activeDoctor: string | null = appStore.activeDoctorName ?? null;
	if (!activeDoctor && appStore.dashboard?.clinicSettings?.staff) {
		const staff = appStore.dashboard.clinicSettings.staff;
		const doc = staff.find((m: { role?: string; active?: boolean; fullName?: string }) => m.role === "doctor" && m.active);
		if (doc?.fullName) activeDoctor = doc.fullName;
	}

	const toothFormula: Record<string, string> = {};
	if (visitStore.visitToothStateByCode) {
		for (const [code, state] of Object.entries(visitStore.visitToothStateByCode)) {
			if (state && state !== "idle") toothFormula[code] = state;
		}
	}

	const diagnosesByTooth: Record<string, string> = {};
	if (visitStore.visitAiDiagnosesByCode) {
		for (const [code, diag] of Object.entries(visitStore.visitAiDiagnosesByCode)) {
			if (diag && diag.trim()) diagnosesByTooth[code] = diag.trim();
		}
	}

	const vForm = visitStore.visitNoteForm;
	let clinical043Context: Clinical043Snapshot | undefined = undefined;
	if (vForm) {
		const hasContent = Boolean(vForm.complaint?.trim()) || Boolean(vForm.anamnesis?.trim()) ||
			Boolean(vForm.objectiveStatus?.trim()) || Boolean(vForm.diagnosis?.trim()) || Boolean(vForm.treatmentPlan?.trim());
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
		view: canonical.canonicalKey, viewLabel: canonical.labelRu, patientId,
		patientName, allergies, activeTooth, activeDoctor,
		toothFormula: Object.keys(toothFormula).length > 0 ? toothFormula : undefined,
		diagnosesByTooth: Object.keys(diagnosesByTooth).length > 0 ? diagnosesByTooth : undefined,
		clinical043Context,
	};
}
