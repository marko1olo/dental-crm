/**
 * apps/web/src/components/documents/primaryIntakePackagePrintEngine.ts
 *
 * Канонический масштабируемый движок пакетной печати первичного приёма DENTE CRM.
 */

import type { Patient } from "@dental/shared";
import { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
import { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
import { renderContractSheet } from "./primaryIntakePackage/contractSheet";
import { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
import { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
import { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";
import type { PrimaryIntakePackagePrintOptions, IntakeRequisitesContext } from "./primaryIntakePackage/types";
import { printHtmlViaIframe } from "./printHtmlViaIframe";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";

export * from "./primaryIntakePackage/types";
export { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
export { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
export { renderContractSheet } from "./primaryIntakePackage/contractSheet";
export { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
export { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
export { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";

export interface ClinicPrintProfileDraft {
	clinicName?: string | null | undefined;
	legalName?: string | null | undefined;
	fullName?: string | null | undefined;
	shortName?: string | null | undefined;
	inn?: string | null | undefined;
	kpp?: string | null | undefined;
	ogrn?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	licenseDate?: string | null | undefined;
	address?: string | null | undefined;
	actualAddress?: string | null | undefined;
	phone?: string | null | undefined;
	directorTitle?: string | null | undefined;
	directorFullName?: string | null | undefined;
	city?: string | null | undefined;
	website?: string | null | undefined;
}

export interface PrintablePatientAdministrativeProfile {
	legalRepresentativeFullName?: string | null | undefined;
	legalRepresentativeRelationship?: string | null | undefined;
	legalRepresentativePhone?: string | null | undefined;
	legalRepresentativeIdentityDocument?: string | null | undefined;
	legalRepresentativeBasisDocument?: string | null | undefined;
	snils?: string | null | undefined;
	registrationAddress?: string | null | undefined;
	residentialAddress?: string | null | undefined;
	passportSeries?: string | null | undefined;
	passportNumber?: string | null | undefined;
	passportIssuedBy?: string | null | undefined;
	passportIssuedDate?: string | null | undefined;
	passportDepartmentCode?: string | null | undefined;
}

export interface PrintablePatient {
	fullName: string;
	birthDate?: string | null | undefined;
	phone?: string | null | undefined;
	gender?: "male" | "female" | "other" | string | null | undefined;
	cardNumber?: string | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	administrativeProfile?: PrintablePatientAdministrativeProfile | null | undefined;
	[key: string]: unknown;
}

export interface UsePrimaryIntakePrintProps {
	patient: PrintablePatient | Patient | null;
	clinicProfileDraft?: ClinicPrintProfileDraft | null | undefined;
	doctorFullName?: string | null | undefined;
	isNormApplied: boolean;
}

export function resolveClinicPrintPayload(c?: ClinicPrintProfileDraft | null) {
	return {
		clinicName: c?.clinicName || "Стоматологическая клиника",
		legalName: c?.legalName || c?.clinicName || "",
		fullName: c?.legalName || c?.clinicName || "",
		shortName: c?.clinicName || "",
		inn: c?.inn || "",
		kpp: c?.kpp || "",
		ogrn: c?.ogrn || "",
		licenseNumber: c?.licenseNumber || "",
		licenseDate: c?.licenseDate || "",
		address: c?.address || "",
		actualAddress: c?.address || "",
		phone: c?.phone || "",
		directorTitle: c?.directorTitle || "Руководитель",
		directorFullName: c?.directorFullName || "",
		city: c?.city || "",
		website: c?.website || "",
	};
}

export function usePrimaryIntakePrint({
	patient,
	clinicProfileDraft,
	doctorFullName,
	isNormApplied,
}: UsePrimaryIntakePrintProps) {
	const clinicPrintPayload = resolveClinicPrintPayload(clinicProfileDraft);

	const handleBatchPrint = () => {
		const store = useDocumentStore.getState();
		const pt = patient as PrintablePatient | null;
		const adminProfile = pt?.administrativeProfile ?? null;
		const repFullName = adminProfile?.legalRepresentativeFullName || store.minorRepresentativeFullName;
		const representative = repFullName
			? {
					fullName: repFullName,
					relationship: adminProfile?.legalRepresentativeRelationship || store.minorRepresentativeRelationship || "Законный представитель",
					phone: adminProfile?.legalRepresentativePhone || store.minorRepresentativePhone || pt?.phone || undefined,
					passport: adminProfile?.legalRepresentativeIdentityDocument || store.minorRepresentativeIdentityDocument || undefined,
					basisDocument: adminProfile?.legalRepresentativeBasisDocument || store.minorRepresentativeAuthorityDocument || undefined,
				}
			: null;

		printPrimaryIntakePackage({
			patient: pt
				? {
						fullName: pt.fullName,
						birthDate: pt.birthDate,
						phone: pt.phone,
						snils: adminProfile?.snils || pt.snils,
						registrationAddress: adminProfile?.registrationAddress || pt.address,
						address: adminProfile?.registrationAddress || pt.address,
						passportSeries: adminProfile?.passportSeries,
						passportNumber: adminProfile?.passportNumber,
						passportIssuedBy: adminProfile?.passportIssuedBy,
						passportIssuedDate: adminProfile?.passportIssuedDate,
						passportDepartmentCode: adminProfile?.passportDepartmentCode,
						gender: pt.gender,
						cardNumber: pt.cardNumber,
					}
				: null,
			representative,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: isNormApplied || Boolean(store.intakeAccuracyConfirmed),
			questionnaireAnswers: {
				complaint: store.intakeChiefComplaint,
				allergies: store.intakeAllergyStatus,
				medications: store.intakeCurrentMedications,
				chronic: store.intakeChronicConditions,
				anticoagulants: store.intakeAnticoagulants,
				infections: store.intakeInfectiousRiskNotes,
				cardioEndocrine: store.intakeCardioEndocrineNotes,
				pregnancy: store.intakePregnancyStatus,
			},
		});
		showToast("Первичный пакет документов (Договор, Согласие ИДС, Персональные данные, Анкета здоровья) отправлен на печать", "success", 4000);
	};

	const handlePrintBlankPackage = () => {
		printPrimaryIntakePackage({
			patient: null,
			representative: null,
			clinic: clinicPrintPayload,
			doctorFullName: doctorFullName || null,
			intakeNormApplied: false,
		});
		showToast("Чистый первичный пакет («________») отправлен на печать", "info", 4000);
	};

	return {
		clinicPrintPayload,
		handleBatchPrint,
		handlePrintBlankPackage,
	};
}

export function generatePrimaryIntakePackageHtml(
	options: PrimaryIntakePackagePrintOptions,
): string {
	const ctx: IntakeRequisitesContext = buildIntakeRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Первичный пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${PRIMARY_INTAKE_PACKAGE_CSS}</style>
</head>
<body>
${renderContractSheet(ctx)}
${renderConsentSheet(ctx)}
${renderPersonalDataSheet(ctx)}
${renderQuestionnaireSheet(ctx, options)}
</body>
</html>`;
}

export function printPrimaryIntakePackage(
	options: PrimaryIntakePackagePrintOptions,
): void {
	const html = generatePrimaryIntakePackageHtml(options);
	printHtmlViaIframe(html, "dente-primary-intake-print-iframe");
}
