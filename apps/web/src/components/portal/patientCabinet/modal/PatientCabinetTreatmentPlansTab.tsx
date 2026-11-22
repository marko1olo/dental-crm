/**
 * Patient Personal Portal - Treatment Plans Tab & Clinical Scans Wrapper
 * (LAYER 4: PRESENTATION SUBCOMPONENT)
 *
 * Renders treatment plans, FDI 11..48 odontogram, 63-FZ PEP approval,
 * SBP stage payment triggers, and clinical scans accordion view.
 */

import React from "react";
import { TreatmentPlanTab } from "../tabs/TreatmentPlanTab.js";
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
							marginBottom: "12px",
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
					{data.scans && data.scans.length > 0 ? (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
								gap: "12px",
							}}
						>
							{data.scans.map((scan) => (
								<div
									key={scan.id}
									className="pc-card"
									style={{
										padding: "12px",
										borderRadius: "12px",
										border: "1px solid var(--pc-border, #334155)",
										backgroundColor: "var(--pc-surface, #1e293b)",
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									<div style={{ fontWeight: 600, fontSize: "14px" }}>{scan.titleRu}</div>
									<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
										{scan.modalityRu || scan.modality} &bull; {scan.dateRu || scan.dateIso}
									</div>
									{scan.previewUrl && (
										<img
											src={scan.previewUrl}
											alt={scan.titleRu}
											loading="lazy"
											style={{
												width: "100%",
												height: "140px",
												objectFit: "contain",
												borderRadius: "8px",
												backgroundColor: "#020617",
											}}
										/>
									)}
									{scan.conclusionRu && (
										<div style={{ fontSize: "12px", color: "var(--pc-text-main)" }}>
											{scan.conclusionRu}
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div style={{ padding: "16px", textAlign: "center", color: "var(--pc-text-muted)" }}>
							Снимки не прикреплены.
						</div>
					)}
				</div>
			)}
		</>
	);
};

export default PatientCabinetTreatmentPlansTab;
