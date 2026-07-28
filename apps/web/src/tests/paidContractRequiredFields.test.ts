import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	paidContractRequiredFieldsReview,
	type PaidContractRequiredFieldsInput,
} from "../components/documents/paidContractRequiredFields";
import {
	validateDocumentPayloadForKind,
	withDocumentCreationTimestamps,
} from "../documentLogic";

/**
 * Сторож согласия двух перечней обязательного для договора платных услуг:
 * того, что показывает список «чего не хватает», и того, что проверяет
 * validatePaidMedicalServicesContract при создании документа.
 *
 * Зачем сторож. Проверка отдаёт ОДНУ позицию за раз (цепочка `??`), поэтому
 * показать всё сразу можно только вторым перечнем. Два перечня расходятся молча:
 * добавят обязательное поле в проверку — список промолчит, и человек снова
 * получит отказ за отказом на пустом экране. Здесь это падает тестом.
 */

/** Заполненный договор: ни одной обязательной позиции не пропущено. */
const readyContract = (): PaidContractRequiredFieldsInput => ({
	contractNumber: "ДПМУ-2026-001",
	serviceStart: "28.07.2026, 09:00",
	serviceEnd: "до подписания акта",
	customerFullName: "Петров Пётр Петрович",
	patientFullName: "Петров Пётр Петрович",
	careReason: "острая боль в зубе 36",
	visitComplaint: "",
	serviceScope: "лечение кариеса 36, пломба",
	visitTreatmentPlan: "",
	visitDoctorSummary: "",
	totalRub: 12_400,
	paymentTerms: "оплата в день оказания услуги",
	priceChangeRules: "изменения — дополнительным соглашением",
	freeCareNotice: "разъяснена помощь по государственным гарантиям",
	recommendationWarning: "несоблюдение назначений снижает качество лечения",
	refundTerms: "при отказе оплачиваются фактические расходы",
	warrantyTerms: "гарантия по правилам клиники",
	doctorFullName: "Иванова Мария Сергеевна",
	activeDoctorFullName: "Иванова Мария Сергеевна",
	clinicInfoConfirmed: true,
	serviceListConfirmed: true,
	paidBasisConfirmed: true,
	writtenChangesConfirmed: true,
});

/**
 * Состояние документа в том виде, в каком его получает проверка при создании.
 * Вычисляемые значения (…Value) повторяют запасы из useAppLogic.tsx: пустое поле
 * заказчика подставляет пациента приёма, пустое основание — жалобу, пустой
 * состав — план лечения.
 */
function contractDocumentState(input: PaidContractRequiredFieldsInput) {
	const trimmed = (value: string) => String(value ?? "").trim();
	return {
		paidContractNumber: input.contractNumber,
		paidContractDate: "",
		paidContractServiceStart: input.serviceStart,
		paidContractServiceEnd: input.serviceEnd,
		paidContractCustomerFullNameValue: () =>
			trimmed(input.customerFullName) || trimmed(input.patientFullName),
		paidContractCareReasonValue: () =>
			trimmed(input.careReason) ||
			trimmed(input.visitComplaint) ||
			"плановое стоматологическое лечение по результатам осмотра",
		paidContractServiceScopeValue: () =>
			trimmed(input.serviceScope) ||
			trimmed(input.visitTreatmentPlan) ||
			trimmed(input.visitDoctorSummary),
		paidContractTotalRubValue: () => input.totalRub,
		paidContractPaymentTerms: input.paymentTerms,
		paidContractPriceChangeRules: input.priceChangeRules,
		paidContractFreeCareNotice: input.freeCareNotice,
		paidContractRecommendationWarning: input.recommendationWarning,
		paidContractRefundTerms: input.refundTerms,
		paidContractWarrantyTerms: input.warrantyTerms,
		paidContractDoctorFullNameValue: () =>
			trimmed(input.doctorFullName) || trimmed(input.activeDoctorFullName),
		paidContractSignedAt: "",
		paidContractClinicInfoConfirmed: input.clinicInfoConfirmed,
		paidContractServiceListConfirmed: input.serviceListConfirmed,
		paidContractPaidBasisConfirmed: input.paidBasisConfirmed,
		paidContractWrittenChangesConfirmed: input.writtenChangesConfirmed,
	};
}

function contractRefusal(input: PaidContractRequiredFieldsInput) {
	return validateDocumentPayloadForKind(
		"paid_medical_services_contract",
		withDocumentCreationTimestamps(contractDocumentState(input)),
	);
}

/** Как обнулить каждую позицию списка: ключ поля — правка договора. */
const emptyByField: Record<string, Partial<PaidContractRequiredFieldsInput>> = {
	paidContractNumber: { contractNumber: "   " },
	paidContractServiceStart: { serviceStart: "" },
	paidContractServiceEnd: { serviceEnd: "" },
	paidContractCustomerFullName: { customerFullName: "", patientFullName: "" },
	paidContractServiceScope: {
		serviceScope: "",
		visitTreatmentPlan: "",
		visitDoctorSummary: "",
	},
	paidContractTotalRub: { totalRub: 0 },
	paidContractPaymentTerms: { paymentTerms: "" },
	paidContractPriceChangeRules: { priceChangeRules: "" },
	paidContractFreeCareNotice: { freeCareNotice: "" },
	paidContractRecommendationWarning: { recommendationWarning: "" },
	paidContractRefundTerms: { refundTerms: "" },
	paidContractWarrantyTerms: { warrantyTerms: "" },
	paidContractDoctorFullName: { doctorFullName: "", activeDoctorFullName: "" },
	paidContractClinicInfoConfirmed: { clinicInfoConfirmed: false },
	paidContractServiceListConfirmed: { serviceListConfirmed: false },
	paidContractPaidBasisConfirmed: { paidBasisConfirmed: false },
	paidContractWrittenChangesConfirmed: { writtenChangesConfirmed: false },
};

describe("paidContractRequiredFieldsReview", () => {
	it("заполненному договору не хватает ничего, и проверка молчит", () => {
		const review = paidContractRequiredFieldsReview(readyContract());
		assert.deepEqual(review.missing, []);
		assert.equal(contractRefusal(readyContract()), null);
	});

	it("каждая позиция списка действительно останавливает создание", () => {
		for (const [field, patch] of Object.entries(emptyByField)) {
			const input = { ...readyContract(), ...patch };
			const review = paidContractRequiredFieldsReview(input);
			assert.ok(
				review.missing.some((entry) => entry.field === field),
				`список не заметил пустое поле ${field}`,
			);
			assert.ok(
				contractRefusal(input),
				`проверка договора пропускает пустое поле ${field} — позиция в списке лишняя`,
			);
		}
	});

	it("основание обращения закрывается запасной формулировкой, а не отказом", () => {
		/*
		 * Единственная обязательная позиция без ручного ввода: проверка требует
		 * основание, но запас в useAppLogic всегда подставляет текст. Если запас
		 * уберут, этот тест упадёт и позиция начнёт показываться человеку.
		 */
		const input = { ...readyContract(), careReason: "", visitComplaint: "" };
		assert.deepEqual(paidContractRequiredFieldsReview(input).missing, []);
		assert.equal(contractRefusal(input), null);
	});

	it("даты договора и подписания подставляются сами и в списке не нужны", () => {
		const filled = withDocumentCreationTimestamps({
			paidContractDate: "",
			paidContractSignedAt: "",
		});
		assert.notEqual(String(filled.paidContractDate ?? "").trim(), "");
		assert.notEqual(String(filled.paidContractSignedAt ?? "").trim(), "");
	});

	it("чистая клиника видит все нехватки сразу, а не по одной", () => {
		/*
		 * Так выглядит договор на новой клинике: тексты условий хранилище
		 * заполняет шаблонами, а номер, начало оказания, состав, сумма и четыре
		 * отметки пусты. Это и есть та серия отказов по одному полю за раз.
		 */
		const freshClinic: PaidContractRequiredFieldsInput = {
			...readyContract(),
			contractNumber: "",
			serviceStart: "",
			serviceScope: "",
			visitTreatmentPlan: "",
			visitDoctorSummary: "",
			totalRub: 0,
			clinicInfoConfirmed: false,
			serviceListConfirmed: false,
			paidBasisConfirmed: false,
			writtenChangesConfirmed: false,
		};
		const review = paidContractRequiredFieldsReview(freshClinic);
		assert.equal(review.missing.length, 8);
		assert.deepEqual(
			review.missing.map((entry) => entry.field),
			[
				"paidContractNumber",
				"paidContractServiceStart",
				"paidContractServiceScope",
				"paidContractTotalRub",
				"paidContractClinicInfoConfirmed",
				"paidContractServiceListConfirmed",
				"paidContractPaidBasisConfirmed",
				"paidContractWrittenChangesConfirmed",
			],
		);
		/* А проверка при создании отдаёт из них ровно одну — первую. */
		assert.equal(
			contractRefusal(freshClinic),
			"Заполните поле: договор, номер.",
		);
	});

	it("у каждой нехватки есть выполнимая подсказка", () => {
		const review = paidContractRequiredFieldsReview({
			...readyContract(),
			contractNumber: "",
			customerFullName: "",
			patientFullName: "",
			doctorFullName: "",
			activeDoctorFullName: "",
		});
		assert.equal(review.requiredCount, 18);
		for (const entry of review.missing) {
			assert.ok(entry.label.trim() !== "", `нет подписи у ${entry.field}`);
			assert.ok(entry.hint.trim() !== "", `нет подсказки у ${entry.field}`);
		}
	});
});
