import { z } from "zod";

export const verifyBodySchema = z.object({
	phoneDigits: z.string().max(10).optional(),
	phone_last4: z.string().max(10).optional(),
	value: z.string().max(10).optional(),
	pin: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
	code: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
});

export const signBodySchema = z.object({
	signaturePng: z
		.string()
		.min(10, { message: "Подпись не может быть пустой" })
		.max(2 * 1024 * 1024, { message: "Размер факсимиле подписи не должен превышать 2 МБ" })
		.refine(
			(val) => val.startsWith("data:image/") || /^[A-Za-z0-9+/=]+$/.test(val),
			{ message: "Подпись должна быть в формате Base64 PNG или Data URL" },
		),
	signerName: z
		.string()
		.max(200, { message: "Имя подписанта не должно превышать 200 символов" })
		.refine((val) => !/[<>]/.test(val), {
			message: "Имя подписанта содержит недопустимые символы",
		})
		.optional(),
	signatureSvg: z
		.string()
		.max(500_000, { message: "Размер SVG подписи не должен превышать 500 КБ" })
		.refine((val) => !/<script|javascript:|on\w+=/i.test(val), {
			message: "Векторная подпись содержит потенциально опасные конструкции",
		})
		.optional(),
	relationship: z
		.string()
		.max(100, { message: "Статус представителя не должен превышать 100 символов" })
		.refine((val) => !/[<>]/.test(val), {
			message: "Поле содержит недопустимые символы",
		})
		.optional(),
});

export type VerifyBody = z.infer<typeof verifyBodySchema>;
export type SignBody = z.infer<typeof signBodySchema>;
