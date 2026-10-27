/**
 * clinicSetupTypes.ts — Схема конфигурации и типы для автономной экспресс-настройки клиники.
 * Мандаты: 8b (<= 120 строк), 8n (соло-практика и малая клиника).
 */

import { z } from "zod";

export const configureClinicSetupSchema = z.object({
	clinicName: z.string().min(2, "Название клиники обязательно").describe("Наименование стоматологической клиники"),
	inn: z.string().optional().describe("ИНН юридического лица или ИП"),
	kpp: z.string().optional().describe("КПП организации"),
	ogrn: z.string().optional().describe("ОГРН / ОГРНИП"),
	legalAddress: z.string().optional().describe("Фактический или юридический адрес клиники"),
	phone: z.string().optional().describe("Контактный телефон клиники"),
	email: z.string().optional().describe("Контактный email клиники"),
	clinicMode: z.enum(["solo_doctor", "one_chair", "small_clinic", "network_clinic"]).optional().describe("Масштаб клиники"),
	chairsCount: z.number().int().min(1).max(20).default(3).describe("Количество стоматологических кресел в расписании"),
	chairNames: z.array(z.string()).optional().describe("Пользовательские названия кабинетов или кресел"),
	schedule: z
		.object({
			startHour: z.number().min(0).max(23).default(9).describe("Час начала рабочего дня"),
			endHour: z.number().min(1).max(24).default(21).describe("Час окончания рабочего дня"),
			workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6]).describe("Рабочие дни недели"),
			timezone: z.string().default("Europe/Moscow").describe("Часовой пояс клиники"),
		})
		.default({ startHour: 9, endHour: 21, workDays: [1, 2, 3, 4, 5, 6], timezone: "Europe/Moscow" }),
	doctors: z
		.array(
			z.object({
				fullName: z.string().min(2).describe("ФИО врача"),
				specialty: z.enum(["therapist", "surgeon", "orthopedist", "orthodontist", "periodontist", "hygienist", "pediatric", "universal"]).describe("Специальность врача"),
				phone: z.string().optional().describe("Телефон врача"),
				email: z.string().optional().describe("Email врача"),
			}),
		)
		.min(1)
		.describe("Список врачей клиники для добавления в расписание"),
	activateStandardPricelist: z.boolean().default(true).describe("Активировать стандартный прейскурант стоматологических услуг"),
	kkmSettings: z
		.object({
			model: z.string().default("ATOL 25F / 30F USB").describe("Модель кассового аппарата (Атол, Штрих-М)"),
			kkmActive: z.boolean().default(true).describe("Флаг активности фискального регистратора"),
			defaultPort: z.string().default("USB/COM3").describe("Порт подключения кассы"),
			cashierName: z.string().optional().describe("ФИО старшего кассира"),
		})
		.default({ model: "ATOL 25F / 30F USB", kkmActive: true, defaultPort: "USB/COM3" })
		.describe("Параметры фискального кассового регистратора"),
});

export type ConfigureClinicSetupInput = z.input<typeof configureClinicSetupSchema>;
