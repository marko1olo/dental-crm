import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";
import { type PatientClinicalSafetyProfile, createHealthySomaticNormProfile, evaluatePatientSafetyFlags } from "../safetyMath";
import { mapPatientToGeneralInfo, resolveInitialSafetyProfile } from "../patientAutonomyActions";
import type { PatientGeneralInfo, PatientGeneralInfoFieldValue } from "../tabs/PatientGeneralInfoTab";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import { DEMO_PATIENT_CATALOG } from "../patientCatalogData";
import { DEMO_SHOWCASE_MODAL_PATIENT, DEMO_SHOWCASE_MODAL_SAFETY, type PatientCardTab, type PatientCardModalProps } from "./patientCardModalTypes";
import { usePatientCardDraftSync } from "./usePatientCardDraftSync";
import { savePatientCardModal } from "./patientCardSaveAction";

export function usePatientCardModalState(props: PatientCardModalProps) {
	const {
		isOpen, onClose, initialTab, patient: initP, patientData: initPAlias,
		initialSafetyProfile: initS, safetyProfile: initSAlias, onSavePatient, onApplySomaticNorm,
		initialPatientId, patientId: propPatientId,
	} = props;

	const targetId = initialPatientId || propPatientId;
	const storePatient = useAppStore((s) =>
		targetId ? s.dashboard?.patients?.find((p) => p.id === targetId) : undefined,
	);
	const isDemo = isDemoShowcaseMode() || (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
	const demoMatch = (isDemo && targetId) ? DEMO_PATIENT_CATALOG.find((p) => p.id === targetId) : null;
	const fallbackDemoPatient = demoMatch ? {
		id: demoMatch.id,
		fullName: demoMatch.fullName,
		phone: demoMatch.phone,
		birthDate: demoMatch.birthDate,
		balanceKopecks: demoMatch.balanceKopecks,
		patientBalanceRub: kopecksToRubles(demoMatch.balanceKopecks),
		doctorClinicalNotes: demoMatch.notes,
	} : (isDemo ? DEMO_SHOWCASE_MODAL_PATIENT : {});

	const rawP = initP ?? initPAlias ?? storePatient ?? fallbackDemoPatient;
	const effP = mapPatientToGeneralInfo(rawP);
	const effS = initS ?? initSAlias ?? (isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_SAFETY : undefined);

	const [activeTab, setActiveTab] = useState<PatientCardTab>(() => initialTab ?? "general");
	useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
	const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => effP);
	const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => resolveInitialSafetyProfile(rawP, effS));
	const [isDirty, setIsDirty] = useState(false);
	const [saveState, setSaveState] = useState<PatientSectionSaveState>("idle");
	const isDirtyRef = useRef(isDirty);
	isDirtyRef.current = isDirty;
	const baseRawRef = useRef(rawP);
	baseRawRef.current = rawP;
	const baseSafetyRef = useRef(effS);
	baseSafetyRef.current = effS;

	useEffect(() => {
		if (isOpen && effP.id) StaffActionAuditService.logEmrOpen({ patientId: effP.id, cardId: effP.id });
	}, [isOpen, effP.id, effP.fullName]);

	const isChildPatient = useMemo(() => {
		if (patientData.birthDate) {
			const y = new Date(patientData.birthDate).getFullYear();
			if (!Number.isNaN(y) && new Date().getFullYear() - y < 18) return true;
		}
		return !!patientData.representativeType;
	}, [patientData.birthDate, patientData.representativeType]);

	const hydratedPatientIdRef = useRef<string | null | undefined>(effP.id ?? null);
	useEffect(() => {
		const next = initP ?? initPAlias ?? storePatient;
		if (!next) return;
		const mapped = mapPatientToGeneralInfo(next);
		const nextId = mapped.id ?? null;
		if (nextId === hydratedPatientIdRef.current && isDirtyRef.current) {
			return;
		}
		hydratedPatientIdRef.current = nextId;
		setPatientData(mapped);
		setSafetyProfile(resolveInitialSafetyProfile(next, effS));
		setIsDirty(false);
		setSaveState("idle");
	}, [initP, initPAlias, storePatient, effS]);

	useEffect(() => {
		const handleBalanceChange = (e: Event) => {
			const detail = (e as CustomEvent<{ patientId?: string; newBalanceKopecks?: number; newBalanceRub?: number }>)?.detail;
			if (!detail) return;
			if (!detail.patientId || detail.patientId === patientData.id) {
				const nextKopecks =
					typeof detail.newBalanceKopecks === "number"
						? detail.newBalanceKopecks
						: typeof detail.newBalanceRub === "number"
							? rublesToKopecks(detail.newBalanceRub)
							: undefined;
				if (typeof nextKopecks === "number") {
					setPatientData((prev) => ({
						...prev,
						balanceKopecks: nextKopecks,
						patientBalanceRub: kopecksToRubles(nextKopecks),
					}));
				}
			}
		};
		window.addEventListener("dente-patient-balance-changed", handleBalanceChange);
		return () => window.removeEventListener("dente-patient-balance-changed", handleBalanceChange);
	}, [patientData.id]);

	const safetyEvaluation = useMemo(() => evaluatePatientSafetyFlags(safetyProfile), [safetyProfile]);

	const inFlightRef = usePatientCardDraftSync({
		isOpen, isDirty, setIsDirty, patientData, setPatientData, safetyProfile, setSafetyProfile, setSaveState, onSavePatient,
	});

	const resetLocalDraft = useCallback(() => {
		setPatientData(mapPatientToGeneralInfo(baseRawRef.current));
		setSafetyProfile(resolveInitialSafetyProfile(baseRawRef.current, baseSafetyRef.current));
		setIsDirty(false);
		setSaveState("idle");
	}, []);

	const handleUpdatePatientField = useCallback((field: keyof PatientGeneralInfo, val: PatientGeneralInfoFieldValue) => {
		setIsDirty(true);
		setPatientData((prev) => ({ ...prev, [field]: val }));
	}, []);

	const handleApplyNorm = useCallback(() => {
		setSafetyProfile(createHealthySomaticNormProfile());
		setIsDirty(true);
		if (onApplySomaticNorm) onApplySomaticNorm();
		showToast("Применена физиологическая норма: соматически здоров", "success", 4000);
	}, [onApplySomaticNorm]);

	const handlePrint = useCallback(() => { if (typeof window !== "undefined") window.print(); }, []);

	const handleSave = useCallback(() => {
		return savePatientCardModal({
			inFlightRef, patientData, safetyProfile, onSavePatient, onClose, setIsDirty, setSaveState,
		});
	}, [patientData, safetyProfile, onSavePatient, onClose, inFlightRef]);

	return {
		patientData, safetyProfile, setSafetyProfile, activeTab, setActiveTab,
		isChildPatient, safetyEvaluation, isDirty, setIsDirty, saveState,
		handleUpdatePatientField, handleApplyNorm, handlePrint, handleSave, resetLocalDraft,
	};
}
