/**
 * PrescriptionSheetPreview.tsx — Clean Printable Outpatient Sheet Preview
 * Mandates 8e, 8x, 8y & Apple HIG. Decomposed module <= 120 lines (Mandate 8b).
 */

import { FileText } from "lucide-react";
import type React from "react";
import { PrescriptionAllergyConflictStrip } from "./PrescriptionAllergyConflictStrip";
import { PrescriptionDocumentFooter } from "./PrescriptionDocumentFooter";
import { PrescriptionDocumentHeader } from "./PrescriptionDocumentHeader";
import { PrescriptionItemsRpList } from "./PrescriptionItemsRpList";
import { PrescriptionPatientDoctorMeta } from "./PrescriptionPatientDoctorMeta";
import { PrescriptionPatientMemoCard } from "./PrescriptionPatientMemoCard";
import type { PrescriptionSheetPreviewProps } from "./prescriptionPreviewTypes";

export type { PrescriptionSheetPreviewProps } from "./prescriptionPreviewTypes";

export const PrescriptionSheetPreview: React.FC<
	PrescriptionSheetPreviewProps
> = (props) => {
	return (
		<div
			className={`w-full lg:w-1/2 p-4 sm:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-3 ${props.className || ""}`}
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
					Живой предпросмотр (А5 / Высокая печать):
				</span>
				<span className="text-xs font-mono font-bold text-[var(--teal)]">
					{props.customSeriesNumber}
				</span>
			</div>

			<PrescriptionAllergyConflictStrip
				penicillinConflict={props.penicillinConflict}
				nsaidConflict={props.nsaidConflict}
				anestheticConflict={props.anestheticConflict}
			/>

			{/* Printable Physical Sheet Mockup */}
			<div className="p-5 sm:p-6 rounded-xl border border-[var(--line)] shadow-xl font-serif leading-relaxed flex flex-col gap-3 bg-[var(--paper-strong)] text-[var(--ink)]">
				<PrescriptionDocumentHeader
					withStampAndSignature={props.withStampAndSignature}
					clinic={props.clinic}
					address={props.address}
					phone={props.phone}
					ogrn={props.ogrn}
					inn={props.inn}
					licNum={props.licNum}
					activeForm={props.activeForm}
					customSeriesNumber={props.customSeriesNumber}
					prescriptionDate={props.prescriptionDate}
				/>
				<PrescriptionPatientDoctorMeta
					patientName={props.patientName}
					patientBirth={props.patientBirth}
					patientCard={props.patientCard}
					patientAddress={props.patientAddress}
					docName={props.docName}
					docSpecialty={props.docSpecialty}
					activeForm={props.activeForm}
					diagnosisIcd10={props.diary?.diagnosisIcd10}
				/>
				<PrescriptionItemsRpList activeItems={props.activeItems} />
				<PrescriptionDocumentFooter
					activeForm={props.activeForm}
					validityDays={props.validityDays}
					isChronicSpecialCare={props.isChronicSpecialCare}
					chronicPeriodicity={props.chronicPeriodicity}
					withStampAndSignature={props.withStampAndSignature}
					docName={props.docName}
					isUkepSigned={props.isUkepSigned}
					ukepSignature={props.ukepSignature}
				/>
			</div>

			<PrescriptionPatientMemoCard
				activeItems={props.activeItems}
				phone={props.phone}
			/>
		</div>
	);
};
