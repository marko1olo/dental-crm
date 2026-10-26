/**
 * paidContract/primaryVisitPackageGenerator.ts
 * 1-click primary visit package generator (Contract + Consent + Medical card + Estimate)
 * (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import type { BlankContractOptions, BlankContractPatientInfo } from "./blankContractTypes";
import { getContractPrintStyles } from "./contractPrintStyles";
import { generateBlankConsentHtml } from "./blankConsentGenerator";
import { generatePaidContractHtml } from "./contractHtmlGenerator";
import { createDefaultPaidContract } from "./contractDefaultFactory";

export function generatePrimaryVisitPackageHtml(
	patient?: BlankContractPatientInfo,
	options?: BlankContractOptions,
): string {
	const defaultContract = createDefaultPaidContract({
		contractNumber: options?.contractNumber,
		contractDate: options?.contractDate,
		patientFullName: patient?.fullName || undefined,
		patientBirthDate: patient?.birthDate || undefined,
		patientAddress: patient?.administrativeProfile?.registrationAddress || undefined,
		patientPhone: patient?.phone || undefined,
		patientSnils: patient?.administrativeProfile?.snils || undefined,
		clinicFullName: options?.clinicName,
		clinicInn: options?.clinicInn,
		clinicOgrn: options?.clinicOgrn,
		clinicLicense: options?.medicalLicenseNumber,
		doctorFullName: options?.doctorName,
		totalAmountKopecks: 0,
	});

	const contractHtml = generatePaidContractHtml(defaultContract);
	const consentHtml = generateBlankConsentHtml(patient, options);

	// Strip outer <html>, <head>, <body> from inner parts and join with page break
	const extractBody = (h: string) => {
		const m = h.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		return m ? m[1] : h;
	};

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Комплект документов первичного приёма — ${patient?.fullName || "Пациент"}</title>
<style>${getContractPrintStyles()}</style>
</head>
<body>
${extractBody(contractHtml)}
<div class="page-break"></div>
${extractBody(consentHtml)}
</body>
</html>`;
}
