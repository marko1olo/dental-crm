import type {
	DentalMedicalCard043uPayload,
	GeneratedDocument,
	MedicalDocumentReleaseReceiptPayload,
	MedicalRecordCopyRequestPayload,
	MedicalRecordExtractPayload,
	Payment,
	TaxDeductionApplicationPayload,
} from "@dental/shared";
import { getAppointmentByIdInDb } from "../../../db/appointmentsQuery.js";
import { getDocumentsByPatientId } from "../../../db/documentQuery.js";
import { getVisitByIdInDb } from "../../../db/visitsQuery.js";
import { taxPaymentsForDocumentScope } from "../../../documents/taxPaymentSnapshot.js";
import {
	normalizeTaxApplicationRelationship,
	normalizedDocumentChainValue,
} from "./types.js";

export { normalizedDocumentChainValue } from "./types.js";

function releasedDocumentTypesCoveredByRequest(
	releasedTypes: readonly string[],
	requestedTypes: readonly string[],
): boolean {
	const requestedValues = new Set(
		requestedTypes
			.map((item) => normalizedDocumentChainValue(item))
			.filter(Boolean),
	);
	return releasedTypes.every((item) =>
		requestedValues.has(normalizedDocumentChainValue(item)),
	);
}

function comparableDocumentChainDate(
	value: string | null | undefined,
): number | null {
	const normalized = (value ?? "").trim();
	if (!normalized) return null;
	const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
	if (!datePrefix) return null;
	const year = Number(datePrefix[1]);
	const month = Number(datePrefix[2]);
	const day = Number(datePrefix[3]);
	const parsed = Date.UTC(year, month - 1, day);
	const date = new Date(parsed);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	)
		return null;
	return parsed;
}

function documentChainDateIsBlankOrValid(
	value: string | null | undefined,
): boolean {
	const normalized = (value ?? "").trim();
	return !normalized || comparableDocumentChainDate(normalized) !== null;
}

function documentChainDateRangeIsChronological(
	periodStart: string | null | undefined,
	periodEnd: string | null | undefined,
): boolean {
	const start = comparableDocumentChainDate(periodStart);
	const end = comparableDocumentChainDate(periodEnd);
	if (
		!documentChainDateIsBlankOrValid(periodStart) ||
		!documentChainDateIsBlankOrValid(periodEnd)
	)
		return false;
	return start === null || end === null || start <= end;
}

function medicalRecordExtractPeriodIsChronological(
	payload: MedicalRecordExtractPayload,
): boolean {
	return documentChainDateRangeIsChronological(
		payload.periodStart,
		payload.periodEnd,
	);
}

function medicalRecordExtractDatesAreValid(
	payload: MedicalRecordExtractPayload,
): boolean {
	return (
		documentChainDateIsBlankOrValid(payload.periodStart) &&
		documentChainDateIsBlankOrValid(payload.periodEnd) &&
		documentChainDateIsBlankOrValid(payload.issuedAt) &&
		documentChainDateRangeIsChronological(
			payload.periodStart,
			payload.periodEnd,
		)
	);
}

export function medicalRecordCopyRequestDatesAreValid(
	payload: MedicalRecordCopyRequestPayload,
): boolean {
	return (
		documentChainDateIsBlankOrValid(payload.periodStart) &&
		documentChainDateIsBlankOrValid(payload.periodEnd) &&
		documentChainDateIsBlankOrValid(payload.requestedAt) &&
		documentChainDateRangeIsChronological(
			payload.periodStart,
			payload.periodEnd,
		)
	);
}

function dentalMedicalCard043uDatesAreValid(
	payload: DentalMedicalCard043uPayload,
): boolean {
	return (
		documentChainDateIsBlankOrValid(payload.visitDate) &&
		documentChainDateIsBlankOrValid(payload.patient?.birthDate) &&
		documentChainDateIsBlankOrValid(payload.organization?.licenseIssueDate) &&
		documentChainDateIsBlankOrValid(payload.lockedAt)
	);
}

function medicalDocumentReleaseReceiptDatesAreValid(
	payload: MedicalDocumentReleaseReceiptPayload,
): boolean {
	const deliveredAt = comparableDocumentChainDate(payload.deliveredAt);
	const accessExpiresAt = comparableDocumentChainDate(payload.accessExpiresAt);
	if (
		!documentChainDateIsBlankOrValid(payload.periodStart) ||
		!documentChainDateIsBlankOrValid(payload.periodEnd) ||
		!documentChainDateIsBlankOrValid(payload.deliveredAt) ||
		!documentChainDateIsBlankOrValid(payload.accessExpiresAt)
	) {
		return false;
	}
	if (
		!documentChainDateRangeIsChronological(
			payload.periodStart,
			payload.periodEnd,
		)
	)
		return false;
	if (
		deliveredAt !== null &&
		accessExpiresAt !== null &&
		accessExpiresAt < deliveredAt
	)
		return false;
	return true;
}

function releasePeriodCoveredByRequest(
	release: MedicalDocumentReleaseReceiptPayload,
	request: MedicalRecordCopyRequestPayload,
): boolean {
	if (
		!medicalDocumentReleaseReceiptDatesAreValid(release) ||
		!medicalRecordCopyRequestDatesAreValid(request)
	)
		return false;
	const requestStart = comparableDocumentChainDate(request.periodStart);
	const requestEnd = comparableDocumentChainDate(request.periodEnd);
	const releaseStart = comparableDocumentChainDate(release.periodStart);
	const releaseEnd = comparableDocumentChainDate(release.periodEnd);

	if (
		requestStart !== null &&
		(releaseStart === null || releaseStart < requestStart)
	)
		return false;
	if (requestEnd !== null && (releaseEnd === null || releaseEnd > requestEnd))
		return false;
	return true;
}

function taxCertificateExpectedApplicationForm(
	document: GeneratedDocument,
): TaxDeductionApplicationPayload["requestedForm"] | null {
	if (document.kind === "tax_deduction_certificate") return "knd_1151156";
	if (document.kind === "tax_deduction_registry") return "knd_1151156";
	if (document.kind === "legacy_tax_deduction_certificate")
		return "legacy_2021_2023";
	return null;
}

function paymentMatchesTaxApplication(
	payment: Payment,
	application: TaxDeductionApplicationPayload,
): boolean {
	return (
		normalizedDocumentChainValue(payment.payerInn) ===
			normalizedDocumentChainValue(application.taxpayerInn) &&
		normalizedDocumentChainValue(payment.payerFullName) ===
			normalizedDocumentChainValue(application.taxpayerFullName) &&
		normalizedDocumentChainValue(payment.payerBirthDate) ===
			normalizedDocumentChainValue(application.taxpayerBirthDate) &&
		normalizedDocumentChainValue(payment.payerIdentityDocument) ===
			normalizedDocumentChainValue(application.taxpayerIdentityDocument) &&
		normalizeTaxApplicationRelationship(payment.payerRelationship) ===
			application.relationshipToPatient
	);
}

function taxApplicationMatchesSelectedPayments(
	paymentsForDocument: Payment[],
	application: TaxDeductionApplicationPayload,
): boolean {
	const applicationPaymentIds = application.selectedPaymentIds ?? [];
	if (!applicationPaymentIds.length) return true;
	const documentPaymentIds = new Set(
		paymentsForDocument.map((payment) => payment.id),
	);
	if (documentPaymentIds.size !== applicationPaymentIds.length) return false;
	return applicationPaymentIds.every((paymentId) =>
		documentPaymentIds.has(paymentId),
	);
}

async function hasIssuedTaxApplicationForCertificate(
	document: GeneratedDocument,
): Promise<boolean> {
	const allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	const expectedForm = taxCertificateExpectedApplicationForm(document);
	if (!expectedForm || !document.taxYear) return false;
	const taxPayments = taxPaymentsForDocumentScope(document, []);
	if (!taxPayments.length) return false;

	return allDocuments.some((candidate) => {
		const application = candidate.payload?.taxDeductionApplication;
		if (!application) return false;
		if (candidate.status !== "issued") return false;
		if (candidate.kind !== "tax_deduction_application") return false;
		if (candidate.organizationId !== document.organizationId) return false;
		if (candidate.patientId !== document.patientId) return false;
		if (application.requestedTaxYear !== document.taxYear) return false;
		if (application.requestedForm !== expectedForm) return false;
		if (
			document.taxPayerInn &&
			normalizedDocumentChainValue(application.taxpayerInn) !==
				normalizedDocumentChainValue(document.taxPayerInn)
		) {
			return false;
		}
		if (!taxApplicationMatchesSelectedPayments(taxPayments, application))
			return false;
		return taxPayments.every((payment) =>
			paymentMatchesTaxApplication(payment, application),
		);
	});
}

function releaseReceiptMatchesCopyRequest(
	release: MedicalDocumentReleaseReceiptPayload,
	request: MedicalRecordCopyRequestPayload,
): boolean {
	return (
		normalizedDocumentChainValue(release.recipientFullName) ===
			normalizedDocumentChainValue(request.recipientFullName) &&
		normalizedDocumentChainValue(release.recipientIdentityDocument) ===
			normalizedDocumentChainValue(request.recipientIdentityDocument) &&
		normalizedDocumentChainValue(release.recipientAuthority) ===
			normalizedDocumentChainValue(request.recipientAuthority) &&
		release.releaseChannel === request.requestedFormat &&
		releasedDocumentTypesCoveredByRequest(
			release.documentTypes,
			request.requestedDocumentTypes,
		) &&
		releasePeriodCoveredByRequest(release, request)
	);
}

export async function findIssuedMedicalCopyRequestForRelease(
	document: GeneratedDocument,
): Promise<GeneratedDocument | null> {
	const allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	const release = document.payload?.medicalDocumentReleaseReceipt;
	if (!release) return null;
	const sourceRequestDocumentId = release.sourceRequestDocumentId;
	return (
		allDocuments.find((candidate) => {
			const request = candidate.payload?.medicalRecordCopyRequest;
			if (!request) return false;
			return (
				candidate.id === sourceRequestDocumentId &&
				candidate.status === "issued" &&
				candidate.kind === "medical_record_copy_request" &&
				candidate.organizationId === document.organizationId &&
				candidate.patientId === document.patientId &&
				releaseReceiptMatchesCopyRequest(release, request)
			);
		}) ?? null
	);
}

async function hasIssuedMedicalCopyRequestForRelease(
	document: GeneratedDocument,
): Promise<boolean> {
	return Boolean(await findIssuedMedicalCopyRequestForRelease(document));
}

async function completedWorksActMatchesIssuedContract(
	document: GeneratedDocument,
): Promise<boolean> {
	const allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	const act = document.payload?.completedWorksAct;
	if (!act) return false;
	return allDocuments.some((candidate) => {
		const contract = candidate.payload?.paidMedicalServicesContract;
		if (!contract) return false;
		if (candidate.id !== act.linkedContractDocumentId) return false;
		if (candidate.status !== "issued") return false;
		if (candidate.kind !== "paid_medical_services_contract") return false;
		if (candidate.organizationId !== document.organizationId) return false;
		if (candidate.patientId !== document.patientId) return false;
		if (candidate.visitId !== document.visitId) return false;
		return normalizedDocumentChainValue(act.contractNumber).includes(
			normalizedDocumentChainValue(contract.contractNumber),
		);
	});
}

async function medicalRecordExtractVisitDate(
	organizationId: string,
	visitId: string,
): Promise<number | null> {
	const visit = await getVisitByIdInDb(organizationId, visitId);
	if (!visit) return null;
	const appointment = visit.appointmentId
		? await getAppointmentByIdInDb(organizationId, visit.appointmentId)
		: null;
	return (
		comparableDocumentChainDate(
			appointment?.startsAt
				? typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString()
				: null,
		) ??
		comparableDocumentChainDate(
			typeof visit.updatedAt === "string"
				? visit.updatedAt
				: visit.updatedAt.toISOString(),
		) ??
		comparableDocumentChainDate(
			typeof visit.createdAt === "string"
				? visit.createdAt
				: visit.createdAt.toISOString(),
		)
	);
}

async function signedMedicalSourceVisitsAreValid(
	sourceVisitIds: readonly string[],
	document: GeneratedDocument,
	periodStartRaw: string | null | undefined,
	periodEndRaw: string | null | undefined,
): Promise<boolean> {
	const periodStart = comparableDocumentChainDate(periodStartRaw);
	const periodEnd = comparableDocumentChainDate(periodEndRaw);
	if (!documentChainDateRangeIsChronological(periodStartRaw, periodEndRaw))
		return false;
	for (const visitId of sourceVisitIds) {
		const visit = await getVisitByIdInDb(document.organizationId, visitId);
		if (
			!visit ||
			visit.patientId !== document.patientId ||
			visit.status !== "signed"
		)
			return false;

		const visitDate = await medicalRecordExtractVisitDate(
			document.organizationId,
			visitId,
		);
		if (visitDate === null) return false;
		if (periodStart !== null && visitDate < periodStart) return false;
		if (periodEnd !== null && visitDate > periodEnd) return false;
	}
	return true;
}

async function medicalRecordExtractSourcesAreValid(
	payload: MedicalRecordExtractPayload,
	document: GeneratedDocument,
): Promise<boolean> {
	return await signedMedicalSourceVisitsAreValid(
		payload.sourceVisitIds,
		document,
		payload.periodStart,
		payload.periodEnd,
	);
}

const documentCreateValidationMessage =
	"Документ не создан: выберите пациента, тип документа и заполните обязательные поля формы.";

function objectRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function documentCreateValidationMessageForRequest(
	body: unknown,
): string {
	const input = objectRecord(body);
	const payload = objectRecord(input?.payload);
	const application = objectRecord(payload?.taxDeductionApplication);
	const taxpayerInn =
		typeof application?.taxpayerInn === "string"
			? application.taxpayerInn.replace(/\D+/g, "")
			: "";

	if (
		application?.requestedForm === "knd_1151156" &&
		taxpayerInn.length > 0 &&
		taxpayerInn.length !== 12
	) {
		return "Документ не создан: для заявления на КНД 1151156 нужен 12-значный ИНН физического лица.";
	}

	return documentCreateValidationMessage;
}

export async function documentIssueChainBlockReason(
	document: GeneratedDocument,
): Promise<string | null> {
	const _allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	if (
		taxCertificateExpectedApplicationForm(document) &&
		!(await hasIssuedTaxApplicationForCertificate(document))
	) {
		return "Перед выдачей налогового документа нужно выпустить заявление налогоплательщика с тем же годом, формой, ИНН, реквизитами плательщика и точным набором выбранных фискальных чеков.";
	}

	const copyRequest = document.payload?.medicalRecordCopyRequest;
	if (
		document.kind === "medical_record_copy_request" &&
		copyRequest &&
		!medicalRecordCopyRequestDatesAreValid(copyRequest)
	) {
		return "Запрос копии медицинских документов нельзя выдать: даты запроса или периода указаны в нераспознаваемом формате либо период указан в обратном порядке.";
	}

	const releaseReceipt = document.payload?.medicalDocumentReleaseReceipt;
	if (document.kind === "medical_document_release_receipt" && releaseReceipt) {
		if (!medicalDocumentReleaseReceiptDatesAreValid(releaseReceipt)) {
			return "Расписку о выдаче медицинских документов нельзя выдать: даты выдачи, доступа или периода указаны в нераспознаваемом формате либо период указан в обратном порядке.";
		}
		if (!(await hasIssuedMedicalCopyRequestForRelease(document))) {
			return "Перед распиской о выдаче медицинских документов нужно выбрать конкретный уже выданный запрос пациента или представителя с тем же получателем, форматом, периодом и не меньшим составом документов.";
		}
	}

	if (
		document.kind === "completed_works_act" &&
		!(await completedWorksActMatchesIssuedContract(document))
	) {
		return "Перед выдачей акта нужно выбрать конкретный уже выданный договор платных медицинских услуг по этому пациенту и визиту.";
	}

	const card043u = document.payload?.dentalMedicalCard043u;
	if (
		(document.kind === "dental_medical_card_043u" ||
			document.kind === "outpatient_medical_card_025u") &&
		card043u
	) {
		if (!dentalMedicalCard043uDatesAreValid(card043u)) {
			return "Карту 043/у нельзя выдать: дата приема, рождения пациента, лицензии или блокировки указаны в нераспознаваемом формате.";
		}
	}

	const extract = document.payload?.medicalRecordExtract;

	if (document.kind === "medical_record_extract" && extract) {
		if (!medicalRecordExtractDatesAreValid(extract)) {
			return "Выписку нельзя выдать: даты периода или выдачи указаны в нераспознаваемом формате либо период указан в обратном порядке.";
		}
		if (!medicalRecordExtractPeriodIsChronological(extract)) {
			return "Выписку нельзя выдать: период выписки указан в обратном порядке.";
		}
		if (!(await medicalRecordExtractSourcesAreValid(extract, document))) {
			return "Выписку нельзя выдать: один или несколько исходных приемов не найдены, принадлежат другому пациенту, еще не подписаны врачом или не входят в период выписки.";
		}
	}

	return null;
}
