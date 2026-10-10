import {
	type CreatePatientInput,
	type Patient,
	patientSchema,
	type UpdatePatientAdministrativeProfileInput,
	type UpdatePatientInput,
} from "@dental/shared";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import {
	convertQwertyMistype,
	phoneKey,
	transliterateLatinToCyrillic,
} from "../../services/patients/duplicateDetection.js";
import {
	createPatient as createPatientInMemory,
	patients as inMemoryPatients,
	updatePatientAdministrativeProfile as updatePatientAdministrativeProfileInMemory,
	updatePatient as updatePatientInMemory,
} from "../../sampleData.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { patientAccountBalancesRub } from "./patientBalanceAndDebtsQuery.js";
import type { GetPatientsOptions } from "./types.js";

export function useInMemory(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
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
export function rowTimestampToIso(
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
		weightKg:
			p.weightKg !== null && p.weightKg !== undefined && p.weightKg !== ""
				? Number(p.weightKg)
				: null,
		administrativeProfile: p.administrativeProfile ?? null,
		/*
		 * Привязка к семейной группе (общий кошелёк).
		 * БЫЛО: поле не отдавалось в DTO, даже если family_group_id был в строке
		 * таблицы. GET/PUT-ответ без familyGroupId заставлял UI считать, что
		 * пациент ни в какой семье, и предлагать создать вторую.
		 * СТАЛО: nullable UUID группы; null — пациент не состоит в семье.
		 */
		familyGroupId: p.familyGroupId ?? null,
		mergedIntoPatientId: p.mergedIntoPatientId ?? null,
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
	options: GetPatientsOptions = {},
): Promise<Patient[]> {
	if (useInMemory()) {
		let list = inMemoryPatients as unknown as Patient[];
		if (!options.includeMerged) {
			list = list.filter((p) => !p.mergedIntoPatientId);
		}
		if (options.search && options.search.trim().length > 0) {
			const qLower = options.search.trim().toLowerCase();
			const qwertySearch = convertQwertyMistype(qLower);
			const translitSearch = transliterateLatinToCyrillic(qLower);
			const searchDigits = qLower.replace(/\D/g, "");
			const searchPk = phoneKey(qLower);

			list = list.filter((p: any) => {
				const nameStr = typeof p.fullName === "string" ? p.fullName : "";
				const nameLower = nameStr.toLowerCase();
				const nameMatch =
					nameLower.includes(qLower) ||
					(qwertySearch !== qLower && nameLower.includes(qwertySearch)) ||
					(translitSearch !== qLower && nameLower.includes(translitSearch));

				const pPhone = typeof p.phone === "string" ? p.phone : "";
				const phoneDigits = pPhone.replace(/\D/g, "");
				const phonePk = phoneKey(pPhone);
				const phoneMatch =
					pPhone.toLowerCase().includes(qLower) ||
					(searchDigits.length >= 4 && phoneDigits.includes(searchDigits)) ||
					(searchPk !== null && phonePk !== null && searchPk === phonePk);

				const pEmail = typeof p.email === "string" ? p.email : "";
				const emailMatch = pEmail.toLowerCase().includes(qLower);
				return Boolean(nameMatch || phoneMatch || emailMatch);
			});
		}
		if (options.offset !== undefined && options.offset > 0) {
			list = list.slice(options.offset);
		}
		if (options.limit !== undefined && options.limit > 0) {
			list = list.slice(0, options.limit);
		}
		return list;
	}
	try {
		const baseFilter = eq(schema.patients.organizationId, organizationId);
		const conditions = [baseFilter];
		if (!options.includeMerged) {
			conditions.push(isNull(schema.patients.mergedIntoPatientId));
		}
		if (options.search && options.search.trim().length > 0) {
			const raw = options.search.trim();
			const s = `%${raw}%`;
			const qwerty = convertQwertyMistype(raw);
			const translit = transliterateLatinToCyrillic(raw);
			const rawDigits = raw.replace(/\D/g, "");

			const searchOr = [
				ilike(schema.patients.fullName, s),
				ilike(schema.patients.phone, s),
				ilike(schema.patients.email, s),
			];
			if (qwerty !== raw) {
				searchOr.push(ilike(schema.patients.fullName, `%${qwerty}%`));
			}
			if (translit !== raw && translit !== qwerty) {
				searchOr.push(ilike(schema.patients.fullName, `%${translit}%`));
			}
			if (rawDigits.length >= 4) {
				searchOr.push(ilike(schema.patients.phone, `%${rawDigits}%`));
			}
			conditions.push(or(...searchOr)!);
		}
		const whereClause = and(...conditions);
		let ptsQuery: any = db
			.select()
			.from(schema.patients)
			.where(whereClause);

		if (typeof ptsQuery.orderBy === "function" && (options.limit !== undefined || options.search)) {
			ptsQuery = ptsQuery.orderBy(desc(schema.patients.createdAt));
		}
		if (options.limit !== undefined && options.limit > 0 && typeof ptsQuery.limit === "function") {
			ptsQuery = ptsQuery.limit(options.limit);
		}
		if (options.offset !== undefined && options.offset > 0 && typeof ptsQuery.offset === "function") {
			ptsQuery = ptsQuery.offset(options.offset);
		}

		const pts = await ptsQuery;

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
				weightKg:
					input.weightKg !== undefined && input.weightKg !== null
						? String(input.weightKg)
						: null,
				administrativeProfile: (input.administrativeProfile as any) ?? null,
			})
			.returning();

		if (!created) throw new Error("Не удалось создать карточку пациента в базе данных");

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
			weightKg?: string | null;
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
		if (input.weightKg !== undefined)
			updateData.weightKg =
				input.weightKg !== null ? String(input.weightKg) : null;

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
