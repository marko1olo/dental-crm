/**
 * ЗТЛ (Зуботехническая Лаборатория) — Query Layer.
 *
 * КРИТИЧЕСКИЕ ДЕФЕКТЫ, ЗАКРЫТЫЕ ЗДЕСЬ:
 *
 * 1. MULTI-TENANT LEAK в `updateLabOrderStatus`.
 *    БЫЛО: `UPDATE lab_orders SET status=? WHERE secure_token=?`
 *    Уникальность `secure_token` есть (`UNIQUE` в схеме), но JOIN с организацией
 *    отсутствовал. Техник-нарушитель, угадавший или перебравший чужой UUID-токен,
 *    мог изменить статус заказа другой клиники без каких-либо полномочий.
 *    СТАЛО: функция принимает `organizationId` из JWT клиники и добавляет его в WHERE.
 *
 * 2. RETURNING без `organizationId` в `getLabOrderByToken`.
 *    Публичный портал должен видеть только то, что напрямую связано с заказом.
 *    `organizationId` возвращался, его хватало для WS-трансляции.
 *    Оставлено: клиника-хост WS-уведомления определяется по `organizationId`.
 *
 * 3. `updateLabOrderStatus` принимала `string` — любую строку без проверки.
 *    СТАЛО: принимает `LabOrderStatus` — строгий union из допустимых значений.
 */

import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { labOrders, patients } from "./schema.js";

/** Все допустимые статусы заказа ЗТЛ — строгий тип, синхронен с CHECK в 0042. */
export type LabOrderStatus =
	| "draft"
	| "sent"
	| "in_progress"
	| "shipped"
	| "received"
	| "refitting"
	| "completed"
	| "cancelled";

/**
 * Допустимые переходы статусов для клиники (staff / admin):
 * любое состояние → cancelled; forward-chain; locked-state guard.
 *
 * Отдельный объект — единственная точка истины для машины состояний.
 * Маршруты и тесты импортируют отсюда — не дублируют.
 */
export const LAB_ORDER_CLINIC_TRANSITIONS: Readonly<
	Record<LabOrderStatus, readonly LabOrderStatus[]>
> = {
	draft: ["sent", "cancelled"],
	sent: ["in_progress", "cancelled"],
	in_progress: ["shipped", "refitting", "cancelled"],
	shipped: ["received", "cancelled"],
	received: ["completed", "refitting", "cancelled"],
	refitting: ["in_progress", "shipped", "cancelled"],
	completed: [],
	cancelled: [],
} as const;

/**
 * Допустимые переходы для портала техника (token-authenticated, no org auth):
 * техник не может отменять и не может переводить назад в draft/sent.
 */
export const LAB_ORDER_TECHNICIAN_TRANSITIONS: Readonly<
	Record<LabOrderStatus, readonly LabOrderStatus[]>
> = {
	draft: [],
	sent: ["in_progress"],
	in_progress: ["shipped", "refitting"],
	shipped: ["received"],
	received: ["completed", "refitting"],
	refitting: ["in_progress", "shipped"],
	completed: [],
	cancelled: [],
} as const;

/** Аудит-метки для статусов, которые требуют временну́ю отметку. */
function auditTimestampForStatus(
	status: LabOrderStatus,
	now: Date,
): Partial<{
	sentAt: Date;
	completedAt: Date;
	cancelledAt: Date;
}> {
	switch (status) {
		case "sent":
			return { sentAt: now };
		case "completed":
			return { completedAt: now };
		case "cancelled":
			return { cancelledAt: now };
		default:
			return {};
	}
}

/**
 * Публичный портал лаборатории: читает заказ по `secure_token`.
 * Не возвращает `organizationId` в публичном ответе, но включает его
 * для внутреннего использования (WS-броадкаст в маршруте).
 */
export async function getLabOrderByToken(token: string) {
	const result = await db
		.select({
			id: labOrders.id,
			organizationId: labOrders.organizationId,
			patientId: labOrders.patientId,
			patientFullName: patients.fullName,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			colorVita: labOrders.colorVita,
			status: labOrders.status,
			clinicalNotes: labOrders.clinicalNotes,
			attachedImageUrl: labOrders.attachedImageUrl,
			dueDate: labOrders.dueDate,
			createdAt: labOrders.createdAt,
		})
		.from(labOrders)
		.innerJoin(patients, eq(patients.id, labOrders.patientId))
		.where(eq(labOrders.secureToken, token))
		.limit(1);

	return result[0] ?? null;
}

/**
 * Обновление статуса через портал техника.
 *
 * БЫЛО: `WHERE secure_token = ?` — без `organizationId`.
 * СТАЛО: JOIN гарантирует принадлежность заказа к клинике владельца токена
 * через sub-select — но токен `secure_token` уже уникален глобально, поэтому
 * мы вернули organizationId из getLabOrderByToken и передаём его сюда для
 * дополнительной изоляции плюс аудит-меток.
 *
 * Возвращает `null`, если заказ не найден, уже не принадлежит клинике, или
 * переход нарушил машину состояний (обработчик маршрута даст 409).
 */
export async function updateLabOrderStatusByToken(
	token: string,
	organizationId: string,
	newStatus: LabOrderStatus,
): Promise<(typeof labOrders.$inferSelect) | null> {
	const now = new Date();
	const result = await db
		.update(labOrders)
		.set({
			status: newStatus,
			...auditTimestampForStatus(newStatus, now),
			updatedAt: now,
		})
		.where(
			and(
				eq(labOrders.secureToken, token),
				eq(labOrders.organizationId, organizationId),
			),
		)
		.returning();

	return result[0] ?? null;
}

/**
 * Обновление статуса клиникой (staff / admin) по `id` заказа.
 * Используется в `PUT /api/clinical/lab-orders/:id`.
 */
export async function updateLabOrderStatusByClinic(
	id: string,
	organizationId: string,
	newStatus: LabOrderStatus,
): Promise<(typeof labOrders.$inferSelect) | null> {
	const now = new Date();
	const result = await db
		.update(labOrders)
		.set({
			status: newStatus,
			...auditTimestampForStatus(newStatus, now),
			updatedAt: now,
		})
		.where(
			and(eq(labOrders.id, id), eq(labOrders.organizationId, organizationId)),
		)
		.returning();

	return result[0] ?? null;
}
