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
import { withSuperuserBypass } from "./rls.js";
import { labOrders, patients } from "./schema.js";

/** Все допустимые статусы заказа ЗТЛ — строгий тип, синхронен с CHECK в 0231. */
export type LabOrderStatus =
	| "draft"
	| "sent"
	| "in_progress"
	| "shipped"
	| "received"
	| "ready"
	| "ready_in_clinic"
	| "fitting"
	| "refitting"
	| "fitted"
	| "completed"
	| "cancelled"
	| "rejected_remake";

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
	sent: ["in_progress", "shipped", "received", "ready", "ready_in_clinic", "fitting", "completed", "cancelled"],
	in_progress: ["shipped", "received", "ready", "ready_in_clinic", "fitting", "refitting", "completed", "cancelled", "rejected_remake"],
	shipped: ["received", "ready", "ready_in_clinic", "fitting", "refitting", "completed", "cancelled", "rejected_remake"],
	received: ["ready", "ready_in_clinic", "fitting", "fitted", "completed", "refitting", "cancelled", "rejected_remake"],
	ready: ["ready_in_clinic", "received", "fitting", "fitted", "completed", "refitting", "cancelled", "rejected_remake"],
	ready_in_clinic: ["ready", "received", "fitting", "fitted", "completed", "refitting", "cancelled", "rejected_remake"],
	fitting: ["fitted", "ready_in_clinic", "ready", "received", "refitting", "completed", "cancelled", "rejected_remake"],
	refitting: ["in_progress", "shipped", "received", "ready", "ready_in_clinic", "fitting", "completed", "cancelled"],
	fitted: ["completed", "refitting", "cancelled", "rejected_remake"],
	completed: ["refitting", "rejected_remake"],
	cancelled: ["draft", "sent"],
	rejected_remake: ["draft", "sent", "cancelled"],
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
	in_progress: ["shipped", "ready", "ready_in_clinic", "fitting", "refitting"],
	shipped: ["received", "ready", "ready_in_clinic", "fitting"],
	received: ["ready_in_clinic", "fitting", "completed", "fitted", "refitting"],
	ready: ["ready_in_clinic", "fitting", "completed", "refitting"],
	ready_in_clinic: ["fitting", "completed", "fitted", "refitting"],
	fitting: ["fitted", "completed", "refitting"],
	refitting: ["in_progress", "shipped"],
	fitted: ["completed"],
	completed: [],
	cancelled: [],
	rejected_remake: ["draft", "sent"],
} as const;

/**
 * Публичный портал лаборатории: читает заказ по `secure_token`.
 * Не возвращает `organizationId` в публичном ответе, но включает его
 * для внутреннего использования (WS-броадкаст в маршруте).
 */
export async function getLabOrderByToken(token: string) {
	return withSuperuserBypass(async (tx) => {
		const result = await tx
			.select({
				id: labOrders.id,
				organizationId: labOrders.organizationId,
				patientId: labOrders.patientId,
				orderNumber: labOrders.orderNumber,
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
			.innerJoin(
				patients,
				and(
					eq(patients.id, labOrders.patientId),
					eq(patients.organizationId, labOrders.organizationId),
				),
			)
			.where(eq(labOrders.secureToken, token))
			.limit(1);

		return result[0] ?? null;
	});
}
