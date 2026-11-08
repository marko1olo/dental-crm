/**
 * LiveTreatmentPlanPresenterLauncher.tsx — Автономный лаунчер студии презентации планов лечения.
 * Декомпозирован по Мандату 8b (строго <= 120 строк).
 */

import React from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import { TreatmentPlanPresenterModal } from "../../../treatment-plans/TreatmentPlanPresenterModal";
import type {
	LivePatientPlanInfo,
	LiveTreatmentPlanPresenterLauncherProps,
} from "./presenterLauncherTypes";
import { TreatmentPlanPresenterEmptyState } from "./TreatmentPlanPresenterEmptyState";
import { useClinicRequisitesLoader } from "./useClinicRequisitesLoader";
import { useLivePatientPlanLoader } from "./useLivePatientPlanLoader";

export type { LiveTreatmentPlanPresenterLauncherProps } from "./presenterLauncherTypes";

export const LiveTreatmentPlanPresenterLauncher: React.FC<
	LiveTreatmentPlanPresenterLauncherProps
> = ({ isOpen, onClose, patientId, planId }) => {
	const isDemo = isDemoShowcaseMode();
	const clinicRequisites = useClinicRequisitesLoader(isOpen);
	const { patientPlan, isLoading, isEmptyState } = useLivePatientPlanLoader({
		isOpen,
		patientId,
		planId,
	});

	if (!isOpen) return null;

	if (isLoading) {
		return (
			<AppLoadingState message="Синхронизация плана с базой данных DENTE..." />
		);
	}

	const fallbackPlan: LivePatientPlanInfo | null = isDemo
		? {
				patientName: "Демо-пациент",
				patientId: patientId || "00000000-0000-0000-0000-000000000001",
				patientPhone: "+7 (999) 000-00-00",
				patientBirthDate: "1990-01-01",
				doctorFullName: "Дежурный врач",
				doctorSpecialty: "Врач-стоматолог общей практики",
				planId: planId || "plan-demo",
				planCreatedAtIso: new Date().toISOString(),
				teeth: [
					{ toothNumber: 16, state: "Caries", diagnosis: "Кариес дентина (K02.1)" },
					{ toothNumber: 46, state: "Missing", diagnosis: "Частичное отсутствие зубов (K08.1)" },
					{ toothNumber: 25, state: "Pulpitis", diagnosis: "Хронический пульпит (K04.0)" },
				],
			}
		: null;

	const activePlan = patientPlan || fallbackPlan;

	if (!activePlan) {
		return <TreatmentPlanPresenterEmptyState onClose={onClose} />;
	}

	const handleSaveApprovalToServer = async (tier: {
		title?: string;
		id?: string;
	}) => {
		try {
			const res = await fetch(
				`/api/treatment-plans/${encodeURIComponent(activePlan.planId)}/approve`,
				{
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						selectedTier: tier.id || "optimum",
					}),
				},
			);
			if (res.ok) {
				showToast(
					"Тариф успешно зафиксирован в карте пациента и базе данных",
					"success",
				);
			} else if (isDemo) {
				showToast("Тариф выбран в демонстрационном режиме", "success");
			}
		} catch (err) {
			logger.warn("Не удалось сохранить утверждение тарифа на сервере:", err);
			if (isDemo) {
				showToast("Тариф выбран в демонстрационном режиме", "success");
			}
		}
	};

	return (
		<TreatmentPlanPresenterModal
			isOpen={true}
			onClose={onClose}
			patientName={activePlan.patientName}
			patientId={activePlan.patientId}
			patientPhone={activePlan.patientPhone}
			patientBirthDate={activePlan.patientBirthDate}
			doctorFullName={activePlan.doctorFullName}
			doctorSpecialty={activePlan.doctorSpecialty}
			clinicName={clinicRequisites.clinicName}
			clinicLegalName={clinicRequisites.clinicLegalName}
			clinicInn={clinicRequisites.clinicInn}
			clinicOgrn={clinicRequisites.clinicOgrn}
			clinicAddress={clinicRequisites.clinicAddress}
			clinicPhone={clinicRequisites.clinicPhone}
			clinicLicense={clinicRequisites.clinicLicense}
			planId={activePlan.planId}
			planCreatedAtIso={activePlan.planCreatedAtIso}
			teeth={activePlan.teeth}
			onConfirmSelection={handleSaveApprovalToServer}
			onApproveAndSign={handleSaveApprovalToServer}
			isDemoMode={isDemo}
		/>
	);
};

export default LiveTreatmentPlanPresenterLauncher;
