import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { inMemoryBlacklist } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import {
	patientArchiveReasons,
	patientArchiveReasonsAndBlacklists,
	patients,
} from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";

export interface ArchiveReasonDto {
	id: string;
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	legalBasis: string;
	isBookingBlocked: boolean;
	requiresDocumentation: boolean;
	isDefault: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const DEFAULT_323_FZ_ARCHIVE_REASONS = [
	{
		code: "RELOCATION",
		name: "Смена места жительства / переезд в другой регион",
		description:
			"Пациент переехал на постоянное место жительства в другой субъект РФ или за пределы РФ",
		legalBasis:
			"Федеральный закон от 21.11.2011 № 323-ФЗ, ст. 21 (Выбор гражданином медицинской организации)",
		isBookingBlocked: true,
		requiresDocumentation: false,
		isDefault: true,
	},
	{
		code: "REFUSAL_OF_CARE",
		name: "Отказ пациента от медицинского вмешательства / расторжение договора",
		description:
			"Письменный отказ пациента от продолжения лечения или расторжение договора на оказание платных медицинских услуг",
		legalBasis:
			"Федеральный закон от 21.11.2011 № 323-ФЗ, ст. 20; Гражданский кодекс РФ, ст. 782",
		isBookingBlocked: true,
		requiresDocumentation: true,
		isDefault: true,
	},
	{
		code: "DECEASED",
		name: "Смерть пациента",
		description:
			"Фиксация факта смерти пациента со сдачей амбулаторной карты 043/у в постоянный архив на 25 лет",
		legalBasis:
			"Федеральный закон от 21.11.2011 № 323-ФЗ, ст. 67; Приказ Минздрава России от 15.12.2014 № 834н",
		isBookingBlocked: true,
		requiresDocumentation: true,
		isDefault: true,
	},
	{
		code: "RETENTION_PERIOD_EXPIRED",
		name: "Истечение установленного срока хранения медицинской карты",
		description:
			"Истечение нормативного 25-летнего срока архивного хранения медицинской карты стоматологического пациента (форма 043/у)",
		legalBasis:
			"Приказ Минздрава СССР от 04.10.1980 № 1030 / Письмо Минздрава России от 07.12.2015 № 13-2/1538",
		isBookingBlocked: true,
		requiresDocumentation: false,
		isDefault: true,
	},
	{
		code: "NON_COMPLIANCE_TREATMENT",
		name: "Систематическое нарушение режима лечения и срыв приемов",
		description:
			"Неоднократная неявка на назначенные приемы без уведомления, невыполнение предписаний врача, влекущее срыв плана лечения",
		legalBasis:
			"Федеральный закон от 21.11.2011 № 323-ФЗ, ст. 27 (Обязанности граждан в сфере охраны здоровья)",
		isBookingBlocked: true,
		requiresDocumentation: true,
		isDefault: true,
	},
	{
		code: "STAFF_THREAT_CONFLICT",
		name: "Отказ от наблюдения пациента при агрессии и угрозе персоналу",
		description:
			"Отказ лечащего врача от наблюдения и лечения по согласованию с главным врачом клиники при отсутствии угрозы жизни",
		legalBasis:
			"Федеральный закон от 21.11.2011 № 323-ФЗ, ст. 70 ч. 3; ст. 11 ч. 2",
		isBookingBlocked: true,
		requiresDocumentation: true,
		isDefault: true,
	},
	{
		code: "DUPLICATE_CARD_MERGED",
		name: "Дублирующая карта, объединенная с основной",
		description:
			"Карточка объединена в единую мастер-карту пациента при разборе дублей",
		legalBasis:
			"Приказ Минздрава России от 15.12.2014 № 834н (ведение единой медкарты)",
		isBookingBlocked: true,
		requiresDocumentation: false,
		isDefault: true,
	},
	{
		code: "OTHER",
		name: "Иная причина архивации",
		description:
			"Списание в архив по индивидуальному основанию с указанием деталей в комментарии",
		legalBasis: "Федеральный закон от 21.11.2011 № 323-ФЗ",
		isBookingBlocked: false,
		requiresDocumentation: false,
		isDefault: true,
	},
];

export class PatientArchiveReasonService {
	/**
	 * Гарантирует наличие стандартных причин архивации по 323-ФЗ для клиники.
	 */
	static async ensureDefaultReasons(organizationId: string): Promise<void> {
		await withTenantCtx(organizationId, async (tx) => {
			const existing = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(patientArchiveReasons)
				.where(eq(patientArchiveReasons.organizationId, organizationId));

			if ((existing[0]?.count ?? 0) === 0) {
				const values = DEFAULT_323_FZ_ARCHIVE_REASONS.map((r) => ({
					organizationId,
					code: r.code,
					name: r.name,
					description: r.description,
					legalBasis: r.legalBasis,
					isBookingBlocked: r.isBookingBlocked,
					requiresDocumentation: r.requiresDocumentation,
					isDefault: r.isDefault,
					isActive: true,
				}));

				await tx.insert(patientArchiveReasons).values(values);
			}
		});
	}

	/**
	 * Возвращает список причин списания в архив клиники.
	 */
	static async listReasons(
		organizationId: string,
		options?: { includeInactive?: boolean },
	): Promise<ArchiveReasonDto[]> {
		await this.ensureDefaultReasons(organizationId);

		return await withTenantCtx(organizationId, async (tx) => {
			const whereClause = options?.includeInactive
				? eq(patientArchiveReasons.organizationId, organizationId)
				: and(
						eq(patientArchiveReasons.organizationId, organizationId),
						eq(patientArchiveReasons.isActive, true),
					);

			const rows = await tx
				.select()
				.from(patientArchiveReasons)
				.where(whereClause);

			return rows.map((r) => ({
				...r,
				createdAt: new Date(r.createdAt),
				updatedAt: new Date(r.updatedAt),
			}));
		});
	}

	/**
	 * Получение причины по коду.
	 */
	static async getReasonByCode(
		organizationId: string,
		code: string,
	): Promise<ArchiveReasonDto | null> {
		await this.ensureDefaultReasons(organizationId);

		return await withTenantCtx(organizationId, async (tx) => {
			const rows = await tx
				.select()
				.from(patientArchiveReasons)
				.where(
					and(
						eq(patientArchiveReasons.organizationId, organizationId),
						eq(patientArchiveReasons.code, code),
					),
				)
				.limit(1);

			if (!rows[0]) return null;
			return {
				...rows[0],
				createdAt: new Date(rows[0].createdAt),
				updatedAt: new Date(rows[0].updatedAt),
			};
		});
	}

	/**
	 * Добавление пользовательской причины архивации клиникой.
	 */
	static async createCustomReason(
		organizationId: string,
		input: {
			code: string;
			name: string;
			description?: string;
			legalBasis: string;
			isBookingBlocked?: boolean;
			requiresDocumentation?: boolean;
		},
	): Promise<ArchiveReasonDto> {
		return await withTenantCtx(organizationId, async (tx) => {
			const [inserted] = await tx
				.insert(patientArchiveReasons)
				.values({
					organizationId,
					code: input.code.trim().toUpperCase(),
					name: input.name.trim(),
					description: input.description?.trim() || null,
					legalBasis: input.legalBasis.trim(),
					isBookingBlocked: input.isBookingBlocked ?? true,
					requiresDocumentation: input.requiresDocumentation ?? false,
					isDefault: false,
					isActive: true,
				})
				.returning();

			if (!inserted) {
				throw new Error("Не удалось создать причину архивации.");
			}

			return {
				id: inserted.id,
				organizationId: inserted.organizationId,
				code: inserted.code,
				name: inserted.name,
				description: inserted.description ?? null,
				legalBasis: inserted.legalBasis,
				isBookingBlocked: inserted.isBookingBlocked,
				requiresDocumentation: inserted.requiresDocumentation,
				isDefault: inserted.isDefault,
				isActive: inserted.isActive,
				createdAt: new Date(inserted.createdAt),
				updatedAt: new Date(inserted.updatedAt),
			};
		});
	}

	/**
	 * Списание карты пациента в архив с фиксацией правового обоснования по 323-ФЗ
	 * и блокировкой создания приемов.
	 */
	static async archivePatient(
		organizationId: string,
		input: {
			patientId: string;
			reasonCode?: string | undefined;
			archiveReason?: string | undefined;
			notes?: string | undefined;
			isBlacklisted?: boolean | undefined;
			blacklistReason?: string | undefined;
			actorUserId?: string | null | undefined;
		},
	): Promise<{
		success: boolean;
		isBookingBlocked: boolean;
		legalBasis: string;
		reasonName: string;
	}> {
		await this.ensureDefaultReasons(organizationId);

		return await withTenantCtx(organizationId, async (tx) => {
			// 1. Проверяем пациента
			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.id, input.patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!patient) {
				throw new Error("Пациент не найден в данной клинике.");
			}

			// 2. Ищем причину по коду или fallback
			let reason: ArchiveReasonDto | null = null;
			if (input.reasonCode) {
				reason = await this.getReasonByCode(organizationId, input.reasonCode);
			}

			const reasonCode = reason?.code ?? input.reasonCode ?? "OTHER";
			const reasonName =
				reason?.name ?? input.archiveReason ?? "Списание в архив";
			const legalBasis =
				reason?.legalBasis ??
				"Федеральный закон от 21.11.2011 № 323-ФЗ (Архивное хранение медицинской документации)";
			const isBookingBlocked =
				(reason?.isBookingBlocked ?? true) || Boolean(input.isBlacklisted);

			// 3. Обновляем статус пациента
			await tx
				.update(patients)
				.set({ status: "archived" })
				.where(
					and(
						eq(patients.id, input.patientId),
						eq(patients.organizationId, organizationId),
					),
				);

			// 4. Фиксируем запись в журнале архива и черных списков
			await tx.insert(patientArchiveReasonsAndBlacklists).values({
				organizationId,
				patientId: input.patientId,
				patientName: patient.fullName,
				archiveReason: reasonName,
				reasonCode,
				legalBasis,
				isBlacklisted: Boolean(input.isBlacklisted),
				isBookingBlocked,
				warningBadge: input.isBlacklisted
					? "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)"
					: isBookingBlocked
						? "⛔ АРХИВ (Запись заблокирована)"
						: "📁 АРХИВ",
				blacklistReason: input.blacklistReason || input.notes || null,
				archivedBy: input.actorUserId || null,
			});

			// 5. Синхронизируем быстрый кэш
			if (isBookingBlocked) {
				inMemoryBlacklist.add(`${organizationId}:${input.patientId}`);
			}

			return {
				success: true,
				isBookingBlocked,
				legalBasis,
				reasonName,
			};
		});
	}

	/**
	 * Разархивация пациента и восстановление возможности записи.
	 */
	static async unarchivePatient(
		organizationId: string,
		patientId: string,
	): Promise<{ success: boolean }> {
		return await withTenantCtx(organizationId, async (tx) => {
			await tx
				.update(patients)
				.set({ status: "active" })
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				);

			// Снимаем признак блокировки в таблице причин
			await tx
				.update(patientArchiveReasonsAndBlacklists)
				.set({ isBookingBlocked: false, isBlacklisted: false })
				.where(
					and(
						eq(patientArchiveReasonsAndBlacklists.organizationId, organizationId),
						eq(patientArchiveReasonsAndBlacklists.patientId, patientId),
					),
				);

			inMemoryBlacklist.delete(`${organizationId}:${patientId}`);

			return { success: true };
		});
	}

	/**
	 * Проверка, заблокирована ли запись пациента (в архиве с запретом записи или в черном списке).
	 */
	static async checkBookingBlock(
		organizationId: string,
		patientId: string,
	): Promise<{ isBlocked: boolean; reason?: string; legalBasis?: string }> {
		if (inMemoryBlacklist.has(`${organizationId}:${patientId}`)) {
			return {
				isBlocked: true,
				reason: "Пациент внесён в архив / чёрный список с запретом записи",
				legalBasis: "Федеральный закон от 21.11.2011 № 323-ФЗ",
			};
		}

		return await withTenantCtx(organizationId, async (tx) => {
			// Проверяем статус в patients
			const [patient] = await tx
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			// Проверяем таблицу блокировок
			const rows = await tx
				.select()
				.from(patientArchiveReasonsAndBlacklists)
				.where(
					and(
						eq(patientArchiveReasonsAndBlacklists.organizationId, organizationId),
						eq(patientArchiveReasonsAndBlacklists.patientId, patientId),
						eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
					),
				)
				.limit(1);

			if (rows[0]) {
				inMemoryBlacklist.add(`${organizationId}:${patientId}`);
				return {
					isBlocked: true,
					reason: rows[0].archiveReason || rows[0].blacklistReason || "Архив",
					legalBasis:
						rows[0].legalBasis ||
						"Федеральный закон от 21.11.2011 № 323-ФЗ",
				};
			}

			// Если пациент имеет статус 'archived', но нет отдельной записи блокировки — по закону 323-ФЗ архивная карта также блокирует прием
			if (patient?.status === "archived") {
				inMemoryBlacklist.add(`${organizationId}:${patientId}`);
				return {
					isBlocked: true,
					reason: "Карта пациента находится в архиве",
					legalBasis:
						"Приказ Минздрава России от 15.12.2014 № 834н (архивный статус формы 043/у)",
				};
			}

			return { isBlocked: false };
		});
	}
}
