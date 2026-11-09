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
	| "partisan_insert_043u"
	| "form043u"
	| "act_and_receipt"
	| "treatment_estimate";

export interface ClinicSummary {
	readonly id?: string;
	readonly name?: string;
	readonly legalName?: string;
	readonly inn?: string;
	readonly ogrn?: string;
	readonly address?: string;
	readonly phone?: string;
	readonly email?: string;
	readonly licenseNumber?: string;
	readonly chiefDoctorFullName?: string;
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
	readonly initialDocType?: FastPrintDocType | string;
	readonly patient?: {
		readonly id?: string;
		readonly organizationId?: string;
		readonly fullName?: string;
		readonly birthDate?: string;
		readonly phone?: string;
		readonly address?: string;
		readonly cardNumber?: string;
		readonly allergies?: string;
		readonly somaticNotes?: string;
	} | Patient | null;
	readonly clinic?: ClinicSummary | null;
	readonly doctor?: {
		readonly fullName?: string;
		readonly specialty?: string;
	} | null;
	readonly visitData?: {
		readonly date?: string;
		readonly time?: string;
		readonly toothNumber?: ToothNumber;
		readonly diagnosis?: string | ClinicalDiagnosis;
		readonly complaints?: string;
		readonly objective?: string;
		readonly treatment?: string;
		readonly recommendations?: string;
	} | null;
	readonly services?: readonly PrintServiceItem[];
	readonly planStages?: readonly PlanStageSummary[];
	readonly fiscalData?: FiscalDataSummary | null;
	readonly onAfterPrint?: () => void;
}

function mapDocTypeToA4Tab(docType?: string): ProfessionalA4DocumentTab {
	switch (docType) {
		case "act_and_receipt":
			return "act";
		case "treatment_estimate":
			return "treatment_plan";
		case "medical_card":
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

	return (
		<DocumentA4PrintPreviewModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab={mappedTab}
			doctorFullName={doctor?.fullName}
			clinicProfileDraft={clinic ?? undefined}
			patient={
				patient
					? {
							id: patient.id || "",
							organizationId:
								"organizationId" in patient && typeof patient.organizationId === "string"
									? patient.organizationId
									: "",
							fullName: patient.fullName || "Пациент",
							birthDate: patient.birthDate || "",
							phone: patient.phone || "",
							status: "active",
							source: "direct",
							gender: "other",
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						}
					: null
			}
			medicalCardData={{
				cardNumber: patient?.cardNumber || "",
				patientFullName: patient?.fullName || "Пациент",
				patientBirthDate: patient?.birthDate || "",
				patientPhone: patient?.phone || "",
				patientAddress: patient?.address || "",
				visitDateRu: visitData?.date || new Date().toLocaleDateString("ru-RU"),
				doctorFullName: doctor?.fullName || "Врач-стоматолог",
				doctorSpecialtyRu: doctor?.specialty || "Стоматолог-терапевт",
				diagnosisMkb10:
					typeof visitData?.diagnosis === "object" && visitData?.diagnosis !== null
						? visitData.diagnosis.code
						: visitData?.diagnosis || "",
				complaintsRu: visitData?.complaints || "",
				objectiveRu: visitData?.objective || "",
				treatmentRu: visitData?.treatment || "",
				recommendationsRu: visitData?.recommendations || "",
			}}
		/>
	);
};

export default FastClinicalPrintEngine;
