import crypto from "node:crypto";
import { multiplyKopecks, parseKopecks, formatKopecksRu } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { appointments, labOrders, patients, users, visits } from "../../../db/schema.js";
import { VALID_FDI_PERMANENT_TEETH, VALID_FDI_PRIMARY_TEETH } from "../../clinical/Icd10ClinicalValidator.js";
import { type ChairsideSafetyAlert, type ChairsideSoapDiary, formatFdiTooth, getCanalsForTooth, parseFdiTooth } from "../chairsideSentinelEngine.js";
import type { AgentContext } from "../context.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolDefinition } from "../tools/tool.js";
import { calculateAnestheticDosageTool, calculateAnestheticDosageSchema, type CalculateAnestheticDosageInput, type CalculateAnestheticDosageResult } from "../tools/anestheticDosageTool.js";
import { generateInformedConsentIdsTool, generateInformedConsentIdsSchema, type GenerateInformedConsentIdsInput, type GenerateInformedConsentIdsResult } from "../tools/informedConsentTool.js";
import { checkWarehouseSuppliesTool, checkWarehouseSuppliesSchema, type CheckWarehouseSuppliesInput, type CheckWarehouseSuppliesResult, type CriticalSupplyItem } from "../tools/warehouseSuppliesTool.js";
import { getDailyScheduleIntelligenceTool, getDoctorShiftsAndChairsTool } from "../tools/crmOperationalScheduleTools.js";
import { getClinicOrDoctorRevenueTool, getPatientFamilyDepositAndDebtTool } from "../tools/crmFinancialIntelligenceTools.js";
export const getPatientEmk043uSchema = z.object({
	patientId: z
		.string()
		.min(1, "Идентификатор пациента обязателен")
		.describe("UUID или идентификатор пациента в клинике"),
	organizationId: z
		.string()
		.optional()
		.describe("Идентификатор организации (клиники)"),
	includeHistoryLimit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.default(5)
		.optional()
		.describe("Количество последних визитов для выборки анамнеза"),
});
export type GetPatientEmk043uInput = z.infer<typeof getPatientEmk043uSchema>;
export interface PatientEmk043uToothState {
	toothNumber: number;
	fdiFormatted: string;
	status: string;
	statusCode: string;
	surfaces: string[];
	diagnosisText?: string;
}
export interface PatientEmk043uResult {
	patient: {
		id: string;
		fullName: string;
		birthDate: string | null;
		gender: string | null;
		phone: string | null;
		card043Number: string;
	};
	allergies: string[];
	somaticStatus: string;
	isPhysiologicalNorm: boolean;
	dentalFormula: Record<number, PatientEmk043uToothState>;
	recentVisits: Array<{
		visitId: string;
		visitDate: string;
		doctorName: string;
		diagnosis: string;
		protocolSnippet: string;
	}>;
	renderedSummary: string;
}
export const updateToothStatusSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	tooth: z
		.union([z.number(), z.string()])
		.describe("Номер зуба по международной системе FDI (11..48 или 51..85, например 26, '2.6', '47')"),
	status: z
		.string()
		.min(1, "Статус зуба обязателен")
		.describe("Клинический статус зуба: кариес (C1-C4), пульпит (P), пломба (F/Pl), коронка (Cr/K), удален (X/A), имплант (Imp), здоровый (Norm)"),
	surfaces: z
		.union([z.array(z.string()), z.string()])
		.optional()
		.describe("Пораженные или восстанавливаемые анатомические поверхности: O (окклюзионная), M (мезиальная), D (дистальная), V/B (вестибулярная), L/P (язычная/небная), I (режущий край)"),
	diagnosisText: z.string().optional().describe("Текстовый диагноз или код МКБ-10 (например, 'K02.1 Кариес дентина')"),
	notes: z.string().optional().describe("Клинические примечания к зубу"),
});
export type UpdateToothStatusInput = z.infer<typeof updateToothStatusSchema>;
export interface UpdateToothStatusResult {
	success: true;
	toothNumber: number;
	fdiFormatted: string;
	previousStatus: string;
	newStatus: string;
	statusCode: string;
	surfaces: string[];
	diagnosisText: string;
	message: string;
}
export const calculate804nEstimateSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothNumber: z.union([z.number(), z.string()]).optional().describe("Номер зуба FDI"),
	category: z
		.enum(["therapy", "endodontics", "surgery", "orthopedics", "hygiene", "preventive"])
		.optional()
		.describe("Клиническая категория лечения"),
	serviceCodes: z.array(z.string()).optional().describe("Массив кодов услуг (например, ['A16.07.002.001', 'A16.07.030'])"),
	customItems: z
		.array(
			z.object({
				code: z.string(),
				title: z.string(),
				priceRub: z.number().nonnegative(),
				quantity: z.number().int().positive().default(1),
			}),
		)
		.optional()
		.describe("Пользовательские или дополнительные позиции прайса клиники"),
	discountPercent: z
		.number()
		.min(0, "Скидка не может быть отрицательной")
		.max(100, "Скидка не может превышать 100%")
		.default(0)
		.describe("Скидка лечащего врача в процентах (0-100%, свобода скидок врача)"),
	priceModifiers: z
		.array(
			z.object({
				name: z.string(),
				percentDelta: z.number(),
			}),
		)
		.optional()
		.describe("Модификаторы цены (например, сложность +10%, гарантия -100%)"),
});
export type Calculate804nEstimateInput = z.infer<typeof calculate804nEstimateSchema>;
export interface EstimateLineItem {
	code: string;
	title: string;
	basePriceRub: number;
	basePriceKopecks: number;
	quantity: number;
	finalPriceRub: number;
	finalPriceKopecks: number;
}
export interface Calculate804nEstimateResult {
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	items: EstimateLineItem[];
	subtotalRub: number;
	subtotalKopecks: number;
	discountPercent: number;
	discountRub: number;
	discountKopecks: number;
	totalRub: number;
	totalKopecks: number;
	formattedTotal: string;
	doctorAutonomyApplied: true;
}
export const checkDrugInteractionsSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	plannedDrugs: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe("Планируемые к введению или назначению препараты (например, ['Артикаин 1:100 000', 'Амоксициллин'])"),
	knownAllergies: z.array(z.string()).optional().describe("Известные аллергии пациента"),
	somaticConditions: z.array(z.string()).optional().describe("Сопутствующие соматические заболевания (гипертония, глаукома, беременность, диабет)"),
});
export type CheckDrugInteractionsInput = z.infer<typeof checkDrugInteractionsSchema>;
export interface CheckDrugInteractionsResult {
	safeToProceed: boolean;
	alerts: ChairsideSafetyAlert[];
	recommendedAnesthetic: string;
	recommendedAntibiotic: string;
	recommendedAnalgesic: string;
	isPhysiologicalNorm: boolean;
}
export const createDentalLabOrderSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothCodes: z
		.array(z.union([z.number(), z.string()]))
		.min(1, "Укажите хотя бы один зуб FDI")
		.describe("Зубы по системе FDI (например, [16, 17] или ['2.6'])"),
	workType: z
		.string()
		.min(1, "Вид конструкции обязателен")
		.describe("Вид конструкции (Коронка цельноциркониевая ZrO2, Винир E.max, Мостовидный протез, Хирургический шаблон)"),
	material: z
		.string()
		.min(1, "Материал обязателен")
		.describe("Материал (Диоксид циркония, E.max Press, Металлокерамика, PMMA, Титан)"),
	vitaShade: z
		.string()
		.min(1, "Оттенок VITA обязателен")
		.describe("Цвет по шкале VITA (A1, A2, A3, A3.5, B1, BL2, BL3, 2M2)"),
	dueDate: z.string().describe("Срок сдачи наряда (ГГГГ-ММ-ДД или ISO 8601)"),
	laboratoryName: z.string().optional().describe("Название ЗТЛ"),
	clinicalNotes: z.string().optional().describe("Клинические указания технику"),
	doctorId: z.string().optional().describe("ID лечащего врача"),
	priceRub: z.number().nonnegative().optional().describe("Себестоимость наряда в рублях"),
});
export type CreateDentalLabOrderInput = z.infer<typeof createDentalLabOrderSchema>;
export interface CreateDentalLabOrderResult {
	success: true;
	orderId: string;
	patientId: string;
	toothCodes: number[];
	toothFdi: string;
	workType: string;
	material: string;
	vitaShade: string;
	dueDate: string;
	status: "draft";
	portalToken: string;
	portalUrl: string;
	isExpired30DaysBlocked: false;
}
export const bookChairsideAppointmentSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	doctorUserId: z.string().min(1, "doctorUserId обязателен"),
	startsAt: z.string().describe("Время начала приема в ISO 8601 (например, 2026-09-28T10:00:00Z)"),
	durationMinutes: z.number().int().positive().default(30).optional(),
	endsAt: z.string().optional().describe("Время окончания приема в ISO 8601"),
	reason: z.string().min(1, "Причина записи обязательна").describe("Причина записи / этап лечения"),
	chairId: z.string().optional().describe("ID стоматологической установки"),
	assistantUserId: z.string().optional().describe("ID ассистента (опционально)"),
	comment: z.string().optional(),
});
export type BookChairsideAppointmentInput = z.infer<typeof bookChairsideAppointmentSchema>;
export interface BookChairsideAppointmentResult {
	success: true;
	appointmentId: string;
	patientId: string;
	doctorUserId: string;
	startsAt: string;
	endsAt: string;
	status: "planned";
	reason: string;
	assistantRequired: false;
	message: string;
}
export const draft043uSoapDiarySchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothNumber: z.union([z.number(), z.string()]).optional().describe("Номер зуба FDI"),
	diagnosisCode: z.string().optional().describe("Код МКБ-10 (например, K04.0, K02.1)"),
	complaints: z.string().optional().describe("Жалобы пациента"),
	somaticStatus: z.string().optional().describe("Соматический анамнез"),
	allergiesStatus: z.string().optional().describe("Аллергологический анамнез"),
	oneClickNorm: z.boolean().default(true).optional().describe("Заполнение физиологической нормы в 1 клик"),
	performedTreatment: z.string().optional().describe("Выполненные манипуляции"),
	recommendations: z.string().optional().describe("Клинические рекомендации пациенту"),
});
export type Draft043uSoapDiaryInput = z.infer<typeof draft043uSoapDiarySchema>;
export interface Draft043uSoapDiaryResult {
	success: true;
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	soapDiary: ChairsideSoapDiary;
	status: "draft";
	readyForOneClickApply: true;
	isDraftEditable: true;
}
