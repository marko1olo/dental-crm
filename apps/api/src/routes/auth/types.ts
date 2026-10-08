import { z } from "zod";

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
export interface ClinicLoginBody {
	email?: string;
	password?: string;
}

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
export interface StaffUnlockBody {
	userId?: string;
	pinCode?: string;
}

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
export interface SetupInitBody {
	clinicName?: string;
	email?: string;
	password?: string;
	ownerName?: string;
	ownerPin?: string;
}

/** Результат чтения «до арендатора». */
export interface PreTenantRead<T> {
	/** Найденная строка либо undefined. */
	row: T | undefined;
	/**
	 * Был ли обход действительно включён в той же транзакции, где выполнялся
	 * запрос. `false` означает, что пустой результат объясняется политикой RLS,
	 * а не отсутствием записи. Отвечать на это «неверный логин» — ложь.
	 */
	bypassActive: boolean;
}

/**
 * SaaS-тела auth раньше разбирались как `(request.body as any)`.
 * Схемы ниже повторяют прежние ручные проверки (длина пароля, форма PIN,
 * обязательные поля) через safeParse — тот же узор, что parseSettingsPayload.
 * Сообщения отказов сохранены дословно, чтобы клиент и существующие тесты
 * не меняли контракт.
 */
export const authPinSchema = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.refine((value) => /^\d{4,12}$/.test(value), {
		message: "PIN должен состоять из 4–12 цифр.",
	});

export const registerBodySchema = z
	.object({
		clinicName: z.string().trim().min(1),
		ownerName: z.string().trim().min(1),
		email: z.string().trim().min(1),
		password: z.string().min(1),
		ownerPin: authPinSchema.optional(),
		practiceType: z.enum(["solo", "clinic"]).optional().default("clinic"),
		phone: z.string().trim().optional(),
		withDemoData: z.boolean().optional().default(false),
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 6) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 6 символов.",
			});
		}
	});

export const loginBodySchema = z
	.object({
		identifier: z.string().trim().optional(),
		email: z.string().trim().optional(),
		password: z.string().min(1),
	})
	.refine(
		(data) => !!(data.identifier?.trim() || data.email?.trim()),
		{
			message: "Введите email и пароль.",
		},
	);

/**
 * Кабинет клиники: POST /api/auth/clinic/login.
 * Bare cast + email.toLowerCase() → 500 на number/object email.
 * Сообщение пустого/битого тела сохранено дословно.
 */
export const clinicLoginBodySchema = z.object({
	email: z.string().min(1),
	password: z.string().min(1),
});

/**
 * PIN-разблокировка: POST /api/auth/staff/unlock.
 * Bare cast; number pin допускается (как authPinSchema SaaS), object → 400.
 */
export const staffUnlockBodySchema = z.object({
	userId: z.string().min(1),
	pinCode: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => value.length > 0, { message: "required" }),
});

export const clinicLoginValidationMessage = "Введите логин и пароль клиники.";
export const staffUnlockValidationMessage =
	"Необходимо указать сотрудника и ввести PIN-код.";

/**
 * Admin set-password / set-pin: AUTH first (identity | ADMIN_SETUP_KEY), then body.
 * adminKey is read from the raw object before full schema — credential, not form field.
 * newPassword/newPin: string; pin number OK via union->String (same as unlock).
 */
export const clinicSetPasswordBodySchema = z
	.object({
		organizationId: z.string().min(1).optional(),
		newPassword: z.string().min(1),
		adminKey: z
			.union([z.string(), z.number()])
			.transform((value) => String(value))
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["newPassword"],
				message: "Новый пароль должен быть не короче 8 символов.",
			});
		}
	});

export const staffSetPinBodySchema = z.object({
	userId: z.string().min(1),
	newPin: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => /^\d{4,12}$/.test(value), {
			message: "PIN должен состоять из 4–12 цифр.",
		}),
	adminKey: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.optional(),
});

/**
 * First-run setup: public route; bare cast + destructure number email -> 500.
 * Messages and if-order preserved (required -> password length -> PIN).
 */
export const setupInitBodySchema = z
	.object({
		clinicName: z.string().min(1),
		email: z.string().min(1),
		password: z.string().min(1),
		ownerName: z.string().min(1).optional(),
		ownerPin: authPinSchema.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 8 символов.",
			});
		}
	});

export const createInviteBodySchema = z.object({
	email: z.string().trim().min(1),
	role: z.string().min(1),
});

export const acceptInviteBodySchema = z
	.object({
		token: z.string().trim().min(1),
		fullName: z.string().trim().min(1),
		password: z.string().min(1),
		pinCode: authPinSchema,
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 8 символов.",
			});
		}
	});

export const updatePasswordBodySchema = z
	.object({
		oldPassword: z.string().min(1),
		newPassword: z.string().min(1),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["newPassword"],
				message: "Новый пароль должен быть не короче 8 символов.",
			});
		}
	});

export const updatePinBodySchema = z.object({
	oldPin: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => value.length > 0, { message: "required" }),
	newPin: authPinSchema,
});

export type AuthPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false; error: z.ZodError };
};
