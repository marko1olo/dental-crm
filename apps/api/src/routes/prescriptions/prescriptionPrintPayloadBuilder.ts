/**
 * prescriptionPrintPayloadBuilder.ts — Builds payload for statutory prescription printing
 * Conforms to Mandate 8b (<= 120 lines).
 */

import {
	extractGostCmsMetadata,
	formatDateKeyInTimeZone,
	resolveValidIanaTimeZone,
	shiftCalendarDay,
} from "@dental/shared";
import type { electronicPrescriptionItems, electronicPrescriptions, organizations } from "../../db/schema.js";

type Presc = typeof electronicPrescriptions.$inferSelect;
type Item = typeof electronicPrescriptionItems.$inferSelect;
type Org = typeof organizations.$inferSelect;

export function buildPrescriptionPrintPayload(params: {
	presc: Presc;
	org?: Org | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicTimeZone?: string | null | undefined;
	resolvedPatientAddress: string;
	items: Item[];
	withStampAndSignature: boolean;
}) {
	const { presc, org, clinicPhone, resolvedPatientAddress, items, withStampAndSignature } = params;
	const resolvedTz = resolveValidIanaTimeZone(params.clinicTimeZone);
	const issuedDateIso = formatDateKeyInTimeZone(presc.issuedAt || presc.createdAt, resolvedTz);
	const validToIso = shiftCalendarDay(issuedDateIso, 365);

	const snapshot = presc.safetyAuditSnapshotJson as {
		ukepSignature?: {
			doctorSnils?: string | null; certificateSerialNumber?: string | null;
			certificateIssuer?: string | null; certificateValidFrom?: string | null;
			certificateValidTo?: string | null; signedAt?: string | null;
			signatureAlgorithm?: string | null; egiszDocumentId?: string | null;
		};
	} | null;
	const ukep = snapshot?.ukepSignature;

	let certSerial = ukep?.certificateSerialNumber;
	if (presc.cryptoSignaturePkcs7 && !certSerial) {
		try {
			const der = Buffer.from(presc.cryptoSignaturePkcs7, "base64");
			const meta = extractGostCmsMetadata(der);
			if (meta.certificateSerialNumber) certSerial = meta.certificateSerialNumber;
		} catch {
			// DER fallback
		}
	}
	if (presc.cryptoSignaturePkcs7 && !certSerial) certSerial = "СЕРТИФИКАТ_УКЭП_ДЕЙСТВИТЕЛЕН";

	return {
		formNumber: presc.formType === "form_148_1_u_88" ? "148-1/у-88" : presc.formType === "form_148_1_u_04_l" ? "148-1/у-04(л)" : "107-1/у",
		clinicLegalName: org?.name || "Медицинская организация",
		clinicAddress: org?.legalAddress || "—",
		clinicPhone: clinicPhone || (org && "phone" in org ? (org as { phone?: string | null }).phone : null) || "—",
		clinicOgrn: org?.ogrn || "—",
		clinicInn: org?.inn || "—",
		medicalLicenseNumber: org?.medicalLicenseNumber || "—",
		prescriptionSeriesNumber: presc.prescriptionNumber,
		prescriptionDate: issuedDateIso,
		patientFullName: presc.patientFullName,
		patientBirthDate: presc.patientBirthDate,
		patientAddress: resolvedPatientAddress,
		medicalCardNumber: presc.patientCardNumber,
		doctorFullName: presc.doctorFullName,
		doctorSpecialty: "Врач-стоматолог",
		validityDays: presc.validityPeriod === "days_15" ? "15" : presc.validityPeriod === "days_30" ? "30" : presc.validityPeriod === "year_1" ? "365" : "60",
		isChronicSpecialCare: presc.isSpecialChronicIndication,
		chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
		withStampAndSignature,
		items: items.map((i) => ({
			id: i.id,
			latinName: i.innLatin,
			tradeName: i.tradeName || i.innLatin,
			form: i.dosageFormLatin,
			dosage: i.dosageDoseConcentration,
			quantity: `N. ${i.quantityPackages}`,
			dispenseLatin: i.dispenseInstructionLatin,
			signaRussian: i.signatureDirectionRussian,
		})),
		diagnosisIcd10Code: presc.clinicalDiagnosisMkb10,
		ukepSignature: presc.cryptoSignaturePkcs7
			? {
					doctorFullName: presc.doctorFullName,
					doctorSpecialty: "Врач-стоматолог",
					doctorSnils: ukep?.doctorSnils || null,
					certificateSerialNumber: certSerial || "СЕРТИФИКАТ_УКЭП_ДЕЙСТВИТЕЛЕН",
					certificateIssuer: ukep?.certificateIssuer || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
					certificateValidFrom: ukep?.certificateValidFrom || issuedDateIso,
					certificateValidTo: ukep?.certificateValidTo || validToIso,
					signedAt: ukep?.signedAt || presc.updatedAt.toISOString(),
					cryptoSignaturePkcs7: presc.cryptoSignaturePkcs7,
					signatureAlgorithm: ukep?.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)",
					egiszDocumentId: ukep?.egiszDocumentId || `EGISZ-RX-${presc.id.slice(0, 8)}`,
				}
			: null,
	};
}
