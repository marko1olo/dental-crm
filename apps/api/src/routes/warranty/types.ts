import { z } from "zod";

export const createCertificateBodySchema = z.object({
	patientId: z.string().uuid("Некорректный ID пациента"),
	visitId: z.string().uuid().optional().nullable(),
	certificateNumber: z.string().trim().min(3).max(64),
	status: z.enum(["active", "conditional", "voided"]).default("active"),
	items: z.array(z.record(z.unknown())).min(1, "Требуется хотя бы одна позиция в паспорте"),
	warrantyMonths: z.number().int().positive("Срок гарантии должен быть положительным"),
	serviceLifeMonths: z.number().int().positive("Срок службы должен быть положительным"),
	issuedAt: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
	nextRecallDate: z.string().optional().nullable(),
	integritySha256: z.string().trim().min(16, "Некорректный хеш целостности"),
	notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateCertificateBody = z.infer<typeof createCertificateBodySchema>;
