import {
	type CreatePatientInput,
	type Patient,
	patientSchema,
	type UpdatePatientAdministrativeProfileInput,
	type UpdatePatientInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import {
	buildPatientLedgers,
	MoneyPrecisionError,
	type PaymentRow,
	patientAccountBalanceKopecks,
	QuantityContractError,
	rublesFromKopecks,
	type TreatmentChargeRow,
} from "../money/patientDebt.js";
import {
	createPatient as createPatientInMemory,
	patients as inMemoryPatients,
	updatePatientAdministrativeProfile as updatePatientAdministrativeProfileInMemory,
	updatePatient as updatePatientInMemory,
} from "../sampleData.js";
import { db } from "./client.js";
import * as schema from "./schema.js";

function useInMemory(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * САЛЬДО КАРТОЧКИ ПАЦИЕНТА — ИЗ ЕДИНОГО ДОМА ФОРМУЛЫ ДОЛГА.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. В `rowToPatient` стояло `balanceRub: 0` — не
 * формула, а константа. То есть API картотеки утверждал, что клинике не должен
 * никто и клиника не должна никому. Замер боевым маршрутом `GET /api/patients`
 * на клинике `d0000000-…-d001` (2026-07-29): 14 пациентов, `balanceRub = 0` у
 * ВСЕХ, тогда как прямой SQL по той же клинике даёт четыре ненулевых сальдо —
 * `…0103` и `…0104` должны по 26 500,00 ₽, `…0100` и `…0101` переплатили по
 * 800,00 ₽. Администратор, открывший карточку перед звонком, видел ноль у
 * должника на 26 500 ₽.
 *
 * ВТОРОЙ ФОРМУЛЫ ЗДЕСЬ НЕ ЗАВЕДЕНО. Считает `money/patientDebt.ts` —
 * единственный дом этого вопроса; разбор всех девяти прежних расчётов и порядок
 * переезда — `.agents/lead/recon-debt-formula-sprawl.md`. В этом файле осталась
 * только пересадка строк базы в строки модуля и один SELECT на денежную таблицу.
 *
 * ЗНАК. Поле `Patient.balanceRub` объявлено контрактом как «оплачено минус
 * запланировано, отрицательное — долг» (`packages/shared/src/index.ts`), и тот
 * же знак печатает второй живой производитель этого поля —
 * `db/domainStateHydration.ts`. Поэтому берётся `patientAccountBalanceKopecks`,
 * а не канонический `patientOwesClinicKopecks`: иначе один и тот же пациент был
 * бы должником в картотеке и переплатившим в сводке.
 *
 * ЧТО ОЗНАЧАЕТ ОТВЕТ. Для КАЖДОГО запрошенного пациента в ответе есть запись:
 *   • число — сальдо посчитано;
 *   • `null` — посчитать не удалось, и это НЕ ноль (см. ниже);
 *   • число 0 бывает двух видов, и оба — измеренный ноль: у пациента нет ни
 *     одной денежной строки, либо все его позиции отменены и оплат нет.
 *
 * ПОЧЕМУ ОТКАЗ ИЗОЛИРУЕТСЯ ПО ПАЦИЕНТУ, А НЕ РОНЯЕТ СПИСОК. Модуль отвергает
 * суммы, потерявшие точность, и количество, нарушающее общий контракт
 * (`quantity: z.number().int().positive()`; колонка `numeric(10,2)` дробное
 * значение пропустит). Одна такая строка у одного пациента не должна лишать
 * клинику всей картотеки — это первый экран смены. Поэтому сальдо собирается по
 * пациенту отдельно, отказ пишется в журнал с именем пациента и причиной, а
 * остальные сальдо остаются точными.
 *
 * ЧЕСТНО О ГРАНИЦЕ, КОТОРУЮ ЗДЕСЬ НЕ ПЕРЕЙТИ. `balanceRub` объявлено
 * `moneyRubSchema.default(0)` — в этом поле нельзя выразить «не рассчитано», а
 * контракт правит другой агент. Значит для такого пациента карточка покажет 0,
 * то есть неизвестное напечатается нулём — ровно то, что запрещает
 * `tests/unknownIsNotZero.test.ts`. Единственное, что здесь можно сделать, — не
 * молчать: причина уходит в журнал целиком. Настоящее лечение — признак «сальдо
 * известно» рядом с суммой, и это долг, названный вслух, а не умолчание.
 *
 * СБОЙ БАЗЫ, В ОТЛИЧИЕ ОТ ГРЯЗНЫХ ДАННЫХ, НАРУЖУ ЛЕТИТ. Он означает, что
 * прочитать деньги нельзя вообще; молча отдать нули значило бы то же, против
 * чего написан весь остальной файл.
 */
async function patientAccountBalancesRub(
	organizationId: string,
	patientIds: readonly string[],
): Promise<Map<string, number | null>> {
	const balances = new Map<string, number | null>();
	if (patientIds.length === 0) return balances;

	/*
	 * Одна карточка — сужаем выборку по пациенту; список клиники — берём деньги
	 * организации одним проходом. Условие по организации стоит в ОБОИХ случаях:
	 * без него в сальдо попали бы строки чужой клиники.
	 */
	const singlePatientId = patientIds.length === 1 ? patientIds[0] : null;
	const chargeScope = singlePatientId
		? and(
				eq(schema.treatmentItems.organizationId, organizationId),
				eq(schema.treatmentItems.patientId, singlePatientId),
			)
		: eq(schema.treatmentItems.organizationId, organizationId);
	const paymentScope = singlePatientId
		? and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.patientId, singlePatientId),
			)
		: eq(schema.payments.organizationId, organizationId);

	const [chargeRows, paymentRows] = await Promise.all([
		db
			.select({
				patientId: schema.treatmentItems.patientId,
				status: schema.treatmentItems.status,
				unitPriceRub: schema.treatmentItems.unitPriceRub,
				quantity: schema.treatmentItems.quantity,
				discountRub: schema.treatmentItems.discountRub,
			})
			.from(schema.treatmentItems)
			.where(chargeScope),
		db
			.select({
				patientId: schema.payments.patientId,
				status: schema.payments.status,
				amountRub: schema.payments.amountRub,
			})
			.from(schema.payments)
			.where(paymentScope),
	]);

	/* Группировка по пациенту — один проход на таблицу. Фильтрация массива в
	   цикле по пациентам дала бы O(пациенты × строки): на клинике с тысячами
	   карт и десятками тысяч позиций это заметно на каждом открытии картотеки. */
	const chargesByPatient = new Map<string, TreatmentChargeRow[]>();
	for (const row of chargeRows) {
		const bucket = chargesByPatient.get(row.patientId);
		if (bucket) bucket.push(row);
		else chargesByPatient.set(row.patientId, [row]);
	}
	const paymentsByPatient = new Map<string, PaymentRow[]>();
	for (const row of paymentRows) {
		const bucket = paymentsByPatient.get(row.patientId);
		if (bucket) bucket.push(row);
		else paymentsByPatient.set(row.patientId, [row]);
	}

	for (const patientId of patientIds) {
		const charges = chargesByPatient.get(patientId) ?? [];
		const patientPayments = paymentsByPatient.get(patientId) ?? [];
		try {
			const ledger = buildPatientLedgers(charges, patientPayments).get(
				patientId,
			);
			/* Сальдо нет в ответе модуля, когда ни одна строка не пошла в зачёт:
			   нет денежных строк вовсе либо все позиции отменены и оплат нет. Это
			   ИЗМЕРЕННЫЙ ноль, и он обязан отличаться от «не рассчитано» ниже. */
			balances.set(
				patientId,
				ledger ? rublesFromKopecks(patientAccountBalanceKopecks(ledger)) : 0,
			);
		} catch (error) {
			if (
				error instanceof MoneyPrecisionError ||
				error instanceof QuantityContractError
			) {
				console.error(
					`[patientsQuery] Сальдо пациента ${patientId} (клиника ${organizationId}) не рассчитано: ${error.message} ` +
						"В карточке будет 0, потому что поле balanceRub контракта не умеет говорить «не рассчитано». " +
						"Это не измеренный ноль: почините строку денег, названную в причине.",
				);
				balances.set(patientId, null);
				continue;
			}
			throw error;
		}
	}
	return balances;
}

/**
 * Отметка времени из строки таблицы в ISO-строку.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ: раньше здесь стояло `p.createdAt.toISOString()`, и
 * строка без этого поля роняла запрос с «Cannot read properties of undefined
 * (reading 'toISOString')» изнутри Array.map — по такому сообщению невозможно
 * понять, ни какой пациент, ни какое поле. Драйвер к тому же отдаёт timestamptz
 * то объектом Date, то строкой, в зависимости от пути (RETURNING, JSON-обмен
 * между процессами), поэтому оба вида принимаются, а отсутствие значения
 * называется прямо.
 */
function rowTimestampToIso(
	value: unknown,
	field: string,
	patientId: unknown,
): string {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new Error(
				`Пациент ${String(patientId)}: поле ${field} содержит недопустимую дату.`,
			);
		}
		return value.toISOString();
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			throw new Error(
				`Пациент ${String(patientId)}: поле ${field} не разбирается как дата: ${value}`,
			);
		}
		return parsed.toISOString();
	}
	throw new Error(
		`Пациент ${String(patientId)}: в строке таблицы нет поля ${field}. ` +
			"Карточка не собрана: подставлять текущее время нельзя, оно исказит историю.",
	);
}

/** Maps a Drizzle $inferSelect row to a validated Patient DTO via Zod parse.
 *  No type assertions — Zod validates at the DB/API boundary and returns the typed object.
 *  Экспортируется, чтобы преобразование строки проверялось тестом напрямую.
 *
 *  `balanceRub` приходит вторым аргументом из `patientAccountBalancesRub`
 *  (единый дом формулы долга, `money/patientDebt.ts`): строка таблицы `patients`
 *  денег не содержит, поэтому вычислить сальдо здесь нечем.
 *
 *  `null` и отсутствующий аргумент означают «сальдо не передано»: поле в объект
 *  не кладётся вовсе, и его заполняет умолчание контракта
 *  (`moneyRubSchema.default(0)`). Раньше здесь стояла явная константа
 *  `balanceRub: 0` — она выглядела измеренным нулём и была им ноль раз из семи
 *  на живых данных. Все четыре боевых пути этого файла передают сальдо явно. */
export function rowToPatient(
	p: typeof schema.patients.$inferSelect,
	balanceRub: number | null = null,
): Patient {
	return patientSchema.parse({
		id: p.id,
		organizationId: p.organizationId,
		status: p.status,
		fullName: p.fullName,
		birthDate: p.birthDate,
		phone: p.phone,
		email: p.email,
		notes: p.notes,
		administrativeProfile: p.administrativeProfile ?? null,
		/*
		 * Привязка к семейной группе (общий кошелёк).
		 * БЫЛО: поле не отдавалось в DTO, даже если family_group_id был в строке
		 * таблицы. GET/PUT-ответ без familyGroupId заставлял UI считать, что
		 * пациент ни в какой семье, и предлагать создать вторую.
		 * СТАЛО: nullable UUID группы; null — пациент не состоит в семье.
		 */
		familyGroupId: p.familyGroupId ?? null,
		...(balanceRub === null ? {} : { balanceRub }),
		createdAt: rowTimestampToIso(p.createdAt, "created_at", p.id),
		updatedAt: rowTimestampToIso(p.updatedAt, "updated_at", p.id),
	});
}

export async function getPatientByIdFromDb(
	organizationId: string,
	id: string,
): Promise<Patient | null> {
	if (useInMemory()) {
		return (
			(inMemoryPatients.find((p) => p.id === id) as unknown as Patient) ?? null
		);
	}
	try {
		const [p] = await db
			.select()
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, id),
				),
			);
		if (!p) return null;
		const balances = await patientAccountBalancesRub(organizationId, [p.id]);
		return rowToPatient(p, balances.get(p.id) ?? null);
	} catch (error) {
		/* БЫЛО: `catch { return inMemoryPatients.find(...) }`. Любой сбой базы
		   (обрыв связи, таймаут, ошибка парсинга сальдо) подменял ответ
		   карточкой из глобального массива-образца — без фильтра по организации
		   и без реального сальдо. Маршрут GET /api/patients/:id отвечал 200 с
		   чужим ФИО/телефоном, а при отсутствии id в образце — null (404), хотя
		   в базе пациент есть. Регистратор видел «не того человека» или «карточка
		   пропала» и заводил дубль.
		   Тот же класс дефекта уже убран у getPatientsFromDb / createPatientInDb:
		   подмена памятью только в useInMemory(); живой сбой базы обязан дойти
		   до маршрута честной ошибкой. */
		console.error(
			"[patientsQuery] Не удалось прочитать карточку пациента из базы:",
			error,
		);
		throw error;
	}
}

export async function getPatientsFromDb(
	organizationId: string,
): Promise<Patient[]> {
	if (useInMemory()) {
		return inMemoryPatients as unknown as Patient[];
	}
	try {
		const pts = await db
			.select()
			.from(schema.patients)
			.where(eq(schema.patients.organizationId, organizationId));
		const balances = await patientAccountBalancesRub(
			organizationId,
			pts.map((p) => p.id),
		);
		return pts.map((p) => rowToPatient(p, balances.get(p.id) ?? null));
	} catch (error) {
		/* БЫЛО: при сбое базы возвращался глобальный массив-образец
		   inMemoryPatients. Он не отфильтрован по организации, то есть клиника
		   получала чужой список, и, что важнее, интерфейс показывал этот
		   список как настоящий: на экране «Пациенты» появлялись люди, которых
		   в клинике нет, а настоящие исчезали. По такому списку регистратор
		   мог записать на приём не того человека.
		   Молчаливая подмена данных в медицинской системе опаснее честной
		   ошибки. Режим работы без базы задаётся выше, в useInMemory(). */
		console.error(
			"[patientsQuery] Не удалось прочитать список пациентов из базы:",
			error,
		);
		throw error;
	}
}

export async function createPatientInDb(
	organizationId: string,
	input: CreatePatientInput,
): Promise<Patient> {
	if (useInMemory()) {
		return createPatientInMemory(input);
	}
	try {
		const [created] = await db
			.insert(schema.patients)
			.values({
				organizationId,
				fullName: input.fullName,
				birthDate: input.birthDate ?? null,
				phone: input.phone ?? null,
				email: input.email ?? null,
				notes: input.notes ?? null,
			})
			.returning();

		if (!created) throw new Error("Failed to create patient in DB");

		/* Ноль здесь ИЗМЕРЕН, а не подставлен: идентификатор выдан этой самой
		   вставкой, а treatment_items.patient_id и payments.patient_id — внешние
		   ключи на patients.id, поэтому ни одна денежная строка на него сослаться
		   ещё не могла. Запрос к деньгам был бы запросом с заранее известным
		   пустым ответом. */
		return rowToPatient(created, 0);
	} catch (error) {
		/* БЫЛО: `catch { return createPatientInMemory(input) }`. Любая ошибка
		   базы подменялась записью в оперативную память, и маршрут отвечал 201
		   с пациентом, которого в базе нет. Проверено на живом API: вставка с
		   недопустимым для PostgreSQL значением дала HTTP 201 и идентификатор
		   88679224-…, которому в таблице patients соответствует 0 строк.
		   Регистратор считает пациента созданным, а дальше по этому
		   идентификатору не откроется карточка, не пройдёт запись на приём и
		   не проведётся оплата.
		   Подмена памятью уместна только в режиме без базы — он выше, в
		   useInMemory(). Настоящий сбой базы обязан дойти до маршрута. */
		console.error("[patientsQuery] Не удалось создать пациента в базе:", error);
		throw error;
	}
}

export async function updatePatientInDb(
	organizationId: string,
	patientId: string,
	input: UpdatePatientInput,
): Promise<Patient | null> {
	if (useInMemory()) {
		/*
		 * ОТСУТСТВИЕ КАРТЫ — ЭТО `null`, А НЕ ИСКЛЮЧЕНИЕ.
		 *
		 * Подпись объявляет `Promise<Patient | null>`, и ветка базы ниже её
		 * соблюдает: `if (!updated) return null`. А память нет —
		 * `sampleData.updatePatient` БРОСАЕТ `Error("Пациент не найден")`.
		 *
		 * Цена этого расхождения измерена на маршруте: `routes/patients.ts:436`
		 * держит ветку `if (!patient) return sendPatientNotFound(reply)`, и она
		 * НЕДОСТИЖИМА — бросок улетает в `catch` строкой ниже, и оператор получает
		 * 500 с текстом «данные могли быть записаны». Дальше он делает то, что
		 * прямо описано в комментарии того же `catch`: считает, что не
		 * сохранилось, и заводит карточку заново. Появляется дубль уже
		 * существующего пациента — ровно тот дефект, против которого тот
		 * комментарий и написан.
		 *
		 * Проверка существования, а не перехват броска: перехват по тексту
		 * сообщения ломается от правки формулировки, а новый `try/catch` в `db/**`
		 * покраснел бы у стража переписи проглатывающих `catch`
		 * (`tests/noFabricatedDataFallback.test.ts` сверяет её РОВНЫМ равенством
		 * со списком долга).
		 *
		 * Отбор по клинике здесь не нужен и его тут нет: путь без базы держит одну
		 * организацию в памяти процесса. Межарендную проверку делает ветка базы —
		 * `organizationId` в её `where`, и причина этого названа ниже.
		 */
		if (!inMemoryPatients.some((candidate) => candidate.id === patientId))
			return null;
		return updatePatientInMemory(patientId, input);
	}
	try {
		/*
		 * БЫЛО: .set() принимал только fullName/birthDate/phone/email/notes.
		 * UI PatientFamilyCard шлёт PUT с { familyGroupId }, Zod после фикса
		 * контракта поле пропускает, а сюда оно не доходило — patients.family_group_id
		 * никогда не менялся. Создание семьи оставляло пустые группы; оплата с
		 * семейного кошелька падала с 400 «Patient is not a member of this family group».
		 * СТАЛО: если familyGroupId передан — пишем его (null = отвязать). Перед
		 * привязкой проверяем, что группа существует в ЭТОЙ организации: иначе
		 * можно было бы привязать пациента к чужой клинике по угаданному UUID.
		 */
		const updateData: {
			fullName?: string;
			birthDate?: string | null;
			phone?: string | null;
			email?: string | null;
			notes?: string | null;
			familyGroupId?: string | null;
			updatedAt: Date;
		} = {
			updatedAt: new Date(),
		};
		if (input.fullName !== undefined) updateData.fullName = input.fullName;
		if (input.birthDate !== undefined) updateData.birthDate = input.birthDate;
		if (input.phone !== undefined) updateData.phone = input.phone;
		if (input.email !== undefined) updateData.email = input.email;
		if (input.notes !== undefined) updateData.notes = input.notes;

		if (input.familyGroupId !== undefined) {
			/*
			 * Нельзя «перепрыгнуть» из семьи A в семью B одним PUT.
			 * БЫЛО: updatePatientInDb просто писал новый family_group_id —
			 * пациент исчезал из members A без аудита и без проверки, что
			 * оператор осознанно отвязал. UI «Присоединить к семье» мог
			 * утащить главу чужой семьи в новую группу одним кликом.
			 * СТАЛО: смена на ДРУГОЙ UUID при уже ненулевом familyGroupId →
			 * ошибка; сначала familyGroupId: null, потом привязка к новой.
			 * null и тот же UUID (идемпотентный re-link после create) — ок.
			 */
			const [current] = await db
				.select({ familyGroupId: schema.patients.familyGroupId })
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.id, patientId),
						eq(schema.patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (
				current?.familyGroupId &&
				input.familyGroupId !== null &&
				input.familyGroupId !== current.familyGroupId
			) {
				throw new Error(
					"Пациент уже состоит в другой семейной группе. Сначала отвяжите его (familyGroupId: null), затем привяжите к новой.",
				);
			}

			if (input.familyGroupId !== null) {
				const [family] = await db
					.select({ id: schema.familyGroups.id })
					.from(schema.familyGroups)
					.where(
						and(
							eq(schema.familyGroups.id, input.familyGroupId),
							eq(schema.familyGroups.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!family) {
					throw new Error(
						"Указанная семейная группа не найдена в вашей организации",
					);
				}
			}
			updateData.familyGroupId = input.familyGroupId;
		}

		const [updated] = await db
			.update(schema.patients)
			.set(updateData)
			/* organizationId обязателен в условии. Без него запись шла только
			   по идентификатору пациента, и клиника переписывала карточку
			   чужой клиники: проверено на живой базе — PUT /api/patients/<uuid
			   чужого пациента> с токеном первой клиники вернул 200 и заменил
			   ФИО и телефон в чужой организации. */
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, patientId),
				),
			)
			.returning();

		if (!updated) return null;

		/* Сальдо перечитывается и здесь. Правка ФИО или телефона денег не меняет,
		   но ответ этого маршрута — полная карточка пациента, и она уходит на
		   экран: отдать в ней ноль значило бы гасить долг нажатием «Сохранить» в
		   анкете. У пациента с долгом 6 000,00 ₽ так и было бы — проверено
		   маршрутом PUT /api/patients/:id в tests/routes/patientCardBalanceIsReal. */
		const balances = await patientAccountBalancesRub(organizationId, [
			updated.id,
		]);
		return rowToPatient(updated, balances.get(updated.id) ?? null);
	} catch (error) {
		/* См. комментарий в createPatientInDb. Здесь подмена памятью давала
		   HTTP 200 с объектом пациента при том, что в базе не менялось ничего:
		   правка теряется молча и обнаруживается только после перезагрузки
		   карточки. Маршрут уже умеет отвечать честно — «Не удалось сохранить
		   изменения», — но получал успех вместо ошибки. */
		console.error(
			"[patientsQuery] Не удалось обновить пациента в базе:",
			error,
		);
		throw error;
	}
}

export async function updatePatientAdministrativeProfileInDb(
	organizationId: string,
	patientId: string,
	input: UpdatePatientAdministrativeProfileInput,
): Promise<Patient | null> {
	if (useInMemory()) {
		return updatePatientAdministrativeProfileInMemory(patientId, input);
	}
	try {
		/*
		 * БЫЛО: .set({ administrativeProfile: input }) — целиком перезаписывал
		 * JSONB partial-пейлоадом. Маршрут patients.ts уже мержит existing+input
		 * перед вызовом, но любой другой вызывающий (и будущий) мог снова
		 * стереть ИНН/представителя/loyaltyTier одним PUT с одним полем.
		 * sampleData.updatePatientAdministrativeProfile мержит сам; DB-ветка
		 * этого не делала — расхождение путей.
		 * СТАЛО: читаем текущий профиль в той же организации, мержим, пишем
		 * merged. Partial wipe невозможен даже без merge на маршруте.
		 */
		const [current] = await db
			.select({
				administrativeProfile: schema.patients.administrativeProfile,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, patientId),
				),
			)
			.limit(1);

		if (!current) return null;

		const existingProfile =
			current.administrativeProfile &&
			typeof current.administrativeProfile === "object" &&
			!Array.isArray(current.administrativeProfile)
				? (current.administrativeProfile as Record<string, unknown>)
				: {};
		const mergedProfile = {
			...existingProfile,
			...(input as Record<string, unknown>),
		};

		const [updated] = await db
			.update(schema.patients)
			.set({
				administrativeProfile:
					mergedProfile as (typeof schema.patients.$inferSelect)["administrativeProfile"],
				updatedAt: new Date(),
			})
			/* Тот же пропуск, что и в updatePatientInDb. Здесь маршрут сейчас
			   прикрыт проверкой getPatientByIdFromDb(orgId, ...) перед вызовом,
			   но полагаться на порядок вызовов в маршруте нельзя: ограничение
			   области принадлежит запросу. */
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, patientId),
				),
			)
			.returning();

		if (!updated) return null;

		/* Та же причина, что в updatePatientInDb: ответ — полная карточка, и
		   сальдо в ней обязано быть настоящим, а не нулём после правки анкеты. */
		const balances = await patientAccountBalancesRub(organizationId, [
			updated.id,
		]);
		return rowToPatient(updated, balances.get(updated.id) ?? null);
	} catch (error) {
		/* См. комментарий в createPatientInDb: сбой базы не должен выглядеть
		   как успешное сохранение административного профиля. */
		console.error(
			"[patientsQuery] Не удалось обновить профиль пациента в базе:",
			error,
		);
		throw error;
	}
}

export async function createPatientSafeInDb(
	organizationId: string,
	input: CreatePatientInput,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	duplicateCheckFn: (patients: any[], input: CreatePatientInput) => any,
): Promise<
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	{ type: "duplicate"; duplicate: any } | { type: "success"; patient: Patient }
> {
	if (useInMemory()) {
		const dbPatients = await getPatientsFromDb(organizationId);
		const duplicate = duplicateCheckFn(dbPatients, input);
		if (duplicate) return { type: "duplicate", duplicate };
		return {
			type: "success",
			patient: await createPatientInDb(organizationId, input),
		};
	}

	return await db.transaction(async (tx) => {
		const rawPatients = await tx
			.select()
			.from(schema.patients)
			.where(eq(schema.patients.organizationId, organizationId));

		const duplicate = duplicateCheckFn(rawPatients, input);
		if (duplicate) return { type: "duplicate", duplicate };

		const [created] = await tx
			.insert(schema.patients)
			.values({
				organizationId,
				fullName: input.fullName,
				birthDate: input.birthDate ?? null,
				phone: input.phone ?? null,
				email: input.email ?? null,
				notes: input.notes ?? null,
			})
			.returning();

		if (!created) throw new Error("Failed to create patient in DB");

		return { type: "success", patient: rowToPatient(created, 0) };
	});
}
