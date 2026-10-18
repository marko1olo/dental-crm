import { useState, useCallback } from "react";
import type { TreatmentPlanValidateAndCommentResponse } from "@dental/shared";
import type { TreatmentPlanTier } from "../../types";
import type { ToothData } from "../../../odontogram/ToothChart";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { requestTreatmentPlanAiValidationAndComment } from "../../../../services/ai/treatmentPlanCopilot";
import { DEFAULT_SAMPLE_TEETH } from "./presenterStateConstants";

export interface PresenterAiAuditParams {
	readonly selectedTier: TreatmentPlanTier;
	readonly patientName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
}

export function usePresenterAiAudit({
	selectedTier,
	patientName = "",
	doctorFullName = "",
	teeth,
}: PresenterAiAuditParams) {
	const [aiAuditResult, setAiAuditResult] = useState<TreatmentPlanValidateAndCommentResponse | null>(null);
	const [isAiAuditing, setIsAiAuditing] = useState<boolean>(false);
	const [aiAuditError, setAiAuditError] = useState<string | null>(null);

	const handleRunAiAudit = useCallback(async () => {
		if (isAiAuditing) return;
		setIsAiAuditing(true);
		setAiAuditError(null);
		try {
			const res = await requestTreatmentPlanAiValidationAndComment(
				selectedTier.stages,
				{
					patientName,
					doctorName: doctorFullName,
					selectedTierTitle: selectedTier.title,
					teeth: teeth && teeth.length > 0 ? teeth : isDemoShowcaseMode() ? DEFAULT_SAMPLE_TEETH : [],
					totalRub: selectedTier.totalRub,
					warrantyYears: typeof selectedTier.warrantyYears === "number" ? selectedTier.warrantyYears : 2,
					monthlyInstallment12Rub: selectedTier.monthlyInstallment12Rub,
				},
			);
			setAiAuditResult(res);
		} catch {
			setAiAuditError("Не удалось связаться с ИИ-сервером. Отображаются локальные клинические правила СтАР.");
		} finally {
			setIsAiAuditing(false);
		}
	}, [isAiAuditing, selectedTier, patientName, doctorFullName, teeth]);

	return {
		aiAuditResult,
		isAiAuditing,
		aiAuditError,
		handleRunAiAudit,
	};
}
