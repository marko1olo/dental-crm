import { z } from "zod";
import {
	type MedicalWasteClass,
	type MedicalWasteDisinfectionMethod,
	type MedicalWasteOperationType,
	type MedicalWastePackageType,
	medicalWasteClassSchema,
	medicalWasteDisinfectionMethodSchema,
	medicalWasteOperationTypeSchema,
	medicalWastePackageTypeSchema,
} from "./types.js";

// ─── 5. Журнал медицинских отходов классов А, Б, В, Г (СанПиН 2.1.3684-21) ────

export const medicalWasteLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	operationType: medicalWasteOperationTypeSchema.default("accumulation"),
	logDate: z.string(),
	wasteClass: medicalWasteClassSchema.default("class_B"),
	wasteDescription: z.string().min(1),
	packageType: medicalWastePackageTypeSchema.default("yellow_bag"),
	packageCount: z.number().int().min(1).default(1),
	weightKg: z.number().positive(),
	volumeLiters: z.number().positive().nullable().optional(),
	disinfectionMethod: medicalWasteDisinfectionMethodSchema.default("chemical_soaking"),
	disinfectantUsed: z.string().nullable().optional(),
	disposalCompany: z.string().nullable().optional(),
	contractNumber: z.string().nullable().optional(),
	transferActNumber: z.string().nullable().optional(),
	responsibleStaffId: z.string().uuid().nullable().optional(),
	responsibleStaffName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type MedicalWasteLog = z.infer<typeof medicalWasteLogSchema>;

export const createMedicalWasteLogDtoSchema = z.object({
	operationType: medicalWasteOperationTypeSchema.default("accumulation"),
	logDate: z.string().min(10, "Укажите дату"),
	wasteClass: medicalWasteClassSchema.default("class_B"),
	wasteDescription: z.string().trim().min(1, "Укажите описание состава отходов"),
	packageType: medicalWastePackageTypeSchema.default("yellow_bag"),
	packageCount: z.number().int().min(1).default(1),
	weightKg: z.number().positive("Масса отходов должна быть > 0 кг"),
	volumeLiters: z.number().positive().optional().nullable(),
	disinfectionMethod: medicalWasteDisinfectionMethodSchema.default("chemical_soaking"),
	disinfectantUsed: z.string().trim().max(160).optional().nullable(),
	disposalCompany: z.string().trim().max(200).optional().nullable(),
	contractNumber: z.string().trim().max(100).optional().nullable(),
	transferActNumber: z.string().trim().max(100).optional().nullable(),
	responsibleStaffId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateMedicalWasteLogDto = z.input<typeof createMedicalWasteLogDtoSchema>;
