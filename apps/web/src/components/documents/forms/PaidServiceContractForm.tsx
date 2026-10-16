import React from "react";
import { FileEdit } from "lucide-react";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { PaidContractRequisitesSection } from "./PaidContractRequisitesSection";
import { PaidContractClausesSection } from "./PaidContractClausesSection";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { usePaidContractStore } from "./paidContract/usePaidContractStore";
import { PaidContractToolbar } from "./paidContract/PaidContractToolbar";
import { PaidContractCareReasonSection } from "./paidContract/PaidContractCareReasonSection";

export const PAID_CONTRACT_FIELDS_BLOCK_TITLE = "Обязательные поля договора";

export interface PaidServiceContractFormProps {
	documentPatientFullName?: string | null | undefined;
	documentPatientPassport?: string | null | undefined;
	documentPatientBirthDate?: string | null | undefined;
	documentPatientPhone?: string | null | undefined;
	documentPatientAddress?: string | null | undefined;
	documentPatientSnils?: string | null | undefined;
	documentPatientCardNumber?: string | null | undefined;
	activeVisitComplaint?: string | null | undefined;
	activeVisitTreatmentPlan?: string | null | undefined;
	activeVisitDoctorSummary?: string | null | undefined;
	activeDoctorFullName?: string | null | undefined;
	totalRubValue?: number | undefined;
	totalRubFormatted?: string | null | undefined;
}

export const PaidServiceContractForm = React.memo(
	function PaidServiceContractForm(props: PaidServiceContractFormProps) {
		const {
			store,
			review,
			handleFillStandardContract,
			handlePrintFilledContract,
			handleCopyContractText,
			handleGenerateNewNumber,
			handleResetContractFields,
		} = usePaidContractStore(props);

		return (
			<article className="document-payload-card">
				<PaidContractToolbar
					patientFullName={props.documentPatientFullName}
					doctorFullName={props.activeDoctorFullName}
					onFillStandard={handleFillStandardContract}
					onPrintFilled={handlePrintFilledContract}
					onGenNumber={handleGenerateNewNumber}
					onCopyText={handleCopyContractText}
					onReset={handleResetContractFields}
				/>
				<PaidContractRequiredFieldsPanel
					review={review}
					fieldsBlockTitle={PAID_CONTRACT_FIELDS_BLOCK_TITLE}
					onPrintBlankContract={() => {
						void printBlankMedicalContract(
							{ fullName: props.documentPatientFullName || "" },
							{ doctorName: props.activeDoctorFullName || "" },
						);
					}}
					patient={{ fullName: props.documentPatientFullName || "" }}
					doctorName={props.activeDoctorFullName}
				/>
				<details className="document-manual-override">
					<summary className="inline-flex items-center gap-1.5 cursor-pointer">
						<FileEdit size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>
							{PAID_CONTRACT_FIELDS_BLOCK_TITLE}
							{review.missing.length ? ` — не хватает ${review.missing.length}` : " — всё заполнено"}
							{" (развернуть)"}
						</span>
					</summary>
					<div className="document-payload-collapsed-content">
						<PaidContractRequisitesSection
							documentPatientFullName={props.documentPatientFullName}
							activeDoctorFullName={props.activeDoctorFullName}
							totalRubValue={props.totalRubValue}
							totalRubFormatted={props.totalRubFormatted}
						/>
						<PaidContractCareReasonSection
							careReason={store.paidContractCareReason}
							setCareReason={store.setPaidContractCareReason}
							serviceScope={store.paidContractServiceScope}
							setServiceScope={store.setPaidContractServiceScope}
							activeVisitComplaint={props.activeVisitComplaint}
							activeVisitTreatmentPlan={props.activeVisitTreatmentPlan}
							activeVisitDoctorSummary={props.activeVisitDoctorSummary}
						/>
						<PaidContractClausesSection />
					</div>
				</details>
			</article>
		);
	},
);

PaidServiceContractForm.displayName = "PaidServiceContractForm";
