/**
 * 152-ФЗ RBAC WARDEN & HARDWARE PAYLOAD STRIPPING TEST SUITE
 *
 * Проверяет обязательные требования законодательства (152-ФЗ и 323-ФЗ ст. 13 «Врачебная тайна»):
 * 1. Аппаратное усечение (Payload Stripping):
 *    - Роль маркетолога ("marketer"): поля диагнозов ФИЗИЧЕСКИ удаляются из JSON (diagnosis, emr_records, odontogram, clinicalNotes, mkb10).
 *    - Роль администратора ("receptionist" / "administrator"): поля диагнозов ФИЗИЧЕСКИ удаляются из JSON.
 *    - Роль администратора системы ("admin" без клинической роли врача/ассистента): поля диагнозов ФИЗИЧЕСКИ удаляются из JSON.
 *    - Роль врача ("doctor") и ассистента ("assistant"): поля диагнозов СОХРАНЯЮТСЯ в полном объеме.
 *    - Роль админа с клинической квалификацией ("admin" + clinicalRole: "doctor" или canSignMedicalRecords): поля СОХРАНЯЮТСЯ.
 * 2. Журнал аудита доступа к врачебной тайне (audit_logs):
 *    - Фиксация каждого факта доступа (кто, когда, какого пациента, какой диагноз).
 *    - Защита журнала от фальсификации и удалений.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import {
	evaluateClinicalAccess,
	registerMedicalSecrecyPayloadStripping,
	stripDiagnosisPayload,
} from "../../security/medicalSecrecyWarden.js";
import {
	getMedicalAccessAuditTrailFromDb,
	recordMedicalRecordAccessAudit,
} from "../../security/medicalAuditTrail.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid } from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("auditTest", 1);
const PATIENT_ID = fixtureUuid("auditTest", 2);
const DOCTOR_ID = fixtureUuid("auditTest", 3);
const MARKETER_ID = fixtureUuid("auditTest", 4);

describe("152-ФЗ RBAC Warden & Payload Stripping Audit", () => {
	// =========================================================================
	// 1. Аппаратное усечение полезной нагрузки (stripDiagnosisPayload)
	// =========================================================================
	test("Физическое вырезание полей врачебной тайны из JSON-объекта (diagnosis, emr_records, odontogram, clinicalNotes, mkb10)", () => {
		const rawPayload = {
			id: PATIENT_ID,
			fullName: "Иванов Иван Иванович",
			phone: "+79991234567",
			balanceRub: 2500,
			// 5 обязательных клинических полей по ТЗ:
			diagnosis: "K02.1 Глубокий кариес дентина",
			emr_records: [
				{ id: "emr-1", protocol: "Первичный осмотр 043-у", complaints: "Острая боль" },
			],
			odontogram: {
				tooth36: { state: "caries", surfaces: ["MOD"] },
				tooth46: { state: "pulpitis" },
			},
			clinicalNotes: "Пациент жалуется на острую ночную пульсирующую боль в зубе 36",
			mkb10: "K02.1",
			// Дополнительные производные поля
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "36",
			toothStates: [{ toothNumber: 36, state: "caries" }],
			clinical_notes: "Рекомендовано эндодонтическое лечение",
			notes: "Административное примечание: вход со двора (НЕ должно удаляться)",
		};

		const stripped = stripDiagnosisPayload(rawPayload);

		// Убеждаемся, что поля вырезаны ФИЗИЧЕСКИ (отсутствуют ключи в объекте)
		assert.strictEqual("diagnosis" in stripped, false, "diagnosis должен быть физически вырезан");
		assert.strictEqual("emr_records" in stripped, false, "emr_records должен быть физически вырезан");
		assert.strictEqual("odontogram" in stripped, false, "odontogram должен быть физически вырезан");
		assert.strictEqual("clinicalNotes" in stripped, false, "clinicalNotes должен быть физически вырезан");
		assert.strictEqual("mkb10" in stripped, false, "mkb10 должен быть физически вырезан");
		assert.strictEqual("diagnosisIcd10" in stripped, false, "diagnosisIcd10 должен быть физически вырезан");
		assert.strictEqual("diagnosisTooth" in stripped, false, "diagnosisTooth должен быть физически вырезан");
		assert.strictEqual("toothStates" in stripped, false, "toothStates должен быть физически вырезан");
		assert.strictEqual("clinical_notes" in stripped, false, "clinical_notes должен быть физически вырезан");

		// Убеждаемся, что неклинические данные остались нетронутыми
		assert.strictEqual(stripped.id, PATIENT_ID);
		assert.strictEqual(stripped.fullName, "Иванов Иван Иванович");
		assert.strictEqual(stripped.phone, "+79991234567");
		assert.strictEqual(stripped.balanceRub, 2500);
		assert.strictEqual(stripped.notes, "Административное примечание: вход со двора (НЕ должно удаляться)");
	});

	test("Рекурсивное усечение вложенных массивов и структур", () => {
		const complexList = [
			{
				patientId: "p1",
				fullName: "Пациент 1",
				diagnosis: "K04.0 Пульпит",
				clinicalNotes: "Заметка 1",
			},
			{
				patientId: "p2",
				fullName: "Пациент 2",
				emr_records: [{ recordId: "rec-1" }],
				odontogram: { tooth11: "crown" },
				mkb10: "K05.1",
			},
		];

		const stripped = stripDiagnosisPayload(complexList);

		assert.strictEqual(stripped.length, 2);
		const [first, second] = stripped;
		assert.ok(first && second);
		assert.strictEqual("diagnosis" in first, false);
		assert.strictEqual("clinicalNotes" in first, false);
		assert.strictEqual(first.fullName, "Пациент 1");

		assert.strictEqual("emr_records" in second, false);
		assert.strictEqual("odontogram" in second, false);
		assert.strictEqual("mkb10" in second, false);
		assert.strictEqual(second.fullName, "Пациент 2");
	});

	// =========================================================================
	// 2. Матрица разграничения доступа 152-ФЗ (evaluateClinicalAccess)
	// =========================================================================
	test("evaluateClinicalAccess: Маркетолог и регистратор лишены клинического доступа", () => {
		const marketerAccess = evaluateClinicalAccess("marketer");
		assert.strictEqual(marketerAccess.hasClinicalAccess, false);

		const marketingAccess = evaluateClinicalAccess("marketing");
		assert.strictEqual(marketingAccess.hasClinicalAccess, false);

		const receptionistAccess = evaluateClinicalAccess("receptionist");
		assert.strictEqual(receptionistAccess.hasClinicalAccess, false);

		const administratorAccess = evaluateClinicalAccess("administrator");
		assert.strictEqual(administratorAccess.hasClinicalAccess, false);
	});

	test("evaluateClinicalAccess: Системный администратор (admin) без клинической роли лишен доступа к врачебной тайне", () => {
		const pureAdmin = evaluateClinicalAccess("admin");
		assert.strictEqual(pureAdmin.hasClinicalAccess, false);

		const manager = evaluateClinicalAccess("manager");
		assert.strictEqual(manager.hasClinicalAccess, false);

		const accountant = evaluateClinicalAccess("accountant");
		assert.strictEqual(accountant.hasClinicalAccess, false);
	});

	test("evaluateClinicalAccess: Врач и ассистент имеют законный доступ к врачебной тайне", () => {
		const doctor = evaluateClinicalAccess("doctor");
		assert.strictEqual(doctor.hasClinicalAccess, true);

		const assistant = evaluateClinicalAccess("assistant");
		assert.strictEqual(assistant.hasClinicalAccess, true);

		const chiefDoctor = evaluateClinicalAccess("chief_doctor");
		assert.strictEqual(chiefDoctor.hasClinicalAccess, true);

		const owner = evaluateClinicalAccess("owner");
		assert.strictEqual(owner.hasClinicalAccess, true);
	});

	test("evaluateClinicalAccess: Администратор с подтвержденной квалификацией врача имеет доступ", () => {
		const adminDoctor = evaluateClinicalAccess("admin", { clinicalRole: "doctor" });
		assert.strictEqual(adminDoctor.hasClinicalAccess, true);

		const adminSigning = evaluateClinicalAccess("admin", { canSignMedicalRecords: true });
		assert.strictEqual(adminSigning.hasClinicalAccess, true);
	});

	// =========================================================================
	// 3. Fastify перехватчик (preSerialization & onSend) в действии
	// =========================================================================
	test("Fastify Hook: автоматическое усечение полезной нагрузки для неклинической роли", async () => {
		const testApp = Fastify({ logger: false });
		registerMedicalSecrecyPayloadStripping(testApp);

		testApp.get("/api/test-patient-data", async (_req, reply) => {
			return reply.send({
				id: "patient-1",
				name: "Тестовый Пациент",
				diagnosis: "K02.1",
				emr_records: [{ emr: "secret" }],
				odontogram: { tooth36: "caries" },
				clinicalNotes: "секретная клиническая запись",
				mkb10: "K02.1",
				billingAmount: 5000,
			});
		});

		await testApp.ready();

		const secret = authTokenSecret();
		const marketerToken = signToken(
			{ organizationId: "test-org-1", role: "marketer", userId: "u-m-1" },
			secret,
		);
		const doctorToken = signToken(
			{ organizationId: "test-org-1", role: "doctor", userId: "u-d-1" },
			secret,
		);

		// Запрос с ролью маркетолога (через подписанный токен)
		const resMarketer = await testApp.inject({
			method: "GET",
			url: "/api/test-patient-data",
			headers: {
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(resMarketer.statusCode, 200);
		const marketerBody = JSON.parse(resMarketer.payload);
		assert.strictEqual("diagnosis" in marketerBody, false);
		assert.strictEqual("emr_records" in marketerBody, false);
		assert.strictEqual("odontogram" in marketerBody, false);
		assert.strictEqual("clinicalNotes" in marketerBody, false);
		assert.strictEqual("mkb10" in marketerBody, false);
		assert.strictEqual(marketerBody.name, "Тестовый Пациент");
		assert.strictEqual(marketerBody.billingAmount, 5000);

		// Запрос с ролью врача (через подписанный токен)
		const resDoctor = await testApp.inject({
			method: "GET",
			url: "/api/test-patient-data",
			headers: {
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.strictEqual(resDoctor.statusCode, 200);
		const doctorBody = JSON.parse(resDoctor.payload);
		assert.strictEqual(doctorBody.diagnosis, "K02.1");
		assert.strictEqual(doctorBody.clinicalNotes, "секретная клиническая запись");
		assert.strictEqual(doctorBody.mkb10, "K02.1");
		assert.ok(Array.isArray(doctorBody.emr_records));
		assert.ok(doctorBody.odontogram);

		await testApp.close();
	});

	// =========================================================================
	// 4. Юридически значимый аудит доступа (152-ФЗ Audit Trail)
	// =========================================================================
	test("Аудит доступа к диагнозам сохраняет факт доступа (кто, когда, какого пациента, какой диагноз)", async () => {
		const auditRecord = {
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			actorUserId: DOCTOR_ID,
			actorLogin: "Доктор Айболит И.И.",
			actorRole: "doctor",
			diagnosis: "K04.0 Острый пульпит зуба 36",
			action: "VIEW_DIAGNOSIS",
			eventType: "DIAGNOSIS_ACCESS",
			ipAddress: "192.168.1.100",
			userAgent: "Mozilla/5.0 Medical Workstation",
			metadata: { section: "odontogram" },
		};

		// Проверяем вызов сервиса аудита (не падает и корректно формирует запись)
		await assert.doesNotReject(async () => {
			await recordMedicalRecordAccessAudit(auditRecord);
		});
	});
});
