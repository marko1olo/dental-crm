import { describe, test } from "node:test";
import assert from "node:assert";
import { z } from "zod";
import {
	billingSummarySchema,
	completedWorksActPayloadSchema,
	createDocumentSchema,
	dentalPricelistCategorySummarySchema,
	generatedDocumentSchema,
	installmentPaymentSchedulePayloadSchema,
	paidMedicalServicesContractPayloadSchema,
	patientInsightSchema,
	patientSchema,
	paymentInvoicePayloadSchema,
	paymentReceiptPayloadSchema,
	paymentRefundCorrectionPayloadSchema,
	treatmentCostEstimatePayloadSchema,
	treatmentPlanAcceptancePayloadSchema,
	treatmentPlanItemSchema,
	treatmentPlanPayloadSchema,
	treatmentPlanScenarioSchema,
	visitFlowRequestSchema,
} from "../index.js";

/**
 * Копейки в общем контракте.
 *
 * ЧТО БЫЛО СЛОМАНО: 38 из 45 денежных полей объявлялись `z.number().int()`.
 * Это не округление — это ОТКАЗ: 1500,50 не проходило проверку, и запрос
 * возвращал ошибку валидации. При этом база уже была переведена в
 * numeric(12, 2), а пять полей (цена услуги, цена строки прайса, сумма платежа)
 * копейки принимали. Итог не мог равняться своим частям по построению.
 *
 * Тест проверяет каждое поле поимённо в трёх режимах:
 *   1. копейки принимаются и возвращаются БЕЗ ИЗМЕНЕНИЙ (round-trip);
 *   2. третий знак после запятой отвергается — это не деньги, а ошибка ввода;
 *   3. знак значения по-прежнему ограничен там, где домен это требует.
 *
 * Проверять поля через полные объекты, а не через вырезанные схемы полей,
 * обязательно: часть денег лежит внутри массивов и внутри `superRefine`, и
 * подмена схемы поля скрыла бы, что объект целиком всё равно не проходит.
 */

/** Ровно две копейки — то, что клиника реально принимает в кассе. */
const KOPECKS = 1500.5;
/** Три знака после запятой. Округлять за пользователя на деньгах нельзя. */
const THIRD_DECIMAL = 1500.505;

function assertAccepts<T extends z.ZodTypeAny>(
	schema: T,
	value: unknown,
	field: string,
): z.infer<T> {
	const parsed = schema.safeParse(value);
	assert.ok(
		parsed.success,
		`${field}: копейки должны приниматься, получено ${JSON.stringify(
			parsed.success ? null : parsed.error.issues,
		)}`,
	);
	return (parsed as { data: z.infer<T> }).data;
}

function assertRejects<T extends z.ZodTypeAny>(
	schema: T,
	value: unknown,
	field: string,
): void {
	assert.strictEqual(
		schema.safeParse(value).success,
		false,
		`${field}: значение должно быть отвергнуто, но прошло проверку`,
	);
}

// ── Фикстуры ────────────────────────────────────────────────────────────────
// Собраны один раз и клонируются в каждом тесте: у документов по 20-30
// обязательных полей, и без общей заготовки тест превратился бы в простыню, где
// причина падения неотличима от опечатки в фикстуре.

const UUID_ORG = "11111111-1111-4111-8111-111111111111";
const UUID_PATIENT = "22222222-2222-4222-8222-222222222222";
const UUID_VISIT = "33333333-3333-4333-8333-333333333333";
const UUID_PAYMENT = "44444444-4444-4444-8444-444444444444";
const UUID_DOCUMENT = "55555555-5555-4555-8555-555555555555";
const UUID_CONTRACT_DOC = "66666666-6666-4666-8666-666666666666";
const DATE = "12.05.2026";
const ISO = "2026-05-12T09:00:00+04:00";

/** clinicalToothRowsSchema требует минимум одну строку — пустой массив не проходит. */
const TOOTH_ROWS = [
	{
		toothOrArea: "36",
		surfaces: ["occlusal"],
		status: "caries",
		diagnosisOrFinding: "Кариес дентина",
		indication: "Боль при накусывании",
		plannedAction: "Пломбирование композитом",
	},
];

const planItem = (patch: Record<string, unknown> = {}) => ({
	id: UUID_DOCUMENT,
	organizationId: UUID_ORG,
	patientId: UUID_PATIENT,
	visitId: null,
	serviceId: "srv-1",
	snapshotServiceName: "Лечение кариеса",
	toothCode: "36",
	quantity: 1,
	unitPriceRub: KOPECKS,
	discountRub: 0.5,
	status: "proposed",
	plannedDoctorUserId: null,
	plannedChairId: null,
	notes: null,
	...patch,
});

const billingSummary = (patch: Record<string, unknown> = {}) => ({
	totalPlannedRub: KOPECKS,
	totalDiscountRub: 0.5,
	totalPaidRub: 0.01,
	// 1500,50 − 0,25 (покрытие) − 0,01 (оплачено) = 1500,24. Фикстура обязана
	// сходиться сама, иначе тест на сходимость проверяет опечатку, а не контракт.
	totalDueRub: 1500.24,
	taxDeductionEligibleRub: KOPECKS,
	draftDocumentAmountRub: KOPECKS,
	openTreatmentItems: 2,
	unpaidDocuments: 1,
	insuranceCoverageRub: 0.25,
	...patch,
});

const serviceLine = (patch: Record<string, unknown> = {}) => ({
	serviceName: "Лечение кариеса",
	toothOrArea: "36",
	quantity: 1,
	unitPriceRub: 1501,
	discountRub: 0.5,
	totalRub: KOPECKS,
	...patch,
});

const costEstimate = (patch: Record<string, unknown> = {}) => ({
	estimateNumber: "СМ-1",
	estimateDate: DATE,
	patientOrPayerFullName: "Иванов Иван Иванович",
	treatmentBasis: "Кариес 36",
	serviceLines: [serviceLine()],
	totalAmountRub: KOPECKS,
	estimateValidUntil: DATE,
	priceChangeRules: "Цена фиксируется на 30 дней",
	excludedItems: ["Ортодонтия"],
	paymentMilestoneNotes: "Оплата по факту приёма",
	responsibleDoctorFullName: "Петров Пётр Петрович",
	responsibleAdminFullName: null,
	signedAt: DATE,
	patientUnderstandsPreliminaryEstimate: true,
	serviceScopeMatchesTreatmentPlan: true,
	estimateDoesNotReplaceContractOrFiscalReceipt: true,
	changesRequireUpdatedEstimate: true,
	...patch,
});

const paymentInvoice = (patch: Record<string, unknown> = {}) => ({
	invoiceNumber: "СЧ-1",
	invoiceDate: DATE,
	payerFullName: "Иванов Иван Иванович",
	payerPhone: null,
	payerEmail: null,
	paymentPurpose: "Лечение кариеса 36",
	serviceLines: [serviceLine()],
	totalAmountRub: KOPECKS,
	dueDate: DATE,
	paymentTerms: "Оплата в течение 5 дней",
	clinicBankDetails: "Р/с 40702810000000000000",
	cashlessPaymentAllowed: true,
	cashDeskPaymentAllowed: true,
	qrPaymentPayload: null,
	clinicRequisitesVerified: true,
	serviceScopeConfirmed: true,
	payerInformedInvoiceIsNotFiscalReceipt: true,
	...patch,
});

const paymentReceipt = (patch: Record<string, unknown> = {}) => ({
	receiptNumber: "КВ-1",
	receiptDate: DATE,
	selectedPaymentIds: [UUID_PAYMENT],
	totalPaidRub: KOPECKS,
	payerFullName: "Иванов Иван Иванович",
	taxSupportRequested: false,
	paymentPurpose: "Оплата лечения",
	fiscalReceiptNumbers: ["0001"],
	issuedByFullName: "Сидорова Анна Петровна",
	paymentAndFiscalDataVerified: true,
	payerIdentityVerified: true,
	receiptDoesNotReplaceFiscalReceipt: true,
	...patch,
});

const installmentSchedule = (patch: Record<string, unknown> = {}) => ({
	scheduleNumber: "ГР-1",
	scheduleDate: DATE,
	baseDocumentTitle: "Договор №1",
	payerFullName: "Иванов Иван Иванович",
	totalAmountRub: 100,
	prepaidAmountRub: 0.01,
	remainingAmountRub: 99.99,
	installments: [
		{ label: "Платёж 1", dueDate: DATE, amountRub: 33.34, status: "planned" },
		{ label: "Платёж 2", dueDate: DATE, amountRub: 33.33, status: "planned" },
		{ label: "Платёж 3", dueDate: DATE, amountRub: 33.32, status: "planned" },
	],
	latePaymentPolicy: "Пеня 0,1% в день",
	paymentMethodNotes: "Картой или наличными в кассе",
	responsibleStaffFullName: "Сидорова Анна Петровна",
	patientAcceptedSchedule: true,
	scheduleDoesNotReplaceFiscalReceipt: true,
	changesRequireWrittenAgreement: true,
	...patch,
});

const treatmentPlan = (patch: Record<string, unknown> = {}) => ({
	clinicalReason: "Жалобы на боль",
	diagnosisSummary: "Кариес 36",
	teethOrArea: "36",
	clinicalToothRows: TOOTH_ROWS,
	treatmentGoals: ["Сохранить зуб"],
	plannedStages: [
		{
			stageName: "Лечение",
			plannedServices: "Лечение кариеса",
			plannedTiming: "Сегодня",
			clinicalNotes: null,
			estimatedAmountRub: KOPECKS,
		},
	],
	estimatedTotalRub: KOPECKS,
	alternatives: ["Удаление"],
	risksAndLimitations: ["Возможен пульпит"],
	plannedAt: DATE,
	patientQuestionsAnswered: true,
	planRequiresSeparateConsent: true,
	planRequiresNewApprovalOnChange: true,
	...patch,
});

const treatmentPlanAcceptance = (patch: Record<string, unknown> = {}) => ({
	selectedVariant: "standard",
	clinicalGoal: "Сохранить зуб",
	diagnosisSummary: "Кариес 36",
	teethOrArea: "36",
	clinicalToothRows: TOOTH_ROWS,
	acceptedStages: [
		{
			stageName: "Лечение",
			plannedServices: "Лечение кариеса",
			plannedTiming: "Сегодня",
			estimatedAmountRub: KOPECKS,
		},
	],
	estimatedTotalRub: KOPECKS,
	estimateValidUntil: DATE,
	paymentTerms: "Оплата по факту",
	rejectedAlternatives: ["Удаление"],
	risksAndLimitations: ["Возможен пульпит"],
	warrantyAndControlTerms: "Гарантия 12 месяцев",
	doctorFullName: "Петров Пётр Петрович",
	acceptedAt: DATE,
	patientQuestionsAnswered: true,
	patientUnderstandsAlternatives: true,
	patientUnderstandsCostMayChange: true,
	revisionRequiresNewApproval: true,
	...patch,
});

const refundCorrection = (patch: Record<string, unknown> = {}) => ({
	action: "full_refund",
	selectedPaymentIds: [UUID_PAYMENT],
	amountRub: KOPECKS,
	reason: "Пациент отказался от лечения",
	refundMethod: "card",
	recipientFullName: "Иванов Иван Иванович",
	recipientIdentityDocument: "Паспорт 1234 567890",
	bankDetails: null,
	originalFiscalReceiptNumber: "0001",
	correctionFiscalReceiptNumber: null,
	accountantDecision: "Возврат согласован",
	...patch,
});

// ── Прайс: сводка по категории (:1757-1759) ─────────────────────────────────

describe("сводка прайса принимает копейки", () => {
	const summary = (patch: Record<string, unknown> = {}) => ({
		category: "therapy",
		specialty: "therapist",
		count: 2,
		pricedCount: 2,
		minPriceRub: KOPECKS,
		maxPriceRub: 1600.01,
		averagePriceRub: 1550.26,
		materialKinds: [],
		brands: [],
		...patch,
	});

	test("min, max и среднее — копии и производные priceRub строки прайса", () => {
		const parsed = assertAccepts(
			dentalPricelistCategorySummarySchema,
			summary(),
			"dentalPricelistCategorySummary",
		);
		assert.strictEqual(parsed.minPriceRub, KOPECKS);
		assert.strictEqual(parsed.maxPriceRub, 1600.01);
		assert.strictEqual(parsed.averagePriceRub, 1550.26);
	});

	test("null допустим: в категории может не быть ни одной цены", () => {
		assertAccepts(
			dentalPricelistCategorySummarySchema,
			summary({ minPriceRub: null, maxPriceRub: null, averagePriceRub: null }),
			"dentalPricelistCategorySummary/null",
		);
	});

	test("третий знак отвергается — среднее округляет вызывающий, не схема", () => {
		assertRejects(
			dentalPricelistCategorySummarySchema,
			summary({ averagePriceRub: THIRD_DECIMAL }),
			"averagePriceRub",
		);
	});

	test("отрицательная цена отвергается", () => {
		assertRejects(
			dentalPricelistCategorySummarySchema,
			summary({ minPriceRub: -1 }),
			"minPriceRub",
		);
	});
});

// ── План лечения: позиция и сценарий (:1813-1814, :1834, :1842) ─────────────

describe("позиция плана лечения принимает копейки", () => {
	test("цена и скидка возвращаются без изменений", () => {
		const parsed = assertAccepts(
			treatmentPlanItemSchema,
			planItem(),
			"treatmentPlanItem",
		);
		assert.strictEqual(parsed.unitPriceRub, KOPECKS);
		assert.strictEqual(parsed.discountRub, 0.5);
	});

	test("третий знак в цене отвергается", () => {
		assertRejects(
			treatmentPlanItemSchema,
			planItem({ unitPriceRub: THIRD_DECIMAL }),
			"treatmentPlanItem.unitPriceRub",
		);
	});

	test("отрицательная скидка отвергается", () => {
		assertRejects(
			treatmentPlanItemSchema,
			planItem({ discountRub: -0.5 }),
			"treatmentPlanItem.discountRub",
		);
	});
});

describe("сценарий плана лечения принимает копейки", () => {
	const scenario = (patch: Record<string, unknown> = {}) => ({
		id: "scn-1",
		organizationId: UUID_ORG,
		patientId: UUID_PATIENT,
		title: "Оптимальный",
		strategy: "optimal",
		priority: "balanced",
		totalRub: 3001,
		durationMonths: 3,
		visitCount: 2,
		includedServiceIds: ["srv-1"],
		phases: [
			{ title: "Этап 1", window: "Май", amountRub: KOPECKS, focus: "Терапия" },
			{ title: "Этап 2", window: "Июнь", amountRub: KOPECKS, focus: "Терапия" },
		],
		pros: [],
		tradeoffs: [],
		clinicalWarnings: [],
		active: true,
		...patch,
	});

	test("сумма этапов РАВНА итогу сценария, а не приблизительно равна", () => {
		const parsed = assertAccepts(
			treatmentPlanScenarioSchema,
			scenario(),
			"treatmentPlanScenario",
		);
		const phasesTotal =
			Math.round(
				parsed.phases.reduce((sum, phase) => sum + phase.amountRub, 0) * 100,
			) / 100;
		assert.strictEqual(phasesTotal, parsed.totalRub);
	});

	test("третий знак в сумме этапа отвергается", () => {
		assertRejects(
			treatmentPlanScenarioSchema,
			scenario({
				phases: [
					{
						title: "Этап 1",
						window: "Май",
						amountRub: THIRD_DECIMAL,
						focus: "Терапия",
					},
				],
			}),
			"treatmentPlanScenario.phases[].amountRub",
		);
	});
});

// ── Финансовая сводка (:2039-2047) ──────────────────────────────────────────

describe("финансовая сводка принимает копейки", () => {
	test("все шесть сумм проходят и возвращаются без изменений", () => {
		const parsed = assertAccepts(
			billingSummarySchema,
			billingSummary(),
			"billingSummary",
		);
		assert.strictEqual(parsed.totalPlannedRub, KOPECKS);
		assert.strictEqual(parsed.totalDiscountRub, 0.5);
		assert.strictEqual(parsed.totalPaidRub, 0.01);
		assert.strictEqual(parsed.totalDueRub, 1500.24);
		assert.strictEqual(parsed.taxDeductionEligibleRub, KOPECKS);
		assert.strictEqual(parsed.draftDocumentAmountRub, KOPECKS);
		assert.strictEqual(parsed.insuranceCoverageRub, 0.25);
	});

	test("долг остаётся суммой частей: план минус покрытие минус оплата", () => {
		const parsed = assertAccepts(
			billingSummarySchema,
			billingSummary(),
			"billingSummary/сходимость",
		);
		const expectedDue =
			Math.round(
				(parsed.totalPlannedRub -
					(parsed.insuranceCoverageRub ?? 0) -
					parsed.totalPaidRub) *
					100,
			) / 100;
		assert.strictEqual(expectedDue, parsed.totalDueRub);
	});

	for (const field of [
		"totalPlannedRub",
		"totalDiscountRub",
		"totalPaidRub",
		"totalDueRub",
		"taxDeductionEligibleRub",
		"draftDocumentAmountRub",
		"insuranceCoverageRub",
	] as const) {
		test(`${field}: третий знак после запятой отвергается`, () => {
			assertRejects(
				billingSummarySchema,
				billingSummary({ [field]: THIRD_DECIMAL }),
				`billingSummary.${field}`,
			);
		});

		test(`${field}: отрицательное значение отвергается`, () => {
			assertRejects(
				billingSummarySchema,
				billingSummary({ [field]: -0.01 }),
				`billingSummary.${field}`,
			);
		});
	}

	/*
	 * ОСТАВЛЕНЫ ЦЕЛЫМИ НАМЕРЕННО. Это НЕ деньги: openTreatmentItems — сколько
	 * позиций плана не закрыто, unpaidDocuments — сколько документов не оплачено.
	 * «2,5 неоплаченных документа» не существует, и дробное значение здесь —
	 * признак того, что в поле попала сумма вместо количества.
	 */
	test("openTreatmentItems — количество позиций, а не сумма: 1500,50 отвергается", () => {
		assertRejects(
			billingSummarySchema,
			billingSummary({ openTreatmentItems: KOPECKS }),
			"billingSummary.openTreatmentItems",
		);
	});

	test("unpaidDocuments — количество документов, а не сумма: 1500,50 отвергается", () => {
		assertRejects(
			billingSummarySchema,
			billingSummary({ unpaidDocuments: KOPECKS }),
			"billingSummary.unpaidDocuments",
		);
	});
});

// ── Пациент: баланс и долг (:2622, :2638) ───────────────────────────────────

describe("баланс пациента принимает копейки", () => {
	const patient = (patch: Record<string, unknown> = {}) => ({
		id: UUID_PATIENT,
		organizationId: UUID_ORG,
		status: "active",
		fullName: "Иванов Иван Иванович",
		birthDate: null,
		phone: null,
		email: null,
		notes: null,
		administrativeProfile: null,
		balanceRub: KOPECKS,
		createdAt: ISO,
		updatedAt: ISO,
		...patch,
	});

	test("положительный баланс с копейками проходит", () => {
		const parsed = assertAccepts(patientSchema, patient(), "patient.balanceRub");
		assert.strictEqual(parsed.balanceRub, KOPECKS);
	});

	test("отрицательный баланс — это долг, он допустим и с копейками", () => {
		const parsed = assertAccepts(
			patientSchema,
			patient({ balanceRub: -1500.5 }),
			"patient.balanceRub/долг",
		);
		assert.strictEqual(parsed.balanceRub, -1500.5);
	});

	test("третий знак в балансе отвергается", () => {
		assertRejects(
			patientSchema,
			patient({ balanceRub: THIRD_DECIMAL }),
			"patient.balanceRub",
		);
	});

	test("баланс по умолчанию ноль, а не отсутствующее значение", () => {
		const withoutBalance = patient();
		delete (withoutBalance as Record<string, unknown>).balanceRub;
		const parsed = assertAccepts(
			patientSchema,
			withoutBalance,
			"patient.balanceRub/default",
		);
		assert.strictEqual(parsed.balanceRub, 0);
	});
});

describe("долг в подсказке администратору принимает копейки", () => {
	const insight = (patch: Record<string, unknown> = {}) => ({
		patientId: UUID_PATIENT,
		riskLevel: "watch",
		riskReasons: [],
		nextBestAction: "Позвонить пациенту",
		recallDueAt: null,
		balanceDueRub: KOPECKS,
		openTasks: 1,
		missingDocumentKinds: [],
		clinicalFlags: [],
		adminFlags: [],
		lastActivityAt: null,
		...patch,
	});

	test("остаток с копейками проходит", () => {
		const parsed = assertAccepts(
			patientInsightSchema,
			insight(),
			"patientInsight.balanceDueRub",
		);
		assert.strictEqual(parsed.balanceDueRub, KOPECKS);
	});

	test("третий знак отвергается", () => {
		assertRejects(
			patientInsightSchema,
			insight({ balanceDueRub: THIRD_DECIMAL }),
			"patientInsight.balanceDueRub",
		);
	});

	test("отрицательный остаток отвергается: долг не бывает меньше нуля", () => {
		assertRejects(
			patientInsightSchema,
			insight({ balanceDueRub: -0.01 }),
			"patientInsight.balanceDueRub",
		);
	});
});

// ── Договор и акт (:2898, :2930-2931) ───────────────────────────────────────

describe("договор на платные услуги принимает копейки", () => {
	const contract = (patch: Record<string, unknown> = {}) => ({
		contractNumber: "Д-1",
		contractDate: DATE,
		serviceStart: DATE,
		serviceEndOrCondition: "До завершения лечения",
		customerFullName: "Иванов Иван Иванович",
		representativeFullName: null,
		plannedCareReason: "Кариес 36",
		serviceScopeSummary: "Лечение кариеса 36",
		estimatedTotalRub: KOPECKS,
		paymentTerms: "Оплата по факту приёма",
		priceChangeRules: "Цена фиксируется на 30 дней",
		freeCareAvailabilityNotice: "Помощь по ОМС доступна в поликлинике",
		medicalRecommendationWarning: "Отказ от лечения ухудшит прогноз",
		refusalAndRefundTerms: "Возврат в течение 10 дней",
		warrantyAndClaimsTerms: "Гарантия 12 месяцев",
		doctorFullName: "Петров Пётр Петрович",
		signedAt: DATE,
		patientReceivedClinicInfo: true,
		patientReceivedPriceAndServiceList: true,
		patientUnderstandsPaidBasis: true,
		changesRequireWrittenAgreement: true,
		...patch,
	});

	test("ориентировочная сумма договора совпадает со сметой до копейки", () => {
		const parsed = assertAccepts(
			paidMedicalServicesContractPayloadSchema,
			contract(),
			"paidMedicalServicesContract.estimatedTotalRub",
		);
		assert.strictEqual(parsed.estimatedTotalRub, KOPECKS);
	});

	test("третий знак отвергается", () => {
		assertRejects(
			paidMedicalServicesContractPayloadSchema,
			contract({ estimatedTotalRub: THIRD_DECIMAL }),
			"paidMedicalServicesContract.estimatedTotalRub",
		);
	});
});

describe("акт выполненных работ принимает копейки", () => {
	const act = (patch: Record<string, unknown> = {}) => ({
		actNumber: "А-1",
		actDate: DATE,
		contractNumber: "Д-1",
		linkedContractDocumentId: UUID_CONTRACT_DOC,
		servicePeriodStart: DATE,
		servicePeriodEnd: DATE,
		doctorFullName: "Петров Пётр Петрович",
		acceptedServicesSummary: "Лечение кариеса 36",
		totalByActRub: KOPECKS,
		paidRub: KOPECKS,
		fiscalReceiptNumbers: ["0001"],
		patientClaimsText: null,
		linkedToSignedContract: true,
		finalServiceScopeConfirmed: true,
		fiscalReceiptsVerified: true,
		patientAcceptedWorks: true,
		...patch,
	});

	test("оплачено по акту равно фактическому платежу с копейками", () => {
		const parsed = assertAccepts(
			completedWorksActPayloadSchema,
			act(),
			"completedWorksAct",
		);
		assert.strictEqual(parsed.paidRub, KOPECKS);
		assert.strictEqual(parsed.totalByActRub, KOPECKS);
	});

	test("третий знак в оплаченной сумме отвергается", () => {
		assertRejects(
			completedWorksActPayloadSchema,
			act({ paidRub: THIRD_DECIMAL }),
			"completedWorksAct.paidRub",
		);
	});
});

// ── Смета, счёт, квитанция, рассрочка (:2959-2966, :2995-3002, :3029, :3107-3115)

describe("смета лечения принимает копейки", () => {
	test("строка и итог сходятся до копейки", () => {
		const parsed = assertAccepts(
			treatmentCostEstimatePayloadSchema,
			costEstimate(),
			"treatmentCostEstimate",
		);
		const line = parsed.serviceLines[0];
		assert.ok(line);
		const expectedLineTotal =
			Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) /
			100;
		assert.strictEqual(expectedLineTotal, line.totalRub);
		assert.strictEqual(line.totalRub, parsed.totalAmountRub);
	});

	test("третий знак в цене строки отвергается", () => {
		assertRejects(
			treatmentCostEstimatePayloadSchema,
			costEstimate({ serviceLines: [serviceLine({ unitPriceRub: THIRD_DECIMAL })] }),
			"treatmentCostEstimate.serviceLines[].unitPriceRub",
		);
	});

	test("нулевой итог отвергается: смета на ноль рублей — не смета", () => {
		assertRejects(
			treatmentCostEstimatePayloadSchema,
			costEstimate({ totalAmountRub: 0 }),
			"treatmentCostEstimate.totalAmountRub",
		);
	});
});

describe("счёт на оплату принимает копейки", () => {
	test("строка и итог сходятся до копейки", () => {
		const parsed = assertAccepts(
			paymentInvoicePayloadSchema,
			paymentInvoice(),
			"paymentInvoice",
		);
		assert.strictEqual(parsed.serviceLines[0]?.totalRub, KOPECKS);
		assert.strictEqual(parsed.totalAmountRub, KOPECKS);
	});

	test("третий знак в итоге отвергается", () => {
		assertRejects(
			paymentInvoicePayloadSchema,
			paymentInvoice({ totalAmountRub: THIRD_DECIMAL }),
			"paymentInvoice.totalAmountRub",
		);
	});
});

describe("квитанция об оплате принимает копейки", () => {
	test("сумма квитанции равна сумме платежа 1500,50", () => {
		const parsed = assertAccepts(
			paymentReceiptPayloadSchema,
			paymentReceipt(),
			"paymentReceipt.totalPaidRub",
		);
		assert.strictEqual(parsed.totalPaidRub, KOPECKS);
	});

	test("третий знак отвергается", () => {
		assertRejects(
			paymentReceiptPayloadSchema,
			paymentReceipt({ totalPaidRub: THIRD_DECIMAL }),
			"paymentReceipt.totalPaidRub",
		);
	});

	test("нулевая и отрицательная квитанция отвергаются", () => {
		assertRejects(
			paymentReceiptPayloadSchema,
			paymentReceipt({ totalPaidRub: 0 }),
			"paymentReceipt.totalPaidRub/ноль",
		);
		assertRejects(
			paymentReceiptPayloadSchema,
			paymentReceipt({ totalPaidRub: -KOPECKS }),
			"paymentReceipt.totalPaidRub/минус",
		);
	});
});

describe("график рассрочки принимает копейки", () => {
	test("сумма платежей РАВНА итогу: 100 ₽ на три платежа сходятся", () => {
		const parsed = assertAccepts(
			installmentPaymentSchedulePayloadSchema,
			installmentSchedule(),
			"installmentPaymentSchedule",
		);
		const paidTotal =
			Math.round(
				parsed.installments.reduce((sum, item) => sum + item.amountRub, 0) * 100,
			) / 100;
		assert.strictEqual(paidTotal, parsed.totalAmountRub - 0.01);
		assert.strictEqual(paidTotal, parsed.remainingAmountRub);
	});

	test("третий знак в платеже отвергается", () => {
		assertRejects(
			installmentPaymentSchedulePayloadSchema,
			installmentSchedule({
				installments: [
					{
						label: "Платёж 1",
						dueDate: DATE,
						amountRub: THIRD_DECIMAL,
						status: "planned",
					},
				],
			}),
			"installmentPaymentSchedule.installments[].amountRub",
		);
	});

	test("нулевой платёж отвергается", () => {
		assertRejects(
			installmentPaymentSchedulePayloadSchema,
			installmentSchedule({
				installments: [
					{ label: "Платёж 1", dueDate: DATE, amountRub: 0, status: "planned" },
				],
			}),
			"installmentPaymentSchedule.installments[].amountRub/ноль",
		);
	});
});

// ── План лечения и его принятие как документы (:3757-3762, :3794-3799) ──────

describe("план лечения как документ принимает копейки", () => {
	test("сумма этапа и итог с копейками проходят", () => {
		const parsed = assertAccepts(
			treatmentPlanPayloadSchema,
			treatmentPlan(),
			"treatmentPlanPayload",
		);
		assert.strictEqual(parsed.plannedStages[0]?.estimatedAmountRub, KOPECKS);
		assert.strictEqual(parsed.estimatedTotalRub, KOPECKS);
	});

	test("null в сумме этапа допустим: этап без оценки стоимости", () => {
		assertAccepts(
			treatmentPlanPayloadSchema,
			treatmentPlan({
				plannedStages: [
					{
						stageName: "Наблюдение",
						plannedServices: "Контрольный осмотр",
						plannedTiming: "Через месяц",
						clinicalNotes: null,
						estimatedAmountRub: null,
					},
				],
			}),
			"treatmentPlanPayload.plannedStages[].estimatedAmountRub/null",
		);
	});

	test("третий знак в итоге отвергается", () => {
		assertRejects(
			treatmentPlanPayloadSchema,
			treatmentPlan({ estimatedTotalRub: THIRD_DECIMAL }),
			"treatmentPlanPayload.estimatedTotalRub",
		);
	});
});

describe("принятый план лечения принимает копейки", () => {
	test("суммы повторяют предложенный план до копейки", () => {
		const parsed = assertAccepts(
			treatmentPlanAcceptancePayloadSchema,
			treatmentPlanAcceptance(),
			"treatmentPlanAcceptance",
		);
		assert.strictEqual(parsed.acceptedStages[0]?.estimatedAmountRub, KOPECKS);
		assert.strictEqual(parsed.estimatedTotalRub, KOPECKS);
	});

	test("третий знак в сумме этапа отвергается", () => {
		assertRejects(
			treatmentPlanAcceptancePayloadSchema,
			treatmentPlanAcceptance({
				acceptedStages: [
					{
						stageName: "Лечение",
						plannedServices: "Лечение кариеса",
						plannedTiming: "Сегодня",
						estimatedAmountRub: THIRD_DECIMAL,
					},
				],
			}),
			"treatmentPlanAcceptance.acceptedStages[].estimatedAmountRub",
		);
	});
});

// ── Возврат и коррекция оплаты (:3836) ──────────────────────────────────────

describe("возврат оплаты принимает копейки", () => {
	test("полный возврат платежа 1500,50 возможен", () => {
		const parsed = assertAccepts(
			paymentRefundCorrectionPayloadSchema,
			refundCorrection(),
			"paymentRefundCorrection.amountRub",
		);
		assert.strictEqual(parsed.amountRub, KOPECKS);
	});

	test("третий знак отвергается", () => {
		assertRejects(
			paymentRefundCorrectionPayloadSchema,
			refundCorrection({ amountRub: THIRD_DECIMAL }),
			"paymentRefundCorrection.amountRub",
		);
	});

	test("нулевой возврат отвергается", () => {
		assertRejects(
			paymentRefundCorrectionPayloadSchema,
			refundCorrection({ amountRub: 0 }),
			"paymentRefundCorrection.amountRub/ноль",
		);
	});
});

// ── Документ: запись и чтение (:4185, :4494) ────────────────────────────────

describe("создание документа принимает копейки", () => {
	const createDocument = (patch: Record<string, unknown> = {}) => ({
		patientId: UUID_PATIENT,
		visitId: UUID_VISIT,
		kind: "payment_receipt",
		totalAmountRub: KOPECKS,
		payload: { paymentReceipt: paymentReceipt() },
		...patch,
	});

	/*
	 * Именно здесь обрыв был виден пользователю: apps/web/src/useAppLogic.tsx
	 * складывает payment.amountRub по выбранным платежам и отправляет сумму в
	 * POST /api/documents, а apps/api/src/routes/documents/create.ts прогоняет
	 * тело через эту схему и отвечает 400 при отказе.
	 */
	test("сумма выбранных платежей с копейками больше не даёт 400", () => {
		const parsed = assertAccepts(
			createDocumentSchema,
			createDocument(),
			"createDocument.totalAmountRub",
		);
		assert.strictEqual(parsed.totalAmountRub, KOPECKS);
	});

	test("третий знак отвергается", () => {
		assertRejects(
			createDocumentSchema,
			createDocument({ totalAmountRub: THIRD_DECIMAL }),
			"createDocument.totalAmountRub",
		);
	});

	test("null допустим: у документа без денег суммы нет", () => {
		const parsed = assertAccepts(
			createDocumentSchema,
			createDocument({
				kind: "informed_consent",
				totalAmountRub: null,
				payload: null,
			}),
			"createDocument.totalAmountRub/null",
		);
		assert.strictEqual(parsed.totalAmountRub, null);
	});
});

describe("выданный документ принимает копейки и требует точности", () => {
	const document = (patch: Record<string, unknown> = {}) => ({
		id: UUID_DOCUMENT,
		organizationId: UUID_ORG,
		patientId: UUID_PATIENT,
		visitId: UUID_VISIT,
		kind: "payment_receipt",
		title: "Квитанция об оплате",
		status: "issued",
		issuedAt: ISO,
		totalAmountRub: KOPECKS,
		...patch,
	});

	test("сумма выданного документа возвращается без изменений", () => {
		const parsed = assertAccepts(
			generatedDocumentSchema,
			document(),
			"generatedDocument.totalAmountRub",
		);
		assert.strictEqual(parsed.totalAmountRub, KOPECKS);
	});

	/*
	 * Раньше здесь стояло z.number().nonnegative() — копейки проходили, но
	 * проходило и 1500,5555, которое колонка numeric(12, 2) молча обрежет: на
	 * руках у пациента и в базе оказались бы разные суммы.
	 */
	test("третий знак теперь отвергается, а раньше проходил", () => {
		assertRejects(
			generatedDocumentSchema,
			document({ totalAmountRub: THIRD_DECIMAL }),
			"generatedDocument.totalAmountRub",
		);
	});
});

// ── Поток визита (:8333) ────────────────────────────────────────────────────

describe("цена выполненной услуги в потоке визита принимает копейки", () => {
	const visitFlow = (patch: Record<string, unknown> = {}) => ({
		transcript: "Вылечили кариес 36",
		completedServices: [
			{ serviceId: "srv-1", title: "Лечение кариеса", quantity: 1, priceRub: KOPECKS },
		],
		...patch,
	});

	test("копейки проходят и доезжают до суммы этапа плана", () => {
		const parsed = assertAccepts(
			visitFlowRequestSchema,
			visitFlow(),
			"visitFlowRequest.completedServices[].priceRub",
		);
		assert.strictEqual(parsed.completedServices?.[0]?.priceRub, KOPECKS);
	});

	/*
	 * Раньше это поле было объявлено просто z.number(): проходила и отрицательная
	 * цена, и третий знак. Отсюда значение уходит в estimatedAmountRub этапа
	 * плана (apps/api/src/ai/visitFlowOrchestrator.ts), где оба варианта роняют
	 * весь план целиком — проверять надо на входе.
	 */
	test("отрицательная цена отвергается, а раньше проходила", () => {
		assertRejects(
			visitFlowRequestSchema,
			visitFlow({
				completedServices: [
					{ serviceId: "srv-1", title: "Лечение", quantity: 1, priceRub: -5000 },
				],
			}),
			"visitFlowRequest.completedServices[].priceRub/минус",
		);
	});

	test("третий знак отвергается, а раньше проходил", () => {
		assertRejects(
			visitFlowRequestSchema,
			visitFlow({
				completedServices: [
					{
						serviceId: "srv-1",
						title: "Лечение",
						quantity: 1,
						priceRub: THIRD_DECIMAL,
					},
				],
			}),
			"visitFlowRequest.completedServices[].priceRub/третий знак",
		);
	});
});

// ── Round-trip: значение обязано пережить проверку неизменным ───────────────

describe("копейки переживают проверку контракта без искажения", () => {
	/*
	 * Money — точная величина (§8b). Схема с refine НЕ преобразует значение, но
	 * проверить это надо явно: достаточно одной случайно добавленной
	 * .transform(Math.round) в цепочке, чтобы деньги начали тихо округляться, и
	 * тест на «принимает 1500,50» этого не заметил бы.
	 */
	const exactValues = [0.01, 0.1, 0.5, 1500.5, 1500.49, 99999.99, 1e6 + 0.07];

	for (const value of exactValues) {
		test(`${value} возвращается ровно таким же`, () => {
			const parsed = assertAccepts(
				billingSummarySchema,
				billingSummary({ totalPaidRub: value }),
				`round-trip/${value}`,
			);
			assert.strictEqual(parsed.totalPaidRub, value);
			assert.strictEqual(
				Math.round(parsed.totalPaidRub * 100),
				Math.round(value * 100),
			);
		});
	}
});

// ── Доказательство от противного: тест обязан падать при откате ──────────────

/*
 * ЗАЧЕМ ЭТОТ БЛОК.
 *
 * Тест, который «принимает 1500,50», сам по себе не доказывает НИЧЕГО: он
 * прошёл бы и на схеме без единой проверки. Доказательство обязано быть от
 * противного — надо показать, что рядом с копейками падает ровно тот вариант
 * объявления, который стоял в файле раньше.
 *
 * Здесь на НАСТОЯЩЕЙ схеме через .extend() воспроизводится прежнее объявление
 * поля, и та же самая фикстура проверяется дважды:
 *   1. с текущим объявлением — обязана ПРОЙТИ;
 *   2. с откатанным объявлением — обязана БЫТЬ ОТВЕРГНУТА.
 * Если кто-то вернёт полю z.number().int(), пункт 1 упадёт в остальных тестах
 * файла, а если кто-то ослабит moneyRubSchema до z.number() — упадёт пункт 2
 * здесь. Оба направления закрыты.
 *
 * Проверять именно парой обязательно: одиночный «отвергается» ничего не стоит,
 * потому что фикстура могла не проходить по любой другой причине — опечатке в
 * поле, промахнувшемуся enum, забытому обязательному полю.
 */

/** Прежнее объявление большинства сумм в HEAD. */
const REVERTED_INT_NONNEGATIVE = z.number().int().nonnegative();
/** Прежнее объявление итогов документов, где ноль запрещён. */
const REVERTED_INT_POSITIVE = z.number().int().positive();

interface RevertCase {
	/** Схема из контракта, которую откатываем по одному полю. */
	readonly schema: z.ZodObject<z.ZodRawShape>;
	/** Фикстура целиком — именно она должна пройти до отката и упасть после. */
	readonly fixture: Record<string, unknown>;
	/** Поле и его прежнее объявление. */
	readonly field: string;
	readonly reverted: z.ZodTypeAny;
	/** Человеческое имя для сообщения об ошибке. */
	readonly label: string;
}

const revertCases: readonly RevertCase[] = [
	// Финансовая сводка пациента — платёжный путь целиком.
	...(
		[
			"totalPlannedRub",
			"totalDiscountRub",
			"totalPaidRub",
			"totalDueRub",
			"taxDeductionEligibleRub",
			"draftDocumentAmountRub",
			"insuranceCoverageRub",
		] as const
	).map((field) => ({
		schema: billingSummarySchema,
		fixture: billingSummary(),
		field,
		reverted: REVERTED_INT_NONNEGATIVE,
		label: `billingSummary.${field}`,
	})),
	// Позиция плана лечения — путь плана лечения.
	{
		schema: treatmentPlanItemSchema,
		fixture: planItem(),
		field: "unitPriceRub",
		reverted: REVERTED_INT_NONNEGATIVE,
		label: "treatmentPlanItem.unitPriceRub",
	},
	{
		schema: treatmentPlanItemSchema,
		fixture: planItem(),
		field: "discountRub",
		reverted: REVERTED_INT_NONNEGATIVE,
		label: "treatmentPlanItem.discountRub",
	},
	// Смета: итог документа, где ноль запрещён.
	{
		schema: treatmentCostEstimatePayloadSchema,
		fixture: costEstimate(),
		field: "totalAmountRub",
		reverted: REVERTED_INT_POSITIVE,
		label: "treatmentCostEstimate.totalAmountRub",
	},
	// График рассрочки: у этих двух полей в фикстуре есть копейки.
	{
		schema: installmentPaymentSchedulePayloadSchema,
		fixture: installmentSchedule(),
		field: "prepaidAmountRub",
		reverted: REVERTED_INT_NONNEGATIVE,
		label: "installmentPaymentSchedule.prepaidAmountRub",
	},
	{
		schema: installmentPaymentSchedulePayloadSchema,
		fixture: installmentSchedule(),
		field: "remainingAmountRub",
		reverted: REVERTED_INT_NONNEGATIVE,
		label: "installmentPaymentSchedule.remainingAmountRub",
	},
	// Принятый пациентом план — сумма, под которой стоит подпись.
	{
		schema: treatmentPlanAcceptancePayloadSchema,
		fixture: treatmentPlanAcceptance(),
		field: "estimatedTotalRub",
		reverted: REVERTED_INT_NONNEGATIVE,
		label: "treatmentPlanAcceptance.estimatedTotalRub",
	},
];

describe("откат поля к z.number().int() снова ломает копейки", () => {
	for (const testCase of revertCases) {
		test(`${testCase.label}: проходит сейчас и падает при откате`, () => {
			// 1. Текущее объявление принимает фикстуру с копейками.
			assertAccepts(
				testCase.schema,
				testCase.fixture,
				`${testCase.label}/сейчас`,
			);

			// 2. То же значение с прежним объявлением поля отвергается.
			const reverted = testCase.schema.extend({
				[testCase.field]: testCase.reverted,
			});
			assertRejects(
				reverted,
				testCase.fixture,
				`${testCase.label}/после откатa`,
			);
		});
	}

	/*
	 * Фикстура обязана содержать копейки именно в проверяемом поле, иначе откат
	 * ничего не сломает и тест молча превратится в пустышку. Это тоже проверяется,
	 * а не оставлено на внимательность того, кто правит фикстуры.
	 */
	for (const testCase of revertCases) {
		test(`${testCase.label}: в фикстуре действительно есть копейки`, () => {
			const value = testCase.fixture[testCase.field];
			assert.strictEqual(
				typeof value,
				"number",
				`${testCase.label}: поле должно быть числом`,
			);
			assert.ok(
				!Number.isInteger(value as number),
				`${testCase.label}: значение ${String(value)} целое — откат такого поля НИЧЕГО не докажет, возьми сумму с копейками`,
			);
		});
	}
});

/*
 * ЧЕСТНЫЙ ПРОБЕЛ. Три схемы построены через superRefine и потому являются
 * ZodEffects, а не ZodObject: у них нет .extend(), и откат поля на них так
 * воспроизвести нельзя — createDocumentSchema, paymentReceiptPayloadSchema,
 * paymentRefundCorrectionPayloadSchema. Их копеечное поведение проверено выше
 * прямыми тестами на приём 1500,50 и отказ 1500,505, но доказательства от
 * противного на них НЕТ. Закрывается это только разделением схемы на объект и
 * отдельный superRefine, что меняет публичный контракт и в этот пакет не входит.
 */
