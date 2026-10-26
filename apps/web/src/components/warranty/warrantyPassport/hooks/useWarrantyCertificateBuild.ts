import { useMemo, useState } from "react";
import {
	calculateMultiItemWarrantyTerms,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateWarrantyCertificateHtml,
	type WarrantyCalculationResult,
	type WarrantyCertificateData,
	type WarrantyItem,
	type WarrantyRemediationOrder,
	type WarrantyRiskFactors,
} from "../../warrantyEngine.js";
import type { WarrantyPatientMeta } from "../types";

export interface UseWarrantyCertificateBuildParams {
	patient?: WarrantyPatientMeta;
	doctorName?: string;
	doctorSpecialty?: string;
	clinicName?: string;
	clinicLegalName?: string;
	clinicLicenseNumber?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicWebsite?: string;
	items: WarrantyItem[];
	attachedStatus: boolean;
	remediations: WarrantyRemediationOrder[];
}

export function useWarrantyCertificateBuild({
	patient, doctorName = "Лечащий врач", doctorSpecialty = "Врач-стоматолог",
	clinicName = "ООО «Стоматологическая клиника»", clinicLegalName = "ООО «Стоматологическая клиника»",
	clinicLicenseNumber = "Лицензия на медицинскую деятельность", clinicAddress = "Адрес клиники",
	clinicPhone = "Телефон клиники", clinicWebsite = "", items, attachedStatus, remediations,
}: UseWarrantyCertificateBuildParams) {
	const [certificateId, setCertificateId] = useState(() => generateCertificateId("WAR"));
	const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [riskFactors, setRiskFactors] = useState<WarrantyRiskFactors>({
		hygieneScore: 1.0, kpuIndex: 4, bruxism: false, nightGuardPrescribed: false, nightGuardUsed: false,
		smoking: "none", diabetes: "none", malocclusion: false, periodontitis: "none", poorCompliance: false, osteoporosis: false,
	});

	const calculation: WarrantyCalculationResult = useMemo(() => {
		return calculateMultiItemWarrantyTerms(items, riskFactors, issueDate);
	}, [items, riskFactors, issueDate]);

	const certificateData: WarrantyCertificateData = useMemo(() => {
		const pName = patient?.fullName || "Пациент стоматологической клиники";
		const pCard = patient?.cardNumber || (patient?.id ? `МК-${patient.id.slice(0, 6).toUpperCase()}` : "МК-2026");
		const vUrl = clinicWebsite
			? `${clinicWebsite}/portal/warranty?cert=${certificateId}&card=${encodeURIComponent(pCard)}`
			: `/portal/warranty?cert=${certificateId}&card=${encodeURIComponent(pCard)}`;
		const qr = generateQrCodeSvg(vUrl, { size: 140 });

		const rawForHash = `${certificateId}|${issueDate}|${pName}|${pCard}|${doctorName}|${items.map((i) => `${i.toothNumber}:${i.category}:${i.materialName}:${i.lotNumber || ""}:${i.serviceCode804n || ""}`).join(";")}|${calculation.adjustedWarrantyMonths}|${calculation.totalRiskMultiplier}`;
		const hash = generateSha256(rawForHash);

		return {
			certificateId, issueDate,
			patient: { fullName: pName, birthDate: patient?.birthDate, cardNumber: pCard, phone: patient?.phone, snils: patient?.snils },
			doctor: { fullName: doctorName, specialty: doctorSpecialty },
			clinic: { name: clinicName, legalName: clinicLegalName, licenseNumber: clinicLicenseNumber, address: clinicAddress, phone: clinicPhone, website: clinicWebsite || undefined },
			items, calculation, verificationUrl: vUrl, qrCodeSvg: qr, integrityHash: hash,
			signedByDoctor: true, signedByChief: true, attachedToForm043u: attachedStatus,
			remediations: remediations.length > 0 ? remediations : undefined,
		};
	}, [certificateId, issueDate, patient, doctorName, doctorSpecialty, clinicName, clinicLegalName, clinicLicenseNumber, clinicAddress, clinicPhone, clinicWebsite, items, calculation, attachedStatus, remediations]);

	const certificateHtml = useMemo(() => generateWarrantyCertificateHtml(certificateData), [certificateData]);

	return {
		certificateId, setCertificateId, issueDate, setIssueDate, riskFactors, setRiskFactors,
		calculation, certificateData, certificateHtml,
	};
}
