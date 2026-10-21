import { useState } from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { printClinicalPackage } from "../clinicalPackagePrintEngine";
import { CLINICAL_STATUTORY_ITEMS, type ClinicalVisitPackageModalProps } from "./types";

export function useClinicalVisitPackage(props: ClinicalVisitPackageModalProps) {
	const { patient, doctorFullName, existingDocuments, onCreateDocument, clinicProfileDraft } = props;
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments ?? []) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = CLINICAL_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const extractPatientInfo = () => {
		if (!patient) return null;
		// biome-ignore lint/suspicious/noExplicitAny: patient profile
		const p = patient as any;
		const admin = p?.administrativeProfile;
		return {
			fullName: patient.fullName,
			birthDate: patient.birthDate,
			phone: patient.phone,
			snils: admin?.snils || p?.snils,
			registrationAddress: admin?.registrationAddress || p?.address,
			address: admin?.registrationAddress || p?.address,
			passportSeries: admin?.passportSeries,
			passportNumber: admin?.passportNumber,
			passportIssuedBy: admin?.passportIssuedBy,
			passportIssuedDate: admin?.passportIssuedDate,
			passportDepartmentCode: admin?.passportDepartmentCode,
			gender: p?.gender,
		};
	};

	const extractClinicInfo = () => {
		if (!clinicProfileDraft) return null;
		return {
			clinicName: clinicProfileDraft.clinicName || "Стоматологическая клиника",
			legalName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
			fullName: clinicProfileDraft.legalName || clinicProfileDraft.clinicName || "",
			shortName: clinicProfileDraft.clinicName || "",
			inn: clinicProfileDraft.inn || "",
			kpp: clinicProfileDraft.kpp || "",
			ogrn: clinicProfileDraft.ogrn || "",
			licenseNumber: clinicProfileDraft.licenseNumber || "",
			address: clinicProfileDraft.address || "",
			actualAddress: clinicProfileDraft.address || "",
			phone: clinicProfileDraft.phone || "",
		};
	};

	const handleBatchPrint = () => {
		printClinicalPackage({
			patient: extractPatientInfo(),
			clinic: extractClinicInfo(),
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	const handlePrintBlank = () => {
		printClinicalPackage({
			patient: null,
			clinic: extractClinicInfo(),
			doctorFullName: doctorFullName || "Врач-стоматолог-терапевт",
		});
	};

	return {
		documentsByKind,
		missingKinds,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		handleBatchCreate,
		handleBatchPrint,
		handlePrintBlank,
	};
}
