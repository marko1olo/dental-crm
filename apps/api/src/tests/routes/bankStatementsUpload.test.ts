import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { bankStatements, bankStatementTransactions, organizations, users } from "../../db/schema.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { registerBankStatementsRoutes } from "../../routes/bankStatements.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "bankStatementsUpload";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 2);

describe("DEF-FIN-04 / DEF-EXP-01: Bank Statement Upload, PG18 Persistence & Dedup API", () => {
	let adminToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "ООО «ДЕНТЕ»",
				loginId: `bank_org_${Date.now()}`,
				inn: "7707083893",
				kpp: "770701001",
			});
			await db.insert(users).values({
				id: ADMIN_USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный бухгалтер ДЕНТЕ",
				role: "admin",
			});
		});

		adminToken = signToken(
			{ organizationId: ORG_ID, userId: ADMIN_USER_ID, role: "admin" },
			authTokenSecret(),
		);
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	const buildServer = async () => {
		const app = createTenantTestApp();
		await app.register(idempotencyPlugin);
		await app.register(registerBankStatementsRoutes);
		await app.ready();
		return app;
	};

	const validStatementText = `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows
Отправитель=ООО "ДЕНТЕ"
Получатель=Банк
ДатаСоздания=16.11.2026
ВремяСоздания=12:00:00
ДатаНачала=01.11.2026
ДатаКонца=16.11.2026
РасчСчет=40702810938000012345
СекцияРасчСчет
ДатаНачала=01.11.2026
ДатаКонца=16.11.2026
РасчСчет=40702810938000012345
НачальныйОстаток=100000.00
ВсегоПоступило=50000.00
ВсегоСписано=20000.00
КонечныйОстаток=130000.00
КонецРасчСчет
СекцияДокумент=Платежное поручение
Номер=101
Дата=05.11.2026
Сумма=50000.00
ПлательщикРасчСчет=40702810111111111111
Плательщик=ООО "Пациент Плюс"
ПлательщикИНН=7701234567
ПлательщикКПП=770101001
ПлательщикБанк1=ПАО СБЕРБАНК
ПлательщикБИК=044525225
ПлательщикКорсчет=30101810400000000225
ПолучательРасчСчет=40702810938000012345
Получатель=ООО "ДЕНТЕ"
ПолучательИНН=7707083893
ПолучательКПП=770701001
ПолучательБанк1=ПАО СБЕРБАНК
ПолучательБИК=044525225
ПолучательКорсчет=30101810400000000225
ВидПлатежа=Электронно
ВидОплаты=01
НазначениеПлатежа=Оплата за стоматологические услуги без НДС
Очередность=5
КонецДокумента
КонецФайла`;

	it("persists parsed 1CClientBankExchange statement into PG18, deduplicates retries, and lists statements", async () => {
		const app = await buildServer();
		const headers = {
			"Content-Type": "application/json",
			"x-dente-staff-token": adminToken,
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/finance/bank-statements/upload",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: { content: validStatementText, filename: "extract_nov_2026.txt" },
		});

		assert.equal(response.statusCode, 200, `Expected 200, got ${response.statusCode}: ${response.body}`);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.deduplicated, false);
		assert.ok(body.statementId);
		assert.equal(body.count, 1);
		assert.equal(body.openingBalanceKopecks, 10000000);
		assert.equal(body.totalReceivedKopecks, 5000000);
		assert.equal(body.closingBalanceKopecks, 13000000);
		assert.equal(body.openingBalanceRub, 100000);
		assert.equal(body.totalReceivedRub, 50000);
		assert.equal(body.closingBalanceRub, 130000);
		assert.equal(body.registry.orders[0].number, "101");

		// Verify DB persistence under RLS
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [dbHeader] = await tx
				.select()
				.from(bankStatements)
				.where(eq(bankStatements.id, body.statementId));
			assert.ok(dbHeader);
			assert.equal(dbHeader.openingBalanceKopecks, 10000000n);
			const dbTxs = await tx
				.select()
				.from(bankStatementTransactions)
				.where(eq(bankStatementTransactions.statementId, body.statementId));
			assert.equal(dbTxs.length, 1);
			assert.equal(dbTxs[0]?.amountKopecks, 5000000n);
		});

		// Retry with fresh Idempotency-Key -> PG18 source_hash dedup triggers!
		const dupRes = await app.inject({
			method: "POST",
			url: "/api/finance/bank-statements/upload",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: { content: validStatementText, filename: "extract_nov_2026_dup.txt" },
		});
		assert.equal(dupRes.statusCode, 200);
		assert.equal(dupRes.json().deduplicated, true);
		assert.equal(dupRes.json().statementId, body.statementId);

		// List & detail endpoints
		const listRes = await app.inject({
			method: "GET",
			url: "/api/finance/bank-statements",
			headers,
		});
		assert.equal(listRes.statusCode, 200);
		assert.equal(listRes.json().statements.length, 1);

		const detailRes = await app.inject({
			method: "GET",
			url: `/api/finance/bank-statements/${body.statementId}`,
			headers,
		});
		assert.equal(detailRes.statusCode, 200);
		assert.equal(detailRes.json().transactions.length, 1);

		await app.close();
	});

	it("returns 400 when file content is not a 1CClientBankExchange format", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "POST",
			url: "/api/finance/bank-statements/upload",
			headers: {
				"Content-Type": "application/json",
				"x-dente-staff-token": adminToken,
				"idempotency-key": randomUUID(),
			},
			payload: { content: "INVALID_HEADER_DATA" },
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "InvalidBankStatement");
		assert.ok(body.message.includes("1CClientBankExchange"));
		await app.close();
	});

	it("blocks non-financial staff roles (152-FZ) with 403 Forbidden", async () => {
		const app = await buildServer();
		const marketerToken = signToken(
			{ organizationId: ORG_ID, userId: fixtureUuid(NAMESPACE, 9), role: "marketer" },
			authTokenSecret(),
		);
		const res = await app.inject({
			method: "GET",
			url: "/api/finance/bank-statements",
			headers: { "x-dente-staff-token": marketerToken },
		});
		assert.equal(res.statusCode, 403);
		assert.equal(res.json().error, "PermissionDenied");
		await app.close();
	});
});
