import assert from "node:assert";
import { describe, test } from "node:test";
import { informedConsentBlockersReview } from "../informedConsentBlockers";
import { taxApplicationBlockersReview } from "../taxApplicationBlockers";
import { photoVideoConsentBlockersReview } from "../photoVideoConsentBlockers";
import { paidContractRequiredFieldsReview } from "../paidContractRequiredFields";

describe("Statutory Consent & Legal Document Blockers", () => {
	test("Informed Consent blocker review requires valid intervention, doctor and patient acknowledgment", () => {
		const review = informedConsentBlockersReview({
			intervention: "Препарирование и пломбирование зуба 16",
			toothOrArea: "16",
			inferredTreatmentArea: "16",
			diagnosisOrIndication: "К02.1 Кариес дентина",
			activeVisitComplaint: "Боль от сладкого",
			expectedBenefit: "Восстановление анатомической формы и функции зуба",
			risks: "Возможна температурная чувствительность",
			alternatives: "Удаление зуба, отказ от лечения",
			aftercare: "Воздержаться от приема красящей пищи 2 часа",
			doctorFullName: "Д-р Смирнов А.В.",
			activeDoctorFullName: "Д-р Смирнов А.В.",
			questionsAnswered: true,
			risksUnderstood: true,
			withdrawUnderstood: true,
		});
		assert.strictEqual(review.blockers.length, 0);

		const emptyReview = informedConsentBlockersReview({
			intervention: "",
			toothOrArea: "",
			inferredTreatmentArea: "",
			diagnosisOrIndication: "",
			activeVisitComplaint: "",
			expectedBenefit: "",
			risks: "",
			alternatives: "",
			aftercare: "",
			doctorFullName: "",
			activeDoctorFullName: "",
			questionsAnswered: false,
			risksUnderstood: false,
			withdrawUnderstood: false,
		});
		assert.ok(emptyReview.blockers.length > 0);
		assert.ok(emptyReview.blockers.some((b) => b.field === "informedConsentIntervention"));
	});

	test("Tax application blocker review checks applicant details and tax year", () => {
		const review = taxApplicationBlockersReview({
			taxpayerFullName: "Иванов Иван Иванович",
			taxpayerInn: "770212345681",
			taxpayerBirthDate: "1985-05-20",
			taxpayerIdentityDocument: "4510 123456",
			relationship: "self",
			authorityDocument: "",
			contact: "+7 999 123-45-67",
			duplicateWarningAccepted: true,
			form: "knd_1151156",
		});
		assert.strictEqual(review.blockers.length, 0);

		const emptyReview = taxApplicationBlockersReview({
			taxpayerFullName: "",
			taxpayerInn: "123", // invalid length
			taxpayerBirthDate: "",
			taxpayerIdentityDocument: "",
			relationship: "child", // requires authority
			authorityDocument: "",
			contact: "",
			duplicateWarningAccepted: false,
			form: "knd_1151156",
		});
		assert.ok(emptyReview.blockers.length > 0);
		assert.ok(emptyReview.blockers.some((b) => b.field === "taxApplicationTaxpayerFullName"));
		assert.ok(emptyReview.blockers.some((b) => b.field === "taxApplicationAuthorityDocument"));
	});

	test("Paid medical services contract validates mandatory fields (Постановление Правительства № 736)", () => {
		const review = paidContractRequiredFieldsReview({
			contractNumber: "ДОГ-2026/042",
			serviceStart: "2026-03-01",
			serviceEnd: "2026-12-31",
			customerFullName: "Иванов Иван Иванович",
			patientFullName: "Иванов Иван Иванович",
			careReason: "Лечение кариеса",
			visitComplaint: "Жалобы на зубную боль",
			serviceScope: "Терапевтическая стоматология",
			visitTreatmentPlan: "План лечения № 12",
			visitDoctorSummary: "Санация",
			totalRub: 25000,
			paymentTerms: "100% предоплата",
			priceChangeRules: "По согласованию сторон",
			freeCareNotice: "Разъяснена программа государственных гарантий",
			recommendationWarning: "Пациент предупрежден о последствиях нарушения режима",
			refundTerms: "Возврат осуществляется по заявлению",
			warrantyTerms: "Гарантийный срок 12 месяцев",
			doctorFullName: "Д-р Смирнов А.В.",
			activeDoctorFullName: "Д-р Смирнов А.В.",
			clinicInfoConfirmed: true,
			serviceListConfirmed: true,
			paidBasisConfirmed: true,
			writtenChangesConfirmed: true,
		});
		assert.strictEqual(review.missing.length, 0);
	});

	test("Photo & Video consent blockers validate patient consent options", () => {
		const review = photoVideoConsentBlockersReview({
			materials: ["intraoral_photo", "cbct"],
			clinicalRecordUseConfirmed: true,
			anonymizationConfirmed: true,
			revocationChannel: "Письменное заявление на стойку ресепшн",
			recognizablePublicationAllowed: true,
			marketingUseAllowed: true,
			educationUseAllowed: true,
		});
		assert.strictEqual(review.blockers.length, 0);
	});
});
