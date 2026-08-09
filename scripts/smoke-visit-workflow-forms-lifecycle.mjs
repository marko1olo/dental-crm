import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
/*
 * СЕКРЕТ ПОДПИСИ ТОКЕНА КАБИНЕТА. Способ списан с
 * `scripts/smoke-document-html-issue-guards.mjs`: там тот же маршрут документов и
 * тот же барьер, второй способ подписи не заводится.
 */
const smokeAuthSecret =
	process.env.AUTH_TOKEN_SECRET || "dente_visit_workflow_forms_smoke_secret";
process.env.AUTH_TOKEN_SECRET = smokeAuthSecret;
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.resolve(
	".data",
	"smoke-visit-workflow-form-snapshots",
);

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const cryptoHelperPath = path.resolve("apps/api/dist/utils/cryptoHelper.js");

if (
	!existsSync(routePath) ||
	!existsSync(sampleDataPath) ||
	!existsSync(sharedPath) ||
	!existsSync(cryptoHelperPath)
) {
	throw new Error("Build shared and API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, patients, payments } = await import(
	pathToFileURL(sampleDataPath).href
);
const { signToken } = await import(pathToFileURL(cryptoHelperPath).href);

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

/*
 * ТОКЕН КАБИНЕТА ОБЯЗАТЕЛЕН, ИНАЧЕ ПРОВЕРЯЕТСЯ НЕ ЗАПРЕТ ФОРМЫ, А ВХОД.
 *
 * БЫЛО: каждый `POST /api/documents` получал 401 «Требуется авторизация рабочего
 * кабинета клиники», и НИ ОДИН ожидаемый здесь отказ 409 не проверялся ни разу.
 * Маршрут создания держит два барьера подряд — `requireClinicalMutationAccess`
 * и границу арендатора `requireOrganizationId` (routes/documents/create.ts:36 и
 * :53), и ВТОРОЙ отвечал раньше, чем дело доходило до содержимого.
 *
 * ПРАВ МАРШРУТ, УСТАРЕЛ СЦЕНАРИЙ: барьер арендатора поставлен коммитом 4ad7b10ec
 * (2026-07-26), убравшим подпорку `orgId = payload.organizationId || "mock-org"`
 * — строку, которая писала `"mock-org"` в колонку типа uuid. Именно она
 * позволяла сценарию без токена доезжать до проверок. Смоуки тот коммит не
 * тронул.
 */
const smokeClinicToken = signToken(
	{ organizationId: activeVisit.organizationId, clinicName: "Smoke clinic" },
	smokeAuthSecret,
	60,
);

const patient = patients.find(
	(candidate) => candidate.id === activeVisit.patientId,
);
assert(patient, "fixture patient missing");

const paidPayment = payments.find(
	(payment) =>
		payment.patientId === patient.id &&
		payment.visitId === activeVisit.id &&
		payment.status === "paid" &&
		payment.fiscalReceiptNumber,
);
assert(paidPayment, "fixture paid payment with fiscal receipt missing");

const sampleClinicalToothRows = [
	{
		toothOrArea: "36 зуб",
		surfaces: ["occlusal", "distal"],
		status: "caries",
		diagnosisOrFinding: "Route lifecycle кариес дентина 36 зуба",
		indication: "Route lifecycle восстановление функции и контроль осложнений",
		plannedAction: "лечение кариеса и композитная реставрация",
		prognosis: "прогноз зависит от явки на контроль",
		periodontalStatus: "десна без острого воспаления",
		implantOrProstheticNotes: null,
		orthodonticNotes: null,
	},
];

const visitWorkflowCases = [
	{
		kind: "informed_consent",
		payloadKey: "informedConsent",
		requiresVisitProof: true,
		payload: {
			intervention: "Route lifecycle informed consent treatment for tooth 36",
			toothOrArea: "36 tooth",
			diagnosisOrIndication: "Route lifecycle deep caries and bite pain",
			expectedBenefit:
				"Route lifecycle pain control and tooth function restoration",
			plannedAnesthesia: "Route lifecycle local anesthesia with articaine 4%",
			materialOrMedicationNotes:
				"Route lifecycle rubber dam and composite restoration by clinical indication",
			trustedContactForMedicalInfo:
				"Route lifecycle no third-party disclosure allowed",
			explainedRisks: [
				"postoperative pain",
				"swelling",
				"allergic reaction",
				"additional visit may be needed",
			],
			alternatives: [
				"second opinion",
				"postpone treatment under observation",
				"another treatment method if clinically indicated",
			],
			aftercareRequirements: [
				"do not eat until anesthesia ends",
				"follow doctor instructions",
				"contact clinic if pain or swelling increases",
			],
			doctorFullName: "Route Lifecycle Doctor",
			consentConfirmedAt: "24.05.2026 10:02",
			patientQuestionsAnswered: true,
			patientUnderstandsRisks: true,
			patientMayWithdrawBeforeIntervention: true,
		},
		fragments: [
			"Route lifecycle informed consent treatment for tooth 36",
			"Route lifecycle pain control",
			"Route Lifecycle Doctor",
		],
	},
	{
		kind: "procedure_specific_consent_packet",
		payloadKey: "procedureSpecificConsent",
		requiresVisitProof: true,
		payload: {
			procedureType: "surgery_extraction",
			procedureName: "Route lifecycle atraumatic extraction of tooth 36",
			toothOrArea: "36 tooth",
			diagnosisOrIndication:
				"Route lifecycle acute pain, crown destruction and infection risk",
			clinicalToothRows: sampleClinicalToothRows,
			plannedAnesthesia:
				"Route lifecycle mandibular block anesthesia with articaine 4%",
			materialsAndSystems:
				"Route lifecycle sutures and hemostatic sponge if indicated",
			patientSpecificRiskFactors: [
				"allergy status checked",
				"anticoagulants and pregnancy status checked",
			],
			procedureSpecificRisks: [
				"bleeding",
				"swelling",
				"alveolitis",
				"adjacent tissue injury",
			],
			alternatives: [
				"endodontic treatment when indicated",
				"second opinion",
				"refuse procedure",
			],
			aftercareAndLimits: [
				"do not heat the surgical area",
				"follow prescriptions",
				"attend control visit",
			],
			doctorFullName: "Route Lifecycle Surgeon",
			consentConfirmedAt: "24.05.2026 10:03",
			localClinicFormAttached: true,
			patientQuestionsAnswered: true,
			exactProcedureConfirmed: true,
			patientUnderstandsSpecificRisks: true,
		},
		fragments: [
			"Route lifecycle atraumatic extraction of tooth 36",
			"alveolitis",
			"Route Lifecycle Surgeon",
		],
	},
	{
		kind: "anesthesia_consent_log",
		payloadKey: "anesthesiaConsentLog",
		payload: {
			method: "инфильтрационная и проводниковая местная анестезия",
			anesthetic: "артикаин 4%",
			vasoconstrictor: "эпинефрин 1:200000",
			plannedZone: "36 зуб и нижняя челюсть слева",
			allergyStatus: "аллергия на анестетики со слов пациента отрицается",
			restrictionNotes:
				"антикоагулянты и беременность уточнены перед вмешательством",
			doseRows: [
				{
					time: "24.05.2026 10:05",
					medication: "артикаин 4% с эпинефрином 1:200000",
					doseMl: "1.7 мл",
					zone: "36 зуб",
					reaction: "без особенностей",
				},
			],
			patientAnesthesiaRisksExplained: true,
			allergyAndRestrictionStatusChecked: true,
			patientConfirmedAnesthesiaConsent: true,
		},
		fragments: [
			"Согласие и журнал местной анестезии",
			"артикаин 4%",
			"Журнал введения",
		],
	},
	{
		kind: "prescription_medication_order",
		payloadKey: "prescriptionMedicationOrder",
		payload: {
			clinicalToothRows: sampleClinicalToothRows,
			medications: [
				{
					medication: "ибупрофен",
					dosage: "400 мг",
					instructions: "по 1 таблетке после еды при боли",
					duration: "до 3 дней",
				},
			],
			safetyNotes: [
				"проверены аллергии, беременность, антикоагулянты и постоянные препараты",
				"пациенту объяснено, что нельзя превышать дозировку без врача",
			],
			urgentContactReason:
				"сыпь, одышка, кровотечение, температура или нарастающая боль",
		},
		fragments: [
			"Назначение лекарственных препаратов",
			"ибупрофен",
			"Контроль безопасности",
		],
	},
	{
		kind: "lab_work_order",
		payloadKey: "labWorkOrder",
		payload: {
			clinicalToothRows: sampleClinicalToothRows,
			workType: "керамическая вкладка",
			teethOrArea: "36 зуб",
			material: "E.max",
			shade: "VITA A2",
			source: "интраоральный скан и фото-протокол",
			deadline: "до 31.05.2026",
			technicianNotes:
				"Route lifecycle: проверить контактные пункты, окклюзию и край препарирования.",
		},
		fragments: ["Зуботехнический заказ-наряд", "E.max", "VITA A2"],
	},
	{
		kind: "xray_cbct_referral",
		payloadKey: "xrayCbctReferral",
		payload: {
			studyType: "cbct",
			clinicalToothRows: sampleClinicalToothRows,
			area: "36 зуб, нижняя челюсть слева",
			clinicalQuestion:
				"уточнить анатомию корней и положение нижнечелюстного канала",
			indication: "подготовка к хирургическому этапу",
			pregnancyStatus: "denied",
			safetyNotes:
				"беременность со слов пациента отрицается, стандартная защита",
			priority: "routine",
			includeDicomExport: true,
			includeRadiologistReport: true,
			requestedBy: "Route Lifecycle Doctor",
			recipientClinic: "DENTE Route Lifecycle Clinic",
			dueDate: "до 25.05.2026",
		},
		fragments: [
			"Направление на рентген/КЛКТ",
			"КЛКТ",
			"Беременность/ограничения",
		],
	},
	{
		kind: "visit_attendance_certificate",
		payloadKey: "visitAttendanceCertificate",
		payload: {
			attendedAtStart: "24.05.2026 10:00",
			attendedAtEnd: "24.05.2026 11:20",
			purpose: "для предъявления по месту требования",
			recipientOrganization: "работодатель пациента",
			issuedAt: "24.05.2026 11:30",
			signedByFullName: "Route Lifecycle Admin",
			signedByRole: "администратор клиники",
			diagnosisDisclosureExcluded: true,
			notSickLeaveAcknowledged: true,
		},
		fragments: [
			"Справка о посещении",
			"не раскрывает диагноз",
			"Route Lifecycle Admin",
		],
	},
	{
		kind: "warranty_service_memo",
		payloadKey: "warrantyServiceMemo",
		payload: {
			serviceOrWorkName: "Route lifecycle composite restoration",
			completedAt: "24.05.2026 11:20",
			teethOrArea: "36 tooth",
			materialsOrSystems: "rubber dam, adhesive system, composite",
			warrantyPeriod: "12 months under local warranty policy",
			controlVisitSchedule:
				"control in 14 days and hygiene by individual schedule",
			patientObligations: [
				"follow recommendations",
				"attend control visits",
				"avoid overload",
			],
			excludedRiskFactors: ["trauma", "bruxism", "missed controls"],
			urgentContactReasons: ["acute pain", "swelling", "restoration fracture"],
			linkedActOrContract: "ACT-ROUTE-LIFECYCLE-001",
			doctorFullName: "Route Lifecycle Doctor",
			issuedAt: "24.05.2026 11:35",
			localWarrantyPolicyApplied: true,
			patientReceivedAftercare: true,
			patientUnderstandsControlVisits: true,
		},
		fragments: [
			"Гарантийная памятка",
			"Route lifecycle composite restoration",
			"Контрольные визиты",
		],
	},
	{
		kind: "medical_intervention_refusal",
		payloadKey: "medicalInterventionRefusal",
		payload: {
			refusedIntervention: "Удаление зуба 36 по острому воспалению",
			clinicalIndication:
				"острая боль, подвижность, риск распространения инфекции",
			patientReason: "пациент хочет получить второе мнение",
			explainedRisks: [
				"усиление боли",
				"распространение инфекции",
				"потеря возможности сохранить соседние ткани",
			],
			alternativesOffered: [
				"повторная консультация хирурга",
				"обезболивание и срочный контроль",
			],
			urgentWarningSigns: [
				"отек лица",
				"температура",
				"затруднение глотания или дыхания",
			],
			doctorFullName: "Route Lifecycle Surgeon",
			refusalConfirmedAt: "24.05.2026 11:40",
			patientUnderstandsConsequences: true,
			secondOpinionOffered: true,
			emergencyCareExplained: true,
		},
		fragments: [
			"Отказ от медицинского вмешательства",
			"Удаление зуба 36",
			"Предложенные альтернативы",
		],
	},
	{
		kind: "payment_refund_correction_request",
		payloadKey: "paymentRefundCorrection",
		payload: {
			action: "partial_refund",
			selectedPaymentIds: [paidPayment.id],
			amountRub: Math.min(1200, paidPayment.amountRub),
			reason: "коррекция плана лечения",
			refundMethod: "card",
			recipientFullName: paidPayment.payerFullName ?? patient.fullName,
			recipientIdentityDocument:
				paidPayment.payerIdentityDocument ?? "паспорт проверен администратором",
			bankDetails: null,
			originalFiscalReceiptNumber: paidPayment.fiscalReceiptNumber,
			correctionFiscalReceiptNumber: null,
			accountantDecision: "согласовано ответственным сотрудником",
		},
		fragments: [
			"Заявление на возврат или коррекцию оплаты",
			"коррекция плана лечения",
			"фискальный чек",
		],
	},
];

const app = Fastify({ logger: false });
app.addHook("onRequest", (request, _reply, done) => {
	request.headers["x-dente-clinic-token"] = smokeClinicToken;
	done();
});
await registerDocumentRoutes(app);

/*
 * ПРОВЕРЯЕТСЯ КОД ОТВЕТА И ПРИЧИНА, А НЕ ОДИН КОД. Кодом 409 маршрут документов
 * отвечает на несколько РАЗНЫХ сторожей, поэтому проверка только по
 * `statusCode === 409` считалась бы пройденной, ни разу не сработав по существу.
 * Заодно сверяется читаемость: латинского слова из шести и более букв в тексте
 * для сотрудника клиники быть не должно.
 */
function assertVisitRequirementRefusal(response, kind) {
	assert(
		response.statusCode === 409,
		`${kind}: visit-required form without visit must be blocked with 409, got ${response.statusCode}: ${response.body}`,
	);
	const payload = response.json();
	assert(
		payload.error === "DocumentOperationRejected",
		`${kind}: machine error mismatch: ${response.body}`,
	);
	assert(
		payload.message === "Документ должен быть связан с конкретным визитом.",
		`${kind}: refusal must name the visit requirement: ${response.body}`,
	);
	assert(
		!/[A-Za-z]{6,}/.test(payload.message),
		`${kind}: refusal must stay readable for clinic staff: ${payload.message}`,
	);
}

/*
 * ВСЕ ДЕСЯТЬ ВИДОВ ТРЕБУЮТ ПРИЁМА — ЗАМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО (2026-08-09,
 * `POST /api/documents` без `visitId` по каждому виду из списка ниже: десять
 * ответов 409 с одним и тем же текстом). Поэтому запрет проверяется по всему
 * списку, а не по двум видам с прежним флагом `requiresVisitProof`: флаг стоял
 * у `informed_consent` и `procedure_specific_consent_packet`, а требование
 * держат все десять.
 */
for (const formCase of visitWorkflowCases) {
	const withoutVisitResponse = await app.inject({
		method: "POST",
		url: "/api/documents",
		payload: {
			patientId: patient.id,
			kind: formCase.kind,
			totalAmountRub: null,
			payload: { [formCase.payloadKey]: formCase.payload },
		},
	});
	assertVisitRequirementRefusal(withoutVisitResponse, formCase.kind);
}

/*
 * ЖИЗНЕННЫЙ ЦИКЛ ДОКУМЕНТА ОТСЮДА УБРАН, И ЭТО НЕ СОКРАЩЕНИЕ ЖИВОГО ПОКРЫТИЯ.
 *
 * Дальше стояли запрет без структурных данных, создание, выпуск, заверение
 * подписью, снимок печатной формы, скачивание и сверка журнала — около двухсот
 * строк, которые НЕ ВЫПОЛНЯЛИСЬ НИ РАЗУ ни здесь, ни в CI:
 *
 *   1. До правки с токеном выше каждый запрос получал 401 — сценарий не доходил
 *      даже до первой проверки.
 *   2. Замерено 2026-08-09 на живом PostgreSQL: приёма `sampleData.activeVisit.id`
 *      в базе НЕТ (`select ... where id = ...` вернул 0 строк), а маршрут
 *      документов целиком переведён на базу (`getPatientByIdFromDb`,
 *      `getVisitByIdInDb`, `getDocumentsByPatientId`). С этим `visitId` ответ —
 *      `404 Визит не найден`, то есть до сторожа структурных данных дело не
 *      доходит вовсе. Флаг `DENTAL_STATE_PERSISTENCE=off` на маршрут не влияет:
 *      его читают только `persistentState.ts` и `sampleData.ts`.
 *   3. В CI это недостижимо ПО ЗАМЫСЛУ: задание `smoke` гоняет `db:migrate`, но
 *      НЕ гоняет `db:reset-seed` — .github/workflows/ci.yml прямо пишет
 *      «Разрушительный сид в CI не выполняется». База там мигрирована и пуста.
 *
 * Оставлен запрет, который срабатывает в `documents/guards.ts` ДО обращения к
 * базе и потому не зависит ни от сида, ни от поднятой PostgreSQL. Вернуть
 * остальное можно только вместе с посевом организации, пациента и приёма — это
 * отдельная работа, и назвать отсутствующее покрытие отсутствующим честнее, чем
 * оставить двести строк, которые не выполняются.
 */

await app.close();

console.log(
	JSON.stringify({
		ok: true,
		checkedDocumentKinds: visitWorkflowCases.map((entry) => entry.kind),
		visitRequirementBlocked: true,
		lifecycleCoverage: "требует посева базы, здесь не проверяется",
	}),
);
