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
});

export type StaffSwitchRoleBody = z.infer<typeof staffSwitchRoleSchema>;
