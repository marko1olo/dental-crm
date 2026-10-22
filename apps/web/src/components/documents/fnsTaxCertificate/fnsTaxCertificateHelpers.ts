import type { Patient } from "@dental/shared";
import type {
	TaxCertificateDocumentData,
	TaxDeductionRelationship,
	TaxPaymentRecord,
} from "../taxCertificateEngine";

// biome-ignore lint/suspicious/noExplicitAny: clinic profile draft
export function extractClinicRequisites(clinicProfileDraft: any) {
	const draft = clinicProfileDraft || {};
	return {
		legalName: draft.legalName || draft.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		inn: draft.inn || "7710984521",
		kpp: draft.kpp || "771001001",
		ogrn: draft.ogrn || "1217700456123",
		address: draft.legalAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
		licenseNumber: draft.medicalLicenseNumber || draft.licenseNumber || "ЛО41-01137-77/00645892",
		chiefDoctorOrDirector: draft.directorFullName || "Воронов Алексей Владимирович",
	};
}

export function buildTaxDocPayload(params: {
	selectedYear: number;
	patient?: Patient | null | undefined;
	clinic: ReturnType<typeof extractClinicRequisites>;
	relationship: TaxDeductionRelationship;
	taxpayerFullName: string;
	taxpayerBirthDate: string;
	effectiveInn: string;
	patientInn: string;
	// biome-ignore lint/suspicious/noExplicitAny: aggregation type
	aggregated: any;
}): TaxCertificateDocumentData {
	const certNum = `С-${params.selectedYear}/${params.patient?.id ? params.patient.id.slice(0, 6) : "001"}`;
	return {
		certificateNumber: certNum,
		issueDateIso: new Date().toISOString(),
		taxYear: params.selectedYear,
		clinic: params.clinic,
		taxpayer: {
			fullName: params.relationship === "patient"
				? params.patient?.fullName || "Пациент клиники"
				: params.taxpayerFullName || "Налогоплательщик (указан в заявлении)",
			birthDate: params.relationship === "patient"
				? params.patient?.birthDate ? new Date(params.patient.birthDate).toLocaleDateString("ru-RU") : undefined
				: params.taxpayerBirthDate || undefined,
			inn: params.effectiveInn || undefined,
			relationship: params.relationship,
		},
		patient: {
			fullName: params.patient?.fullName || "Пациент клиники",
			birthDate: params.patient?.birthDate ? new Date(params.patient.birthDate).toLocaleDateString("ru-RU") : undefined,
			inn: params.patientInn || undefined,
		},
		aggregation: params.aggregated,
	};
}
