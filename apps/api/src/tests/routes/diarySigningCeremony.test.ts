/**
 * Церемония подписания дневника: оба маршрута обязаны давать один результат.
 *
 * ЧТО БЫЛО СЛОМАНО
 * Подписать приём можно двумя маршрутами. `POST /api/diaries` со `status: "signed"`
 * ставил только is_locked, время и хеш; `POST /api/diaries/:id/lock` дополнительно
 * закрывал услуги визита, списывал расходники, писал inventory_transactions и
 * оставлял запись в clinical_audit_logs. От того, какой маршрут вызвал экран,
 * зависело, спишется ли материал и останется ли юридический след.
 *
 * ЧТО ПРОВЕРЯЕТ ЭТОТ ТЕСТ
 * Тест не сравнивает пути между собой «на равенство и всё»: два одинаково ничего
 * не сделавших маршрута такую проверку прошли бы. Поэтому проверяется и равенство
 * результатов, и абсолютные величины — остаток склада, число строк расхода, число
 * записей журнала, статус услуг.
 *
 * Тест работает с НАСТОЯЩЕЙ базой (DATABASE_URL) в собственной организации,
 * которая создаётся и удаляется целиком. Чужие строки не читаются и не меняются.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	procedureMaterialRules,
	serviceCatalogItems,
	treatmentItems,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import registerDiaryRoutes from "../../routes/diary.js";

/**
 * Склад: 10 на старте, правило списывает 2 на единицу услуги, услуг 2 -> остаток 6.
 *
 * Величины целые не для красоты: в ЖИВОЙ базе inventory_items.stock_quantity,
 * inventory_transactions.quantity_changed и procedure_material_rules.quantity_to_deduct
 * имеют тип integer, хотя schema.ts объявляет их numeric (проверено чтением
 * information_schema на 127.0.0.1:5432). Дробный расход эти колонки не принимают
 * вовсе — расхождение описано в handoff пакета U5 как отдельный долг.
 */
const START_STOCK = "10";
const QUANTITY_TO_DEDUCT = "2";
const TREATMENT_QUANTITY = 2;
const EXPECTED_STOCK_AFTER = 6;
const EXPECTED_DEDUCTION = -4;

const ANAMNESIS = "Жалобы на боль при накусывании, вторые сутки.";
const STATUS_LOCALIS = "Зуб 36: глубокая кариозная полость, перкуссия болезненна.";
const TREATMENT = "Механическая и медикаментозная обработка, пломба.";
const PKCS7 = "MIIB-test-signature-blob";

function diaryHashOf(row: {
	visitId: string;
	patientId: string | null;
	anamnesis: string | null;
	statusLocalis: string | null;
	treatmentDescription: string | null;
}): string {
	const raw = `${row.visitId}|${row.patientId ?? ""}|${row.anamnesis ?? ""}|${row.statusLocalis ?? ""}|${row.treatmentDescription ?? ""}`;
	return crypto.createHash("sha256").update(raw).digest("hex");
}

interface Scenario {
	visitId: string;
	serviceId: string;
	inventoryItemId: string;
	treatmentItemId: string;
}

/** Наблюдаемый итог подписания — то, что должно совпасть у обоих маршрутов. */
interface CeremonyOutcome {
	diaryLocked: boolean;
	diaryHashPresent: boolean;
	diaryHashMatchesStoredRow: boolean;
	lockedByDoctor: boolean;
	coSignedByDoctor: boolean;
	signatureStored: boolean;
	stockAfter: number;
	stockDelta: number;
	deductionRows: number;
	deductionQuantity: number;
	deductionType: string | null;
	deductionUserIsDoctor: boolean;
	deductionVisitMatches: boolean;
	auditRows: number;
	auditAction: string | null;
	auditEntityType: string | null;
	auditUserIsDoctor: boolean;
	auditPatientMatches: boolean;
	auditEntityIsDiary: boolean;
	treatmentItemStatus: string | null;
	commissionRows: number;
}

describe("церемония подписания дневника одинакова у POST и /lock", () => {
	let app: FastifyInstance;
	/*
	 * Идентификатор клиники известен ДО вставки, а не берётся из `returning`.
	 * Под принудительным RLS вставка идёт внутри `withFixtureTenant`, а политика
	 * `organizations` сверяет `id = current_tenant`: под таким контекстом создаётся
	 * ровно названная строка, любая другая отвергается кодом 42501.
	 */
	const organizationId = crypto.randomUUID();
	let doctorId: string;
	let patientId: string;
	let staffToken: string;
	const originalEnv = { ...process.env };

	async function seedScenario(
		label: string,
		stock: string = START_STOCK,
		options: {
			/** Сколько списывает правило за единицу услуги. По умолчанию 2. */
			quantityToDeduct?: string;
			/**
			 * `null` воспроизводит то, что делает продукт: routes/inventory.ts:410-417
			 * создаёт правило БЕЗ organization_id (колонка nullable).
			 */
			ruleOrganizationId?: string | null;
			/** Количество услуги в плане. По умолчанию 2. */
			treatmentQuantity?: string;
		} = {},
	): Promise<Scenario> {
		const quantityToDeduct = options.quantityToDeduct ?? QUANTITY_TO_DEDUCT;
		const ruleOrganizationId =
			options.ruleOrganizationId === undefined
				? organizationId
				: options.ruleOrganizationId;
		const treatmentQuantity =
			options.treatmentQuantity ?? String(TREATMENT_QUANTITY);
		/*
		 * Сценарий сеется под тенант-контекстом клиники: у прейскуранта, склада,
		 * правил, визитов и позиций плана в WITH CHECK стоит только
		 * `organization_id = current_tenant`, без дизъюнкта обхода, поэтому вставка
		 * без контекста отвергается кодом 42501.
		 */
		return withFixtureTenant(organizationId, async () => {
			const [service] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId,
					code: `U5-${label}`,
					title: `Лечение кариеса (${label})`,
					basePriceRub: 4500,
					priceRub: 4500,
				})
				.returning({ id: serviceCatalogItems.id });
			assert.ok(service);

			const [item] = await db
				.insert(inventoryItems)
				.values({
					organizationId,
					name: `Композит U5-${label}`,
					stockQuantity: stock,
					currentQty: START_STOCK,
					unitCostRub: "123.45",
				})
				.returning({ id: inventoryItems.id });
			assert.ok(item);

			await db.insert(procedureMaterialRules).values({
				...(ruleOrganizationId ? { organizationId: ruleOrganizationId } : {}),
				serviceId: service.id,
				inventoryItemId: item.id,
				materialName: `Композит U5-${label}`,
				quantityToDeduct,
			});

			const [visit] = await db
				.insert(visits)
				.values({ organizationId, patientId, status: "draft" })
				.returning({ id: visits.id });
			assert.ok(visit);

			const [treatmentItem] = await db
				.insert(treatmentItems)
				.values({
					organizationId,
					patientId,
					visitId: visit.id,
					serviceId: service.id,
					title: `Лечение кариеса (${label})`,
					quantity: treatmentQuantity,
					priceRub: 4500,
					unitPriceRub: 4500,
					status: "approved",
				})
				.returning({ id: treatmentItems.id });
			assert.ok(treatmentItem);

			return {
				visitId: visit.id,
				serviceId: service.id,
				inventoryItemId: item.id,
				treatmentItemId: treatmentItem.id,
			};
		});
	}

	async function observe(scenario: Scenario): Promise<CeremonyOutcome> {
		/*
		 * Наблюдение идёт под тенант-контекстом. SELECT без него не ошибается, а
		 * молча отдаёт ноль строк, и «списания не было», «журнал пуст» подтверждались
		 * бы скрытием строк политикой, а не их отсутствием.
		 */
		return withFixtureTenant(organizationId, async () => {
			const [diary] = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, scenario.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				);
			assert.ok(diary);
			const [item] = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, scenario.inventoryItemId));
			assert.ok(item);
			const movements = await db
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.visitId, scenario.visitId),
						eq(inventoryTransactions.organizationId, organizationId),
					),
				);
			const audits = await db
				.select()
				.from(clinicalAuditLogs)
				.where(
					and(
						eq(clinicalAuditLogs.entityId, diary.id),
						eq(clinicalAuditLogs.organizationId, organizationId),
					),
				);
			const [treatment] = await db
				.select()
				.from(treatmentItems)
				.where(eq(treatmentItems.id, scenario.treatmentItemId));
			assert.ok(treatment);
			const commissions = await db
				.select()
				.from(doctorCommissions)
				.where(
					and(
						eq(doctorCommissions.userId, doctorId),
						eq(doctorCommissions.organizationId, organizationId),
					),
				);

			const stockAfter = Number(item.stockQuantity);
			return {
				diaryLocked: diary.isLocked,
				diaryHashPresent: typeof diary.diaryHash === "string" && diary.diaryHash.length === 64,
				diaryHashMatchesStoredRow: diary.diaryHash === diaryHashOf(diary),
				lockedByDoctor: diary.lockedByUserId === doctorId,
				coSignedByDoctor: diary.coSignedByUserId === doctorId,
				signatureStored: diary.cryptoSignaturePkcs7 === PKCS7,
				stockAfter,
				stockDelta: stockAfter - Number(START_STOCK),
				deductionRows: movements.length,
				deductionQuantity: movements.reduce((sum, row) => sum + Number(row.quantityChanged), 0),
				deductionType: movements[0]?.transactionType ?? null,
				deductionUserIsDoctor: movements.every((row) => row.userId === doctorId),
				deductionVisitMatches: movements.every((row) => row.visitId === scenario.visitId),
				auditRows: audits.length,
				auditAction: audits[0]?.action ?? null,
				auditEntityType: audits[0]?.entityType ?? null,
				auditUserIsDoctor: audits.every((row) => row.userId === doctorId),
				auditPatientMatches: audits.every((row) => row.patientId === patientId),
				auditEntityIsDiary: audits.every((row) => row.entityId === diary.id),
				treatmentItemStatus: treatment.status,
				commissionRows: commissions.length,
			};
		});
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		/*
		 * Клиника, врач и пациент сеются под тенант-контекстом: WITH CHECK у `users`
		 * и `patients` знает только `organization_id = current_tenant`, без дизъюнкта
		 * обхода, поэтому вставка без контекста отвергается кодом 42501.
		 */
		await withFixtureTenant(organizationId, async () => {
			const [organization] = await db
				.insert(organizations)
				.values({ id: organizationId, name: "U5 ceremony probe clinic" })
				.returning({ id: organizations.id });
			assert.ok(organization);

			const [doctor] = await db
				.insert(users)
				.values({ organizationId, fullName: "Врач U5", role: "doctor" })
				.returning({ id: users.id });
			assert.ok(doctor);
			doctorId = doctor.id;

			const [patient] = await db
				.insert(patients)
				.values({ organizationId, fullName: "Пациент U5" })
				.returning({ id: patients.id });
			assert.ok(patient);
			patientId = patient.id;
		});

		staffToken = signToken(
			{ organizationId, userId: doctorId, role: "doctor" },
			authTokenSecret(),
		);

		// Оба хука изоляции боевого server.ts: первый наполняет request.user, из
		// которого diary.ts берёт роль и идентификатор врача, второй оборачивает
		// обработчик в `withTenantCtx` — без него церемония не видит ни визита, ни
		// склада своей же клиники и читает ноль строк без единой ошибки.
		app = createTenantTestApp();
		await registerDiaryRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (organizationId) {
			/*
			 * ПРАВО НА УДАЛЕНИЕ ЖУРНАЛА СПРАШИВАЕТСЯ У КАТАЛОГА ЗАРАНЕЕ.
			 *
			 * С миграции 0161_audit_append_only.sql у роли приложения отозвано право
			 * DELETE на `clinical_audit_logs`, а проверка прав срабатывает ДО того, как
			 * база посмотрит на условие: отказ 42501 приходит даже когда под условие не
			 * подпадает ни одной строки. Прежний безусловный `db.delete` обрывал этим
			 * исключением весь `after`, и все следующие удаления не выполнялись — вся
			 * клиника целиком оставалась в общей базе. Признак берётся из каталога, а
			 * не из списка имён в коде: перечень устареет при первой же миграции,
			 * закрывающей ещё одну таблицу, а `has_table_privilege` отстать не может.
			 */
			const auditPrivilege = await db.execute<{ deletable: boolean }>(
				sql`SELECT has_table_privilege(current_user, 'public.clinical_audit_logs', 'DELETE') AS deletable`,
			);
			const clinicalAuditLogsDeletable = auditPrivilege.rows[0]?.deletable === true;

			/*
			 * Уборка идёт под тенант-контекстом. DELETE без него не ошибается: политика
			 * просто не показывает ни одной строки, снимается ноль, и хук отчитывается
			 * об успехе, оставив клинику в живой базе.
			 */
			await withFixtureTenant(organizationId, async () => {
				await db
					.delete(inventoryTransactions)
					.where(eq(inventoryTransactions.organizationId, organizationId));
				if (clinicalAuditLogsDeletable) {
					await db
						.delete(clinicalAuditLogs)
						.where(eq(clinicalAuditLogs.organizationId, organizationId));
				}
				await db
					.delete(doctorCommissions)
					.where(eq(doctorCommissions.organizationId, organizationId));
				await db
					.delete(visitDiaryRevisions)
					.where(eq(visitDiaryRevisions.organizationId, organizationId));
				await db
					.delete(visitDiaries)
					.where(eq(visitDiaries.organizationId, organizationId));
				await db
					.delete(procedureMaterialRules)
					.where(eq(procedureMaterialRules.organizationId, organizationId));
				// Правила без organization_id по организации не удаляются — их надо
				// снимать по позиции склада, иначе фикстура остаётся в живой базе.
				await db.execute(
					sql`delete from procedure_material_rules
					     where inventory_item_id in (
					       select id from inventory_items where organization_id = ${organizationId}
					     )`,
				);
				await db
					.delete(treatmentItems)
					.where(eq(treatmentItems.organizationId, organizationId));
				await db.delete(visits).where(eq(visits.organizationId, organizationId));
				await db
					.delete(serviceCatalogItems)
					.where(eq(serviceCatalogItems.organizationId, organizationId));
				await db
					.delete(inventoryItems)
					.where(eq(inventoryItems.organizationId, organizationId));
				await db.delete(patients).where(eq(patients.organizationId, organizationId));
				await db.delete(users).where(eq(users.organizationId, organizationId));
				await db.delete(organizations).where(eq(organizations.id, organizationId));
			});
		}
		process.env = originalEnv;
	});

	test("подпись через POST и через /lock дают одинаковое списание склада и одинаковый журнал", async () => {
		const viaPost = await seedScenario("post");
		const viaLock = await seedScenario("lock");

		// Оба сценария сперва получают черновик тем же маршрутом — расходятся только
		// способом подписания.
		for (const scenario of [viaPost, viaLock]) {
			const draft = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: { "x-dente-staff-token": staffToken },
				payload: {
					visitId: scenario.visitId,
					patientId,
					anamnesis: ANAMNESIS,
					statusLocalis: STATUS_LOCALIS,
					treatmentDescription: TREATMENT,
				},
			});
			assert.equal(draft.statusCode, 200, draft.body);
			assert.equal(JSON.parse(draft.body).hash, null, "черновик не должен быть запечатан");
		}

		// Путь A: подпись через POST со status "signed".
		const postSign = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: viaPost.visitId,
				patientId,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(postSign.statusCode, 200, postSign.body);

		// Путь B: подпись через /lock.
		// Чтение — под тенант-контекстом: без него политика отдаёт ноль строк, и
		// дневник выглядел бы несуществующим сразу после успешного создания.
		const [lockDiary] = await withFixtureTenant(organizationId, async () =>
			db
				.select({ id: visitDiaries.id })
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, viaLock.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);
		assert.ok(lockDiary);
		const lockSign = await app.inject({
			method: "POST",
			url: `/api/diaries/${lockDiary.id}/lock`,
			headers: { "x-dente-staff-token": staffToken },
			payload: { pkcs7Signature: PKCS7 },
		});
		assert.equal(lockSign.statusCode, 200, lockSign.body);

		const postOutcome = await observe(viaPost);
		const lockOutcome = await observe(viaLock);

		// 1. Равенство: одно действие врача — один результат, независимо от маршрута.
		assert.deepEqual(
			postOutcome,
			lockOutcome,
			"POST и /lock оставили разный след в базе",
		);

		// 2. Абсолютные величины: равенство само по себе прошло бы и для двух
		// маршрутов, не сделавших ничего.
		const expected: CeremonyOutcome = {
			diaryLocked: true,
			diaryHashPresent: true,
			diaryHashMatchesStoredRow: true,
			lockedByDoctor: true,
			coSignedByDoctor: true,
			signatureStored: true,
			stockAfter: EXPECTED_STOCK_AFTER,
			stockDelta: EXPECTED_DEDUCTION,
			deductionRows: 1,
			deductionQuantity: EXPECTED_DEDUCTION,
			deductionType: "auto_deduct",
			deductionUserIsDoctor: true,
			deductionVisitMatches: true,
			auditRows: 1,
			auditAction: "VISIT_SIGNED_AND_LOCKED",
			auditEntityType: "visit_diary",
			auditUserIsDoctor: true,
			auditPatientMatches: true,
			auditEntityIsDiary: true,
			treatmentItemStatus: "completed",
			commissionRows: 1,
		};
		assert.deepEqual(postOutcome, expected, "POST провёл церемонию не полностью");
		assert.deepEqual(lockOutcome, expected, "/lock провёл церемонию не полностью");
	});

	test("подпись через POST для визита без дневника тоже проводит церемонию", async () => {
		// Ветка вставки раньше создавала дневник сразу заблокированным, минуя
		// списание и журнал целиком.
		const scenario = await seedScenario("insert");

		const response = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				statusLocalis: STATUS_LOCALIS,
				treatmentDescription: TREATMENT,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(response.statusCode, 200, response.body);

		const outcome = await observe(scenario);
		assert.equal(outcome.diaryLocked, true);
		assert.equal(outcome.stockAfter, EXPECTED_STOCK_AFTER);
		assert.equal(outcome.deductionRows, 1);
		assert.equal(outcome.deductionQuantity, EXPECTED_DEDUCTION);
		assert.equal(outcome.auditRows, 1);
		assert.equal(outcome.auditAction, "VISIT_SIGNED_AND_LOCKED");
		assert.equal(outcome.treatmentItemStatus, "completed");
		assert.equal(outcome.diaryHashMatchesStoredRow, true);
	});

	test("печать считается по сохранённой строке, а не по телу запроса", async () => {
		// Фронтенд сохраняет черновик отдельным маршрутом и при подписании
		// клинические поля не присылает. Раньше POST хешировал присланное, то есть
		// пустые строки, тогда как в карте оставался прежний текст: печать заверяла
		// не то содержимое, которое хранится.
		const scenario = await seedScenario("hash");

		const draft = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				statusLocalis: STATUS_LOCALIS,
				treatmentDescription: TREATMENT,
			},
		});
		assert.equal(draft.statusCode, 200, draft.body);

		const sign = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: { visitId: scenario.visitId, patientId, status: "signed" },
		});
		assert.equal(sign.statusCode, 200, sign.body);
		const signedHash = JSON.parse(sign.body).hash;

		const [stored] = await withFixtureTenant(organizationId, async () =>
			db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, scenario.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);
		assert.ok(stored);
		assert.equal(stored.anamnesis, ANAMNESIS, "текст карты должен сохраниться");
		assert.equal(stored.diaryHash, signedHash);
		assert.equal(stored.diaryHash, diaryHashOf(stored));
		assert.notEqual(
			stored.diaryHash,
			diaryHashOf({
				visitId: scenario.visitId,
				patientId,
				anamnesis: null,
				statusLocalis: null,
				treatmentDescription: null,
			}),
			"печать не должна совпадать с хешем пустого дневника",
		);
	});

	test("пустая полка не даёт подписать приём и не восстанавливает остаток", async () => {
		// stock_quantity = 0 при непустой устаревшей current_qty.
		//
		// ПОПРАВКА К ЗАПИСИ: первоначальный комментарий здесь утверждал, что
		// `inv.stockQuantity || inv.currentQty` принимал настоящий ноль за
		// отсутствующее значение и подписание УВЕЛИЧИВАЛО остаток пустой полки.
		// Это не воспроизводится ни на одной версии маршрута: на 1f65d674b^ пустая
		// полка отвечала 400 TransactionFailed при остатке 0, ровно как и сейчас.
		// Причина — drizzle отдаёт numeric строкой, а "0" истинна (см. отдельный
		// тест ниже). Этот тест не про исправленный дефект, он про инвариант:
		// подписание приёма не должно ни проходить, ни поднимать остаток, если
		// материала нет.
		const scenario = await seedScenario("empty", "0");

		const response = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(response.statusCode, 400, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "TransactionFailed");
		assert.match(body.message, /Недостаточно материалов/);

		/*
		 * Все четыре сверки — под тенант-контекстом. Без него SELECT отдаёт ноль
		 * строк, и «дневника нет», «движений нет» подтверждались бы тем, что политика
		 * скрыла строки, а не тем, что церемония откатилась.
		 */
		const [item] = await withFixtureTenant(organizationId, async () =>
			db.select().from(inventoryItems).where(eq(inventoryItems.id, scenario.inventoryItemId)),
		);
		assert.ok(item);
		assert.equal(Number(item.stockQuantity), 0, "остаток пустой полки не должен вырасти");

		// Транзакция откатилась целиком: дневник не подписан, журнал пуст, услуга не закрыта.
		const [diary] = await withFixtureTenant(organizationId, async () =>
			db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, scenario.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);
		assert.equal(diary, undefined, "дневник не должен появиться при отказе церемонии");
		const movements = await withFixtureTenant(organizationId, async () =>
			db
				.select()
				.from(inventoryTransactions)
				.where(eq(inventoryTransactions.visitId, scenario.visitId)),
		);
		assert.equal(movements.length, 0);
		const [treatment] = await withFixtureTenant(organizationId, async () =>
			db.select().from(treatmentItems).where(eq(treatmentItems.id, scenario.treatmentItemId)),
		);
		assert.ok(treatment);
		assert.equal(treatment.status, "approved", "услуга не должна закрыться");
	});

	test("повторная подпись подписанного дневника отклоняется на обоих маршрутах", async () => {
		const scenario = await seedScenario("twice");
		const first = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(first.statusCode, 200, first.body);
		const stockAfterFirst = await observe(scenario);

		const again = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: { visitId: scenario.visitId, patientId, status: "signed" },
		});
		assert.equal(again.statusCode, 403, again.body);
		assert.equal(JSON.parse(again.body).error, "DiaryLocked");

		const [diary] = await withFixtureTenant(organizationId, async () =>
			db
				.select({ id: visitDiaries.id })
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, scenario.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				),
		);
		assert.ok(diary);
		const lockAgain = await app.inject({
			method: "POST",
			url: `/api/diaries/${diary.id}/lock`,
			headers: { "x-dente-staff-token": staffToken },
			payload: { pkcs7Signature: PKCS7 },
		});
		assert.equal(lockAgain.statusCode, 409, lockAgain.body);
		assert.equal(JSON.parse(lockAgain.body).error, "AlreadyLocked");

		// Материал списан один раз, а не по разу на каждую попытку подписи.
		const stockAfterRetries = await observe(scenario);
		assert.deepEqual(stockAfterRetries, stockAfterFirst);
		assert.equal(stockAfterRetries.deductionRows, 1);
	});

	test("правило с отрицательным списанием не увеличивает остаток и не пишет расход", async () => {
		// НАСТОЯЩИЙ дефект, который закрыл 1f65d674b (заголовок коммита назвал
		// другой, несуществующий). Измерено на 1f65d674b^ той же фикстурой:
		// остаток 10 -> 16 и строка inventory_transactions на "+6" с типом
		// auto_deduct. Подписание приёма создавало материал из ничего, а склад
		// получал документ о расходе, которого не было.
		const scenario = await seedScenario("negative", START_STOCK, {
			quantityToDeduct: "-3",
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(response.statusCode, 200, response.body);

		const outcome = await observe(scenario);
		assert.equal(
			outcome.stockAfter,
			Number(START_STOCK),
			"подписание приёма не может увеличить остаток материала",
		);
		assert.equal(outcome.stockDelta, 0);
		assert.equal(
			outcome.deductionRows,
			0,
			"отрицательное правило не должно оставлять строку расхода",
		);
		// Церемония при этом обязана пройти целиком: пропускается только списание
		// по неверному правилу, а не подпись, журнал и закрытие услуги.
		assert.equal(outcome.diaryLocked, true);
		assert.equal(outcome.auditRows, 1);
		assert.equal(outcome.auditAction, "VISIT_SIGNED_AND_LOCKED");
		assert.equal(outcome.treatmentItemStatus, "completed");
	});

	test("правило со списанием 0 не пишет мусорную строку движения склада", async () => {
		// Измерено на 1f65d674b^: остаток оставался 10 (то есть списывалось 0, а не
		// 1, как утверждал коммит), но в inventory_transactions уходила строка на
		// "0" — документ о расходе, которого не было.
		const scenario = await seedScenario("zerorule", START_STOCK, {
			quantityToDeduct: "0",
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(response.statusCode, 200, response.body);

		const outcome = await observe(scenario);
		assert.equal(outcome.stockAfter, Number(START_STOCK));
		assert.equal(
			outcome.deductionRows,
			0,
			"списание 0 — это не списание, строки движения быть не должно",
		);
		assert.equal(outcome.diaryLocked, true);
		assert.equal(outcome.auditRows, 1);
	});

	test("ничьё правило материалов (organization_id NULL) всё равно списывает материал", async () => {
		// Единственный маршрут, создающий правила материалов
		// (routes/inventory.ts:410-417), не заполняет organization_id. Когда
		// церемония требовала точного совпадения организации, подписание приёма по
		// такому правилу НЕ СПИСЫВАЛО НИЧЕГО: измерено — остаток 10 -> 10, ноль
		// строк расхода, ответ 200, дневник подписан. До 87e367c40 то же правило
		// списывало (10 -> 6).
		const scenario = await seedScenario("orgless", START_STOCK, {
			ruleOrganizationId: null,
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/diaries",
			headers: { "x-dente-staff-token": staffToken },
			payload: {
				visitId: scenario.visitId,
				patientId,
				anamnesis: ANAMNESIS,
				status: "signed",
				pkcs7Signature: PKCS7,
			},
		});
		assert.equal(response.statusCode, 200, response.body);

		const outcome = await observe(scenario);
		assert.equal(
			outcome.stockAfter,
			EXPECTED_STOCK_AFTER,
			"правило без организации обязано списывать материал так же, как своё",
		);
		assert.equal(outcome.deductionRows, 1);
		assert.equal(outcome.deductionQuantity, EXPECTED_DEDUCTION);
		assert.equal(outcome.deductionType, "auto_deduct");
	});

	test("numeric-ноль приходит из drizzle строкой, поэтому || и ?? здесь неразличимы", async () => {
		// Гейт под поправку к записи. Коммит 1f65d674b объяснял замену `||` на `??`
		// тем, что драйвер отдаёт для нуля настоящее число 0 (ложное значение) и
		// ветка фолбэка срабатывала. Драйвер действительно отдаёт число, НО
		// schema.ts объявляет все три колонки numeric, а drizzle для numeric зовёт
		// String(value) (PgNumeric.mapFromDriverValue), поэтому в маршрут приходит
		// строка "0" — истинная. Значит `||` провалиться не мог, и та замена была
		// защитной гигиеной, а не исправлением склада. Если модель когда-нибудь
		// перейдёт на numeric-режим с числами, этот тест покраснеет — и вывод про
		// неразличимость операторов придётся пересматривать.
		const scenario = await seedScenario("noopzero", "0", {
			quantityToDeduct: "0",
			treatmentQuantity: "0",
		});

		// Три чтения — под тенант-контекстом: без него ни одна из трёх строк не
		// видна, и проверка типа numeric-нуля не нашла бы, что проверять.
		const [item] = await withFixtureTenant(organizationId, async () =>
			db.select().from(inventoryItems).where(eq(inventoryItems.id, scenario.inventoryItemId)),
		);
		assert.ok(item);
		const [rule] = await withFixtureTenant(organizationId, async () =>
			db
				.select()
				.from(procedureMaterialRules)
				.where(eq(procedureMaterialRules.serviceId, scenario.serviceId)),
		);
		assert.ok(rule);
		const [treatment] = await withFixtureTenant(organizationId, async () =>
			db.select().from(treatmentItems).where(eq(treatmentItems.id, scenario.treatmentItemId)),
		);
		assert.ok(treatment);

		for (const [name, value] of [
			["inventory_items.stock_quantity", item.stockQuantity],
			["procedure_material_rules.quantity_to_deduct", rule.quantityToDeduct],
			["treatment_items.quantity", treatment.quantity],
		] as const) {
			assert.equal(typeof value, "string", `${name}: drizzle должен отдать строку`);
			assert.equal(Number(value), 0, `${name}: в базе лежит настоящий ноль`);
			assert.ok(value, `${name}: строка нуля истинна, поэтому || не проваливается`);
		}
	});
});
