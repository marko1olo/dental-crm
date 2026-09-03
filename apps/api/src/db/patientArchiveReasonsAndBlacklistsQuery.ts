import { and, eq, or } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists, patients } from "./schema.js";
import {
	nameFuzzySimilarity,
	nameKey,
} from "../services/patients/duplicateDetection.js";

export const inMemoryBlacklist = new Set<string>();

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
			.select({ fullName: patients.fullName, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);
		if (patientRow?.status === "archived") {
			return true;
		}
		if (patientRow?.fullName) {
			fullName = patientRow.fullName.trim();
		}

		const rows = await db
			.select({
				id: patientArchiveReasonsAndBlacklists.id,
				patientId: patientArchiveReasonsAndBlacklists.patientId,
				patientName: patientArchiveReasonsAndBlacklists.patientName,
			})
			.from(patientArchiveReasonsAndBlacklists)
			.where(
				and(
					eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
					eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
				),
			);

		if (rows.some((r) => r.patientId === patientId)) {
			return true;
		}

		if (fullName) {
			const blockedByName = rows.some((b) => {
				if (!b.patientName) return false;
				if (b.patientName.trim().toLowerCase() === fullName.toLowerCase()) return true;
				if (nameKey(b.patientName) === nameKey(fullName)) return true;
				return nameFuzzySimilarity(b.patientName, fullName) >= 0.85;
			});
			if (blockedByName) {
				return true;
			}
		}

		return false;
	} catch (_err) {
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
 * Проверка блокировки записи с получением детальной причины и правового основания (323-ФЗ).
 */
export async function checkPatientBookingBlockDetails(
	orgId: string,
	patientId: string,
): Promise<{ isBlocked: boolean; reason?: string; legalBasis?: string }> {
	if (inMemoryBlacklist.has(`${orgId}:${patientId}`)) {
		return {
			isBlocked: true,
			reason: "Внесен в архив / черный список клиники",
			legalBasis: "Федеральный закон от 21.11.2011 № 323-ФЗ",
		};
	}
	try {
		let fullName = "";
		const [patientRow] = await db
			.select({ fullName: patients.fullName, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (patientRow?.fullName) {
			fullName = patientRow.fullName.trim();
		}

		const conditions = [
			eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
			eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
		];

		const rows = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(and(...conditions));

		let blockedRow = rows.find((r) => r.patientId === patientId);

		if (!blockedRow && fullName) {
			blockedRow = rows.find((b) => {
				if (!b.patientName) return false;
				if (b.patientName.trim().toLowerCase() === fullName.toLowerCase()) return true;
				if (nameKey(b.patientName) === nameKey(fullName)) return true;
				return nameFuzzySimilarity(b.patientName, fullName) >= 0.85;
			});
		}

		if (blockedRow) {
			inMemoryBlacklist.add(`${orgId}:${patientId}`);
			return {
				isBlocked: true,
				reason:
					blockedRow.archiveReason ||
					blockedRow.blacklistReason ||
					"Архив",
				legalBasis:
					blockedRow.legalBasis ||
					"Федеральный закон от 21.11.2011 № 323-ФЗ",
			};
		}

		if (patientRow?.status === "archived") {
			inMemoryBlacklist.add(`${orgId}:${patientId}`);
			return {
				isBlocked: true,
				reason: "Карта пациента находится в архиве",
				legalBasis:
					"Приказ Минздрава России от 15.12.2014 № 834н (архивный статус формы 043/у)",
			};
		}

		return { isBlocked: false };
	} catch (_err) {
		throw new Error(
			"Не удалось проверить, не внесён ли пациент в архив / чёрный список: база не ответила. " +
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
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			);

		// Insert archive reason
		await tx.insert(patientArchiveReasonsAndBlacklists).values({
			organizationId: orgId,
			patientId: patientId,
			patientName: patientName || "Пациент",
			archiveReason: archiveReason,
			isBlacklisted: isBlacklisted,
			blacklistReason: blacklistReason || null,
			isBookingBlocked: isBlacklisted,
			warningBadge: isBlacklisted
				? "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)"
				: "📁 АРХИВ",
			archivedBy: userId,
		});

		if (isBlacklisted) {
			inMemoryBlacklist.add(`${orgId}:${patientId}`);
		}
	});
}
