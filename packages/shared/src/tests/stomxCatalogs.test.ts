/**
 * packages/shared/src/tests/stomxCatalogs.test.ts
 *
 * Test suite for StomX Cash Flow Categories & Patient Registration Catalogs Harmonizer.
 * Verifies:
 * 1. Cash Receipt & Expense categories, 54-FZ FFD 1.2 subjects, and P&L mappings.
 * 2. Mandate 8e & 8n: Solo Doctor & Small Clinic Sovereignty (no INN forced on physical persons).
 * 3. Exact kopeck arithmetic validation.
 * 4. Patient tags, clinical red alerts (allergy/acute pain), and administrative tags.
 * 5. Statutory legal representatives (SK RF st. 64 / 323-FZ).
 * 6. Marketing channels and appointment visit/cancellation reasons.
 * 7. Client activity timeline event labels.
 */

import assert from "node:assert";
import test from "node:test";

import {
	STOMX_CASH_RECEIPT_CATALOG,
	STOMX_CASH_RECEIPT_BY_ALIAS,
	STOMX_CASH_RECEIPT_BY_ID,
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_EXPENSE_BY_ALIAS,
	STOMX_CASH_EXPENSE_BY_ID,
	STOMX_EXPENSE_PNL_CATEGORIES,
	STOMX_EXPENSE_PNL_LABELS_RU,
	CASH_TENDER_METHODS,
	CASH_TENDER_LABELS_RU,
	getStomxReceiptTypeByAlias,
	getStomxReceiptTypeById,
	getStomxExpenseTypeByAlias,
	getStomxExpenseTypeById,
	isFiscalReceiptOperation,
	isFiscalRefundOperation,
	mapStomxExpenseToPnlCategory,
	validatePhysicalPersonPayment,
	stomxPayerPartySchema,
	stomxCashReceiptRecordSchema,
	stomxCashExpenseRecordSchema,
} from "../finance/stomxCashFlowCategories.js";

import {
	STOMX_PATIENT_TAGS_CATALOG,
	STOMX_PATIENT_TAGS_MAP,
	STOMX_REPRESENTATIVE_CATALOG,
	STOMX_REPRESENTATIVE_BY_CODE,
	STOMX_MARKETING_SOURCES_CATALOG,
	STOMX_MARKETING_BY_CHANNEL,
	STOMX_APPT_REASONS_CATALOG,
	STOMX_APPT_REASON_BY_CODE,
	STOMX_REFUSE_REASONS_CATALOG,
	STOMX_REFUSE_REASON_BY_CODE,
	STOMX_CLIENT_TIMELINE_EVENTS_CATALOG,
	STOMX_CLIENT_TIMELINE_BY_KEY,
	isRedAlertPatientTag,
	isStatutoryLegalRepresentative,
	getMarketingChannelLabel,
	getApptReasonMeta,
	getApptRefuseReasonMeta,
	getTimelineEventLabel,
	STOMX_TASK_CALLS_CATALOG,
	STOMX_TASK_CALL_BY_TYPE,
	getTaskCallMeta,
	stomxPatientTagCodeSchema,
	stomxRepresentativeTypeSchema,
	stomxMarketingChannelSchema,
	stomxApptReasonSchema,
	stomxApptRefuseReasonSchema,
	stomxClientTimelineEventKeySchema,
} from "../patients/stomxPatientTagsCatalog.js";

// ============================================================================
// 1. CASH RECEIPT & EXPENSE TYPES (STOMX FINANCE)
// ============================================================================

test("StomX Cash Receipts: contains all 9 cataloged receipt types with exact aliases & IDs", () => {
	assert.strictEqual(STOMX_CASH_RECEIPT_CATALOG.length, 9);

	// Verify key items
	const apptPay = getStomxReceiptTypeByAlias("appointment_payment");
	assert.ok(apptPay, "appointment_payment should exist");
	assert.strictEqual(apptPay.id, 5);
	assert.strictEqual(apptPay.isFiscal, true);
	assert.strictEqual(apptPay.ffdCalculationSubject, 4); // Услуга

	const advancePay = getStomxReceiptTypeById(19);
	assert.ok(advancePay, "id 19 advance_payment should exist");
	assert.strictEqual(advancePay.alias, "advance_payment");
	assert.strictEqual(advancePay.ffdCalculationSubject, 3); // Аванс

	const productSale = getStomxReceiptTypeByAlias("sale_product");
	assert.ok(productSale);
	assert.strictEqual(productSale.id, 13);
	assert.strictEqual(productSale.ffdCalculationSubject, 1); // Товар

	const xrayPay = getStomxReceiptTypeByAlias("xray_payment");
	assert.ok(xrayPay);
	assert.strictEqual(xrayPay.id, 31);
	assert.strictEqual(xrayPay.ffdCalculationSubject, 4);

	const dmsPay = getStomxReceiptTypeByAlias("dms_pay");
	assert.ok(dmsPay);
	assert.strictEqual(dmsPay.id, 20);
	assert.strictEqual(dmsPay.isFiscal, false); // Юрлицо безнал

	const cashDeposit = getStomxReceiptTypeByAlias("cash_deposit");
	assert.ok(cashDeposit);
	assert.strictEqual(cashDeposit.id, 40);
	assert.strictEqual(cashDeposit.isFiscal, false); // Внереализационное внесение
	assert.strictEqual(cashDeposit.ffdCalculationSubject, null);
});

test("StomX Cash Expenses: contains all 14 cataloged expense types with exact aliases & IDs", () => {
	assert.strictEqual(STOMX_CASH_EXPENSE_CATALOG.length, 14);

	// Collection / Encashment
	const coll = getStomxExpenseTypeByAlias("collection");
	assert.ok(coll);
	assert.strictEqual(coll.id, 1);
	assert.strictEqual(coll.defaultPnlCategory, "encashment");
	assert.strictEqual(coll.isFiscalRefund, false);

	// Return appointment
	const retAppt = getStomxExpenseTypeById(12);
	assert.ok(retAppt);
	assert.strictEqual(retAppt.alias, "return_appointment");
	assert.strictEqual(retAppt.isFiscalRefund, true);
	assert.strictEqual(retAppt.defaultPnlCategory, "refund");

	// Employee payment (salaries / accountability)
	const empPay = getStomxExpenseTypeByAlias("payment_employee");
	assert.ok(empPay);
	assert.strictEqual(empPay.id, 3);
	assert.strictEqual(empPay.defaultPnlCategory, "salaries");

	// Contractor payment (supplies / materials / rent)
	const contractorPay = getStomxExpenseTypeByAlias("payment_contractor");
	assert.ok(contractorPay);
	assert.strictEqual(contractorPay.id, 4);

	// Dental Lab (ЗТЛ)
	const labPay = getStomxExpenseTypeByAlias("payment_lab");
	assert.ok(labPay);
	assert.strictEqual(labPay.id, 8);
	assert.strictEqual(labPay.defaultPnlCategory, "lab");

	// Family transfer
	const famTransfer = getStomxExpenseTypeById(41);
	assert.ok(famTransfer);
	assert.strictEqual(famTransfer.alias, "family_transfer");
});

test("isFiscalReceiptOperation & isFiscalRefundOperation helpers", () => {
	assert.strictEqual(isFiscalReceiptOperation("appointment_payment"), true);
	assert.strictEqual(isFiscalReceiptOperation("sale_product"), true);
	assert.strictEqual(isFiscalReceiptOperation("advance_payment"), true);
	assert.strictEqual(isFiscalReceiptOperation("cash_deposit"), false);
	assert.strictEqual(isFiscalReceiptOperation("income_employee"), false);

	assert.strictEqual(isFiscalRefundOperation("return_appointment"), true);
	assert.strictEqual(isFiscalRefundOperation("return_advance"), true);
	assert.strictEqual(isFiscalRefundOperation("return_product"), true);
	assert.strictEqual(isFiscalRefundOperation("collection"), false);
	assert.strictEqual(isFiscalRefundOperation("payment_employee"), false);
});

test("mapStomxExpenseToPnlCategory respects default and explicit override", () => {
	assert.strictEqual(mapStomxExpenseToPnlCategory("payment_lab"), "lab");
	assert.strictEqual(mapStomxExpenseToPnlCategory("collection"), "encashment");
	assert.strictEqual(mapStomxExpenseToPnlCategory("payment_contractor", "rent"), "rent");
	assert.strictEqual(mapStomxExpenseToPnlCategory("payment_contractor", "household"), "household");
	assert.strictEqual(mapStomxExpenseToPnlCategory("payment_contractor", "taxes"), "taxes");
});

// ============================================================================
// 2. MANDATE 8e / 8n: 54-FZ AUTONOMY & KOPECK ARITHMETIC
// ============================================================================

test("Mandate 8e/8n: Physical person cash payment does NOT require INN", () => {
	// Valid individual payer with NO INN
	const individualPayer = {
		partyType: "individual" as const,
		fullName: "Иванов Иван Иванович",
		phone: "+79991234567",
	};
	const parsed = stomxPayerPartySchema.safeParse(individualPayer);
	assert.strictEqual(parsed.success, true, "Physical person must be accepted without INN");

	// Legal entity MUST have an INN
	const legalWithoutInn = {
		partyType: "legal_entity" as const,
		fullName: "ООО 'Дента-Плюс'",
	};
	const failedLegal = stomxPayerPartySchema.safeParse(legalWithoutInn);
	assert.strictEqual(failedLegal.success, false, "Legal entity without INN must fail");

	// Legal entity with valid 10-digit INN succeeds
	const legalWithInn = {
		partyType: "legal_entity" as const,
		fullName: "ООО 'Дента-Плюс'",
		inn: "7701234567",
	};
	const parsedLegal = stomxPayerPartySchema.safeParse(legalWithInn);
	assert.strictEqual(parsedLegal.success, true);
});

test("validatePhysicalPersonPayment helper enforces integer kopecks > 0", () => {
	// Valid
	const valid = validatePhysicalPersonPayment(150000, "Петров Петр");
	assert.strictEqual(valid.isValid, true);

	// Invalid zero amount
	const zero = validatePhysicalPersonPayment(0, "Петров Петр");
	assert.strictEqual(zero.isValid, false);

	// Invalid negative amount
	const negative = validatePhysicalPersonPayment(-5000, "Петров Петр");
	assert.strictEqual(negative.isValid, false);

	// Invalid float kopecks
	const floatKop = validatePhysicalPersonPayment(1500.5, "Петров Петр");
	assert.strictEqual(floatKop.isValid, false);

	// Missing name
	const emptyName = validatePhysicalPersonPayment(10000, "   ");
	assert.strictEqual(emptyName.isValid, false);
});

test("stomxCashReceiptRecordSchema validates valid receipt and rejects float amounts", () => {
	const validRecord = {
		organizationId: "11111111-1111-4111-8111-111111111111",
		receiptTypeAlias: "appointment_payment",
		amountKopecks: 250000, // 2,500.00 RUB
		paymentMethod: "card",
		payer: {
			partyType: "individual",
			fullName: "Сидорова Анна Сергеевна",
		},
	};
	const res = stomxCashReceiptRecordSchema.safeParse(validRecord);
	assert.strictEqual(res.success, true);

	// Float amount rejected
	const invalidFloat = {
		...validRecord,
		amountKopecks: 2500.5,
	};
	const floatRes = stomxCashReceiptRecordSchema.safeParse(invalidFloat);
	assert.strictEqual(floatRes.success, false);
});

// ============================================================================
// 3. PATIENT TAGS & CLINICAL RED ALERTS
// ============================================================================

test("StomX Patient Tags: contains all 13 clinical and administrative tags", () => {
	assert.strictEqual(STOMX_PATIENT_TAGS_CATALOG.length, 13);

	// Clinical allergy tag has red alert flag
	const allergyTag = STOMX_PATIENT_TAGS_MAP.allergy;
	assert.ok(allergyTag);
	assert.strictEqual(allergyTag.isRedAlert, true);
	assert.strictEqual(allergyTag.category, "clinical");
	assert.strictEqual(isRedAlertPatientTag("allergy"), true);

	// Acute pain has red alert flag
	const acutePain = STOMX_PATIENT_TAGS_MAP.acute_pain;
	assert.ok(acutePain);
	assert.strictEqual(acutePain.isRedAlert, true);
	assert.strictEqual(isRedAlertPatientTag("acute_pain"), true);

	// VIP, blacklist, child, pensioner do NOT have red alert flag
	assert.strictEqual(isRedAlertPatientTag("vip"), false);
	assert.strictEqual(isRedAlertPatientTag("blacklist"), false);
	assert.strictEqual(isRedAlertPatientTag("child"), false);
	assert.strictEqual(isRedAlertPatientTag("pensioner"), false);
	assert.strictEqual(isRedAlertPatientTag("dms"), false);

	// Blacklist tag is administrative
	assert.strictEqual(STOMX_PATIENT_TAGS_MAP.blacklist.category, "administrative");
	// DMS tag is financial
	assert.strictEqual(STOMX_PATIENT_TAGS_MAP.dms.category, "financial");
});

test("stomxPatientTagCodeSchema validates allowed tag codes", () => {
	assert.strictEqual(stomxPatientTagCodeSchema.safeParse("allergy").success, true);
	assert.strictEqual(stomxPatientTagCodeSchema.safeParse("pregnancy").success, true);
	assert.strictEqual(stomxPatientTagCodeSchema.safeParse("unknown_tag").success, false);
});

// ============================================================================
// 4. STATUTORY LEGAL REPRESENTATIVES (СК РФ ст. 64)
// ============================================================================

test("StomX Representatives: recognizes statutory legal representatives for minors", () => {
	assert.strictEqual(isStatutoryLegalRepresentative("mother"), true);
	assert.strictEqual(isStatutoryLegalRepresentative("father"), true);
	assert.strictEqual(isStatutoryLegalRepresentative("parent"), true);
	assert.strictEqual(isStatutoryLegalRepresentative("guardian"), true);
	assert.strictEqual(isStatutoryLegalRepresentative("curator"), true);
	assert.strictEqual(isStatutoryLegalRepresentative("adoptive_parent"), true);

	// Non-statutory family relatives (cannot sign consent for minor without proxy)
	assert.strictEqual(isStatutoryLegalRepresentative("husband"), false);
	assert.strictEqual(isStatutoryLegalRepresentative("wife"), false);
	assert.strictEqual(isStatutoryLegalRepresentative("brother"), false);
	assert.strictEqual(isStatutoryLegalRepresentative("sister"), false);
	assert.strictEqual(isStatutoryLegalRepresentative("son"), false);
	assert.strictEqual(isStatutoryLegalRepresentative("daughter"), false);
});

test("StomX Representatives: preserves IDs from representative_types.json", () => {
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.mother.id, 6);
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.father.id, 5);
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.parent.id, 1);
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.guardian.id, 2);
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.husband.id, 3);
	assert.strictEqual(STOMX_REPRESENTATIVE_BY_CODE.wife.id, 4);
});

// ============================================================================
// 5. MARKETING SOURCES & APPOINTMENT REASONS
// ============================================================================

test("StomX Marketing Sources: contains standard Russian dental marketing channels", () => {
	assert.strictEqual(STOMX_MARKETING_SOURCES_CATALOG.length, 13);

	assert.strictEqual(getMarketingChannelLabel("yandex"), "Яндекс (Карты, Поиск, Директ)");
	assert.strictEqual(getMarketingChannelLabel("gis2"), "2GIS (ДубльГис)");
	assert.strictEqual(getMarketingChannelLabel("word_of_mouth"), "Через знакомых / Сарафанное радио");
	assert.strictEqual(getMarketingChannelLabel("prodoctorov"), "ПроДокторов");
	assert.strictEqual(getMarketingChannelLabel("napopravku"), "НаПоправку");
	assert.strictEqual(getMarketingChannelLabel("social_media"), "Социальные сети (ВКонтакте, Telegram)");

	// Preserves StomX IDs from info_sources.json
	assert.strictEqual(STOMX_MARKETING_BY_CHANNEL.word_of_mouth.id, 3);
	assert.strictEqual(STOMX_MARKETING_BY_CHANNEL.prodoctorov.id, 5);
	assert.strictEqual(STOMX_MARKETING_BY_CHANNEL.signboard.id, 2);
});

test("StomX Appointment Reasons: distinguishes patient visits from doctor schedule blocks", () => {
	assert.strictEqual(STOMX_APPT_REASONS_CATALOG.length, 12);

	const pain = getApptReasonMeta("acute_pain");
	assert.ok(pain);
	assert.strictEqual(pain.id, 1);
	assert.strictEqual(pain.type, "common");
	assert.strictEqual(pain.isEmergency, true);

	const lunch = getApptReasonMeta("lunch");
	assert.ok(lunch);
	assert.strictEqual(lunch.id, 5);
	assert.strictEqual(lunch.type, "block");
	assert.strictEqual(lunch.isEmergency, false);

	const vacation = getApptReasonMeta("vacation");
	assert.ok(vacation);
	assert.strictEqual(vacation.id, 7);
	assert.strictEqual(vacation.type, "block");
});

test("StomX Appointment Refuse Reasons: captures all 10 cancellation reasons with responsibility", () => {
	assert.strictEqual(STOMX_REFUSE_REASONS_CATALOG.length, 10);

	const noShow = getApptRefuseReasonMeta("no_show_confirmed");
	assert.ok(noShow);
	assert.strictEqual(noShow.id, 1);
	assert.strictEqual(noShow.responsibility, "patient");

	const clinicCancelled = getApptRefuseReasonMeta("clinic_cancelled");
	assert.ok(clinicCancelled);
	assert.strictEqual(clinicCancelled.id, 6);
	assert.strictEqual(clinicCancelled.responsibility, "clinic");

	const expired = getApptRefuseReasonMeta("expired_slot");
	assert.ok(expired);
	assert.strictEqual(expired.id, 10);
	assert.strictEqual(expired.responsibility, "system");
	assert.strictEqual(expired.isSystem, true);
});

// ============================================================================
// 6. CLIENT TIMELINE EVENT LABELS
// ============================================================================

test("StomX Client Timeline: maps all 26 events from client_labels.json", () => {
	assert.strictEqual(STOMX_CLIENT_TIMELINE_EVENTS_CATALOG.length, 30); // 26 StomX + task_call variants

	assert.strictEqual(getTimelineEventLabel("client.create"), "Создание карточки пациента");
	assert.strictEqual(getTimelineEventLabel("outpatient_card.create"), "Создание амбулаторной карты 043/у");
	assert.strictEqual(getTimelineEventLabel("invoice.create"), "Создание счёта");
	assert.strictEqual(getTimelineEventLabel("appointment.confirmed"), "Прием подтвержден");
	assert.strictEqual(getTimelineEventLabel("appointment.status_refuse"), "Прием отменен");
	assert.strictEqual(getTimelineEventLabel("payment.appointment_payment"), "Оплата приема");
	assert.strictEqual(getTimelineEventLabel("payment.advance_payment"), "Внесение аванса");
	assert.strictEqual(getTimelineEventLabel("voip.call_in"), "Звонок пациенту (Входящий)");
	assert.strictEqual(getTimelineEventLabel("task_call.appointment.confirmation"), "Звонок: Подтверждение приема");
});

// ============================================================================
// 7. STOMX TASK CALLS & PATIENT CARE WORKFLOW
// ============================================================================

test("StomX Task Calls: contains all 7 canonical service call tasks with scripts & metadata", () => {
	assert.strictEqual(STOMX_TASK_CALLS_CATALOG.length, 7);

	const healthCall = getTaskCallMeta("learn_health");
	assert.ok(healthCall);
	assert.strictEqual(healthCall.titleRu, "Контроль самочувствия после лечения (1-2 день)");
	assert.strictEqual(healthCall.timelineKey, "task_call.client.learn_health");
	assert.strictEqual(healthCall.defaultDueDays, 1);
	assert.ok(healthCall.defaultScriptRu.includes("самочувствие"));

	const hygieneCall = getTaskCallMeta("preventive_inspection");
	assert.ok(hygieneCall);
	assert.strictEqual(hygieneCall.defaultDueDays, 180);
	assert.strictEqual(hygieneCall.timelineKey, "task_call.client.preventive_inspection");

	const medplanNotStarted = getTaskCallMeta("medplan_not_started");
	assert.ok(medplanNotStarted);
	assert.strictEqual(medplanNotStarted.defaultDueDays, 7);

	const medplanNotFinished = getTaskCallMeta("medplan_not_finished");
	assert.ok(medplanNotFinished);
	assert.strictEqual(medplanNotFinished.defaultDueDays, 14);

	const apptConfirm = getTaskCallMeta("appointment_confirmation");
	assert.ok(apptConfirm);
	assert.strictEqual(apptConfirm.defaultDueDays, 1);

	const apptRefuse = getTaskCallMeta("appointment_refuse");
	assert.ok(apptRefuse);
	assert.strictEqual(apptRefuse.defaultDueDays, 2);

	const birthday = getTaskCallMeta("birthday");
	assert.ok(birthday);
	assert.strictEqual(birthday.defaultDueDays, 0);
	assert.ok(birthday.defaultScriptRu.includes("днем рождения"));
});
