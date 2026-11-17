import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerBankStatementsRoutes } from "../../routes/bankStatements.js";

describe("DEF-FIN-04: Bank Statement Upload API", () => {
	const buildServer = async () => {
		const app = Fastify();
		app.decorateRequest("__denteIdentity", null);
		app.addHook("preHandler", async (request) => {
			(request as any).__denteIdentity = {
				userId: "00000000-0000-0000-0000-000000000001",
				organizationId: "11111111-1111-1111-1111-111111111111",
				role: "admin",
				verified: true,
				isDemo: false,
				clinicToken: null,
				staffToken: null,
			};
		});
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

	it("successfully parses valid 1CClientBankExchange statement via POST /api/finance/bank-statements/upload", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "POST",
			url: "/api/finance/bank-statements/upload",
			headers: { "Content-Type": "application/json" },
			payload: { content: validStatementText },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.count, 1);
		assert.equal(body.openingBalanceRub, 100000);
		assert.equal(body.totalReceivedRub, 50000);
		assert.equal(body.closingBalanceRub, 130000);
		assert.equal(body.registry.orders[0].number, "101");
		await app.close();
	});

	it("returns 400 when file content is not a 1CClientBankExchange format", async () => {
		const app = await buildServer();
		const response = await app.inject({
			method: "POST",
			url: "/api/finance/bank-statements/upload",
			headers: { "Content-Type": "application/json" },
			payload: { content: "INVALID_HEADER_DATA" },
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "InvalidBankStatement");
		assert.ok(body.message.includes("1CClientBankExchange"));
		await app.close();
	});
});
