/**
 * Временные данные для съёмки рабочих панелей.
 *
 * ЗАЧЕМ. Проверить оформление панелей чтением исходников нельзя: вёрстка,
 * контраст и поведение на узком экране видны только на живом экране с
 * содержимым. В рабочей базе одна организация с тремя пациентами и нулём
 * приёмов — на ней панели покажут пустые состояния, и оценить таблицы не выйдет.
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ ОРГАНИЗАЦИЯ, А НЕ ДОЗАПИСЬ В СУЩЕСТВУЮЩУЮ. Чужие данные
 * трогать нельзя, а удалить ровно то, что добавил, проще, когда всё лежит под
 * одним идентификатором. `--clean` сносит организацию целиком.
 *
 * ЗАПУСК
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts          — создать и выдать токены
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts --clean   — удалить без остатка
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointmentActionCodes, communicationCampaigns } from "../db/communicationsSchema.js";
import { patientDuplicateDecisions } from "../db/patientsSchema.js";
import {
	appointments,
	auditEvents,
	chairs,
	clinics,
	communicationOutbox,
	communicationTasks,
	communicationTemplates,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const CLINIC_ID = "d0000000-0000-4000-8000-00000000d002";
const CHAIR_A = "d0000000-0000-4000-8000-00000000d003";
const CHAIR_B = "d0000000-0000-4000-8000-00000000d004";
const DOCTOR_A = "d0000000-0000-4000-8000-00000000d005";
const DOCTOR_B = "d0000000-0000-4000-8000-00000000d006";
const ADMIN_USER = "d0000000-0000-4000-8000-00000000d007";

/** Фамилии вымышленные: в снимках не должно быть настоящих пациентов. */
const PATIENT_NAMES = [
	"Орлова Марина Петровна",
	"Ковалёв Сергей Иванович",
	"Белкина Анна Дмитриевна",
	"Тихонов Артём Олегович",
	"Савельева Ольга Игоревна",
	"Громов Илья Андреевич",
	"Юдина Екатерина Львовна",
	"Панфилов Роман Викторович"
];

function patientId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(100 + index).padStart(5, "0")}`;
}

function appointmentId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(200 + index).padStart(5, "0")}`;
}

/**
 * Добивка: удалить строки демонстрационной клиники из ВСЕХ остальных таблиц,
 * где есть колонка organization_id.
 *
 * ЗАЧЕМ ЭТО, ЕСЛИ ВЫШЕ ВСЁ ПЕРЕЧИСЛЕНО ПОИМЁННО. Список поимённых удалений
 * ломается каждый раз, когда в системе появляется новая таблица со ссылкой на
 * организацию: пересев падает с «violates foreign key constraint», и снимки
 * перестают сниматься вовсе. За сутки это случилось дважды — сначала из-за
 * решений по дублям, потом из-за журнала действий, а следом из-за
 * recent_patient_history, куда строки попали вообще не из этого скрипта.
 * Перечислять дальше — значит чинить одно и то же раз в неделю.
 *
 * Список таблиц берётся из каталога базы, а не из кода: он не может отстать.
 * Несколько проходов нужны из-за связей МЕЖДУ этими таблицами — строка может
 * не удалиться, пока жива ссылающаяся на неё. Проходы прекращаются, когда
 * очередной не удалил ничего: значит либо всё чисто, либо осталось то, что
 * нельзя убрать этим способом, и об этом честно сообщается.
 *
 * Опасности для чужих данных нет: условие всегда одно — организация ORG_ID,
 * созданная этим же скриптом.
 */
async function sweepRemainingOrganizationRows(): Promise<void> {
	const SAFE_TABLE = /^[a-z_][a-z0-9_]*$/;
	const tables = await db.execute<{ table_name: string }>(sql`
		SELECT table_name
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND column_name = 'organization_id'
		  AND table_name <> 'organizations'
		ORDER BY table_name
	`);

	let remaining = tables.rows.map((row) => row.table_name).filter((name) => SAFE_TABLE.test(name));

	for (let pass = 0; pass < 5 && remaining.length > 0; pass += 1) {
		const stillBlocked: string[] = [];
		for (const table of remaining) {
			try {
				await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE organization_id = ${ORG_ID}`);
			} catch {
				// Мешает ссылка из другой таблицы — вернёмся к ней следующим проходом.
				stillBlocked.push(table);
			}
		}
		if (stillBlocked.length === remaining.length) break;
		remaining = stillBlocked;
	}

	if (remaining.length > 0) {
		console.error(
			`Не удалось очистить таблицы: ${remaining.join(", ")}. Демонстрационная организация может не удалиться.`
		);
	}
}

async function clean(): Promise<void> {
	/*
	 * Каталожная зачистка идёт ПЕРВОЙ, а не только последней.
	 *
	 * ЗАЧЕМ. Ниже стоит поимённый список удалений в порядке, обратном ссылкам. Он
	 * перечисляет только те таблицы, о которых знал автор, и потому устаревает при
	 * появлении любой новой. Так и вышло: как только в демо-клинике появилась
	 * строка листа ожидания, сев начал падать на
	 * appointment_waitlists_patient_id_patients_id_fk — пациентов удаляют на строке
	 * ниже, а очередь, которая на них ссылается, до этой правки чистилась только
	 * зачисткой в самом конце, то есть уже после падения. Снимки при этом
	 * перестают делаться совсем, а причина выглядит как поломка приложения.
	 *
	 * Зачистка обходит information_schema, то есть знает про ВСЕ таблицы с
	 * organization_id, и повторяет проходы, пока ссылки не развяжутся. Поимённый
	 * список после неё остаётся холостым и оставлен намеренно: он документирует
	 * порядок зависимостей и страхует случай, когда у таблицы нет колонки
	 * organization_id и зачистка её не видит.
	 */
	await sweepRemainingOrganizationRows();

	// Порядок обратный зависимостям: сначала то, что ссылается.
	await db.delete(appointmentActionCodes).where(eq(appointmentActionCodes.organizationId, ORG_ID));
	await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
	await db.delete(communicationCampaigns).where(eq(communicationCampaigns.organizationId, ORG_ID));
	await db.delete(communicationTasks).where(eq(communicationTasks.organizationId, ORG_ID));
	await db.delete(communicationTemplates).where(eq(communicationTemplates.organizationId, ORG_ID));
	await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
	await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
	await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
	await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
	// Решения по дублям удаляются явно, хотя после миграции 0130 их снял бы и
	// каскад: скрипт не должен зависеть от того, что база доедет до 0130. Без
	// этой строки повторный сев падал сразу после первого объединения карточек.
	await db.delete(patientDuplicateDecisions).where(eq(patientDuplicateDecisions.organizationId, ORG_ID));
	await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
	await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
	await db.delete(users).where(eq(users.organizationId, ORG_ID));
	await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
	/*
	 * Журнал действий удаляется последним из зависимых. Он наполняется сам —
	 * любой маршрут, что-то меняющий в демо-клинике, оставляет здесь запись, — и
	 * внешний ключ на организацию не даёт её удалить. Пересев ломался ровно так
	 * после появления маршрутов правки сотрудника и кресла.
	 */
	await db.delete(auditEvents).where(eq(auditEvents.organizationId, ORG_ID));

	await sweepRemainingOrganizationRows();
	await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	// В stderr, а не в stdout: stdout этого скрипта — строго JSON с токенами, его
	// перенаправляют в .ops-shot-tokens.json. Любая проза в stdout делает файл
	// нечитаемым, а seed() вызывает clean() перед наполнением.
	console.error("Демонстрационная организация удалена.");
}

async function seed(): Promise<void> {
	await clean();

	const now = new Date();
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow.setHours(9, 0, 0, 0);

	await db.insert(organizations).values({ id: ORG_ID, name: "Демо-клиника для снимков" });
	await db
		.insert(clinics)
		.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Клиника на Ленина", phone: "+7 495 120-30-40", timezone: "Europe/Moscow" });
	await db.insert(chairs).values([
		{ id: CHAIR_A, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1" },
		{ id: CHAIR_B, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 2" }
	]);
	await db.insert(users).values([
		{ id: DOCTOR_A, organizationId: ORG_ID, fullName: "Смирнова Елена Владимировна", role: "doctor" },
		{ id: DOCTOR_B, organizationId: ORG_ID, fullName: "Гаврилов Никита Сергеевич", role: "doctor" },
		{ id: ADMIN_USER, organizationId: ORG_ID, fullName: "Администратор клиники", role: "administrator" }
	]);

	// Намеренные дубли: настоящий (то же имя и дата рождения) и мнимый
	// (родственники на одном номере). Нужны, чтобы разбор дублей на снимке
	// показывал и уверенную пару, и пару с предупреждением.
	const DUPLICATE_REAL = "d0000000-0000-4000-8000-0000000009a1";
	const DUPLICATE_KIN = "d0000000-0000-4000-8000-0000000009a2";

	await db.insert(patients).values([
		{
			id: DUPLICATE_REAL,
			organizationId: ORG_ID,
			// Имя в другом регистре и с двойным пробелом, дата рождения та же, что
			// у первого пациента списка: это уверенный дубль.
			fullName: "орлова  марина петровна",
			birthDate: "1970-01-10",
			phone: "+7 916 200-10-20",
			email: null
		},
		{
			id: DUPLICATE_KIN,
			organizationId: ORG_ID,
			fullName: "Орлов Кирилл Сергеевич",
			birthDate: null,
			phone: "+7 916 200-10-20",
			email: null
		}
	]);

	/*
	 * Пациенты, которых пора звать обратно. Нужны, чтобы список возврата было на
	 * чём проверить: у остальных демонстрационных пациентов приёмы свежие, и
	 * список выходил пустым — а пустой список не показывает ни полос, ни
	 * сортировки, ни того, как выглядит «скорее всего ушёл».
	 */
	const RECALL_DUE = "d0000000-0000-4000-8000-0000000009b1";
	const RECALL_OVERDUE = "d0000000-0000-4000-8000-0000000009b2";
	const RECALL_LOST = "d0000000-0000-4000-8000-0000000009b3";
	const RECALL_NEVER = "d0000000-0000-4000-8000-0000000009b4";

	await db.insert(patients).values([
		{
			id: RECALL_DUE,
			organizationId: ORG_ID,
			fullName: "Зорина Татьяна Львовна",
			birthDate: "1985-03-14",
			phone: "+7 916 300-10-31",
			email: "zorina@example.ru"
		},
		{
			id: RECALL_OVERDUE,
			organizationId: ORG_ID,
			fullName: "Лапин Егор Дмитриевич",
			birthDate: "1978-11-02",
			phone: "+7 916 300-10-32",
			email: null
		},
		{
			id: RECALL_LOST,
			organizationId: ORG_ID,
			fullName: "Ветрова Ирина Павловна",
			birthDate: "1966-07-21",
			phone: "+7 916 300-10-33",
			email: null
		},
		{
			id: RECALL_NEVER,
			organizationId: ORG_ID,
			fullName: "Сомов Артур Вадимович",
			birthDate: "1992-05-05",
			phone: "+7 916 300-10-34",
			email: null
		}
	]);

	const monthsAgo = (months: number): Date => {
		const date = new Date(now.getTime());
		date.setMonth(date.getMonth() - months);
		return date;
	};

	await db.insert(appointments).values([
		// Восемь месяцев назад — пора на профилактику.
		{
			id: "d0000000-0000-4000-8000-0000000009c1",
			organizationId: ORG_ID,
			patientId: RECALL_DUE,
			doctorUserId: DOCTOR_A,
			chairId: CHAIR_A,
			status: "completed" as const,
			startsAt: monthsAgo(8),
			endsAt: new Date(monthsAgo(8).getTime() + 60 * 60_000)
		},
		// Четырнадцать месяцев — пропущен осмотр.
		{
			id: "d0000000-0000-4000-8000-0000000009c2",
			organizationId: ORG_ID,
			patientId: RECALL_OVERDUE,
			doctorUserId: DOCTOR_B,
			chairId: CHAIR_B,
			status: "completed" as const,
			startsAt: monthsAgo(14),
			endsAt: new Date(monthsAgo(14).getTime() + 60 * 60_000)
		},
		// Тридцать месяцев — скорее всего лечится в другом месте.
		{
			id: "d0000000-0000-4000-8000-0000000009c3",
			organizationId: ORG_ID,
			patientId: RECALL_LOST,
			doctorUserId: DOCTOR_A,
			chairId: CHAIR_A,
			status: "completed" as const,
			startsAt: monthsAgo(30),
			endsAt: new Date(monthsAgo(30).getTime() + 60 * 60_000)
		},
		// Записывался дважды и оба раза не пришёл: завершённых приёмов нет вовсе.
		{
			id: "d0000000-0000-4000-8000-0000000009c4",
			organizationId: ORG_ID,
			patientId: RECALL_NEVER,
			doctorUserId: DOCTOR_B,
			chairId: CHAIR_B,
			status: "no_show" as const,
			startsAt: monthsAgo(3),
			endsAt: new Date(monthsAgo(3).getTime() + 60 * 60_000)
		},
		{
			id: "d0000000-0000-4000-8000-0000000009c5",
			organizationId: ORG_ID,
			patientId: RECALL_NEVER,
			doctorUserId: DOCTOR_B,
			chairId: CHAIR_B,
			status: "cancelled" as const,
			startsAt: monthsAgo(2),
			endsAt: new Date(monthsAgo(2).getTime() + 60 * 60_000)
		}
	]);

	await db.insert(patients).values(
		PATIENT_NAMES.map((fullName, index) => ({
			id: patientId(index),
			organizationId: ORG_ID,
			fullName,
			// У одного пациента телефона нет намеренно: панель обзвона обязана
			// показать это отдельно.
			phone: index === 5 ? null : `+7 916 ${String(200 + index).padStart(3, "0")}-10-${String(20 + index).padStart(2, "0")}`,
			email: index % 3 === 0 ? `patient${index}@example.ru` : null,
			birthDate: `19${70 + index}-0${(index % 9) + 1}-1${index % 9}`
		}))
	);

	// Завтрашние приёмы под список обзвона: подтверждённые, ожидающие и отменённый.
	const statuses = ["confirmed", "planned", "planned", "planned", "confirmed", "planned", "cancelled", "planned"] as const;
	await db.insert(appointments).values(
		PATIENT_NAMES.map((_unused, index) => ({
			id: appointmentId(index),
			organizationId: ORG_ID,
			patientId: patientId(index),
			doctorUserId: index % 2 === 0 ? DOCTOR_A : DOCTOR_B,
			chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
			status: statuses[index] ?? "planned",
			startsAt: new Date(tomorrow.getTime() + index * 45 * 60_000),
			endsAt: new Date(tomorrow.getTime() + index * 45 * 60_000 + 40 * 60_000)
		}))
	);

	// Прошедшие приёмы этого месяца — под отчёты.
	const pastBase = new Date(now.getFullYear(), now.getMonth(), 2, 10, 0, 0);
	const pastAppointments = Array.from({ length: 14 }, (_unused, index) => ({
		id: `d0000000-0000-4000-8000-0000000${String(300 + index).padStart(5, "0")}`,
		organizationId: ORG_ID,
		patientId: patientId(index % PATIENT_NAMES.length),
		doctorUserId: index % 3 === 0 ? DOCTOR_B : DOCTOR_A,
		chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
		status: (index % 7 === 0 ? "no_show" : index % 5 === 0 ? "cancelled" : "completed") as
			| "no_show"
			| "cancelled"
			| "completed",
		startsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000),
		endsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000 + 60 * 60_000)
	}));
	await db.insert(appointments).values(pastAppointments);

	/*
	 * ПРАЙС КЛИНИКИ. Без него демонстрационная клиника не может ни договор
	 * посчитать, ни счёт, ни справку для налогового вычета — сервер прямо об этом
	 * предупреждает при каждой сборке сводки: «Прайс-лист пуст: в справочнике
	 * услуг клиники нет ни одной позиции».
	 *
	 * Измерено запросом: в обеих организациях базы прайс был пуст, ноль строк.
	 * Для новой клиники это норма — прайс заполняет она сама, и писатель для
	 * этого появился только сегодня. Но демонстрационная клиника обслуживает
	 * снимки и сквозные денежные цепочки: на пустом прайсе они проверяют нули, то
	 * есть зелены по бессодержательности.
	 *
	 * Цены с копейками намеренно: рубли с копейками — это тот случай, где
	 * сложение в плавающей точке уже отклоняло верные квитанции, и цепочке денег
	 * нужен материал, на котором копейка видна.
	 */
	const catalog = [
		{ code: "T01", title: "Лечение кариеса", category: "therapy" as const, specialty: "therapist" as const, price: 7200.5, minutes: 60 },
		{ code: "H01", title: "Профессиональная гигиена", category: "hygiene" as const, specialty: "hygienist" as const, price: 5400, minutes: 45 },
		{ code: "T02", title: "Лечение пульпита", category: "therapy" as const, specialty: "therapist" as const, price: 14800.99, minutes: 90 },
		{ code: "P01", title: "Установка коронки", category: "prosthetics" as const, specialty: "orthopedist" as const, price: 26500, minutes: 60 },
		{ code: "C01", title: "Консультация", category: "consultation" as const, specialty: "universal" as const, price: 1500.5, minutes: 30 }
	];
	const catalogIds = new Map<string, string>();
	/*
	 * ЦЕНА ПОЗИЦИИ БЕРЁТСЯ ИЗ ПРАЙСА, А НЕ ИЗ ВТОРОГО МАССИВА.
	 *
	 * Ниже стоял второй список цен — `[7200, 5400, 14800, 26500]`, круглый, — и
	 * позиции лечения с платежами заполнялись ИЗ НЕГО, тогда как прайс рядом
	 * объявляет `7200.5` и `14800.99`. Замер на живой демо-клинике: в прайсе
	 * `7200.50` и `14800.99`, в позициях `7200.00` и `14800.00`. Потеря 3,48 ₽
	 * прямо в демо-данных при пяти позициях.
	 *
	 * Беда не в трёх рублях, а в том, ЧТО ЭТО ЗА ДАННЫЕ. Комментарий выше прямо
	 * говорит: «цепочке денег нужен материал, на котором копейка видна». Второй
	 * массив стирал копейки ровно там, где они должны быть видны, — и снимки
	 * визуального гейта, и сквозные денежные сценарии сверяли круглые числа. То
	 * есть дефект округления в квитанции или в счёте не проявился бы на демо
	 * никогда.
	 *
	 * Теперь источник один: цена приходит из того же прайса, на который позиция
	 * ссылается через `service_id`. Расхождение прайса и позиции стало
	 * невозможным по построению, а не по внимательности того, кто правит массив.
	 */
	const catalogPrices = new Map<string, number>();
	for (const [index, service] of catalog.entries()) {
		const id = `d0000000-0000-4000-8000-0000000${String(600 + index).padStart(5, "0")}`;
		catalogIds.set(service.title, id);
		catalogPrices.set(service.title, service.price);
		await db.insert(serviceCatalogItems).values({
			id,
			organizationId: ORG_ID,
			code: service.code,
			title: service.title,
			category: service.category,
			specialty: service.specialty,
			basePriceRub: service.price,
			priceRub: service.price,
			durationMinutes: service.minutes,
			taxDeductible: true
		});
	}

	// Визиты, позиции лечения и платежи — чтобы в отчётах были деньги и долг.
	const completed = pastAppointments.filter((appointment) => appointment.status === "completed");
	for (const [index, appointment] of completed.entries()) {
		const visitId = `d0000000-0000-4000-8000-0000000${String(400 + index).padStart(5, "0")}`;
		await db.insert(visits).values({
			id: visitId,
			organizationId: ORG_ID,
			patientId: appointment.patientId,
			appointmentId: appointment.id,
			status: "signed",
			createdAt: appointment.startsAt
		});
		const itemTitle = ["Лечение кариеса", "Профессиональная гигиена", "Лечение пульпита", "Установка коронки"][index % 4] ?? "Приём";
		/*
		 * Позиции без цены в прайсе быть не может: `itemTitle` берётся из того же
		 * списка заголовков, что и прайс. Если списки разойдутся, посев обязан
		 * упасть с внятной причиной, а не тихо подставить запасное число — тихая
		 * подстановка и была исходным дефектом.
		 */
		const itemPriceRub = catalogPrices.get(itemTitle);
		if (itemPriceRub === undefined) {
			throw new Error(
				`Посев демо-данных остановлен: позиции «${itemTitle}» нет в прайсе этой же сеялки. ` +
					"Список заголовков позиций и список прайса разошлись — добавьте услугу в прайс, " +
					"иначе позиция получит цену, не совпадающую с прайсом, и копейки в демо снова исчезнут."
			);
		}
		await db.insert(treatmentItems).values({
			organizationId: ORG_ID,
			patientId: appointment.patientId,
			visitId,
			// Ссылка на прайс, а не только название: без неё позиция лечения
			// «висит в воздухе», правила списания материалов её не находят, а
			// изменение цены в прайсе не связано с уже назначенным лечением.
			serviceId: catalogIds.get(itemTitle) ?? null,
			title: itemTitle,
			quantity: "1",
			priceRub: itemPriceRub,
			unitPriceRub: itemPriceRub,
			discountRub: index % 5 === 0 ? 800 : 0,
			status: "completed"
		});
		// Часть приёмов оплачена не полностью — иначе дебиторка будет пустой.
		if (index % 4 !== 3) {
			await db.insert(payments).values({
				organizationId: ORG_ID,
				patientId: appointment.patientId,
				visitId,
				amountRub: itemPriceRub,
				status: "paid",
				paidAt: appointment.startsAt
			});
		}
	}

	// Шаблоны и очередь сообщений — под пульт отправки.
	const [reminderTemplate] = await db
		.insert(communicationTemplates)
		.values([
			{
				organizationId: ORG_ID,
				title: "Напоминание о приёме",
				channel: "sms",
				intent: "appointment_confirmation",
				audienceRole: "administrator",
				body: "{patient}, напоминаем: приём {date} в {time}, {clinic}. Подтвердить: {confirmLink}",
				variablesJson: JSON.stringify(["patient", "date", "time", "clinic", "confirmLink"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Приглашение на профилактический осмотр",
				channel: "sms",
				intent: "recall",
				audienceRole: "administrator",
				body: "{patient}, приглашаем на профилактический осмотр. {clinic}",
				variablesJson: JSON.stringify(["patient", "clinic"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Справка для налогового вычета готова",
				channel: "email",
				intent: "document_ready",
				audienceRole: "administrator",
				body: "{patient}, справка готова. Заберите её в клинике или скачайте в портале: {link}",
				variablesJson: JSON.stringify(["patient", "link"]),
				isActive: false
			}
		])
		.returning({ id: communicationTemplates.id });

	const outboxStates = [
		{ status: "delivered" as const, error: null, detail: "SMS.RU 103: Доставлено" },
		{ status: "sent" as const, error: null, detail: null },
		{ status: "failed" as const, error: "Не доставлено: истёк срок жизни сообщения", detail: "SMS.RU 104" },
		{ status: "queued" as const, error: null, detail: null },
		{ status: "suppressed" as const, error: "SMS-шлюз не настроен: нет ключей доступа в окружении сервера.", detail: null },
		{ status: "delivered" as const, error: null, detail: "SMS.RU 110: Прочитано" }
	];
	await db.insert(communicationOutbox).values(
		outboxStates.map((state, index) => ({
			organizationId: ORG_ID,
			patientId: patientId(index),
			templateId: reminderTemplate?.id ?? null,
			channel: (index % 3 === 2 ? "email" : "sms") as "sms" | "email",
			intent: "appointment_confirmation" as const,
			recipientAddress: index % 3 === 2 ? `patient${index}@example.ru` : `7916${String(200 + index)}1020`,
			body: `${PATIENT_NAMES[index]?.split(" ")[1] ?? "Пациент"}, напоминаем: приём завтра в ${9 + index}:00, Клиника на Ленина.`,
			status: state.status,
			attempts: state.status === "failed" ? 3 : state.status === "queued" ? 0 : 1,
			sentAt: state.status === "delivered" || state.status === "sent" ? new Date(now.getTime() - index * 3_600_000) : null,
			deliveredAt: state.status === "delivered" ? new Date(now.getTime() - index * 3_500_000) : null,
			lastErrorMessage: state.error,
			receiptDetail: state.detail,
			dedupeKey: `reminder:${appointmentId(index)}:24`
		}))
	);

	// Рассылка в состоянии «выполняется» — чтобы панель кампаний не была пустой.
	await db.insert(communicationCampaigns).values({
		organizationId: ORG_ID,
		title: "Осмотр для тех, кто давно не был",
		templateId: reminderTemplate?.id ?? null,
		channel: "sms",
		scope: "marketing",
		status: "running",
		audienceJson: JSON.stringify({ status: "active", hasFutureAppointment: false }),
		audienceSnapshotJson: JSON.stringify({
			takenAt: now.toISOString(),
			criteria: ["активные пациенты", "нет будущей записи"],
			matched: 6,
			deliverable: 2,
			excluded: { no_contact: 1, no_consent: 3, excluded_by_criteria: 0, status_mismatch: 0 },
			queued: 2,
			alreadyQueued: 0,
			skipped: 0
		}),
		launchedAt: new Date(now.getTime() - 2 * 3_600_000)
	});

	const clinicToken = signToken({ organizationId: ORG_ID, clinicName: "Демо-клиника для снимков" }, authTokenSecret(), 3600);
	const staffToken = signToken(
		{ userId: ADMIN_USER, fullName: "Администратор клиники", role: "administrator", organizationId: ORG_ID },
		authTokenSecret(),
		3600
	);

	console.log(JSON.stringify({ organizationId: ORG_ID, clinicToken, staffToken }));
}

const shouldClean = process.argv.includes("--clean");
await (shouldClean ? clean() : seed());
process.exit(0);
