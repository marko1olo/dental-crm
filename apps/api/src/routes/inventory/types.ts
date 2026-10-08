import crypto from "node:crypto";
import { z } from "zod";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

/**
 * Тела склада раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body (POST/PATCH без JSON) это бросало TypeError → 500.
 * Zod safeParse после auth-first закрывает путь: 400 с прежними текстами.
 */
export const inventoryCreateBodySchema = z.object({
	name: z.string().optional(),
	criticalThreshold: z.number().finite().nonnegative().optional(),
	unitCostRub: z.number().finite().nonnegative().optional(),
	stockQuantity: z.number().finite().nonnegative().optional(),
	sku: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

export const inventoryUpdateBodySchema = z.object({
	name: z.string().optional(),
	criticalThreshold: z.number().finite().nonnegative().optional(),
	unitCostRub: z.number().finite().nonnegative().optional(),
	stockQuantity: z.number().finite().nonnegative().optional(),
	sku: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

export const inventoryStockBodySchema = z.object({
	adjustment: z
		.number({
			required_error:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
			invalid_type_error:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
		})
		.finite({
			message:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
		}),
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	isClinicalOperation: z.boolean().optional(),
	batchNumber: z.string().optional(),
	lotNumber: z.string().optional(),
	expirationDate: z.string().optional(),
	manufactureDate: z.string().nullable().optional(),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	barcode: z.string().nullable().optional(),
});

export const inventoryReceiveBatchBodySchema = z.object({
	inventoryItemId: z
		.string({
			required_error: "Укажите ID материала",
			invalid_type_error: "ID материала должен быть строкой",
		})
		.min(1, { message: "Укажите ID материала" }),
	warehouseId: z.string().nullable().optional(),
	batchNumber: z.string().optional(),
	lotNumber: z.string().optional(),
	expirationDate: z.string().optional(),
	manufactureDate: z.string().nullable().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для оприходования",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество приходуемой партии должно быть больше 0" }),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	barcode: z.string().nullable().optional(),
	notes: z.string().optional(),
});

export const acceptanceWaybillItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	name: z.string().min(1, "Наименование материала обязательно"),
	category: z.string().optional(),
	unit: z.string().default("шт"),
	batchNumber: z.string().min(1, "Номер серии / партии обязателен"),
	lotNumber: z.string().optional(),
	expirationDate: z.string().min(1, "Срок годности обязателен"),
	manufactureDate: z.string().nullable().optional(),
	quantity: z.number().finite().positive("Количество должно быть больше нуля"),
	purchasePriceKopecks: z.number().int().nonnegative().optional(),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	vatRate: z.number().finite().default(0),
	barcode: z.string().nullable().optional(),
	sku: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

export const acceptanceWaybillBodySchema = z.object({
	supplierName: z.string().min(1, "Наименование поставщика обязательно"),
	supplierInn: z.string().nullable().optional(),
	waybillNumber: z.string().min(1, "Номер накладной обязателен"),
	receiptDate: z.string().min(1, "Дата прихода обязательна"),
	warehouseId: z.string().nullable().optional(),
	warehouseName: z.string().nullable().optional(),
	items: z.array(acceptanceWaybillItemSchema).min(1, "Накладная должна содержать хотя бы одну позицию"),
	notes: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

export const inventoryDeductItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для списания",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для списания должно быть больше 0" }),
	unitCostRub: z.union([z.number(), z.string()]).optional(),
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

export const inventoryDeductBatchBodySchema = z.union([
	z.array(inventoryDeductItemSchema),
	z.object({
		items: z.array(inventoryDeductItemSchema).optional(),
		materials: z.array(inventoryDeductItemSchema).optional(),
		organizationId: z.string().optional(),
		reason: z.string().optional(),
		notes: z.string().optional(),
		operationTitle: z.string().optional(),
		hasWarehouseDelay: z.boolean().optional(),
		visitId: z.string().optional(),
		cabinetId: z.string().optional(),
		doctorName: z.string().optional(),
		nurseName: z.string().optional(),
		allowOverdraft: z.boolean().default(true).optional(),
	}),
	inventoryDeductItemSchema,
]);

export const inventoryRuleBodySchema = z.object({
	serviceId: z
		.string({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.min(1, { message: "Missing required fields" }),
	inventoryItemId: z
		.string({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.min(1, { message: "Missing required fields" }),
	quantityToDeduct: z
		.number({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество должно быть больше 0" }),
});

export const inventoryStornoItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для сторно",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для возврата на склад должно быть больше 0" }),
	reason: z.string().optional(),
	notes: z.string().optional(),
});

export const inventoryStornoServiceSchema = z.object({
	serviceId: z.string().optional(),
	serviceCode: z.string().optional(),
	code804n: z.string().optional(),
	title: z.string().optional(),
	toothCode: z.string().optional(),
	toothNumber: z.union([z.number(), z.string()]).optional(),
	quantity: z.number().finite().positive().default(1),
	reason: z.string().optional(),
});

export const inventoryStornoBodySchema = z.object({
	visitId: z.string().optional(),
	service: inventoryStornoServiceSchema.optional(),
	services: z.array(inventoryStornoServiceSchema).optional(),
	items: z.array(inventoryStornoItemSchema).optional(),
	materials: z.array(inventoryStornoItemSchema).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
	cancelVisit: z.boolean().optional(),
	organizationId: z.string().optional(),
});

export const inventoryOverdraftAlertBodySchema = z.object({
	visitId: z.string().optional(),
	visitNumber: z.union([z.string(), z.number()]).optional(),
	chairId: z.string().optional(),
	cabinetId: z.string().optional(),
	message: z.string().optional(),
	items: z
		.array(
			z.object({
				itemId: z.string().optional(),
				inventoryItemId: z.string().optional(),
				itemName: z.string().optional(),
				deficitQty: z.number().finite().optional(),
				quantity: z.number().finite().optional(),
			}),
		)
		.default([]),
});

/**
 * Метка «дату прислали, но разобрать её нельзя».
 *
 * Отличать её от пустого значения обязательно: пустой срок годности —
 * нормальное состояние (у многих расходников его просто не пишут), а
 * непонятная строка означает ошибку ввода, и молча превращать её в «срока нет»
 * значит потерять предупреждение о просрочке.
 */
export const INVALID_DATE = Symbol("invalid-expiration-date");

/**
 * Приведение срока годности к виду, который принимает колонка date (YYYY-MM-DD).
 *
 * Принимает как ISO-формат «YYYY-MM-DD» (2027-03-31), так и российский формат «DD.MM.YYYY» (31.03.2027).
 * Всё остальное, включая невалидные дни в месяце (например, 31.02.2027), — ошибка INVALID_DATE.
 */
export function normalizedExpirationDate(
	value: string | null | undefined,
): string | null | typeof INVALID_DATE {
	if (value === null || value === undefined) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;

	let isoCandidate: string;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		isoCandidate = trimmed;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [dd, mm, yyyy] = trimmed.split(".");
		isoCandidate = `${yyyy}-${mm}-${dd}`;
	} else {
		return INVALID_DATE;
	}

	const parsed = new Date(`${isoCandidate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return INVALID_DATE;
	// 2027-02-31 разбирается в 3 марта: сверяем, что дата не «уехала».
	if (parsed.toISOString().slice(0, 10) !== isoCandidate) return INVALID_DATE;
	return isoCandidate;
}

export function toValidUuid(str?: string | null): string | null {
	if (!str) return null;
	const trimmed = String(str).trim();
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
		return trimmed;
	}
	const hash = crypto.createHash("md5").update(trimmed).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
