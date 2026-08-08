/**
 * Живой сквозной прогон движка переноса против настоящей базы PostgreSQL.
 * Создаёт изолированную организацию, гоняет перенос, проверяет инварианты, убирает за собой.
 */
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import {
	appointments,
	migrationEntityLinks,
	migrationQuarantineRecords,
	migrationRuns,
	migrationStagingRecords,
	organizations,
	patients,
	payments,
	visits,
} from "../db/schema.js";
import {
	analyzeSource,
	listQuarantine,
	rollbackRun,
	runMigration,
} from "../migration/engine.js";
import { buildDbfFile, encodeSingleByte } from "../migration/tests/fixtures.js";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = ""): void {
	if (condition) {
		pass += 1;
		console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
	} else {
		fail += 1;
		console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
	}
}

function same(label: string, actual: unknown, expected: unknown): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	check(label, a === e, a === e ? String(a) : `got ${a}, expected ${e}`);
}

const [org] = await db
	.insert(organizations)
	.values({ name: `E2E-migration-${Date.now()}` })
	.returning();
if (!org) throw new Error("Failed to create test organization");
const ORG = org.id;
console.log(`\nОрганизация ${ORG}\n`);

const base = {
	organizationId: ORG,
	allowLlm: false,
	sourceSystem: "e2e_legacy",
	mappingOverrides: [] as Array<never>,
};

try {
	console.log("--- 1. Анализ выгрузки пациентов в windows-1251");
	const csv = [
		"Код;ФИО;Телефон;Дата рождения;Комментарий",
		"101;Иванов Иван Иванович;+7 (900) 123-45-67;01.01.1980;Жалобы на боль в 16",
		"102;Петрова Мария Сергеевна;89161112233;15.03.1992;Плановый осмотр",
		"103;Сидоров Алексей Николаевич;8 495 777 88 99;22.11.1975;Городской телефон",
		"104;Кузнецова Ольга Владимировна;;07.07.1988;БЕЗ ТЕЛЕФОНА - должен перенестись",
		"105;;89031234567;10.10.1970;БЕЗ ФИО - должен уйти в карантин",
		"106;Орлов Пётр Сергеевич;89052223344;31.02.2019;НЕСУЩЕСТВУЮЩАЯ ДАТА",
		"107;Иванов Иван Иванович;+7 (900) 123-45-67;01.01.1980;Жалобы на боль в 16",
	].join("\n");
	const content = encodeSingleByte(csv, "windows-1251").toString("base64");

	const analysis = await analyzeSource({
		...base,
		sourceName: "пациенты.csv",
		contentBase64: content,
		dryRun: true,
	});
	same(
		"кодировка определена",
		analysis.profile.detectedEncoding,
		"windows-1251",
	);
	same("сущность определена", analysis.mapping.entityKind, "patient");
	same("строк прочитано", analysis.profile.rowCount, 7);
	check(
		"в предпросмотре маски, а не значения пациентов",
		!JSON.stringify(analysis.profile.sampleRows).includes("Иванов"),
		JSON.stringify(analysis.profile.sampleRows[0]),
	);
	console.log(
		`       карта: ${analysis.mapping.columns.map((c) => `${c.sourceColumn}→${c.targetField}`).join(", ")}`,
	);
	console.log(
		`       оценка: готово ${analysis.projectedReady}, карантин ${analysis.projectedQuarantine}`,
	);

	console.log("--- 2. Сухой прогон не должен писать в боевые таблицы");
	const dry = await runMigration({
		...base,
		sourceName: "пациенты.csv",
		contentBase64: content,
		dryRun: true,
	});
	const afterDry = await db
		.select({ n: sql<string>`count(*)` })
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	same("пациентов в базе после сухого прогона", Number(afterDry[0]?.n), 0);
	same("статус сухого прогона", dry.run.status, "validated");
	check(
		"сверка сухого прогона сошлась",
		dry.reconciliation.balanced,
		dry.reconciliation.checks
			.filter((c) => !c.passed)
			.map((c) => c.title)
			.join("; ") || "все проверки пройдены",
	);

	console.log("--- 3. Боевой прогон");
	const live = await runMigration({
		...base,
		sourceName: "пациенты.csv",
		contentBase64: content,
		dryRun: false,
	});
	console.log(
		`       создано ${live.run.loadedRows}, обновлено ${live.run.updatedRows}, дублей ${live.run.duplicateRows}, карантин ${live.run.quarantinedRows}, пропущено ${live.run.skippedRows}`,
	);

	const loaded = await db
		.select({
			fullName: patients.fullName,
			phone: patients.phone,
			birthDate: patients.birthDate,
		})
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	console.log(
		`       в базе: ${loaded.map((p) => `${p.fullName}/${p.phone ?? "нет тел"}/${p.birthDate ?? "нет ДР"}`).join(" | ")}`,
	);

	check(
		"пациент без телефона перенесён",
		loaded.some((p) => p.fullName === "Кузнецова Ольга Владимировна"),
		"строка 104",
	);
	check(
		"строка без ФИО не создала карточку",
		!loaded.some((p) => !p.fullName || p.fullName.trim() === ""),
	);
	same(
		"дублей Иванова",
		loaded.filter((p) => p.fullName === "Иванов Иван Иванович").length,
		1,
	);
	const orlov = loaded.find((p) => p.fullName?.startsWith("Орлов"));
	check(
		"несуществующая дата не записана в базу",
		orlov === undefined || orlov.birthDate === null,
		`Орлов ДР=${orlov?.birthDate ?? "(нет карточки)"}`,
	);
	check(
		"телефон приведён к E.164",
		loaded.some((p) => p.phone === "+79001234567"),
	);
	check(
		"городской телефон перенесён",
		loaded.some((p) => p.phone === "+74957778899"),
	);

	console.log("--- 4. Сверка: баланс строк");
	for (const c of live.reconciliation.checks) {
		console.log(
			`       ${c.passed ? "[+]" : "[-]"} ${c.title}: ожидалось ${c.expected}, получено ${c.actual}`,
		);
	}
	check(
		"сверка сошлась",
		live.reconciliation.balanced,
		live.reconciliation.checks
			.filter((c) => !c.passed)
			.map((c) => `${c.title} (${c.expected} != ${c.actual})`)
			.join("; ") || "ок",
	);

	const staged = await db
		.select({
			status: migrationStagingRecords.status,
			n: sql<string>`count(*)`,
		})
		.from(migrationStagingRecords)
		.where(eq(migrationStagingRecords.runId, live.run.runId))
		.groupBy(migrationStagingRecords.status);
	console.log(
		`       стейджинг: ${staged.map((s) => `${s.status}=${s.n}`).join(", ")}`,
	);
	same(
		"все 7 строк сохранены дословно",
		staged.reduce((sum, r) => sum + Number(r.n), 0),
		7,
	);

	console.log("--- 5. Карантин: причины на русском");
	const quarantine = await listQuarantine(ORG, live.run.runId, 50);
	for (const q of quarantine.slice(0, 7)) {
		console.log(
			`       строка ${q.sourceRowNumber} [${q.reason}${q.blocking ? ", блок" : ""}]: ${q.message.slice(0, 95)}`,
		);
	}
	check(
		"карантин непустой и с объяснениями",
		quarantine.length > 0 && quarantine.every((q) => q.message.length > 10),
	);
	check(
		"строка без ФИО в карантине",
		quarantine.some(
			(q) => q.sourceRowNumber === 6 && q.reason === "missing_required_field",
		),
		`причины строки 6: ${quarantine
			.filter((q) => q.sourceRowNumber === 6)
			.map((q) => q.reason)
			.join(",")}`,
	);
	check(
		"несуществующая дата зафиксирована",
		quarantine.some(
			(q) => q.reason === "unparsable_value" && q.fieldPath === "birthDate",
		),
		quarantine
			.filter((q) => q.fieldPath === "birthDate")
			.map((q) => q.reason)
			.join(","),
	);

	console.log("--- 6. Идемпотентность: тот же файл второй раз");
	const again = await runMigration({
		...base,
		sourceName: "пациенты.csv",
		contentBase64: content,
		dryRun: false,
	});
	const afterSecond = await db
		.select({ n: sql<string>`count(*)` })
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	console.log(
		`       второй прогон: создано ${again.run.loadedRows}, обновлено ${again.run.updatedRows}, дублей ${again.run.duplicateRows}`,
	);
	same(
		"пациентов после второго прогона не выросло",
		Number(afterSecond[0]?.n),
		loaded.length,
	);
	same("второй прогон не создал новых карточек", again.run.loadedRows, 0);
	check(
		"второй прогон распознал уже перенесённых",
		again.run.updatedRows + again.run.duplicateRows > 0,
	);

	console.log("--- 7. Платежи со ссылкой на пациента по ключу старой системы");
	const paymentsCsv = [
		"Код;Пациент;Сумма;Дата оплаты;Способ оплаты",
		"5001;101;1 500,00 руб.;05.02.2020;карта",
		"5002;102;23 400,50;06.02.2020;наличными",
		"5003;999;5 000,00;07.02.2020;карта",
		"5004;103;(2 000,00);08.02.2020;карта",
	].join("\n");
	const payRun = await runMigration({
		...base,
		sourceName: "оплаты.csv",
		rawText: paymentsCsv,
		dryRun: false,
		requestedEntityKind: "payment",
	});
	console.log(
		`       платежи: создано ${payRun.run.loadedRows}, карантин ${payRun.run.quarantinedRows}`,
	);
	const loadedPayments = await db
		.select({ amountRub: payments.amountRub, patientId: payments.patientId })
		.from(payments)
		.where(eq(payments.organizationId, ORG));
	console.log(
		`       суммы в базе: ${loadedPayments.map((p) => p.amountRub).join(", ")}`,
	);
	same("загружено 2 платежа", loadedPayments.length, 2);
	check(
		"сумма 1500 разобрана из '1 500,00 руб.'",
		loadedPayments.some((p) => p.amountRub === 1500),
	);
	// БЫЛО: ожидалось 23401 — то есть скрипт проверял, что перенос ОКРУГЛИЛ сумму
	// до рубля. Колонка amount_rub — numeric(12, 2), копейки обязаны доехать.
	check(
		"сумма 23400,50 доехала до колонки без округления",
		loadedPayments.some((p) => p.amountRub === 23400.5),
	);

	const payQ = await listQuarantine(ORG, payRun.run.runId, 50);
	for (const q of payQ.slice(0, 5)) {
		console.log(
			`       строка ${q.sourceRowNumber} [${q.reason}]: ${q.message.slice(0, 95)}`,
		);
	}
	check(
		"платёж на несуществующего пациента изолирован",
		payQ.some((q) => q.reason === "broken_reference"),
		payQ.map((q) => q.reason).join(","),
	);
	check(
		"отрицательный платёж изолирован",
		payQ.some(
			(q) => q.reason === "validation_failed" && q.fieldPath === "amountRub",
		),
	);

	console.log("--- 8. Сверка денег ДО КОПЕЙКИ");
	const moneyChecks = payRun.reconciliation.checks.filter((c) =>
		c.code.startsWith("money"),
	);
	for (const c of moneyChecks) {
		console.log(
			`       ${c.passed ? "[+]" : "[-]"} ${c.title}: ожидалось ${c.expected}, получено ${c.actual}`,
		);
	}
	check(
		"проверки денег присутствуют",
		moneyChecks.length >= 3,
		`${moneyChecks.length} проверок`,
	);
	check(
		"деньги сходятся",
		moneyChecks.every((c) => c.passed),
		moneyChecks
			.filter((c) => !c.passed)
			.map((c) => c.detail)
			.join("; ") || "ок",
	);

	/**
	 * Источник: 1500,00 + 23400,50 + 5000,00 + (-2000,00). В копейках это
	 * 150000 + 2340050 + 500000 - 200000 = 2790050.
	 */
	const parseCheck = moneyChecks.find(
		(c) => c.code === "money_parse_completeness_kopecks",
	);
	same(
		"сумма источника в копейках посчитана точно",
		parseCheck?.expected,
		2790050,
	);
	same("разбор не потерял ни копейки", parseCheck?.actual, 2790050);

	const conservation = moneyChecks.find(
		(c) => c.code === "money_conservation_kopecks",
	);
	check(
		"баланс копеек замкнут",
		conservation?.passed === true,
		conservation?.detail ?? "проверка отсутствует",
	);

	/**
	 * В колонку ушла ровно разобранная сумма.
	 *
	 * Загружаются два платежа: 1500,00 и 23400,50 — точно 2 355 050 копеек, и
	 * столько же обязано лежать в колонке amount_rub (numeric(12, 2)).
	 *
	 * БЫЛО: здесь проверялась противоположность — «расхождение округления ровно 50
	 * копеек» у проверки money_rounding_disclosure, которая ВСЕГДА проходила и лишь
	 * называла потерю вслух. Потеря устранена, поэтому проверка стала
	 * money_column_exactness_kopecks и обязана давать ноль расхождения.
	 */
	const exactness = moneyChecks.find(
		(c) => c.code === "money_column_exactness_kopecks",
	);
	check(
		"проверка точности колонки присутствует",
		exactness !== undefined,
		exactness?.detail ?? "проверка отсутствует",
	);
	same("разобрано копеек", exactness?.expected, 2355050);
	same("в колонку записано столько же копеек", exactness?.actual, 2355050);
	check(
		"копейки не потеряны при записи",
		exactness?.passed === true,
		exactness?.detail ?? "проверка отсутствует",
	);
	console.log(`       ${exactness?.detail ?? ""}`);

	console.log("--- 9. Откат прогона платежей");
	const rb = await rollbackRun({
		organizationId: ORG,
		runId: payRun.run.runId,
	});
	console.log(`       ${rb.message}`);
	const afterRollback = await db
		.select({ n: sql<string>`count(*)` })
		.from(payments)
		.where(eq(payments.organizationId, ORG));
	same("платежей после отката", Number(afterRollback[0]?.n), 0);
	const linksLeft = await db
		.select({ n: sql<string>`count(*)` })
		.from(migrationEntityLinks)
		.where(
			and(
				eq(migrationEntityLinks.organizationId, ORG),
				eq(migrationEntityLinks.createdByRunId, payRun.run.runId),
			),
		);
	same("ссылки удалённых сущностей убраны", Number(linksLeft[0]?.n), 0);
	const [rolledRun] = await db
		.select({ status: migrationRuns.status })
		.from(migrationRuns)
		.where(eq(migrationRuns.id, payRun.run.runId));
	same("статус прогона после отката", rolledRun?.status, "rolled_back");
	const stagedAfterRb = await db
		.select({ n: sql<string>`count(*)` })
		.from(migrationStagingRecords)
		.where(eq(migrationStagingRecords.runId, payRun.run.runId));
	check(
		"исходные строки сохранены после отката",
		Number(stagedAfterRb[0]?.n) === 4,
		`${stagedAfterRb[0]?.n} строк`,
	);

	console.log("--- 10. Расписание: время приёма обязано сохраниться");
	const scheduleCsv = [
		"Код;Пациент;Дата приёма;Длительность;Статус;Повод",
		"9001;101;12.03.2019 14:30;45;завершён;Лечение 16 зуба",
		"9002;102;12.03.2019 09:15;30;отменена пациентом;Осмотр",
		"9003;103;13.03.2019;60;запланирован;Без указания времени",
		"9004;101;14.03.2019 18:45;30;неявка;Повторный",
	].join("\n");
	const schedRun = await runMigration({
		...base,
		sourceName: "расписание.csv",
		rawText: scheduleCsv,
		dryRun: false,
		requestedEntityKind: "appointment",
	});
	console.log(
		`       записи: создано ${schedRun.run.loadedRows}, карантин ${schedRun.run.quarantinedRows}`,
	);

	const loadedAppointments = await db
		.select({
			startsAt: appointments.startsAt,
			endsAt: appointments.endsAt,
			status: appointments.status,
			reason: appointments.reason,
		})
		.from(appointments)
		.where(eq(appointments.organizationId, ORG))
		.orderBy(appointments.startsAt);

	/** Часовой пояс клиники по умолчанию — Europe/Moscow, поэтому 14:30 мск = 11:30 UTC. */
	const asMoscow = (value: Date): string =>
		new Intl.DateTimeFormat("ru-RU", {
			timeZone: "Europe/Moscow",
			hour: "2-digit",
			minute: "2-digit",
			day: "2-digit",
			month: "2-digit",
		}).format(value);
	console.log(
		`       в базе (мск): ${loadedAppointments.map((a) => `${asMoscow(a.startsAt)}→${asMoscow(a.endsAt)} ${a.status}`).join(" | ")}`,
	);

	same("создано 4 записи", loadedAppointments.length, 4);
	check(
		"время 14:30 сохранено, а не заменено девятью утра",
		loadedAppointments.some((a) => asMoscow(a.startsAt).endsWith("14:30")),
		loadedAppointments.map((a) => asMoscow(a.startsAt)).join(", "),
	);
	check(
		"время 09:15 сохранено",
		loadedAppointments.some((a) => asMoscow(a.startsAt).endsWith("09:15")),
	);
	check(
		"время 18:45 сохранено",
		loadedAppointments.some((a) => asMoscow(a.startsAt).endsWith("18:45")),
	);
	check(
		"все четыре момента различны",
		new Set(loadedAppointments.map((a) => a.startsAt.getTime())).size === 4,
		`уникальных моментов: ${new Set(loadedAppointments.map((a) => a.startsAt.getTime())).size}`,
	);
	const fortyFive = loadedAppointments.find((a) =>
		asMoscow(a.startsAt).endsWith("14:30"),
	);
	check(
		"длительность 45 минут учтена в окончании",
		fortyFive !== undefined &&
			fortyFive.endsAt.getTime() - fortyFive.startsAt.getTime() === 45 * 60_000,
		fortyFive
			? `${(fortyFive.endsAt.getTime() - fortyFive.startsAt.getTime()) / 60000} мин`
			: "не найдено",
	);
	check(
		"статус «отменена пациентом» распознан",
		loadedAppointments.some((a) => a.status === "cancelled"),
	);
	check(
		"статус «неявка» распознан",
		loadedAppointments.some((a) => a.status === "no_show"),
	);
	check(
		"статус «завершён» распознан",
		loadedAppointments.some((a) => a.status === "completed"),
	);
	check(
		"запись без времени поставлена на начало дня, а не потеряна",
		loadedAppointments.some((a) => asMoscow(a.startsAt).endsWith("09:00")),
		loadedAppointments.map((a) => asMoscow(a.startsAt)).join(", "),
	);

	console.log("--- 11. Приёмы с клинической частью");
	const visitsCsv = [
		"Код;Пациент;Дата;Жалобы;Анамнез;Диагноз;План лечения",
		"7001;101;12.03.2019 14:30;Боль при накусывании на 16;Лечение 2 года назад;K04.0 Пульпит;Эндодонтическое лечение 16",
		"7002;102;12.03.2019 09:15;Профилактический осмотр;Без особенностей;K02.1 Кариес дентина;Пломба 26",
	].join("\n");
	const visitRun = await runMigration({
		...base,
		sourceName: "приёмы.csv",
		rawText: visitsCsv,
		dryRun: false,
		requestedEntityKind: "visit",
	});
	const loadedVisits = await db
		.select({
			complaint: visits.complaint,
			diagnosis: visits.diagnosis,
			status: visits.status,
			signedAt: visits.signedAt,
		})
		.from(visits)
		.where(eq(visits.organizationId, ORG));
	console.log(
		`       приёмы: создано ${visitRun.run.loadedRows}, карантин ${visitRun.run.quarantinedRows}`,
	);
	console.log(
		`       в базе: ${loadedVisits.map((v) => `${v.status}/${v.diagnosis}`).join(" | ")}`,
	);
	same("создано 2 приёма", loadedVisits.length, 2);
	check(
		"жалобы перенесены дословно",
		loadedVisits.some((v) => v.complaint === "Боль при накусывании на 16"),
	);
	check(
		"диагноз перенесён",
		loadedVisits.some((v) => v.diagnosis === "K04.0 Пульпит"),
	);
	check(
		"перенесённый приём закрыт, а не оставлен черновиком",
		loadedVisits.every((v) => v.status === "signed"),
		loadedVisits.map((v) => v.status).join(","),
	);
	check(
		"время приёма сохранено в подписи",
		loadedVisits.some(
			(v) => v.signedAt !== null && asMoscow(v.signedAt).endsWith("14:30"),
		),
		loadedVisits
			.map((v) => (v.signedAt ? asMoscow(v.signedAt) : "null"))
			.join(", "),
	);

	console.log(
		"--- 12. Изоляция строки: отказ базы по одной строке не уносит остальные",
	);
	/**
	 * Ситуация настоящая, а не выдуманная: карточка пациента удалена вручную уже
	 * после переноса, а соответствие «ключ старой системы → uuid» осталось.
	 * Следующая выгрузка платежей сошлётся на удалённый uuid, и внешний ключ
	 * payments.patient_id отвергнет ровно эту строку.
	 *
	 * Раньше try/catch стоял вокруг всей партии, и такая строка уносила с собой
	 * все 500 строк партии. Проверяем, что теперь падает только она.
	 */
	const [victimLink] = await db
		.select({
			target: migrationEntityLinks.targetEntityId,
			sourceId: migrationEntityLinks.sourceEntityId,
		})
		.from(migrationEntityLinks)
		.where(
			and(
				eq(migrationEntityLinks.organizationId, ORG),
				eq(migrationEntityLinks.entityKind, "patient"),
			),
		)
		.limit(1);

	if (!victimLink) {
		check(
			"подготовка проверки изоляции",
			false,
			"не найдено ни одной ссылки пациента",
		);
	} else {
		// Удаляем карточку, оставляя ссылку висеть в никуда.
		await db
			.delete(appointments)
			.where(eq(appointments.patientId, victimLink.target));
		await db.delete(visits).where(eq(visits.patientId, victimLink.target));
		await db.delete(patients).where(eq(patients.id, victimLink.target));

		const brokenSourceId = victimLink.sourceId.replace(/^id:/, "");
		const isolationCsv = [
			"Код;Пациент;Сумма;Дата оплаты;Способ оплаты",
			`8001;${brokenSourceId};1 000,00;01.04.2020;карта`,
			"8002;102;2 000,00;02.04.2020;карта",
			"8003;103;3 000,00;03.04.2020;наличными",
		].join("\n");

		const isolationRun = await runMigration({
			...base,
			sourceName: "оплаты-изоляция.csv",
			rawText: isolationCsv,
			dryRun: false,
			requestedEntityKind: "payment",
		});
		console.log(
			`       создано ${isolationRun.run.loadedRows}, карантин ${isolationRun.run.quarantinedRows}, отказов ${isolationRun.run.sourceRows - isolationRun.run.loadedRows - isolationRun.run.duplicateRows}`,
		);

		const isolationPayments = await db
			.select({ amountRub: payments.amountRub })
			.from(payments)
			.where(eq(payments.organizationId, ORG));
		const amounts = isolationPayments
			.map((p) => p.amountRub)
			.sort((a, b) => a - b);
		console.log(`       суммы в базе: ${amounts.join(", ")}`);

		// Две исправные строки обязаны загрузиться, несмотря на отказ третьей.
		check(
			"исправные строки партии загружены",
			amounts.includes(2000) && amounts.includes(3000),
			amounts.join(", "),
		);
		check(
			"строка с битой ссылкой не загружена",
			!amounts.includes(1000),
			amounts.join(", "),
		);

		const isolationQ = await listQuarantine(ORG, isolationRun.run.runId, 20);
		for (const q of isolationQ) {
			console.log(
				`       строка ${q.sourceRowNumber} [${q.reason}]: ${q.message.slice(0, 100)}`,
			);
		}
		check(
			"отказ базы записан как причина карантина именно для этой строки",
			isolationQ.some(
				(q) =>
					q.reason === "target_write_failed" || q.reason === "broken_reference",
			),
			isolationQ.map((q) => `${q.sourceRowNumber}:${q.reason}`).join(", "),
		);
		check(
			"сверка видит все три строки, ни одна не потеряна",
			isolationRun.reconciliation.checks.find(
				(c) => c.code === "row_conservation",
			)?.passed === true,
			isolationRun.reconciliation.checks.find(
				(c) => c.code === "row_conservation",
			)?.detail ?? "",
		);
	}

	console.log("--- 13. DBF в cp866 через тот же движок");
	const dbf = buildDbfFile(
		[
			{ name: "NKART", type: "I", length: 4 },
			{ name: "FIO", type: "C", length: 40 },
			{ name: "TEL", type: "C", length: 20 },
			{ name: "DROJD", type: "D", length: 8 },
		],
		[
			["201", "Морозов Сергей Иванович", "89012223344", "19700515"],
			["202", "Волкова Анна Петровна", "89023334455", "19851120"],
		],
		{ languageDriver: 0x65, encoding: "ibm866" },
	);
	const dbfRun = await runMigration({
		...base,
		sourceName: "PACIENT.DBF",
		contentBase64: dbf.toString("base64"),
		dryRun: false,
	});
	same("вид источника", dbfRun.run.sourceKind, "dbf");
	const [dbfRunRow] = await db
		.select({ encoding: migrationRuns.detectedEncoding })
		.from(migrationRuns)
		.where(eq(migrationRuns.id, dbfRun.run.runId));
	same("кодировка взята из заголовка DBF", dbfRunRow?.encoding, "ibm866");
	const dbfPatients = await db
		.select({ fullName: patients.fullName })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, ORG),
				sql`${patients.fullName} like 'Морозов%' or ${patients.fullName} like 'Волкова%'`,
			),
		);
	console.log(
		`       из DBF: ${dbfPatients.map((p) => p.fullName).join(", ")}`,
	);
	same(
		"кириллица из cp866 не испорчена",
		dbfPatients.map((p) => p.fullName).sort(),
		["Волкова Анна Петровна", "Морозов Сергей Иванович"],
	);
} finally {
	console.log("\n--- Уборка тестовых данных");
	// Порядок удаления от зависимых к тем, на кого ссылаются.
	await db.delete(payments).where(eq(payments.organizationId, ORG));
	await db.delete(visits).where(eq(visits.organizationId, ORG));
	await db.delete(appointments).where(eq(appointments.organizationId, ORG));
	const runs = await db
		.select({ id: migrationRuns.id })
		.from(migrationRuns)
		.where(eq(migrationRuns.organizationId, ORG));
	for (const run of runs) {
		await db
			.delete(migrationQuarantineRecords)
			.where(eq(migrationQuarantineRecords.runId, run.id));
		await db
			.delete(migrationStagingRecords)
			.where(eq(migrationStagingRecords.runId, run.id));
	}
	await db
		.delete(migrationEntityLinks)
		.where(eq(migrationEntityLinks.organizationId, ORG));
	await pool.query(
		"delete from migration_reconciliations where organization_id = $1",
		[ORG],
	);
	await pool.query("delete from audit_events where organization_id = $1", [
		ORG,
	]);
	await db.delete(migrationRuns).where(eq(migrationRuns.organizationId, ORG));
	await db.delete(patients).where(eq(patients.organizationId, ORG));
	await db.delete(organizations).where(eq(organizations.id, ORG));
	console.log("Убрано.");
	console.log(`\n${pass} passed, ${fail} failed`);
	await pool.end();
	process.exit(fail ? 1 : 0);
}
