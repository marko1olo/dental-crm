/**
 * apps/web/src/components/documents/FastClinicalPrintEngine.tsx
 *
 * Ультра-тонкий фасад совместимости для вызова канонического A4 движка печати
 * (DocumentA4PrintPreviewModal) по Мандату 8za (SSOT).
 * Исключает параллельные движки печати и направляет всех потребителей
 * в регламентный A4 стандарт клиники.
 */

import React from "react";
import type { Patient } from "@dental/shared";
import { DocumentA4PrintPreviewModal } from "./DocumentA4PrintPreviewModal";
import type { ProfessionalA4DocumentTab } from "./professionalA4/types";

export type FastPrintDocType =
	| "medical_card"
	| "clinical_protocol_entry"
	| "clinicalProtocolEntry"
	| "form043u"
	| "act_and_receipt"
	| "treatment_estimate";

export interface ClinicSummary {
	readonly id?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly legalName?: string | null | undefined;
	readonly inn?: string | null | undefined;
	readonly ogrn?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly email?: string | null | undefined;
	readonly licenseNumber?: string | null | undefined;
	readonly chiefDoctorFullName?: string | null | undefined;
	readonly [key: string]: unknown;
}

export type ToothNumber = number | string;

export interface ClinicalDiagnosis {
	readonly code: string;
	readonly titleRu: string;
	readonly toothNumber?: ToothNumber | null;
}

export interface PrintServiceItem {
	readonly code?: string;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothNumber?: ToothNumber | null;
}

export interface PlanStageSummary {
	readonly stageNumber: number;
	readonly title: string;
	readonly services: readonly PrintServiceItem[];
	readonly totalRub: number;
}

export interface FiscalDataSummary {
	readonly cashboxNumber?: string;
	readonly receiptNumber?: string;
	readonly shiftNumber?: number;
	readonly fiscalSign?: string;
	readonly totalKopecks?: bigint | number;
}

export interface FastClinicalPrintEngineProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocType?: FastPrintDocType | string | undefined;
	readonly patient?: {
		readonly id?: string | null | undefined;
		readonly organizationId?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | Date | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly cardNumber?: string | null | undefined;
		readonly allergies?: string | readonly string[] | null | undefined;
		readonly somaticNotes?: string | null | undefined;
		readonly [key: string]: unknown;
	} | Patient | null | undefined;
	readonly clinic?: ClinicSummary | null | undefined;
	readonly doctor?: {
		readonly fullName?: string | undefined;
		readonly specialty?: string | undefined;
	} | null | undefined;
	readonly visitData?: {
		readonly date?: string | undefined;
		readonly time?: string | undefined;
		readonly toothNumber?: ToothNumber | undefined;
		readonly diagnosis?: string | ClinicalDiagnosis | undefined;
		readonly complaints?: string | undefined;
		readonly objective?: string | undefined;
		readonly treatment?: string | undefined;
		readonly recommendations?: string | undefined;
	} | null | undefined;
	readonly services?: readonly PrintServiceItem[] | undefined;
	readonly planStages?: readonly PlanStageSummary[] | undefined;
	readonly fiscalData?: FiscalDataSummary | null | undefined;
	readonly onAfterPrint?: (() => void) | undefined;
}

function mapDocTypeToA4Tab(docType?: string): ProfessionalA4DocumentTab {
	switch (docType) {
		case "act_and_receipt":
			return "act";
		case "treatment_estimate":
			return "treatment_plan";
		case "medical_card":
		case "clinical_protocol_entry":
		case "partisan_insert_043u":
		case "form043u":
		default:
			return "medical_card";
	}
}

export const FastClinicalPrintEngine: React.FC<FastClinicalPrintEngineProps> = ({
	isOpen,
	onClose,
	initialDocType,
	patient,
	clinic,
	doctor,
	visitData,
}) => {
	if (!isOpen) return null;

	const mappedTab = mapDocTypeToA4Tab(initialDocType);
	const pCardNumber = (patient && "cardNumber" in patient && typeof patient.cardNumber === "string")
		? patient.cardNumber
		: (patient?.id ? `МК-${patient.id.slice(0, 8)}` : "");
	const diagCode = typeof visitData?.diagnosis === "object" && visitData?.diagnosis !== null
		? visitData.diagnosis.code
		: visitData?.diagnosis || "";
	const diagDesc = typeof visitData?.diagnosis === "object" && visitData?.diagnosis !== null
		? visitData.diagnosis.titleRu
		: "";

	return (
		<DocumentA4PrintPreviewModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab={mappedTab}
			doctorFullName={doctor?.fullName}
			clinicProfileDraft={clinic ?? undefined}
			patient={
				patient
					? ({
							id: patient.id || "",
							organizationId:
								"organizationId" in patient && typeof patient.organizationId === "string"
									? patient.organizationId
									: "",
							fullName: patient.fullName || "Пациент",
							birthDate: patient.birthDate || "",
							phone: patient.phone || "",
							email: "email" in patient && typeof patient.email === "string" ? patient.email : "",
							gender: "gender" in patient && (patient.gender === "male" || patient.gender === "female") ? patient.gender : "other",
							status: "active",
							notes: null,
							balanceRub: 0,
							balanceKopecks: 0,
							administrativeProfile: null,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						} as Patient)
					: null
			}
			medicalCardData={{
				cardNumber: pCardNumber,
				visitDate: visitData?.date || new Date().toLocaleDateString("ru-RU"),
				doctorFullName: doctor?.fullName || "Врач-стоматолог",
				doctorSpecialty: doctor?.specialty || "Стоматолог-терапевт",
				diagnosisIcd10: diagCode,
				diagnosisDescription: diagDesc,
				complaints: visitData?.complaints || "",
				statusLocalis: visitData?.objective || "",
				treatmentProtocol: visitData?.treatment || "",
				recommendations: visitData?.recommendations || "",
			}}
		/>
	);
};

export default FastClinicalPrintEngine;
