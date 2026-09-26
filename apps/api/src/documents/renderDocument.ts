import {
	type GeneratedDocument,
	type Patient,
	type DocumentKind,
	documentKindMetadata,
	renderForm003vuHtml,
	injectVisualSignatureStampIntoHtml,
	formatKopecksRu,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import { repairMojibakeText } from "../text/repairMojibake.js";
import {
	DocumentRenderContext,
	escapeHtml,
	patientAdministrativeProfile,
	patientIdentityDocument,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicSignatory,
	documentPayloadBlockReason,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
} from "./templates/baseRenderUtils.js";
import { baseDocument } from "./templates/baseDocument.js";
import { resolveDocumentDigitalSignatureStamp } from "./templates/signatureRenderUtils.js";
import {
	paidMedicalServicesContract,
	financialDocumentTreatmentItems,
	completedWorksAct,
	treatmentPlanBackedFinancialKinds,
	treatmentPlanItemTotalKopecks,
	unreadableTreatmentPlanItems,
} from "./templates/contractAndActTemplates.js";
import {
	paidPaymentsForDocument,
	hasAllFiscalReceipts,
	hasAllFiscalReceiptDates,
	hasAllPaymentPayerIdentities,
} from "./templates/taxHelpers.js";
import {
	paymentReceiptSelectionBlockReason,
	completedWorksActFiscalReceiptBlockReason,
	paymentRefundCorrectionFiscalReceiptBlockReason,
	taxFiscalDocumentBlockReason,
	taxDocumentBlockReason,
} from "./templates/taxFiscalValidation.js";
import {
	taxDeductionCertificate,
	legacyTaxDeductionCertificate,
	taxDeductionApplication,
	taxDeductionRegistry,
} from "./templates/taxTemplates.js";
import {
	informedConsent,
	procedureSpecificConsentPacket,
	treatmentPlan,
	treatmentPlanAcceptance,
	fallbackTreatmentPlanAcceptance,
	anesthesiaConsentLog,
	prescriptionMedicationOrder,
	personalDataConsent,
	minorLegalRepresentativeConsent,
	photoVideoConsent,
	medicalInterventionRefusal,
} from "./templates/consentTemplates.js";
import {
	treatmentCostEstimate,
	paymentInvoice,
	paymentReceipt,
	installmentPaymentSchedule,
	paymentRefundCorrectionRequest,
} from "./templates/financialTemplates.js";
import {
	postVisitRecommendations,
} from "./templates/postVisitTemplates.js";
import {
	medicalRecordExtract,
	structuredMedicalRecordCopyRequest,
	medicalDocumentReleaseReceipt,
	xrayCbctReferral,
	labWorkOrder,
	visitAttendanceCertificate,
	warrantyServiceMemo,
	patientIntakeQuestionnaire,
} from "./templates/memosAndExtractsTemplates.js";
import {
	dentalMedicalCard043u,
	orthodonticMedicalCard043_1u,
	dailyDentistDiary037u,
	summaryDentistStatement039u,
	radiationDoseSheet,
} from "./templates/statutoryTemplates.js";

// Full transparent re-exports (Zero-Downtime Contract)
export * from "./templates/baseRenderUtils.js";
export * from "./templates/signatureRenderUtils.js";
export * from "./templates/baseDocument.js";
export * from "./templates/contractAndActTemplates.js";
export * from "./templates/taxHelpers.js";
export * from "./templates/taxFiscalValidation.js";
export * from "./templates/taxTemplates.js";
export * from "./templates/consentTemplates.js";
export * from "./templates/financialTemplates.js";
export * from "./templates/postVisitTemplates.js";
export * from "./templates/memosAndExtractsTemplates.js";
export * from "./templates/statutoryTemplates.js";

const unresolvedPlaceholderPatterns = [
	"заполнить",
	"________",
	"указать врачом",
	"указать по",
	"не указана",
	"не указан",
].map((pattern) => repairMojibakeText(pattern));

export function documentHasUnresolvedPlaceholders(html: string): boolean {
	if (html.includes("[[{") || html.includes("}]]")) return true;
	const htmlWithoutSignatureBlanks = html.replace(
		/<div class="signatures">[\s\S]*?<\/div>/g,
		"",
	);
	const normalized = htmlWithoutSignatureBlanks.toLocaleLowerCase("ru-RU");
	return unresolvedPlaceholderPatterns.some((pattern) =>
		normalized.includes(pattern),
	);
}


export function renderDocumentHtml(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext = {},
) {
	const bodyByKind: Record<DocumentKind, string> = {
		paid_medical_services_contract: paidMedicalServicesContract(
			document,
			context,
		),
		completed_works_act: completedWorksAct(document, context),
		tax_deduction_certificate: taxDeductionCertificate(
			document,
			patient,
			context,
		),
		informed_consent: informedConsent(document),
		procedure_specific_consent_packet: procedureSpecificConsentPacket(document),
		treatment_plan: treatmentPlan(document),
		treatment_plan_acceptance: treatmentPlanAcceptance(document),
		anesthesia_consent_log: anesthesiaConsentLog(document),
		prescription_medication_order: prescriptionMedicationOrder(document),
		personal_data_processing_consent: personalDataConsent(document, patient),
		minor_legal_representative_consent: minorLegalRepresentativeConsent(
			document,
			patient,
		),
		photo_video_consent: photoVideoConsent(document),
		medical_intervention_refusal: medicalInterventionRefusal(document),
		treatment_cost_estimate: treatmentCostEstimate(document, context),
		payment_invoice: paymentInvoice(document, context),
		payment_receipt: paymentReceipt(document, context),
		installment_payment_schedule: installmentPaymentSchedule(document, context),
		post_visit_recommendations: postVisitRecommendations(document),
		medical_record_extract: document.payload?.medicalCardExtract003vu
			? renderForm003vuHtml(document.payload.medicalCardExtract003vu)
			: medicalRecordExtract(document, patient),
		outpatient_medical_card_025u: dentalMedicalCard043u(document, patient),
		dental_medical_card_043u: dentalMedicalCard043u(document, patient),
		orthodontic_medical_card_043_1u: orthodonticMedicalCard043_1u(
			document,
			patient,
		),
		daily_dentist_diary_037u: dailyDentistDiary037u(document),
		summary_dentist_statement_039u: summaryDentistStatement039u(document),
		medical_record_copy_request: structuredMedicalRecordCopyRequest(
			document,
			patient,
		),
		medical_document_release_receipt: medicalDocumentReleaseReceipt(
			document,
			patient,
		),
		xray_cbct_referral: xrayCbctReferral(document),
		radiation_dose_sheet: radiationDoseSheet(document, patient),
		lab_work_order: labWorkOrder(document),
		visit_attendance_certificate: visitAttendanceCertificate(document, patient),
		warranty_service_memo: warrantyServiceMemo(document),
		payment_refund_correction_request: paymentRefundCorrectionRequest(
			document,
			context,
		),
		tax_deduction_application: taxDeductionApplication(
			document,
			patient,
			context,
		),
		legacy_tax_deduction_certificate: legacyTaxDeductionCertificate(
			document,
			patient,
			context,
		),
		tax_deduction_registry: taxDeductionRegistry(document, context),
		patient_intake_questionnaire: patientIntakeQuestionnaire(document),
	};

	const rawHtml = baseDocument(
		document.title,
		patient,
		document,
		bodyByKind[document.kind],
		context,
	);

	const stampHtml = resolveDocumentDigitalSignatureStamp(
		document,
		context.clinicProfile,
	);
	const finalHtml = stampHtml
		? injectVisualSignatureStampIntoHtml(rawHtml, stampHtml)
		: rawHtml;

	return repairMojibakeText(finalHtml);
}

export function documentIssueBlockReasonRaw(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext = {},
): string | null {
	if (document.status === "voided") {
		return "Аннулированный документ нельзя выдать.";
	}
	if (document.status === "issued") {
		return null;
	}

	const metadata = documentKindMetadata[document.kind];
	if (metadata.requiresVisit && !document.visitId) {
		return "Документ должен быть связан с конкретным визитом перед выдачей.";
	}

	if (documentRequiresClinicLegalProfile(document.kind)) {
		const missingClinicFields = clinicLegalProfileMissingFields(
			context.clinicProfile,
		);
		if (missingClinicFields.length) {
			return `Юридический профиль клиники заполнен не полностью: ${missingClinicFields.join(", ")}.`;
		}
	}

	if (
		treatmentPlanBackedFinancialKinds.has(document.kind) &&
		document.kind !== "paid_medical_services_contract" &&
		!financialDocumentTreatmentItems(document, context).length
	) {
		return "Для выдачи финансового документа нужен состав услуг из плана лечения: услуга, количество, цена, скидка и итоговая сумма.";
	}

	/*
	 * Позиция, чей итог посчитать нельзя, ОСТАНАВЛИВАЕТ ВЫДАЧУ, а не печатается
	 * прочерком в выданном документе.
	 *
	 * Причина названа числом в шапке `treatmentPlanItemTotalKopecks`: пока такая
	 * строка считалась округлением, ворота выдачи и печатная форма ОДНОГО
	 * документа расходились на 500,00 ₽. Черновик рисуется целиком — иначе
	 * администратор не увидел бы, какую позицию править, — а выдача блокируется:
	 * выданный документ обязан сходиться построчно и в итоге до копейки
	 * (`.agents/AGENTS.md` §8b).
	 *
	 * Проверка стоит здесь, а не полагается на «не указана» в теле: у документа с
	 * такой строкой может не быть напечатанного итога вовсе, и тогда общий фильтр
	 * незаполненных полей её бы не поймал.
	 */
	const unreadableItems = unreadableTreatmentPlanItems(document, context);
	const firstUnreadableItem = unreadableItems[0];
	if (firstUnreadableItem) {
		const itemName =
			firstUnreadableItem.snapshotServiceName || firstUnreadableItem.serviceId;
		return (
			`Позиций плана лечения с непригодным количеством: ${unreadableItems.length}. ` +
			`Первая — «${itemName}», количество ${firstUnreadableItem.quantity}. ` +
			"Количество услуги обязано быть целым числом больше нуля: по дробному количеству " +
			"проверка суммы документа и его печатная форма дают разные суммы, поэтому документ не выдаётся. " +
			"Исправьте количество в плане лечения и оформите документ заново."
		);
	}

	const payloadBlockReason = documentPayloadBlockReason(document);
	if (payloadBlockReason) {
		return payloadBlockReason;
	}
	const completedWorksActFiscalBlockReason =
		completedWorksActFiscalReceiptBlockReason(document, context);
	if (completedWorksActFiscalBlockReason) {
		return completedWorksActFiscalBlockReason;
	}
	const paymentReceiptSelectionReason = paymentReceiptSelectionBlockReason(
		document,
		context,
	);
	if (paymentReceiptSelectionReason) {
		return paymentReceiptSelectionReason;
	}
	const paymentRefundCorrectionFiscalBlockReason =
		paymentRefundCorrectionFiscalReceiptBlockReason(document, context);
	if (paymentRefundCorrectionFiscalBlockReason) {
		return paymentRefundCorrectionFiscalBlockReason;
	}
	if (
		document.kind === "photo_video_consent" &&
		document.payload?.photoVideoConsent?.recognizablePublicationAllowed &&
		!document.payload.photoVideoConsent.educationUseAllowed &&
		!document.payload.photoVideoConsent.marketingUseAllowed
	) {
		return "Публикация узнаваемых фото или видео требует отдельного разрешения на обучение или маркетинг.";
	}

	if (metadata.requiresPaidRecord && metadata.group !== "tax") {
		const paidPayments = paidPaymentsForDocument(document, context);
		/**
		 * Потолок возврата тоже считается в целых копейках.
		 *
		 * Раньше сумма оплат складывалась в плавающей точке, поэтому возврат ровно
		 * той суммы, которую пациент заплатил, отклонялся: двадцать оплат по
		 * 55.55 руб. давали потолок 1110.9999999999995, и возврат 1111 руб.
		 * оказывался «больше фактически оплаченной суммы». Клиника не могла вернуть
		 * деньги, которые сама же приняла.
		 */
		const paidTotalKopecks = sumKopecks(
			paidPayments.map((payment) => parseKopecks(payment.amountRub)),
		);
		const refundPayload = document.payload?.paymentRefundCorrection;
		if (!paidPayments.length) {
			return "Для этого документа нужен хотя бы один сохраненный оплаченный платеж в выбранном визите или документе.";
		}
		if (
			document.kind === "payment_refund_correction_request" &&
			refundPayload
		) {
			const refundKopecks = parseKopecks(refundPayload.amountRub);
			if (refundKopecks > paidTotalKopecks) {
				return `Сумма возврата ${formatKopecksRu(refundKopecks)} больше фактически оплаченной ${formatKopecksRu(
					paidTotalKopecks,
				)} по выбранному визиту. Уменьшите сумму возврата или добавьте в документ остальные оплаты визита.`;
			}
		}
		if (
			(document.kind === "payment_receipt" ||
				document.kind === "payment_refund_correction_request") &&
			!hasAllFiscalReceipts(paidPayments)
		) {
			return "Платежный документ требует номер фискального чека в каждом включенном платеже.";
		}
		if (
			(document.kind === "payment_receipt" ||
				document.kind === "payment_refund_correction_request") &&
			!hasAllFiscalReceiptDates(paidPayments)
		) {
			return "Платежный документ требует дату фискального чека в каждом включенном платеже.";
		}
		if (
			document.kind === "payment_refund_correction_request" &&
			!hasAllPaymentPayerIdentities(paidPayments)
		) {
			return "Платежный документ требует ФИО, дату рождения, документ удостоверения личности и связь плательщика с пациентом в каждом включенном платеже.";
		}
	}

	const taxBlockReason = taxDocumentBlockReason(document, patient, context);
	if (taxBlockReason) return taxBlockReason;

	const isBlankPaidContract =
		document.kind === "paid_medical_services_contract" &&
		(Number(document.payload?.paidMedicalServicesContract?.estimatedTotalRub || 0) === 0 ||
			!document.payload?.paidMedicalServicesContract?.doctorFullName?.trim() ||
			!financialDocumentTreatmentItems(document, context).length);
	const isBlankInformedConsent =
		document.kind === "informed_consent" &&
		!document.payload?.informedConsent?.doctorFullName?.trim();

	const html = renderDocumentHtml(document, patient, context);
	if (
		documentHasUnresolvedPlaceholders(html) &&
		!isBlankPaidContract &&
		!isBlankInformedConsent
	) {
		return "В документе остались незаполненные поля; перед выдачей их нужно заполнить.";
	}

	return null;
}

export function documentIssueBlockReason(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext = {},
): string | null {
	const reason = documentIssueBlockReasonRaw(document, patient, context);
	return reason ? repairMojibakeText(reason) : null;
}
