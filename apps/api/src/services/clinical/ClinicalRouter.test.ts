import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { db, pool } from "../../db/client.js";
import { ClinicalTaskOwnershipError } from "../../db/clinicalTasksQuery.js";
import { ClinicalRouter } from "./ClinicalRouter.js";

/**
 * Тест бьёт по настоящей базе, а не по моку.
 *
 * БЫЛО: прошлая версия этого файла проверяла, что функция вернула объект с
 * нужными полями. Она проходила ровно потому, что объект собирался в памяти и
 * никуда не сохранялся, — зелёный тест подтверждал сам дефект. Проверять здесь
 * нужно единственное: строка появилась в таблице и читается обратно.
 *
 * Организация и пациент НЕ захардкожены: они ищутся в базе на старте. Ровно
 * такой захардкоженный UUID арендатора — то, из-за чего в проекте появились
 * четыре мёртвые копии getDefaultOrganizationId().
 */

interface TestFixture {
	organizationId: string;
	patientId: string;
	foreignPatientId: string | null;
}

let fixture: TestFixture | null = null;
const createdTaskIds: string[] = [];
/** Метка прогона: защита от дублей внутри сервиса не должна склеивать разные запуски теста. */
const runTag = `autotest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function findFixture(): Promise<TestFixture | null> {
	const own = await db.execute(
		sql`SELECT id, organization_id FROM patients ORDER BY created_at ASC NULLS LAST LIMIT 1`,
	);
	const ownRow = (own.rows ?? [])[0] as
		| { id: string; organization_id: string }
		| undefined;
	if (!ownRow) return null;

	const foreign = await db.execute(
		sql`SELECT id FROM patients WHERE organization_id <> ${ownRow.organization_id}::uuid LIMIT 1`,
	);
	const foreignRow = (foreign.rows ?? [])[0] as { id: string } | undefined;

	return {
		organizationId: String(ownRow.organization_id),
		patientId: String(ownRow.id),
		foreignPatientId: foreignRow ? String(foreignRow.id) : null,
	};
}

before(async () => {
	fixture = await findFixture();
});

after(async () => {
	// Массив в шаблон sql не подставляем: drizzle развернёт его в ($1, $2), и приведение
	// к uuid[] упадёт с 42846. Собираем параметры поштучно.
	if (createdTaskIds.length > 0) {
		const idList = sql.join(
			createdTaskIds.map((id) => sql`${id}::uuid`),
			sql`, `,
		);
		await db.execute(sql`DELETE FROM clinical_tasks WHERE id IN (${idList})`);
	}
	await pool.end();
});

describe("ClinicalRouter — передача между клиническими этапами", () => {
	test("задача передачи записывается в clinical_tasks и читается обратно", async (t) => {
		if (!fixture) {
			t.skip(
				"В базе нет ни одного пациента — фикстуру для записи задачи взять неоткуда.",
			);
			return;
		}
		const router = new ClinicalRouter();
		const notes = `${runTag} терапия закончена`;

		const task = await router.handlePhaseCompletion(fixture.organizationId, {
			patientId: fixture.patientId,
			completedPhaseCode: "PHASE_1_THERAPY",
			notes,
			toothCodes: ["11", "12"],
		});

		assert.ok(task, "handlePhaseCompletion обязан вернуть сохранённую задачу");
		createdTaskIds.push(task.id);

		assert.match(
			task.id,
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		assert.strictEqual(task.organizationId, fixture.organizationId);
		assert.strictEqual(task.patientId, fixture.patientId);
		assert.strictEqual(task.taskType, "prosthetics_handoff");
		assert.strictEqual(task.title, "Этап II: передача в ортопедию");
		assert.strictEqual(task.status, "pending");
		assert.strictEqual(task.treatmentPlanId, null);
		assert.strictEqual(task.assignedDoctorId, null);
		assert.ok(task.createdAt !== "", "created_at должен прийти из базы");
		assert.strictEqual(
			task.description,
			`Терапевтический этап завершён по зубам: 11, 12. Комментарий: ${notes}. Требуется осмотр ортопедом перед протезированием.`,
		);

		// Главная проверка пакета: строка физически лежит в таблице.
		const raw = await db.execute(
			sql`SELECT * FROM clinical_tasks WHERE id = ${task.id}::uuid`,
		);
		const rawRow = (raw.rows ?? [])[0] as Record<string, unknown> | undefined;
		assert.ok(
			rawRow,
			"строка обязана существовать в clinical_tasks после вызова",
		);
		assert.strictEqual(String(rawRow.title), "Этап II: передача в ортопедию");
		assert.strictEqual(String(rawRow.status), "pending");
		assert.strictEqual(String(rawRow.organization_id), fixture.organizationId);

		// И читается обратно сервисом — это то, что увидит следующий врач.
		const seenByNextDoctor = await new ClinicalRouter().listTasks(
			fixture.organizationId,
			fixture.patientId,
		);
		const found = seenByNextDoctor.find((row) => row.id === task.id);
		assert.ok(found, "listTasks обязан вернуть только что сохранённую задачу");
		assert.deepStrictEqual(found, task);
	});

	test("повторная отправка того же завершения не плодит вторую открытую задачу", async (t) => {
		if (!fixture) {
			t.skip("В базе нет ни одного пациента.");
			return;
		}
		const router = new ClinicalRouter();
		const input = {
			patientId: fixture.patientId,
			completedPhaseCode: "PHASE_2_SURGERY",
			notes: `${runTag} двойное нажатие`,
			toothCodes: ["36"],
		};

		const first = await router.handlePhaseCompletion(
			fixture.organizationId,
			input,
		);
		assert.ok(first);
		createdTaskIds.push(first.id);

		const second = await router.handlePhaseCompletion(
			fixture.organizationId,
			input,
		);
		assert.ok(second);
		assert.strictEqual(
			second.id,
			first.id,
			"второе нажатие обязано вернуть ту же задачу, а не создать новую",
		);

		const count = await db.execute(
			sql`SELECT count(*)::int AS n FROM clinical_tasks
          WHERE organization_id = ${fixture.organizationId}::uuid
            AND patient_id = ${fixture.patientId}::uuid
            AND description = ${first.description}::text`,
		);
		assert.strictEqual(Number((count.rows ?? [])[0]?.n), 1);
	});

	test("описание не содержит пустых разделов, когда зубы и комментарий не указаны", async (t) => {
		if (!fixture) {
			t.skip("В базе нет ни одного пациента.");
			return;
		}
		// Пробелы в комментарии и в кодах зубов — это «ничего не указано», а не данные.
		const task = await new ClinicalRouter().handlePhaseCompletion(
			fixture.organizationId,
			{
				patientId: fixture.patientId,
				completedPhaseCode: "PHASE_1_THERAPY",
				notes: "   ",
				toothCodes: [" ", ""],
			},
		);
		assert.ok(task);
		createdTaskIds.push(task.id);
		assert.strictEqual(
			task.description,
			"Терапевтический этап завершён. Требуется осмотр ортопедом перед протезированием.",
		);
	});

	test("неизвестный код этапа возвращает null и ничего не пишет", async (t) => {
		if (!fixture) {
			t.skip("В базе нет ни одного пациента.");
			return;
		}
		const countBefore = await db.execute(
			sql`SELECT count(*)::int AS n FROM clinical_tasks`,
		);
		const result = await new ClinicalRouter().handlePhaseCompletion(
			fixture.organizationId,
			{
				patientId: fixture.patientId,
				completedPhaseCode: "UNKNOWN_PHASE",
				notes: `${runTag} неизвестный этап`,
				toothCodes: ["21"],
			},
		);
		assert.strictEqual(result, null);
		const countAfter = await db.execute(
			sql`SELECT count(*)::int AS n FROM clinical_tasks`,
		);
		assert.strictEqual(
			Number((countAfter.rows ?? [])[0]?.n),
			Number((countBefore.rows ?? [])[0]?.n),
		);
	});

	test("пациент чужой клиники отклоняется, а не записывается под своей организацией", async (t) => {
		if (!fixture) {
			t.skip("В базе нет ни одного пациента.");
			return;
		}
		if (!fixture.foreignPatientId) {
			t.skip(
				"В базе одна организация — межарендную проверку подтвердить нечем.",
			);
			return;
		}
		const orgId = fixture.organizationId;
		const foreignPatientId = fixture.foreignPatientId;
		await assert.rejects(
			() =>
				new ClinicalRouter().handlePhaseCompletion(orgId, {
					patientId: foreignPatientId,
					completedPhaseCode: "PHASE_1_THERAPY",
					notes: `${runTag} чужой пациент`,
					toothCodes: ["11"],
				}),
			(error: unknown) =>
				error instanceof ClinicalTaskOwnershipError &&
				error.field === "patientId",
		);

		const leaked = await db.execute(
			sql`SELECT count(*)::int AS n FROM clinical_tasks WHERE patient_id = ${fixture.foreignPatientId}::uuid`,
		);
		assert.strictEqual(Number((leaked.rows ?? [])[0]?.n), 0);
	});
});
