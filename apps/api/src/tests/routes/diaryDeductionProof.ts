/**
 * V2 — измеримое доказательство поведения списания склада при подписании дневника.
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает): он пишет
 * в живую базу и служит воспроизводимым замером для отчёта и для сравнения с
 * историческими версиями маршрута. Утверждения-гейты живут в
 * diarySigningCeremony.test.ts.
 *
 * ЗАЧЕМ. Коммит 1f65d674b назвал дефектом «подписание приёма с пустой полки
 * увеличивало остаток материала». Ревью это опровергло: пустая полка отвергалась
 * и до коммита. Настоящий дефект был другим — ОТРИЦАТЕЛЬНОЕ quantity_to_deduct
 * поднимало остаток и писало положительную строку расхода. Скрипт измеряет каждый
 * случай на живой PostgreSQL, а не рассуждает о нём.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/diaryDeductionProof.ts
 *
 * Против исторической версии маршрута (проверка, что новые тесты действительно
 * краснеют на старом коде):
 *   git show 1f65d674b^:apps/api/src/routes/diary.ts > apps/api/src/_v2tmp/hist_diary.ts
 *   V2_DIARY_ROUTER=../../_v2tmp/hist_diary.js node --import tsx src/tests/routes/diaryDeductionProof.ts
 * Спецификатор разрешается относительно ЭТОГО файла. Каталог _v2tmp лежит прямо
 * под apps/api/src, поэтому импорты `../db/client.js` внутри извлечённого файла
 * разрешаются без единой правки — переписывать историю файла не требуется.
 *
 * V2_SIGN_VIA=lock переключает подписание на POST /api/diaries/:id/lock — нужно
 * для версий ДО 87e367c40, где церемонию проводил только этот маршрут.
 *
 * V2_API_BASE=http://127.0.0.1:4100 гонит те же случаи по СЕТИ против уже
 * запущенного сервера, а не через app.inject: тогда в дело вступают глобальные
 * хуки и обработчик ошибок server.ts. Сервер под tsx watch подхватывает правки
 * маршрута сам; перезапускать его не нужно и нельзя — он общий.
 *
 * Скрипт создаёт собственную организацию и удаляет её целиком в finally.
 * Секрет подписи токена берётся штатным authTokenSecret() и в вывод не попадает.
 */
import { and, eq, sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
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
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ROUTER_MODULE = process.env.V2_DIARY_ROUTER ?? "../../routes/diary.js";
const SIGN_VIA = process.env.V2_SIGN_VIA === "lock" ? "lock" : "post";
/** Пустая строка означает «в процессе, через app.inject». */
const API_BASE = process.env.V2_API_BASE?.trim() ?? "";

const START_STOCK = "10";
const TREATMENT_QUANTITY = "2";
const PKCS7 = "MIIB-v2-deduction-proof";

interface Fixture {
	label: string;
	visitId: string;
	inventoryItemId: string;
	treatmentItemId: string;
}

interface Observation {
	label: string;
	httpStatus: number;
	httpBody: string;
	stockRaw: string | null;
	movements: { quantity: string; type: string }[];
	diaryLocked: boolean | null;
	treatmentStatus: string | null;
	auditRows: number;
}

/** Реальные типы колонок склада в живой базе против того, что объявляет schema.ts. */
async function reportSchemaDrift(): Promise<void> {
	const columns = await db.execute(sql`
		select table_name, column_name, data_type, numeric_precision, numeric_scale,
		       is_nullable, column_default
		  from information_schema.columns
		 where (table_name, column_name) in (
		         ('inventory_items', 'stock_quantity'),
		         ('inventory_items', 'current_qty'),
		         ('inventory_transactions', 'quantity_changed'),
		         ('procedure_material_rules', 'organization_id'),
		         ('procedure_material_rules', 'quantity_to_deduct'),
		         ('treatment_items', 'quantity')
		       )
		 order by table_name, column_name
	`);
	console.log("=== information_schema.columns (живая база) ===");
	for (const row of columns.rows as Record<string, unknown>[]) {
		console.log(
			`${row.table_name}.${row.column_name}: ${row.data_type}` +
				`(${row.numeric_precision ?? "-"},${row.numeric_scale ?? "-"})` +
				` nullable=${row.is_nullable} default=${String(row.column_default)}`,
		);
	}

	const checks = await db.execute(sql`
		select conname, pg_get_constraintdef(oid) as def
		  from pg_constraint
		 where conrelid in (
		         'inventory_items'::regclass,
		         'procedure_material_rules'::regclass,
		         'treatment_items'::regclass
		       )
		   and contype = 'c'
		 order by conname
	`);
	const checkRows = checks.rows as Record<string, unknown>[];
	console.log("=== CHECK-ограничения на этих таблицах ===");
	console.log(
		checkRows.length === 0
			? "(ни одного: отрицательное количество база принимает)"
			: checkRows.map((r) => `${r.conname}: ${r.def}`).join("\n"),
	);

	const driver = await db.execute(
		sql`select 0::numeric(10,3) as numeric_zero, 0::int as integer_zero`,
	);
	const raw = driver.rows[0] as Record<string, unknown>;
	console.log("=== что отдаёт драйвер после registerMoneyTypeParsers ===");
	for (const key of Object.keys(raw)) {
		console.log(`${key}: ${JSON.stringify(raw[key])} typeof=${typeof raw[key]}`);
	}
}

async function main(): Promise<void> {
	await reportSchemaDrift();

	const [organization] = await db
		.insert(organizations)
		.values({ name: "V2 deduction proof clinic" })
		.returning({ id: organizations.id });
	if (!organization) {
		throw new Error("организация замера не создана");
	}
	const organizationId = organization.id;

	let app: FastifyInstance | null = null;
	try {
		const [doctor] = await db
			.insert(users)
			.values({ organizationId, fullName: "Врач V2", role: "doctor" })
			.returning({ id: users.id });
		if (!doctor) {
			throw new Error("врач замера не создан");
		}
		const [patient] = await db
			.insert(patients)
			.values({ organizationId, fullName: "Пациент V2" })
			.returning({ id: patients.id });
		if (!patient) {
			throw new Error("пациент замера не создан");
		}
		// Отдельный id: сужение `patient` не проходит внутрь вложенных функций
		// seed/sign, а нужен он именно там.
		const patientId = patient.id;
		const staffToken = signToken(
			{ organizationId, userId: doctor.id, role: "doctor" },
			authTokenSecret(),
		);

		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		if (!API_BASE) {
			const routerModule = (await import(ROUTER_MODULE)) as {
				default: (instance: FastifyInstance) => Promise<void>;
			};
			app = Fastify();
			// Тот же хук, что в apps/api/src/server.ts — он наполняет request.user.
			app.addHook("onRequest", async (request) => {
				getRequestIdentity(request);
			});
			await routerModule.default(app);
			await app.ready();
		}

		/** Один POST: либо в процессе, либо по сети против запущенного сервера. */
		async function post(
			url: string,
			payload: Record<string, unknown>,
		): Promise<{ statusCode: number; body: string }> {
			if (API_BASE) {
				const response = await fetch(`${API_BASE}${url}`, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-dente-staff-token": staffToken,
					},
					body: JSON.stringify(payload),
				});
				return { statusCode: response.status, body: await response.text() };
			}
			const injected = await (app as FastifyInstance).inject({
				method: "POST",
				url,
				headers: { "x-dente-staff-token": staffToken },
				payload,
			});
			return { statusCode: injected.statusCode, body: injected.body };
		}

		/** Услуга, полка, правило материалов, визит и позиция плана под один случай. */
		async function seed(
			label: string,
			quantityToDeduct: string,
			options: {
				ruleOrganizationId?: string | null;
				treatmentQuantity?: string;
			} = {},
		): Promise<Fixture> {
			const ruleOrganizationId =
				options.ruleOrganizationId === undefined
					? organizationId
					: options.ruleOrganizationId;
			const treatmentQuantity = options.treatmentQuantity ?? TREATMENT_QUANTITY;
			const [service] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId,
					code: `V2-${label}`,
					title: `Лечение (${label})`,
					basePriceRub: 4500,
					priceRub: 4500,
				})
				.returning({ id: serviceCatalogItems.id });
			if (!service) {
				throw new Error(`услуга не создана: ${label}`);
			}
			const [item] = await db
				.insert(inventoryItems)
				.values({
					organizationId,
					name: `Композит V2-${label}`,
					stockQuantity: START_STOCK,
					currentQty: START_STOCK,
					unitCostRub: "123.45",
				})
				.returning({ id: inventoryItems.id });
			if (!item) {
				throw new Error(`позиция склада не создана: ${label}`);
			}
			await db.insert(procedureMaterialRules).values({
				// Пропуск organizationId воспроизводит routes/inventory.ts:410-417:
				// правило создаётся продуктом БЕЗ organization_id.
				...(ruleOrganizationId ? { organizationId: ruleOrganizationId } : {}),
				serviceId: service.id,
				inventoryItemId: item.id,
				materialName: `Композит V2-${label}`,
				quantityToDeduct,
			});
			const [visit] = await db
				.insert(visits)
				.values({ organizationId, patientId, status: "draft" })
				.returning({ id: visits.id });
			if (!visit) {
				throw new Error(`визит не создан: ${label}`);
			}
			const [treatmentItem] = await db
				.insert(treatmentItems)
				.values({
					organizationId,
					patientId,
					visitId: visit.id,
					serviceId: service.id,
					title: `Лечение (${label})`,
					quantity: treatmentQuantity,
					priceRub: 4500,
					unitPriceRub: 4500,
					status: "approved",
				})
				.returning({ id: treatmentItems.id });
			if (!treatmentItem) {
				throw new Error(`позиция плана лечения не создана: ${label}`);
			}
			return {
				label,
				visitId: visit.id,
				inventoryItemId: item.id,
				treatmentItemId: treatmentItem.id,
			};
		}

		/** Подписывает приём и читает результат СЫРЫМ SQL, а не через ORM. */
		async function sign(fixture: Fixture): Promise<Observation> {
			const draft = await post("/api/diaries", {
				visitId: fixture.visitId,
				patientId,
				anamnesis: "Жалобы на боль при накусывании.",
				statusLocalis: "Зуб 36: глубокая кариозная полость.",
				treatmentDescription: "Обработка, пломба.",
			});
			if (draft.statusCode !== 200) {
				throw new Error(`черновик не создан: ${draft.statusCode} ${draft.body}`);
			}
			const [diaryRow] = await db
				.select({ id: visitDiaries.id })
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, fixture.visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				);

			const response =
				SIGN_VIA === "lock"
					? await post(`/api/diaries/${diaryRow?.id}/lock`, {
							pkcs7Signature: PKCS7,
						})
					: await post("/api/diaries", {
							visitId: fixture.visitId,
							patientId,
							status: "signed",
							pkcs7Signature: PKCS7,
						});

			const stock = await db.execute(
				sql`select stock_quantity::text as stock from inventory_items where id = ${fixture.inventoryItemId}`,
			);
			const movements = await db.execute(
				sql`select quantity_changed::text as quantity, transaction_type as type
				      from inventory_transactions
				     where visit_id = ${fixture.visitId}
				     order by created_at`,
			);
			const diary = await db.execute(
				sql`select is_locked from visit_diaries where visit_id = ${fixture.visitId}`,
			);
			const treatment = await db.execute(
				sql`select status from treatment_items where id = ${fixture.treatmentItemId}`,
			);
			const audits = await db.execute(
				sql`select count(*)::int as n from clinical_audit_logs
				     where organization_id = ${organizationId}
				       and action = 'VISIT_SIGNED_AND_LOCKED'
				       and entity_id = ${diaryRow?.id ?? null}`,
			);

			return {
				label: fixture.label,
				httpStatus: response.statusCode,
				httpBody: response.body.slice(0, 160),
				stockRaw:
					(stock.rows[0] as { stock: string | null } | undefined)?.stock ?? null,
				movements: movements.rows as { quantity: string; type: string }[],
				diaryLocked:
					(diary.rows[0] as { is_locked: boolean } | undefined)?.is_locked ?? null,
				treatmentStatus:
					(treatment.rows[0] as { status: string } | undefined)?.status ?? null,
				auditRows: (audits.rows[0] as { n: number }).n,
			};
		}

		console.log(
			`\nTRANSPORT = ${API_BASE ? `сеть, ${API_BASE}` : "app.inject в процессе"}`,
		);
		console.log(`ROUTER = ${API_BASE ? "запущенный сервер" : ROUTER_MODULE}`);
		console.log(`SIGN VIA = ${SIGN_VIA}`);
		console.log(
			`START STOCK = ${START_STOCK}, treatment_items.quantity = ${TREATMENT_QUANTITY}`,
		);

		const cases: Observation[] = [];
		cases.push(await sign(await seed("normal +2", "2")));
		cases.push(await sign(await seed("negative -3", "-3")));
		cases.push(await sign(await seed("zero 0", "0")));
		cases.push(
			await sign(await seed("orgless rule +2", "2", { ruleOrganizationId: null })),
		);
		// Дробный расход: правило 1 при количестве услуги 1.5 требует записать 8.5 в
		// integer-колонку stock_quantity. Проверяем, что именно отвечает маршрут.
		cases.push(
			await sign(await seed("fractional 1.5", "1", { treatmentQuantity: "1.5" })),
		);

		for (const observed of cases) {
			console.log(
				`\n[${observed.label}] HTTP ${observed.httpStatus} ${observed.httpBody}` +
					`\n  stock_quantity = ${observed.stockRaw}` +
					`\n  inventory_transactions = ${JSON.stringify(observed.movements)}` +
					`\n  diary is_locked = ${observed.diaryLocked}` +
					`  treatment status = ${observed.treatmentStatus}` +
					`  audit rows = ${observed.auditRows}`,
			);
		}
	} finally {
		await app?.close();
		await db
			.delete(inventoryTransactions)
			.where(eq(inventoryTransactions.organizationId, organizationId));
		await db
			.delete(clinicalAuditLogs)
			.where(eq(clinicalAuditLogs.organizationId, organizationId));
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
			.delete(treatmentItems)
			.where(eq(treatmentItems.organizationId, organizationId));
		// Правила без organization_id удаляются по позиции склада этой организации.
		await db.execute(
			sql`delete from procedure_material_rules
			     where inventory_item_id in (
			       select id from inventory_items where organization_id = ${organizationId}
			     )`,
		);
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

		const leftovers = await db.execute(
			sql`select
			      (select count(*)::int from organizations where id = ${organizationId}) as own_org,
			      (select count(*)::int from organizations) as organizations,
			      (select count(*)::int from inventory_items) as inventory_items,
			      (select count(*)::int from procedure_material_rules) as rules,
			      (select count(*)::int from visit_diaries) as visit_diaries,
			      (select count(*)::int from inventory_transactions) as movements`,
		);
		console.log(`\nCLEANUP ${JSON.stringify(leftovers.rows[0])}`);
		await pool.end();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
