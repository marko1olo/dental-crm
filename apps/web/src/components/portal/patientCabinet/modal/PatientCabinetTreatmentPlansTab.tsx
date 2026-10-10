/**
 * Patient Personal Portal - Treatment Plans Tab & Clinical Scans Wrapper
 * (LAYER 4: PRESENTATION SUBCOMPONENT)
 *
 * Renders treatment plans, FDI 11..48 odontogram, 63-FZ PEP approval,
 * SBP stage payment triggers, and clinical scans accordion view (PatientPlanView).
 */

import React from "react";
import { TreatmentPlanTab } from "../tabs/TreatmentPlanTab.js";
import { PatientPlanView } from "../../PatientPlanView.js";
import type {
	PatientCabinetSummary,
	PatientDentalPassport,
	PatientPersonalCabinetData,
	PatientTreatmentPlan,
	TreatmentPlanStage,
} from "../patientCabinetEngine.js";

export interface PatientCabinetTreatmentPlansTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly dentalPassport: PatientDentalPassport;
	readonly summary: PatientCabinetSummary;
	readonly onPayStageWithSbp: (stage: TreatmentPlanStage) => void;
	readonly onBookAppointment: () => void;
	readonly onApproveTreatmentPlan: (plan: PatientTreatmentPlan) => void;
	readonly onShowToast: (msg: string) => void;
	readonly onOpenClinicalScans: () => void;
	readonly isClinicalScansOpen: boolean;
	readonly onCloseClinicalScans: () => void;
}

export const PatientCabinetTreatmentPlansTab: React.FC<PatientCabinetTreatmentPlansTabProps> = ({
	data,
	dentalPassport,
	summary,
	onPayStageWithSbp,
	onBookAppointment,
	onApproveTreatmentPlan,
	onShowToast,
	onOpenClinicalScans,
	isClinicalScansOpen,
	onCloseClinicalScans,
}) => {
	return (
		<>
			<TreatmentPlanTab
				data={data}
				dentalPassport={dentalPassport}
				onPayStageWithSbp={onPayStageWithSbp}
				onBookAppointment={onBookAppointment}
				onApproveTreatmentPlan={onApproveTreatmentPlan}
				onShowToast={onShowToast}
				onOpenClinicalScans={onOpenClinicalScans}
				isClinicalScansOpen={isClinicalScansOpen}
			/>

			{isClinicalScansOpen && (
				<div
					data-testid="clinical-scans-accordion-container"
					style={{
						marginTop: "16px",
						borderTop: "1px solid var(--pc-border)",
						paddingTop: "16px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "8px",
						}}
					>
						<strong style={{ fontSize: "0.9375rem" }}>
							Клиническая карта и рентген-снимки
						</strong>
						<button
							type="button"
							className="pc-btn-secondary"
							data-testid="hide-clinical-scans-btn"
							onClick={onCloseClinicalScans}
						>
							Скрыть подробности
						</button>
					</div>
					<PatientPlanView
						plan={data.treatmentPlans[0] as any}
						nextAppointment={summary.nextAppointment as any}
						fullCabinetData={data as any}
					/>
				</div>
			)}
		</>
	);
};

export default PatientCabinetTreatmentPlansTab;
