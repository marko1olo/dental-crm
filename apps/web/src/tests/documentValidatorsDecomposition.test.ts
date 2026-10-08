import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	documentPayloadValidators,
	isValidInn,
	isValidOms,
	isValidPassportRf,
	isValidSnils,
	requiredDocumentField,
	validateAnesthesiaConsentLog,
	validateCompletedWorksAct,
	validateDailyDentistDiary037U,
	validateDentalMedicalCard043U,
	validateDocumentPayloadForKind,
	validateInformedConsent,
	validateInstallmentPaymentSchedule,
	validateLabWorkOrder,
	validateMedicalDocumentReleaseReceipt,
	validateMedicalInterventionRefusal,
	validateMedicalRecordCopyRequest,
	validateMedicalRecordExtract,
	validateMinorLegalRepresentativeConsent,
	validateOrthodonticMedicalCard043_1U,
	validatePaidMedicalServicesContract,
	validatePatientIntakeQuestionnaire,
	validatePaymentInvoice,
	validatePaymentReceipt,
	validatePaymentRefundCorrectionRequest,
	validatePersonalDataProcessingConsent,
	validatePhotoVideoConsent,
	validatePostVisitRecommendations,
	validatePrescriptionMedicationOrder,
	validateProcedureSpecificConsentPacket,
	validateRadiationDoseSheet,
	validateSummaryDentistStatement039U,
	validateTaxDeductionApplication,
	validateTreatmentCostEstimate,
	validateTreatmentPlan,
	validateTreatmentPlanAcceptance,
	validateVisitAttendanceCertificate,
	validateWarrantyServiceMemo,
	validateXrayCbctReferral,
} from "../documentValidators";

describe("Document Validators Monolith Decomposition (Layer 0-5 Verifications)", () => {
	test("Layer 0: Регулярные выражения и контрольные суммы документов РФ", () => {
		// ИНН ЮЛ (10 знаков)
		assert.equal(isValidInn("7707083893"), true, "ПАО Сбербанк ИНН валиден");
		assert.equal(isValidInn("7707083894"), false, "Битый ИНН ЮЛ бракуется");
		assert.equal(isValidInn("123"), false, "Короткий ИНН бракуется");

		// ИНН ФЛ (12 знаков)
		assert.equal(isValidInn("500100732259"), true, "Реальный 12-значный ИНН физлица валиден");
		assert.equal(isValidInn("500100732258"), false, "Битый 12-значный ИНН бракуется");

		// СНИЛС (11 знаков)
		assert.equal(isValidSnils("112-233-445 95"), true, "Корректный СНИЛС с контрольной суммой валиден");
		assert.equal(isValidSnils("112-233-445 00"), false, "СНИЛС с некорректной контрольной суммой бракуется");
		assert.equal(isValidSnils("12345"), false, "Короткий СНИЛС бракуется");

		// Паспорт РФ
		assert.equal(isValidPassportRf("4510 123456"), true, "Паспорт РФ 4 серии + 6 номера валиден");
		assert.equal(isValidPassportRf("451 123456"), false, "Паспорт РФ короче 10 цифр бракуется");

		// ОМС (16 цифр)
		assert.equal(isValidOms("1234567890123456"), true, "Полис ОМС 16 цифр валиден");
		assert.equal(isValidOms("1234567890"), false, "Неполный полис ОМС бракуется");

		// Helper requiredDocumentField
		assert.equal(requiredDocumentField("", "Поле"), "Поле");
		assert.equal(requiredDocumentField(null, "Поле"), "Поле");
		assert.equal(requiredDocumentField(undefined, "Поле"), "Поле");
		assert.equal(requiredDocumentField("  ", "Поле"), "Поле");
		assert.equal(requiredDocumentField("Заполнено", "Поле"), null);
	});

	test("Layer 1: Валидаторы идентификации пациента и согласий", () => {
		// Анкета первичного осмотра при allowBlankForPrint
		const blankIntake = validatePatientIntakeQuestionnaire({
			allowBlankForPrint: true,
		});
		assert.equal(blankIntake, null, "Для печати пустой анкеты ошибок нет");

		// Запрос копий документов
		const copyRequestResult = validateMedicalRecordCopyRequest({
			documentTextLines: () => ["043/у", "Справка"],
			copyRequestRecipientFullName: "Иванов Иван",
			copyRequestRecipientIdentityDocument: "Паспорт",
			copyRequestRecipientAuthority: "Лично",
			copyRequestRequestedAt: "2026-10-09",
			copyRequestContactForDelivery: "+79991234567",
			copyRequestIdentityVerified: true,
			copyRequestThirdPartyDataChecked: true,
		});
		assert.equal(copyRequestResult, null, "Полный запрос копий документов валиден");

		// Согласие на обработку ПДн (152-ФЗ)
		const pdnIncomplete = validatePersonalDataProcessingConsent({
			documentTextLines: () => [],
			clinicProfileDraft: { legalName: "", inn: "7707083893" },
		});
		assert.ok(
			typeof pdnIncomplete === "string" && pdnIncomplete.length > 0,
			"Неполное согласие ПДн выдает ошибку",
		);
	});

	test("Layer 1: Валидаторы договоров и процедурных согласий", () => {
		// Договор платных услуг при allowBlankForPrint
		const blankContract = validatePaidMedicalServicesContract({
			allowBlankForPrint: true,
		});
		assert.equal(blankContract, null, "Пустой договор для печати разрешен");

		// ИДС 1051н
		const blankConsent = validateInformedConsent({
			allowBlankForPrint: true,
		});
		assert.equal(blankConsent, null, "Печать чистого бланка ИДС разрешена");

		// Отказ от медицинского вмешательства
		const refusalResult = validateMedicalInterventionRefusal({
			documentTextLines: (val: unknown) => (Array.isArray(val) ? val : ["Риск 1"]),
			refusalIntervention: "Удаление зуба",
			refusalClinicalIndication: "Периодонтит",
			refusalExplainedRisks: ["Осложнения"],
			refusalAlternatives: ["Консервативное лечение"],
			refusalUrgentWarningSigns: ["Кровотечение"],
			refusalDoctorFullName: "Петров В.В.",
			refusalConfirmedAt: "2026-10-09 12:00",
			refusalConsequencesUnderstood: true,
			refusalSecondOpinionOffered: true,
			refusalEmergencyCareExplained: true,
		});
		assert.equal(refusalResult, null, "Заполненный отказ от вмешательства валиден");
	});

	test("Layer 2: Валидаторы клинических форм (043/у, рецепты, направления)", () => {
		// Карта 043/у
		const blankCard = validateDentalMedicalCard043U({
			allowBlankForPrint: true,
		});
		assert.equal(blankCard, null, "Бланк 043/у для печати возвращает null");

		// Рецептурный бланк
		const rxError = validatePrescriptionMedicationOrder({
			clinicalToothRowsValue: () => [],
		});
		assert.equal(
			rxError,
			"Добавьте клинические строки по зубам или сегментам.",
			"Рецепт без клинических строк дает ошибку",
		);

		// Направление на рентген/КЛКТ
		const xrayError = validateXrayCbctReferral({
			clinicalToothRowsValue: () => [{ tooth: 16 }],
			xrayArea: "",
			xrayClinicalQuestion: "Кариес",
			xrayIndication: "Боль",
			xraySafetyNotes: "Фартук",
			xrayRequestedBy: "Доктор",
		});
		assert.equal(xrayError, "снимок, область", "Пустая область снимка дает ошибку");
	});

	test("Layer 2: Валидаторы финансовых документов (акты, счета, сметы, ФНС)", () => {
		// Акт выполненных работ
		const actIncomplete = validateCompletedWorksAct({
			completedActNumber: "",
			completedActDate: "2026-10-09",
		});
		assert.equal(actIncomplete, "акт, номер", "Отсутствие номера акта возвращает ошибку");

		// Заявление на вычет ФНС
		const taxAppError = validateTaxDeductionApplication({
			taxApplicationTaxpayerFullName: "Иванов И.И.",
			taxApplicationTaxpayerInn: "123", // Некорректный ИНН
			taxApplicationForm: "knd_1151156",
		});
		assert.ok(
			typeof taxAppError === "string" && taxAppError.includes("ИНН"),
			"Некорректная длина ИНН заявителя возвращает ошибку",
		);
	});

	test("Layer 5: Реестр documentPayloadValidators и диспетчер validateDocumentPayloadForKind", () => {
		// Проверка полноты реестра (ровно 32 валидатора)
		assert.equal(
			Object.keys(documentPayloadValidators).length,
			32,
			"Реестр содержит ровно 32 валидатора документов",
		);

		// Неизвестный вид документа валиден по умолчанию
		const unknownKind = validateDocumentPayloadForKind("unknown_document_xyz", {});
		assert.deepEqual(unknownKind, { valid: true });

		// Проверка через диспетчер ошибки для незаполненного договора
		const contractCheck = validateDocumentPayloadForKind(
			"paid_medical_services_contract",
			{ allowBlankForPrint: false, paidContractNumber: "" },
		);
		assert.equal(contractCheck.valid, false);
		assert.ok(contractCheck.error?.includes("договор"));

		// Проверка успешной валидации при allowBlankForPrint
		const blankCheck = validateDocumentPayloadForKind(
			"paid_medical_services_contract",
			{ allowBlankForPrint: true },
		);
		assert.deepEqual(blankCheck, { valid: true });
	});
});
