/**
 * LiveTreatmentPlanPresenterLauncher.tsx — Автономный лаунчер студии презентации планов лечения.
 * Декомпозирован по Мандату 8b (строго <= 120 строк).
 */

import type React from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import { TreatmentPlanPresenterModal } from "../../../treatment-plans/TreatmentPlanPresenterModal";
import type { LiveTreatmentPlanPresenterLauncherProps } from "./presenterLauncherTypes";
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
		isDemo,
		patientId,
		planId,
	});

	if (!isOpen) return null;

	if (isLoading) {
		return (
			<AppLoadingState message="Синхронизация плана с базой данных DENTE..." />
		);
	}

	if (isEmptyState || !patientPlan) {
		return <TreatmentPlanPresenterEmptyState onClose={onClose} />;
	}

	const handleSaveApprovalToServer = async (tier: {
		title?: string;
		id?: string;
	}) => {
		try {
			const res = await fetch(
				`/api/patients/${encodeURIComponent(patientPlan.patientId)}/treatment-plans/${encodeURIComponent(patientPlan.planId)}/approve-variant`,
				{
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						reason: `Пациент ${patientPlan.patientName} утвердил тариф «${tier.title || tier.id || "Основной"}» (ст. 20 323-ФЗ / ПП РФ №659)`,
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
			patientName={patientPlan.patientName}
			patientId={patientPlan.patientId}
			patientPhone={patientPlan.patientPhone}
			patientBirthDate={patientPlan.patientBirthDate}
			doctorFullName={patientPlan.doctorFullName}
			doctorSpecialty={patientPlan.doctorSpecialty}
			clinicName={clinicRequisites.clinicName}
			clinicLegalName={clinicRequisites.clinicLegalName}
			clinicInn={clinicRequisites.clinicInn}
			clinicOgrn={clinicRequisites.clinicOgrn}
			clinicAddress={clinicRequisites.clinicAddress}
			clinicPhone={clinicRequisites.clinicPhone}
			clinicLicense={clinicRequisites.clinicLicense}
			planId={patientPlan.planId}
			planCreatedAtIso={patientPlan.planCreatedAtIso}
			teeth={patientPlan.teeth}
			onConfirmSelection={handleSaveApprovalToServer}
			onApproveAndSign={handleSaveApprovalToServer}
			isDemoMode={isDemo}
		/>
	);
};

export default LiveTreatmentPlanPresenterLauncher;
