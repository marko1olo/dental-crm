import type React from "react";
import { showToast } from "../../../GlobalToast";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";
import { ICD10_DICTIONARY } from "../../../../lib/icd10";
import { useVisitDiaryLogic } from "../../../useVisitDiaryLogic";
import { useVisitDiaryPatientInfo } from "../useVisitDiaryPatientInfo";
import { useVisitDiarySectionIcd } from "../useVisitDiarySectionIcd";
import { useVisitDiarySectionPerio } from "../useVisitDiarySectionPerio";
import { useVisitDiaryModalsState } from "./useVisitDiaryModalsState";
import { useVisitDiaryCarpulesDisposal } from "./useVisitDiaryCarpulesDisposal";
import { applyFullPhysiologicalNorm } from "./applyPhysiologicalNormHelper";

export function useVisitDiarySectionView(
	visitId: string,
	patientId?: string,
	teethData: readonly any[] = [],
) {
	const effectivePatientId = patientId || "";
	const logic = useVisitDiaryLogic(visitId, effectivePatientId);
	const modals = useVisitDiaryModalsState();
	const ctx = useAppLogicContext();

	const patientInfo = useVisitDiaryPatientInfo({
		patientId: effectivePatientId,
		visitId,
		initialTeethData: teethData,
		activePatient: ctx.activePatient,
		activeDoctor: ctx.activeDoctor,
		clinicSettings: ctx.clinicSettings,
		diaryDoctorFullName: logic.diaryDoctorFullName,
		diaryDoctorSpecialty: logic.diaryDoctorSpecialty,
		ctxDashboard: ctx.dashboard,
	});

	const ensureRevisingIfLocked = () => {
		if (logic.isLocked && !logic.isRevising) {
			logic.beginRevise();
		}
	};

	const icd = useVisitDiarySectionIcd({
		icdSearch: logic.icdSearch,
		setIcdSearch: logic.setIcdSearch,
		setDiary: logic.setDiary,
		setShowIcdDropdown: logic.setShowIcdDropdown,
		ensureRevisingIfLocked,
		scheduleDebouncedSave: logic.scheduleDebouncedSave,
	});

	const perio = useVisitDiarySectionPerio({
		ensureRevisingIfLocked,
		setDiary: logic.setDiary,
		scheduleDebouncedSave: logic.scheduleDebouncedSave,
		setIcdSearch: logic.setIcdSearch,
		diary: logic.diary,
		doctorName: patientInfo.doctorName,
		patientBirthDate: patientInfo.patientBirthDate,
		activeTeeth: patientInfo.activeTeeth,
		setShowPerioPathologyMenu: modals.setShowPerioPathologyMenu,
		ctxToast: ctx.showToast,
	});

	const handleDisposalCarpules = useVisitDiaryCarpulesDisposal(
		ensureRevisingIfLocked,
		logic.applyAnesthesiaPreset,
		ctx.activePatient,
		ctx.clinicSettings,
		visitId,
	);

	const handleApplyNorm = () => {
		applyFullPhysiologicalNorm(
			ensureRevisingIfLocked,
			logic.setDiary,
			logic.setIcdSearch,
			logic.scheduleDebouncedSave,
		);
	};

	const handleAutoResize = (
		e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>,
	) => {
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleCompleteVisitAndBilling = async () => {
		await logic.doSave(false);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:trigger-complete-visit"));
			showToast("Приём завершён. Переход к оплате чека", "success");
			if (window.location.hash !== "#finance" && window.location.hash !== "#billing") {
				window.location.hash = "billing";
			}
		}
	};

	const icdEntry = (ICD10_DICTIONARY ?? []).find(
		(i) => i?.code === logic.diary?.diagnosisIcd10,
	);

	return {
		logic,
		modals,
		ctx,
		patientInfo,
		ensureRevisingIfLocked,
		icd,
		perio,
		handleDisposalCarpules,
		handleApplyNorm,
		handleAutoResize,
		handleCompleteVisitAndBilling,
		icdEntry,
	};
}
