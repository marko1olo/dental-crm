import { useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import {
	type Clinical043Snapshot,
	type CopilotUiContext,
	getCanonicalViewName,
} from "./contextSyncTypes";
import { formatCopilotUiContextHeader } from "./contextHeaderFormatter";
import { enrichMessageWithUiContext, syncCopilotContextToWindow } from "./contextStoreReader";

export function useCopilotContextSync() {
	const currentView = useAppStore((s) => s.currentView) ?? useAppStore.getState().currentView ?? "shift";
	const activeTooth = useAppStore((s) => s.activeTooth) ?? useAppStore.getState().activeTooth ?? null;
	const activeDoctorName = useAppStore((s) => s.activeDoctorName) ?? useAppStore.getState().activeDoctorName ?? null;
	const appActivePatientId = useAppStore((s) => s.activePatientId) ?? useAppStore.getState().activePatientId ?? null;
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId) ?? usePatientStore.getState().selectedPatientId ?? null;
	const dashboard = useAppStore((s) => s.dashboard) ?? useAppStore.getState().dashboard ?? null;

	const toothStates = useVisitStore((s) => s.visitToothStateByCode) ?? useVisitStore.getState().visitToothStateByCode ?? {};
	const aiDiagnoses = useVisitStore((s) => s.visitAiDiagnosesByCode) ?? useVisitStore.getState().visitAiDiagnosesByCode ?? {};
	const visitNoteForm = useVisitStore((s) => s.visitNoteForm) ?? useVisitStore.getState().visitNoteForm ?? null;

	const setActiveTooth = useAppStore((s) => s.setActiveTooth);
	const setActiveDoctorName = useAppStore((s) => s.setActiveDoctorName);
	const setActivePatientId = useAppStore((s) => s.setActivePatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const canonical = useMemo(() => getCanonicalViewName(currentView), [currentView]);
	const effectivePatientId = useMemo(() => selectedPatientId ?? appActivePatientId ?? dashboard?.activeVisit?.patientId ?? null, [selectedPatientId, appActivePatientId, dashboard?.activeVisit?.patientId]);

	const patientRecord = useMemo(() => {
		if (!effectivePatientId || !dashboard?.patients) return null;
		return (dashboard.patients as Array<{ id: string; fullName?: string; allergies?: string[] }>).find((p) => p.id === effectivePatientId) ?? null;
	}, [effectivePatientId, dashboard?.patients]);

	const patientName = patientRecord?.fullName ?? null;
	const allergies = useMemo(() => (Array.isArray(patientRecord?.allergies) && patientRecord.allergies.length > 0 ? patientRecord.allergies : undefined), [patientRecord?.allergies]);

	const effectiveDoctor = useMemo(() => {
		if (activeDoctorName) return activeDoctorName;
		return dashboard?.clinicSettings?.staff?.find((m: { role?: string; active?: boolean; fullName?: string }) => m.role === "doctor" && m.active)?.fullName ?? null;
	}, [activeDoctorName, dashboard?.clinicSettings?.staff]);

	const toothFormula = useMemo(() => {
		const res: Record<string, string> = {};
		for (const [code, state] of Object.entries(toothStates)) {
			if (state && state !== "idle") res[code] = state;
		}
		return Object.keys(res).length > 0 ? res : undefined;
	}, [toothStates]);

	const diagnosesByTooth = useMemo(() => {
		const res: Record<string, string> = {};
		for (const [code, diag] of Object.entries(aiDiagnoses)) {
			if (diag?.trim()) res[code] = diag.trim();
		}
		return Object.keys(res).length > 0 ? res : undefined;
	}, [aiDiagnoses]);

	const clinical043Context = useMemo((): Clinical043Snapshot | undefined => {
		if (!visitNoteForm) return undefined;
		const hasContent = Boolean(visitNoteForm.complaint?.trim()) || Boolean(visitNoteForm.anamnesis?.trim()) ||
			Boolean(visitNoteForm.objectiveStatus?.trim()) || Boolean(visitNoteForm.diagnosis?.trim()) || Boolean(visitNoteForm.treatmentPlan?.trim());
		if (!hasContent) return undefined;
		return {
			complaints: visitNoteForm.complaint?.trim() || undefined,
			anamnesis: visitNoteForm.anamnesis?.trim() || undefined,
			objectiveStatus: visitNoteForm.objectiveStatus?.trim() || undefined,
			diagnosis: visitNoteForm.diagnosis?.trim() || undefined,
			treatmentPlan: visitNoteForm.treatmentPlan?.trim() || undefined,
		};
	}, [visitNoteForm]);

	const context: CopilotUiContext = useMemo(() => ({
		view: canonical.canonicalKey, viewLabel: canonical.labelRu, patientId: effectivePatientId,
		patientName, allergies, activeTooth, activeDoctor: effectiveDoctor,
		toothFormula, diagnosesByTooth, clinical043Context,
	}), [canonical.canonicalKey, canonical.labelRu, effectivePatientId, patientName, allergies, activeTooth, effectiveDoctor, toothFormula, diagnosesByTooth, clinical043Context]);

	const contextHeader = useMemo(() => formatCopilotUiContextHeader(context), [context]);

	useEffect(() => {
		syncCopilotContextToWindow(context);
		if (typeof window !== "undefined") {
			window.__denteSetCopilotContext = (partial) => {
				if (partial.activeTooth !== undefined) setActiveTooth(partial.activeTooth);
				if (partial.activeDoctor !== undefined) setActiveDoctorName(partial.activeDoctor);
				if (partial.patientId !== undefined) {
					setActivePatientId(partial.patientId);
					setSelectedPatientId(partial.patientId);
				}
			};
		}
		return () => {
			if (typeof window !== "undefined") delete window.__denteSetCopilotContext;
		};
	}, [context, setActiveTooth, setActiveDoctorName, setActivePatientId, setSelectedPatientId]);

	const enrichMessage = useCallback((text: string) => enrichMessageWithUiContext(text, context), [context]);
	const setContext = useCallback((partial: Partial<CopilotUiContext>) => {
		if (partial.activeTooth !== undefined) setActiveTooth(partial.activeTooth);
		if (partial.activeDoctor !== undefined) setActiveDoctorName(partial.activeDoctor);
		if (partial.patientId !== undefined) {
			setActivePatientId(partial.patientId);
			setSelectedPatientId(partial.patientId);
		}
	}, [setActiveTooth, setActiveDoctorName, setActivePatientId, setSelectedPatientId]);

	return {
		context, contextHeader, enrichMessage, setContext, setActiveTooth,
		setActiveDoctor: setActiveDoctorName,
		setActivePatient: useCallback((id: string | null) => {
			setActivePatientId(id);
			setSelectedPatientId(id);
		}, [setActivePatientId, setSelectedPatientId]),
	};
}
