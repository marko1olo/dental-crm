import { and, eq, or } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists, patients } from "./schema.js";

const inMemoryBlacklist = new Set<string>();

export async function getPatientArchiveReasonsAndBlacklistsFromDb(
	orgId: string,
	_patientId?: string,
) {
	return db
		.select()
		.from(patientArchiveReasonsAndBlacklists)
		.where(eq(patientArchiveReasonsAndBlacklists.organizationId, orgId));
}

/**
 * Внесён ли пациент в чёрный список с запретом записи.
 *
 * ПОЧЕМУ ЭТА ПРОВЕРКА ТЕПЕРЬ ПАДАЕТ, А НЕ ОТВЕЧАЕТ «НЕ ЗАПРЕЩЕНО».
 *
 * Здесь стояли два глушителя ошибок, и оба давали ответ в сторону «разрешено»:
 *   1. внешний catch возвращал inMemoryBlacklist.has(...) — набор в памяти
 *      процесса, который после перезапуска сервера ПУСТ. То есть любой сбой базы
 *      превращался в «пациент не в чёрном списке»;
 *   2. внутренний catch вокруг чтения ФИО молча оставлял имя пустым, и правило
 *      чёрного списка ПО ИМЕНИ переставало применяться — а по имени как раз и
 *      ловится человек, которого завели новой карточкой.
 * Вместе это означало: клиника внесла человека в чёрный список, база икнула — и
 * запись на приём прошла.
 *
 * Чёрный список — защита персонала и других пациентов. Отвечать «разрешено», когда
 * проверить не удалось, здесь недопустимо: ошибка в эту сторону приводит в клинику
 * того, кого решили не принимать, а ошибка в другую сторону всего лишь просит
 * повторить попытку.
 *
 * ДОСТУПНОСТЬ ОТ ЭТОГО НЕ СТРАДАЕТ, и это главный довод, а не смелость. Единственный
 * вызов — createAppointmentInDb (db/appointmentsQuery.ts:126), и сразу после проверки
 * он ВСТАВЛЯЕТ строку в ту же базу. Если база недоступна, запись не создалась бы и
 * так: прежний «мягкий» ответ не давал работать дальше, он лишь подменял причину
 * отказа на неверную. Падение здесь ничего не отнимает и убирает ложный ответ.
 *
 * Набор в памяти оставлен, но ТОЛЬКО как быстрый ответ «да, запрещено» — проверка
 * первой строкой. В эту сторону он безопасен: разрешить лишнего он не может.
 */
export async function isPatientBookingBlocked(
	orgId: string,
	patientId: string,
): Promise<boolean> {
	if (inMemoryBlacklist.has(`${orgId}:${patientId}`)) {
		return true;
	}
	try {
		let fullName = "";
		const [patientRow] = await db
			.select({ fullName: patients.fullName })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);
		if (patientRow && patientRow.fullName) {
			fullName = patientRow.fullName.trim();
		}

		const conditions = [
			eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
			eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
		];

		const matchRules = [
			eq(patientArchiveReasonsAndBlacklists.patientId, patientId),
		];
		if (fullName) {
			matchRules.push(
				eq(patientArchiveReasonsAndBlacklists.patientName, fullName),
			);
		}

		const rows = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(and(...conditions, or(...matchRules)))
			.limit(1);

		return rows.length > 0;
	} catch (err) {
		/*
		 * Текст предназначен администратору у стойки, поэтому называет и причину, и
		 * последствие, и следующий шаг. Молча пропустить запись нельзя, но и пугать
		 * его словом «исключение» незачем.
		 */
		throw new Error(
			"Не удалось проверить, не внесён ли пациент в чёрный список: база не ответила. " +
				"Запись не создана — повторите через минуту, а если не поможет, позовите администратора.",
		);
	}
}

/**
 * Запись/снятие запрета записи (чёрный список).
 *
 * БЫЛО: inMemoryBlacklist менялся ДО обращения к базе, а любая ошибка
 * INSERT/DELETE глоталась пустым catch («safe in-memory fallback»).
 * Маршрут patients archive-status уже перечитывает базу и отвечает 500,
 * если строка не совпала — но набор в памяти оставался рассинхронен:
 *   • INSERT упал → ключ в памяти, базы нет → isPatientBookingBlocked
 *     до перезапуска запрещал запись «из ниоткуда»;
 *   • DELETE упал → ключ из памяти снят, строка в базе жива → до
 *     перезапуска быстрый путь «запрещено» не срабатывал (чтение БД
 *     ещё спасало, но при сбое БД чтение падает fail-closed, а память
 *     уже «разрешила»).
 * СТАЛО: сначала база; память только после успеха; ошибка пробрасывается.
 */
export async function setPatientArchiveStatusInDb(
	orgId: string,
	patientId: string,
	isBlacklisted: boolean,
	patientName?: string,
) {
	if (isBlacklisted) {
		await db.insert(patientArchiveReasonsAndBlacklists).values({
			organizationId: orgId,
			patientId: patientId,
			patientName: patientName || "Пациент",
			archiveReason: "Внесен в черный список администратором",
			isBookingBlocked: true,
			warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)",
		});
		inMemoryBlacklist.add(`${orgId}:${patientId}`);
	} else {
		await db
			.delete(patientArchiveReasonsAndBlacklists)
			.where(
				and(
					eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
					or(
						eq(patientArchiveReasonsAndBlacklists.patientId, patientId),
						eq(
							patientArchiveReasonsAndBlacklists.patientName,
							patientName || "",
						),
					),
				),
			);
		inMemoryBlacklist.delete(`${orgId}:${patientId}`);
	}
}

export async function archivePatientInDb(
	orgId: string,
	patientId: string,
	patientName: string | undefined,
	archiveReason: string,
	isBlacklisted: boolean,
	blacklistReason: string,
	userId: string | null,
) {
	await db.transaction(async (tx) => {
		// Update patient status
		await tx
			.update(patients)
			.set({ status: "archived" })
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)));

		// Insert archive reason
		await tx.insert(patientArchiveReasonsAndBlacklists).values({
			organizationId: orgId,
			patientId: patientId,
			patientName: patientName || "Пациент",
			archiveReason: archiveReason,
			isBlacklisted: isBlacklisted,
			blacklistReason: blacklistReason || null,
			isBookingBlocked: isBlacklisted,
			warningBadge: isBlacklisted ? "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)" : "📁 АРХИВ",
			archivedBy: userId,
		});

		if (isBlacklisted) {
			inMemoryBlacklist.add(`${orgId}:${patientId}`);
		}
	});
}
