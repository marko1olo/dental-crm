import React, { useMemo, useState } from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { ProfessionalDocumentA4Sheet } from "./ProfessionalDocumentA4Sheet";
import {
	type OutpatientCardPrintModalProps,
	buildDefaultClinic,
	buildDefaultPatient,
	getTodayRuFormatted,
	buildCompleteCardData,
	OutpatientCardHeader,
} from "./outpatientCard/index";

export type { OutpatientCardPrintModalProps };

export const OutpatientCardPrintModal: React.FC<OutpatientCardPrintModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	medicalCardData: customCardData,
	isClosedOrSigned = false,
	onPrint,
	onDownloadPdf,
}) => {
	const [isPrinting, setIsPrinting] = useState(false);
	const todayRu = useMemo(() => getTodayRuFormatted(), []);
	const cl = useMemo(() => buildDefaultClinic(clinicProfileDraft), [clinicProfileDraft]);
	const pt = useMemo(() => buildDefaultPatient(patient), [patient]);
	const doctor = doctorFullName || cl.directorFullName || "Лечащий врач";

	const cardData: A4DocumentMedicalCardData = useMemo(() => {
		return buildCompleteCardData(cl, pt, doctor, todayRu, customCardData);
	}, [cl, pt, doctor, todayRu, customCardData]);

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (onPrint) onPrint();
			else if (typeof window !== "undefined") window.print();
		} finally {
			setIsPrinting(false);
		}
	};

	const handleDownloadPdf = () => {
		if (onDownloadPdf) onDownloadPdf();
		else if (typeof window !== "undefined") window.print();
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="outpatient-card-print-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Печать медицинской карты пациента (карта приёма)"
		>
			<div className="relative w-full max-w-[1020px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				<OutpatientCardHeader
					ptFullName={pt.fullName}
					ptCardNumber={pt.cardNumber}
					todayRu={todayRu}
					isClosedOrSigned={isClosedOrSigned}
					isPrinting={isPrinting}
					onPrint={handlePrint}
					onDownloadPdf={handleDownloadPdf}
					onClose={onClose}
				/>
				<main className="p-0 sm:p-4 max-h-[85vh] overflow-y-auto bg-[var(--paper-soft)] flex justify-center">
					<ProfessionalDocumentA4Sheet
						activeTab="medical_card"
						onTabChange={() => {}}
						medicalCardData={cardData}
						contractData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							contractNumber: `Д-${pt.cardNumber}`,
							contractDate: todayRu,
							estimatedTotalRub: 0,
							services: [],
						}}
						actData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							actNumber: `А-${pt.cardNumber}`,
							actDate: todayRu,
							contractNumber: `Д-${pt.cardNumber}`,
							contractDate: todayRu,
							doctorFullName: doctor,
							services: [],
							totalAmountRub: 0,
						}}
						treatmentPlanData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							planNumber: `П-${pt.cardNumber}`,
							planDate: todayRu,
							doctorFullName: doctor,
							stages: [],
							totalCostWithoutDiscountRub: 0,
							totalCostWithDiscountRub: 0,
						}}
						onPrint={handlePrint}
					/>
				</main>
			</div>
		</div>
	);
};

OutpatientCardPrintModal.displayName = "OutpatientCardPrintModal";
