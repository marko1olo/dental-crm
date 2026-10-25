import React, { useState } from "react";
import { FastClinicalPrintEngine } from "../documents/FastClinicalPrintEngine";
import { PrintViewOfficialAppendixView } from "./printView/PrintViewOfficialAppendixView";
import { PrintViewPatientFriendlyView } from "./printView/PrintViewPatientFriendlyView";
import { PrintViewFormatToolbar } from "./printView/PrintViewFormatToolbar";
import type { TreatmentPlanPresenterPrintViewProps } from "./printView/printViewTypes";

export { type TreatmentPlanPresenterPrintViewProps } from "./printView/printViewTypes";

export const TreatmentPlanPresenterPrintView: React.FC<TreatmentPlanPresenterPrintViewProps> = ({
	printDocFormat, setPrintDocFormat, showMicroConsumables, setShowMicroConsumables,
	selectedTier, patientName, patientBirthDate, patientPhone, doctorFullName,
	doctorSpecialty, clinicName, clinicLegalName, clinicInn, clinicOgrn, clinicAddress,
	clinicPhone, clinicLicense, displayContractNumber, todayRu, watermarkText,
	getTierLetter, patientId, planAgeDays = 0,
}) => {
	const effectiveWatermark = watermarkText || (selectedTier ? "ПЛАН ЛЕЧЕНИЯ" : "ПРОЕКТ");
	const stampColor = "#0d9488";
	const [isFastPrintOpen, setIsFastPrintOpen] = useState(false);

	return (
		<div className="treatment-appendix-print-doc" data-testid="appendix-print-document">
			<PrintViewFormatToolbar
				printDocFormat={printDocFormat}
				setPrintDocFormat={setPrintDocFormat}
				showMicroConsumables={showMicroConsumables}
				setShowMicroConsumables={setShowMicroConsumables}
				onOpenFastPrint={() => setIsFastPrintOpen(true)}
			/>

			{printDocFormat === "patient_friendly" ? (
				<PrintViewPatientFriendlyView
					effectiveWatermark={effectiveWatermark}
					stampColor={stampColor}
					clinicName={clinicName}
					clinicLicense={clinicLicense}
					clinicPhone={clinicPhone}
					displayContractNumber={displayContractNumber}
					todayRu={todayRu}
					patientName={patientName}
					patientId={patientId}
					patientPhone={patientPhone}
					doctorFullName={doctorFullName}
					doctorSpecialty={doctorSpecialty}
					selectedTier={selectedTier}
					getTierLetter={getTierLetter}
					planAgeDays={planAgeDays}
				/>
			) : (
				<PrintViewOfficialAppendixView
					clinicName={clinicName}
					clinicLicense={clinicLicense}
					clinicLegalName={clinicLegalName}
					clinicInn={clinicInn}
					clinicOgrn={clinicOgrn}
					clinicAddress={clinicAddress}
					doctorFullName={doctorFullName}
					doctorSpecialty={doctorSpecialty}
					patientName={patientName}
					patientBirthDate={patientBirthDate}
					patientPhone={patientPhone}
					patientId={patientId}
					selectedTier={selectedTier}
					getTierLetter={getTierLetter}
					todayRu={todayRu}
					effectiveWatermark={effectiveWatermark}
					stampColor={stampColor}
					showMicroConsumables={showMicroConsumables}
				/>
			)}

			{isFastPrintOpen && (
				<FastClinicalPrintEngine
					isOpen={isFastPrintOpen}
					initialDocType="treatment_estimate"
					patient={{ fullName: patientName, birthDate: patientBirthDate, phone: patientPhone }}
					clinic={{ name: clinicName, legalName: clinicLegalName, inn: clinicInn, ogrn: clinicOgrn, address: clinicAddress, phone: clinicPhone, licenseNumber: clinicLicense }}
					doctor={{ fullName: doctorFullName, specialty: doctorSpecialty }}
					planStages={selectedTier.stages.map((stage) => ({
						title: stage.title,
						services: stage.items.map((it) => ({
							name: it.name,
							tooth: it.toothNumber ? String(it.toothNumber) : undefined,
							price: it.priceRub,
						})),
						total: stage.totalRub,
						dueDate: stage.estimatedWeeks ? `${stage.estimatedWeeks} нед.` : undefined,
					}))}
					onClose={() => setIsFastPrintOpen(false)}
				/>
			)}
		</div>
	);
};
