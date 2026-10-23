import { z } from "zod";

export * from "./pricelistCategoriesMetadata.js";
export * from "./pricelistValidationSchemas.js";

export type PricelistPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export const pricelistValidationMessage =
	"Ошибка валидации: прайс-лист или запрос не соответствуют формату.";

export function parsePricelistPayload<T>(
	schema: PricelistPayloadSchema<T>,
	value: unknown,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return parsed.data;
}
