import { z } from "zod";

export const warrantyCertificateItemSchema = z
	.preprocess((val) => {
		if (typeof val === "object" && val !== null) {
			const obj = { ...(val as Record<string, unknown>) };
			const title = (obj.clinicalWorkTitle || obj.name || obj.restorationType || "Стоматологическая работа") as string;
			if (!obj.name) obj.name = title;
			if (!obj.clinicalWorkTitle) obj.clinicalWorkTitle = title;
			if (!obj.toothNumber && obj.tooth !== undefined) obj.toothNumber = obj.tooth as string | number;
			if (!obj.tooth && obj.toothNumber !== undefined) obj.tooth = obj.toothNumber as string | number;
			if (!obj.material && obj.materialName) obj.material = obj.materialName as string;
			if (!obj.materialName && obj.material) obj.materialName = obj.material as string;
			if (!obj.color && (obj.shade || obj.vitaShade)) obj.color = (obj.shade || obj.vitaShade) as string;
			if (!obj.shade && (obj.color || obj.vitaShade)) obj.shade = (obj.color || obj.vitaShade) as string;
			if (!obj.lot && (obj.lotNumber || obj.batchCode)) obj.lot = (obj.lotNumber || obj.batchCode) as string;
			return obj;
		}
		return val;
	}, z.object({
		id: z.string().optional(),
		name: z.string().optional(),
		clinicalWorkTitle: z.string().optional(),
		category: z.string().optional(),
		toothNumber: z.union([z.number().int(), z.string()]).optional(),
		tooth: z.union([z.number().int(), z.string()]).optional(),
		surface: z.string().optional(),
		material: z.string().optional(),
		materialName: z.string().optional(),
		color: z.string().optional(),
		shade: z.string().optional(),
		vitaShade: z.string().optional(),
		shadeStump: z.string().nullable().optional(),
		lot: z.string().optional(),
		lotNumber: z.string().optional(),
		batchCode: z.string().optional(),
		restorationType: z.string().optional(),
		laboratoryName: z.string().optional(),
		cementationProtocol: z.string().optional(),
		warrantyMonths: z.number().int().nonnegative().optional(),
		serviceLifeMonths: z.number().int().nonnegative().optional(),
		notes: z.string().optional(),
	}).passthrough());

export type WarrantyCertificateItem = z.infer<typeof warrantyCertificateItemSchema>;

export const createCertificateBodySchema = z.object({
	patientId: z.string().uuid("Некорректный ID пациента"),
	visitId: z.string().uuid().optional().nullable(),
	certificateNumber: z.string().trim().min(3).max(64),
	status: z.enum(["active", "conditional", "voided"]).default("active"),
	items: z.array(warrantyCertificateItemSchema).min(1, "Требуется хотя бы одна позиция в паспорте"),
	warrantyMonths: z.number().int().positive("Срок гарантии должен быть положительным"),
	serviceLifeMonths: z.number().int().positive("Срок службы должен быть положительным"),
	issuedAt: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
	nextRecallDate: z.string().optional().nullable(),
	integritySha256: z.string().trim().min(16, "Некорректный хеш целостности"),
	notes: z.string().trim().max(2000).optional().nullable(),
}).strict();

export type CreateCertificateBody = z.infer<typeof createCertificateBodySchema>;
