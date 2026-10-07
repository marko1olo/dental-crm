import { sql } from "drizzle-orm";
import { withTenantCtx } from "../apps/api/src/db/rls.js";
import * as schema from "../apps/api/src/db/schema.js";

const TARGET_ORGS = [
	"dce70000-a9e3-4c83-8245-754214aa0001",
	"4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
	"00000000-0000-0000-0000-000000000001",
];

async function seedForOrg(ORG_ID: string) {
	console.log(`Сидирование диалогов для организации ${ORG_ID}...`);
	await withTenantCtx(ORG_ID, async (tx) => {
		// Проверяем существование организации
		const [org] = await tx.select().from(schema.organizations).where(sql`id = ${ORG_ID}`).limit(1);
		if (!org) {
			console.log(`Организация ${ORG_ID} не найдена в таблице organizations, пропускаем.`);
			return;
		}
		// 1. Получаем существующих пациентов клиники
		const existingPatients = await tx
			.select()
			.from(schema.patients)
			.where(sql`organization_id = ${ORG_ID}`)
			.limit(10);

		console.log(`Найдено пациентов в базе: ${existingPatients.length}`);

		let p1 = existingPatients[0];
		let p2 = existingPatients[1];
		let p3 = existingPatients[2];

		if (!p1) {
			const [created] = await tx
				.insert(schema.patients)
				.values({
					organizationId: ORG_ID,
					fullName: "Смирнов Алексей Николаевич",
					phone: "+79161112233",
					status: "active",
					notes: "TG:79161112233 • Предпочитает утреннее время",
				})
				.returning();
			p1 = created!;
		}

		if (!p2) {
			const [created] = await tx
				.insert(schema.patients)
				.values({
					organizationId: ORG_ID,
					fullName: "Ковалёва Марина Сергеевна",
					phone: "+79054445566",
					status: "active",
					notes: "WA:79054445566 • Аллергия на лидокаин",
				})
				.returning();
			p2 = created!;
		}

		if (!p3) {
			const [created] = await tx
				.insert(schema.patients)
				.values({
					organizationId: ORG_ID,
					fullName: "Тихонов Дмитрий Игоревич",
					phone: "+79267778899",
					status: "active",
					notes: "VK:2891102 • Ортодонтический пациент",
				})
				.returning();
			p3 = created!;
		}

		// 2. Очистим старые тестовые события для этих внешних чатов, чтобы не двоилось
		await tx.execute(sql`
			DELETE FROM messenger_inbound_events
			WHERE organization_id = ${ORG_ID}
			AND external_chat_id IN ('79161112233', '79054445566', '2891102', 'max_user_449')
		`);

		// 3. Создаем диалог 1: TELEGRAM (Смирнов Алексей Николаевич)
		await tx.insert(schema.messengerInboundEvents).values([
			{
				organizationId: ORG_ID,
				channel: "telegram",
				externalChatId: "79161112233",
				patientId: p1.id,
				eventKind: "message",
				messageText: "Здравствуйте! Разболелся зуб мудрости снизу справа, можно сегодня или завтра попасть на осмотр и снимок?",
				rawPayload: {
					sourceType: "tg_bot",
					from: { first_name: "Алексей", last_name: "Смирнов" },
					user_name: "Смирнов Алексей Николаевич",
				},
				createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 мин назад
			},
			{
				organizationId: ORG_ID,
				channel: "telegram",
				externalChatId: "79161112233",
				patientId: p1.id,
				eventKind: "message",
				messageText: "Подскажите, сколько примерно займет приём по времени?",
				rawPayload: {
					sourceType: "tg_bot",
					from: { first_name: "Алексей", last_name: "Смирнов" },
					user_name: "Смирнов Алексей Николаевич",
				},
				createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 мин назад
			},
		]);

		// Исходящие в communication_events для Telegram
		await tx.insert(schema.communicationEvents).values([
			{
				organizationId: ORG_ID,
				patientId: p1.id,
				channel: "telegram",
				direction: "outbound",
				status: "sent",
				message: "Здравствуйте, Алексей Николаевич! Осмотр и прицельный КТ-снимок займут около 30 минут. Есть свободное окно завтра в 11:00 к хирургу Ковалеву Д.С.",
				createdAt: new Date(Date.now() - 20 * 60 * 1000),
			},
		]);

		// 4. Создаем диалог 2: WHATSAPP (Ковалёва Марина Сергеевна)
		await tx.insert(schema.messengerInboundEvents).values([
			{
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79054445566",
				patientId: p2.id,
				eventKind: "message",
				messageText: "Добрый день! Подскажите стоимость комплексной гигиены полости рта AirFlow и ультразвука?",
				rawPayload: {
					sourceType: "wa_phone",
					senderData: { senderName: "Марина Ковалёва" },
					user_name: "Ковалёва Марина Сергеевна",
				},
				createdAt: new Date(Date.now() - 65 * 60 * 1000),
			},
		]);

		// Исходящий ответ в WhatsApp
		await tx.insert(schema.communicationEvents).values([
			{
				organizationId: ORG_ID,
				patientId: p2.id,
				channel: "whatsapp",
				direction: "outbound",
				status: "sent",
				message: "Здравствуйте, Марина Сергеевна! Стоимость комплексной профгигиены (ультразвук + AirFlow + полировка + фторирование) составляет 5 500 ₽. Записать вас?",
				createdAt: new Date(Date.now() - 50 * 60 * 1000),
			},
		]);

		// 5. Создаем диалог 3: VK Сообщество (Тихонов Дмитрий Игоревич)
		await tx.insert(schema.messengerInboundEvents).values([
			{
				organizationId: ORG_ID,
				channel: "vk",
				externalChatId: "2891102",
				patientId: p3.id,
				eventKind: "message",
				messageText: "Здравствуйте! Хочу записаться на консультацию по установке брекетов или элайнеров. В какие дни принимает ортодонт?",
				rawPayload: {
					sourceType: "vk_group",
					from: { first_name: "Дмитрий", last_name: "Тихонов" },
					user_name: "Тихонов Дмитрий Игоревич",
				},
				createdAt: new Date(Date.now() - 15 * 60 * 1000),
			},
		]);

		// 6. Создаем диалог 4: 1C:MAX Мессенджер (Новый пациент Волкова Анна)
		await tx.insert(schema.messengerInboundEvents).values([
			{
				organizationId: ORG_ID,
				channel: "max",
				externalChatId: "max_user_449",
				patientId: null, // Не привязан к карте для проверки Мандата 8e!
				eventKind: "message",
				messageText: "Добрый день! Подскажите, клиника работает в субботу? Хочу записать маму на консультацию к терапевту.",
				rawPayload: {
					sourceType: "max_bot",
					user_name: "Анна Волкова",
					phone: "+79853332211",
				},
				createdAt: new Date(Date.now() - 5 * 60 * 1000),
			},
		]);

		console.log(`✓ Все 4 канала для организации ${ORG_ID} успешно засеяны реальными данными в PostgreSQL 18!`);
	});
}

async function main() {
	console.log("Запуск сидирования омниканальных диалогов для клиники DENTE...");
	for (const orgId of TARGET_ORGS) {
		await seedForOrg(orgId);
	}
	console.log("=== Сидирование всех организаций завершено успешно ===");
	process.exit(0);
}

main().catch((err) => {
	console.error("Ошибка сидирования омниканальных диалогов:", err);
	process.exit(1);
});
