import { z } from "zod";
import {
	leadPriorityEnum,
	leadStatusEnum,
} from "@dental/shared";

export { leadStatusEnum, leadPriorityEnum };

export const leadSchema = z.object({
	name: z.string().min(1),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const patchLeadSchema = z.object({
	name: z.string().min(1).optional(),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	status: leadStatusEnum.optional(),
	notes: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

export type PatchLeadInput = z.infer<typeof patchLeadSchema>;

export const patchLeadStatusSchema = z.object({
	status: leadStatusEnum,
	reason: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
});

export type PatchLeadStatusInput = z.infer<typeof patchLeadStatusSchema>;

export const DEMO_SHOWCASE_SEED_LEADS = [
	{
		name: "Белова Марина Сергеевна",
		phone: "+79164401892",
		source: "Яндекс.Директ",
		status: "new" as const,
		expectedRevenue: "145000",
		notes: "Консультация по имплантации в области 36, 37 зубов, есть КЛКТ",
		clinicalTags: ["Имплантация", "КЛКТ"],
	},
	{
		name: "Ковалёв Денис Игоревич",
		phone: "+79257123045",
		source: "2ГИС",
		status: "new" as const,
		expectedRevenue: "18500",
		notes: "Чувствительность на холодное, зуб 25, просит окно на вечер",
		clinicalTags: ["Терапия"],
	},
	{
		name: "Романова Алина Викторовна",
		phone: "+79035589114",
		source: "ПроДокторов",
		status: "contacted" as const,
		expectedRevenue: "220000",
		notes: "Эстетическая реабилитация (виниры E.max в зоне улыбки), согласует дату",
		clinicalTags: ["Ортопедия E.max"],
	},
	{
		name: "Захаров Павел Андреевич",
		phone: "+79853047761",
		source: "Сайт / SEO",
		status: "contacted" as const,
		expectedRevenue: "42000",
		notes: "Удаление ретинированного 48 зуба + седация",
		clinicalTags: ["Хирургия"],
	},
	{
		name: "Ларионова Ольга Николаевна",
		phone: "+79158820933",
		source: "Рекомендации",
		status: "consult_booked" as const,
		expectedRevenue: "180000",
		notes: "Записана к д-ру Орлову А. В. на комплексную консультацию и фотопротокол",
		clinicalTags: ["Тотальное протезирование"],
	},
	{
		name: "Сафонов Тимур Русланович",
		phone: "+79266194280",
		source: "Яндекс.Директ",
		status: "consult_booked" as const,
		expectedRevenue: "95000",
		notes: "Консультация ортодонта (элайнеры), направлен на ОПТГ",
		clinicalTags: ["Ортодонтия"],
	},
	{
		name: "Крылова Екатерина Дмитриевна",
		phone: "+79052316419",
		source: "ПроДокторов",
		status: "showed_up" as const,
		expectedRevenue: "310000",
		notes: "План лечения согласован (2 имплантата Straumann + коронки ZrO2), внесён аванс",
		clinicalTags: ["Имплантация", "План согласован"],
	},
	{
		name: "Мельников Артём Олегович",
		phone: "+79169041158",
		source: "2ГИС",
		status: "showed_up" as const,
		expectedRevenue: "28500",
		notes: "Проведена профгигиена AirFlow и лечение кариеса 16 зуба",
		clinicalTags: ["Санация"],
	},
] as const;
