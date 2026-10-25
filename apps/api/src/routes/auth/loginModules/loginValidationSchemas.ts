import { z } from "zod";
import {
	clinicLoginBodySchema,
	clinicLoginValidationMessage,
	loginBodySchema,
	staffUnlockBodySchema,
	staffUnlockValidationMessage,
} from "../types.js";

export {
	clinicLoginBodySchema,
	clinicLoginValidationMessage,
	loginBodySchema,
	staffUnlockBodySchema,
	staffUnlockValidationMessage,
};

/**
 * Валидация переключения клинической роли сотрудника (Мандат 8e: Doctor Autonomy / Zero Dead-Ends)
 * Позволяет быстро переключаться между кабинетами/ролями без полного разлогина.
 *
 * pinCode обязателен при входе ЗА ДРУГОГО сотрудника: смена пилота у кресла —
 * это вход нового человека, и подтверждается его личным ПИН-кодом, а не тем,
 * что предыдущий уже вошёл. Роль всегда берётся из карточки сотрудника в
 * базе: поле targetRole лишь называет её для удобства клиента.
 */
export const staffSwitchRoleSchema = z.object({
	targetRole: z.enum([
		"doctor",
		"administrator",
		"owner",
		"assistant",
		"hygienist",
		"receptionist",
	]),
	targetUserId: z.string().optional(),
	pinCode: z.string().trim().min(1).max(16).optional(),
});

export type StaffSwitchRoleBody = z.infer<typeof staffSwitchRoleSchema>;
