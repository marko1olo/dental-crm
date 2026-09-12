/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CDA R2 EXPORT MODAL — DENTE DENTAL CRM
 * Canonical SSOT Facade over EgiszRemdHubModal (Mandate 8s)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { EgiszRemdHubModal } from "./EgiszRemdHubModal";
import type { EgiszDentalCdaPayload } from "./egiszRemdEngine";
import type { EgiszSemdDocTypeCode } from "./egiszCdaValidator";

export interface EgiszCdaExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	visitId: string;
	patientId: string;
	patientName?: { first: string; last: string; middle?: string } | string;
	patientSnils?: string;
	patientBirthDate?: string;
	patientGender?: "male" | "female" | "other" | string;
	patientPolisOms?: string;
	patientAddress?: string;
	patientPhone?: string;
	patientEmail?: string;
	clinicName?: string;
	clinicOid?: string;
	clinicOgrn?: string;
	clinicInn?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicEmail?: string;
	doctorName?: { first: string; last: string; middle?: string } | string;
	doctorSnils?: string;
	doctorPosition?: string;
	doctorPositionCode?: string;
	doctorPhone?: string;
	doctorEmail?: string;
	diagnosisText?: string;
	icd10Code?: string;
	diagnosisTooth?: string | number;
	anamnesis?: string;
	objectiveStatus?: string;
	treatmentDescription?: string;
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
	toothStates?: Record<number, string> | undefined;
	toothSurfaces?: Record<number, string[]> | undefined;
	procedures?: Array<{ code: string; name: string; tooth?: number | string }> | undefined;
	initialDocType?: EgiszSemdDocTypeCode;
	documentVersion?: number;
	onSentSuccess?: (result: { logId?: string; transactionId?: string }) => void;
}

export type ModalTab = "xml" | "validation" | "signature";

export const EgiszCdaExportModal: React.FC<EgiszCdaExportModalProps> = ({
	isOpen,
	onClose,
	visitId,
	patientId,
	patientName,
	patientSnils,
	patientBirthDate,
	patientGender,
	patientPolisOms,
	patientAddress,
	patientPhone,
	patientEmail: _patientEmail,
	clinicName,
	clinicOid,
	clinicOgrn,
	clinicInn,
	clinicAddress,
	clinicPhone,
	clinicEmail,
	doctorName,
	doctorSnils,
	doctorPosition,
	doctorPositionCode,
	doctorPhone,
	doctorEmail,
	diagnosisText,
	icd10Code,
	diagnosisTooth,
	anamnesis,
	objectiveStatus: _objectiveStatus,
	treatmentDescription,
	complications: _complications,
	comorbidities: _comorbidities,
	instrumentTrayBarcode: _instrumentTrayBarcode,
	toothStates,
	toothSurfaces,
	procedures,
	initialDocType,
	documentVersion: _documentVersion,
	onSentSuccess,
}) => {
	const cdaPayload: Partial<EgiszDentalCdaPayload> = useMemo(() => {
		const docName =
			typeof doctorName === "string"
				? doctorName
				: doctorName
				? `${doctorName.last} ${doctorName.first} ${doctorName.middle || ""}`.trim()
				: undefined;

		const patName =
			typeof patientName === "string"
				? patientName
				: patientName
				? `${patientName.last} ${patientName.first} ${patientName.middle || ""}`.trim()
				: undefined;

		const payload: Partial<EgiszDentalCdaPayload> = {
			docTypeCode: (initialDocType as any) || "302",
			documentUuid: visitId || `DOC-302-${Date.now()}`,
			complaints: anamnesis || "Жалобы на боли в зубе",
			anamnesisMorbi: anamnesis || "",
			treatmentProtocolDescription: treatmentDescription || "",
		};

		if (clinicName || clinicOid || clinicOgrn || clinicInn) {
			payload.clinic = {
				clinicName: clinicName || "ООО «Стоматология ДЕНТЕ»",
				clinicOid: clinicOid || "1.2.643.5.1.13.13.12.2.77.9999",
				clinicOgrn: clinicOgrn || "1027700132195",
				clinicInn: clinicInn || "7701234567",
				clinicKpp: "770101001",
				clinicAddress: clinicAddress || "г. Москва",
				clinicPhone: clinicPhone || "+7 (495) 123-45-67",
				clinicEmail: clinicEmail || "clinic@dente.ru",
			};
		}

		if (docName || doctorSnils) {
			payload.doctor = {
				doctorFullName: docName || "Врач-стоматолог",
				doctorSnils: doctorSnils || "112-233-445 95",
				doctorPosition: doctorPosition || "Врач-стоматолог-терапевт",
				doctorPositionCode: doctorPositionCode || "18",
				...(doctorPhone ? { doctorPhone } : {}),
				...(doctorEmail ? { doctorEmail } : {}),
			};
		}

		if (patName || patientSnils) {
			payload.patient = {
				patientId: patientId || "PAT-001",
				cardNumber: patientId || "CARD-001",
				patientFullName: patName || "Иванов Иван Иванович",
				...(patientSnils ? { patientSnils } : {}),
				patientBirthDate: patientBirthDate || "1985-05-12",
				patientGender: (patientGender as any) || "male",
				...(patientPolisOms ? { patientPolisOms } : {}),
				...(patientAddress ? { patientAddress } : {}),
				...(patientPhone ? { patientPhone } : {}),
			};
		}

		if (icd10Code) {
			payload.diagnoses = [
				{
					icd10Code: icd10Code,
					icd10Name: diagnosisText || "Кариес дентина",
					isPrimary: true,
					...(diagnosisTooth ? { tooth: Number(diagnosisTooth) } : {}),
					surfaces: ["O"],
				},
			];
		}

		if (toothStates) {
			payload.toothStates = toothStates;
		} else if (diagnosisTooth) {
			payload.toothStates = { [Number(diagnosisTooth)]: "Caries" };
		}

		if (toothSurfaces) {
			payload.toothSurfaces = toothSurfaces;
		}

		if (procedures) {
			payload.procedures = procedures.map((p) => ({
				code: p.code || "A16.07.002",
				name: p.name || "Восстановление зуба пломбой",
				...(p.tooth ? { tooth: Number(p.tooth) } : {}),
				quantity: 1,
			}));
		}

		return payload;
	}, [
		visitId,
		patientId,
		patientName,
		patientSnils,
		patientBirthDate,
		patientGender,
		patientPolisOms,
		patientAddress,
		patientPhone,
		clinicName,
		clinicOid,
		clinicOgrn,
		clinicInn,
		clinicAddress,
		clinicPhone,
		clinicEmail,
		doctorName,
		doctorSnils,
		doctorPosition,
		doctorPositionCode,
		doctorPhone,
		doctorEmail,
		diagnosisText,
		icd10Code,
		diagnosisTooth,
		anamnesis,
		treatmentDescription,
		toothStates,
		toothSurfaces,
		procedures,
		initialDocType,
	]);

	return (
		<EgiszRemdHubModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab="xml_preview"
			initialPayload={cdaPayload}
			onSentSuccess={(res) => {
				onSentSuccess?.({ transactionId: res.documentId });
			}}
		/>
	);
};
