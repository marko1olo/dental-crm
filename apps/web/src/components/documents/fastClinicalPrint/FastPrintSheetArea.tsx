import React from "react";
import type {
	FastPrintDocType,
	FastPrintPatientInfo,
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintServiceItem,
	FastPrintPlanStage,
} from "./types";
import type { InsertCutLayout } from "../partisanMedicalInsertTemplate";
import { RenderPartisanInsert043u } from "../partisanMedicalInsertTemplate";
import { RenderForm043u } from "./RenderForm043u";
import { RenderActAndReceipt } from "./RenderActAndReceipt";
import { RenderTreatmentEstimate } from "./RenderTreatmentEstimate";

interface FastPrintSheetAreaProps {
	readonly activeDocType: FastPrintDocType;
	readonly effectiveClinic: FastPrintClinicInfo;
	readonly doctor?: FastPrintDoctorInfo | undefined;
	readonly effectivePatient: FastPrintPatientInfo;
	readonly visitData?: any;
	readonly cutLayout: InsertCutLayout;
	readonly services?: FastPrintServiceItem[] | undefined;
	readonly planStages?: FastPrintPlanStage[] | undefined;
	readonly totalServicesAmount: number;
	readonly fiscalData?: any;
}

export const FastPrintSheetArea: React.FC<FastPrintSheetAreaProps> = ({
	activeDocType,
	effectiveClinic,
	doctor,
	effectivePatient,
	visitData,
	cutLayout,
	services,
	planStages,
	totalServicesAmount,
	fiscalData,
}) => (
	<div className="fast-print-preview-scroll">
		<div className="fast-print-a4-sheet" data-testid="fast-print-active-sheet">
			{activeDocType === "partisan_insert_043u" && (
				<RenderPartisanInsert043u
					clinic={effectiveClinic}
					doctor={doctor}
					patient={effectivePatient}
					visitData={visitData}
					cutLayout={cutLayout}
				/>
			)}
			{activeDocType === "form043u" && (
				<RenderForm043u
					clinic={effectiveClinic}
					doctor={doctor}
					patient={effectivePatient}
					visitData={visitData}
				/>
			)}
			{activeDocType === "act_and_receipt" && (
				<RenderActAndReceipt
					clinic={effectiveClinic}
					doctor={doctor}
					patient={effectivePatient}
					services={services}
					totalAmount={totalServicesAmount}
					fiscalData={fiscalData}
				/>
			)}
			{activeDocType === "treatment_estimate" && (
				<RenderTreatmentEstimate
					clinic={effectiveClinic}
					doctor={doctor}
					patient={effectivePatient}
					planStages={planStages}
					totalAmount={totalServicesAmount}
				/>
			)}
		</div>
	</div>
);
