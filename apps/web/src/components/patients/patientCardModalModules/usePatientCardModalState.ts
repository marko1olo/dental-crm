import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { type PatientClinicalSafetyProfile, createHealthySomaticNormProfile, evaluatePatientSafetyFlags } from "../safetyMath";
import { mapPatientToGeneralInfo, persistPatientCardModalToApi, resolveInitialSafetyProfile } from "../patientAutonomyActions";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import { DEMO_SHOWCASE_MODAL_PATIENT, DEMO_SHOWCASE_MODAL_SAFETY, type PatientCardTab, type PatientCardModalProps } from "./patientCardModalTypes";

export function usePatientCardModalState(props: PatientCardModalProps) {
	const {
		isOpen,
		onClose,
		initialTab,
		patient: initP,
		patientData: initPAlias,
		initialSafetyProfile: initS,
		safetyProfile: initSAlias,
		onSavePatient,
		onApplySomaticNorm,
	} = props;

	const isDemo = isDemoShowcaseMode();
	const rawP = initP ?? initPAlias ?? (isDemo ? DEMO_SHOWCASE_MODAL_PATIENT : {});
	const effP = mapPatientToGeneralInfo(rawP);
	const effS = initS ?? initSAlias ?? (isDemo ? DEMO_SHOWCASE_MODAL_SAFETY : undefined);

	const [activeTab, setActiveTab] = useState<PatientCardTab>(() => initialTab ?? "general");
	useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
	const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => effP);
	const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => resolveInitialSafetyProfile(rawP, effS));
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState(false);
	const [isDmsLetterModalOpen, setIsDmsLetterModalOpen] = useState(false);
	const [isTaxDeductionModalOpen, setIsTaxDeductionModalOpen] = useState(false);

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

	const safetyEvaluation = useMemo(() => evaluatePatientSafetyFlags(safetyProfile), [safetyProfile]);
	const [isDirty, setIsDirty] = useState(false);
	const [saveState, setSaveState] = useState<PatientSectionSaveState>("idle");

	const handleUpdatePatientField = useCallback((field: keyof PatientGeneralInfo, val: any) => {
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

	const handleSave = useCallback(async () => {
		setSaveState("saving");
		try {
			if (onSavePatient) await onSavePatient(patientData, safetyProfile);
			else await persistPatientCardModalToApi(patientData, safetyProfile, DEMO_SHOWCASE_MODAL_PATIENT.id || "");
			setIsDirty(false);
			setSaveState("saved");
			showToast("Данные пациента сохранены", "success", 3000);
			onClose();
		} catch (err: any) {
			setSaveState("error");
			showToast(err?.message || "Ошибка при сохранении карты", "error", 4000);
		}
	}, [patientData, safetyProfile, onSavePatient, onClose]);

	return {
		patientData,
		safetyProfile,
		setSafetyProfile,
		activeTab,
		setActiveTab,
		isChildPatient,
		safetyEvaluation,
		isDirty,
		setIsDirty,
		saveState,
		isDiplomaModalOpen,
		setIsDiplomaModalOpen,
		isDmsLetterModalOpen,
		setIsDmsLetterModalOpen,
		isTaxDeductionModalOpen,
		setIsTaxDeductionModalOpen,
		handleUpdatePatientField,
		handleApplyNorm,
		handlePrint,
		handleSave,
	};
}
