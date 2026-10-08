/**
 * @file sanpinFixtures.ts
 * @description Layer 1: SanPiN clinical compliance fixtures, autoclave journals, sterilization tests.
 */

import type { SampleSanpinJournalEntry } from "./types.js";

export const sampleSanpinJournalEntries: SampleSanpinJournalEntry[] = [
	{
		id: "sanpin-autoclave-20261008-01",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		logType: "autoclave",
		timestamp: "2026-10-08T07:45:00.000Z",
		equipmentName: "Автоклав Euronda E9 Next (Класс B, 24л)",
		cycleNumber: 1422,
		temperatureCelsius: 134,
		pressureBar: 2.1,
		durationMinutes: 45,
		chemicalIndicatorResult: "passed",
		biologicalIndicatorResult: "passed",
		performedByStaffId: "f365da0c-7094-4f80-b52d-59b7b1254791",
		verifiedByStaffId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
		notes: "Утренняя стерилизация терапевтических и хирургических наборов (12 крафт-пакетов)",
	},
	{
		id: "sanpin-disinfection-20261008-01",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		logType: "disinfection",
		timestamp: "2026-10-08T08:15:00.000Z",
		equipmentName: "Кабинет №1 (Кресло Planmeca Compact i5)",
		durationMinutes: 15,
		chemicalIndicatorResult: "passed",
		performedByStaffId: "f365da0c-7094-4f80-b52d-59b7b1254791",
		notes: "Предсменная текущая дезинфекция поверхностей (Аламинол 3%)",
	},
	{
		id: "sanpin-bactericidal-20261008-01",
		organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
		logType: "bactericidal_lamp",
		timestamp: "2026-10-08T08:30:00.000Z",
		equipmentName: "Рециркулятор бактерицидный ДЕЗАР-7",
		durationMinutes: 60,
		chemicalIndicatorResult: "passed",
		performedByStaffId: "f365da0c-7094-4f80-b52d-59b7b1254791",
		notes: "Предсменное обеззараживание воздуха кабинета перед началом приёма",
	},
];
