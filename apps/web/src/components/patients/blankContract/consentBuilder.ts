import type { BlankContractOptions, BlankContractPatientInfo } from "./types";
import { escapeHtml } from "./contractSections/contractEscapeHtml";
import { renderConsentHeaderHtml } from "./contractSections/consentHeaderSection";
import { renderConsentSignaturesHtml } from "./contractSections/consentSignaturesSection";
import { getConsentPrintStyles } from "./contractSections/consentStyles";
import { renderConsentTermsHtml } from "./contractSections/consentTermsSection";

export function generateBlankConsentFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName?.trim() || "ООО «Стоматологическая клиника»";
	const clinicAddress = options?.clinicAddress?.trim() || "________________________________________________";
	const clinicInn = options?.clinicInn?.trim() || "____________";
	const clinicOgrn = options?.clinicOgrn?.trim() || "_____________";
	const clinicPhone = options?.clinicPhone?.trim() || "________________________";
	const medicalLicenseNumber = options?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421";
	const medicalLicenseDate = options?.medicalLicenseDate?.trim() || "12.10.2021";
	const medicalLicenseIssuer = options?.medicalLicenseIssuer?.trim() || "Департамент здравоохранения города Москвы";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const customerBirthDate = patient?.birthDate?.trim() || "«_____» _________________ _______ г.";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const customerPassport =
		patient?.administrativeProfile?.identityDocument?.trim() ||
		"серия _______ № ______________, выдан ________________________________________________";
	const customerAddress =
		patient?.administrativeProfile?.registrationAddress?.trim() ||
		patient?.administrativeProfile?.residentialAddress?.trim() ||
		"____________________________________________________________________";
	const customerSnils = patient?.administrativeProfile?.snils?.trim() || "_______-_______-_______ ___";
	const doctorName = options?.doctorName?.trim() || "________________________";

	const repFullName = patient?.administrativeProfile?.legalRepresentativeFullName?.trim() || "";
	const repRelationship = patient?.administrativeProfile?.legalRepresentativeRelationship?.trim() || "";
	const repPassport = patient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() || "";
	const repPhone = patient?.administrativeProfile?.legalRepresentativePhone?.trim() || "";

	const consentSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-")
			? options.contractNumber.slice("БЛАНК-".length)
			: options.contractNumber)
		: Date.now().toString().slice(-6);
	const consentDateFormatted = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	const representativeBlock = repFullName
		? `<div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7.5pt;">
			<strong>Законный представитель:</strong> ${escapeHtml(repFullName)}
			${repRelationship ? ` (${escapeHtml(repRelationship)})` : ""},
			паспорт: ${escapeHtml(repPassport || "________________________")},
			тел.: ${escapeHtml(repPhone || "________________________")}
		</div>`
		: "";

	const headerHtml = renderConsentHeaderHtml({
		clinicName, clinicAddress, clinicInn, clinicOgrn, clinicPhone,
		medicalLicenseNumber, medicalLicenseDate, medicalLicenseIssuer,
		consentSuffix, consentDateFormatted,
	});

	const termsHtml = renderConsentTermsHtml({
		customerName, customerBirthDate, customerPassport, customerSnils,
		customerAddress, customerPhone, doctorName, representativeBlock,
	});

	const signaturesHtml = renderConsentSignaturesHtml({ customerName, doctorName });

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Информированное добровольное согласие (Бланк)</title>
	<style>${getConsentPrintStyles()}</style>
</head>
<body>
	${headerHtml}
	${termsHtml}
	${signaturesHtml}
	<script>
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}
