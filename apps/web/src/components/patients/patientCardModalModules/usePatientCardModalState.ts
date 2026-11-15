import { useCallback, useEffect, useMemo, useState } from "react";
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
	const isDemo = isDemoShowcaseMode() || (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
	const demoMatch = (isDemo && targetId) ? DEMO_PATIENT_CATALOG.find((p) => p.id === targetId) : null;
	const fallbackDemoPatient = demoMatch ? {
		id: demoMatch.id,
		fullName: demoMatch.fullName,
		phone: demoMatch.phone,
		birthDate: demoMatch.birthDate,
		patientBalanceRub: demoMatch.balanceKopecks / 100,
		doctorClinicalNotes: demoMatch.notes,
	} : (isDemo ? DEMO_SHOWCASE_MODAL_PATIENT : {});

	const rawP = initP ?? initPAlias ?? fallbackDemoPatient;
	const effP = mapPatientToGeneralInfo(rawP);
	const effS = initS ?? initSAlias ?? (isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_SAFETY : undefined);

	const [activeTab, setActiveTab] = useState<PatientCardTab>(() => initialTab ?? "general");
	useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
	const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => effP);
	const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => resolveInitialSafetyProfile(rawP, effS));
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState(false);
	const [isDmsLetterModalOpen, setIsDmsLetterModalOpen] = useState(false);
	const [isTaxDeductionModalOpen, setIsTaxDeductionModalOpen] = useState(false);
	const [initialTaxTab, setInitialTaxTab] = useState<"form" | "checks" | "family" | "xml" | "registry">("form");

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

	useEffect(() => {
		if (initP || initPAlias) {
			const n = initP ?? initPAlias;
			setPatientData((prev) => ({ ...prev, ...mapPatientToGeneralInfo(n) }));
			setSafetyProfile(resolveInitialSafetyProfile(n, effS));
		}
	}, [initP, initPAlias, effS]);

	useEffect(() => {
		const handleBalanceChange = (e: Event) => {
			const detail = (e as CustomEvent<{ patientId?: string; newBalanceRub?: number }>)?.detail;
			if (!detail) return;
			if (!detail.patientId || detail.patientId === patientData.id) {
				if (typeof detail.newBalanceRub === "number") {
					setPatientData((prev) => ({ ...prev, patientBalanceRub: detail.newBalanceRub }));
				}
			}
		};
		window.addEventListener("dente-patient-balance-changed", handleBalanceChange);
		return () => window.removeEventListener("dente-patient-balance-changed", handleBalanceChange);
	}, [patientData.id]);

	const safetyEvaluation = useMemo(() => evaluatePatientSafetyFlags(safetyProfile), [safetyProfile]);
	const [isDirty, setIsDirty] = useState(false);
	const [saveState, setSaveState] = useState<PatientSectionSaveState>("idle");

	const inFlightRef = usePatientCardDraftSync({
		isOpen, isDirty, setIsDirty, patientData, setPatientData, safetyProfile, setSafetyProfile, setSaveState, onSavePatient,
	});

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

	const handleOpenTaxCertificate = useCallback((tab?: "form" | "checks" | "family" | "xml" | "registry") => {
		setInitialTaxTab(tab || "form");
		setIsTaxDeductionModalOpen(true);
	}, []);

	return {
		patientData, safetyProfile, setSafetyProfile, activeTab, setActiveTab,
		isChildPatient, safetyEvaluation, isDirty, setIsDirty, saveState,
		isDiplomaModalOpen, setIsDiplomaModalOpen, isDmsLetterModalOpen, setIsDmsLetterModalOpen,
		isTaxDeductionModalOpen, setIsTaxDeductionModalOpen,
		initialTaxTab, setInitialTaxTab, handleOpenTaxCertificate,
		handleUpdatePatientField, handleApplyNorm, handlePrint, handleSave,
	};
}
