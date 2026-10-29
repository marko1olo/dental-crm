import type { PatientThreeTierTreatmentPlan } from "../patientCabinetEngine";

export const ALEXEY_THREE_TIER_PLAN: PatientThreeTierTreatmentPlan = {
	selectedTier: "standard",
	tiers: [
		{
			tierId: "basic",
			tierNameRu: "Базовый (Эконом)",
			subtitleRu: "Восстановление жевательной функции металлокерамикой",
			totalCostRub: 195000,
			warrantyMonths: 12,
			durationWeeks: 4,
			benefits: ["Функциональное восстановление жевания", "Доступная стоимость", "Гарантия 1 год"],
			stages: [
				{ id: "st-e1", orderIndex: 1, titleRu: "Санация и гигиена", categoryRu: "Гигиена", teethFdi: ["1.1-4.8"], costRub: 15000, status: "completed", procedures: ["УЗ-скейлинг", "AirFlow"] },
				{ id: "st-e2", orderIndex: 2, titleRu: "Имплантация Osstem", categoryRu: "Хирургия", teethFdi: ["1.6", "2.6"], costRub: 90000, status: "completed", procedures: ["Установка имплантатов Osstem"] },
				{ id: "st-e3", orderIndex: 3, titleRu: "Металлокерамические коронки", categoryRu: "Ортопедия", teethFdi: ["1.6", "2.6"], costRub: 90000, status: "planned", procedures: ["Коронки МК"] },
			],
		},
		{
			tierId: "standard",
			tierNameRu: "Оптимальный (Стандарт)",
			subtitleRu: "Имплантация Osstem TS III + Диоксид циркония Katana + Виниры E.max",
			totalCostRub: 340000,
			warrantyMonths: 24,
			durationWeeks: 6,
			isRecommended: true,
			benefits: ["Корейские имплантаты Osstem TS III", "Японский диоксид циркония Katana ML", "Керамические виниры E.max", "Гарантия 2 года"],
			stages: [
				{ id: "st-s1", orderIndex: 1, titleRu: "Гигиена и санация очагов кариеса", categoryRu: "Гигиена", teethFdi: ["1.1-4.8", "1.4"], costRub: 16000, status: "completed", procedures: ["Скейлинг", "Лечение кариеса #1.4"] },
				{ id: "st-s2", orderIndex: 2, titleRu: "Навигационная имплантация Osstem TS III", categoryRu: "Хирургия", teethFdi: ["1.6", "2.6"], costRub: 110000, status: "completed", procedures: ["Имплантация #1.6", "Имплантация #2.6"] },
				{ id: "st-s3", orderIndex: 3, titleRu: "Эндодонтия под микроскопом", categoryRu: "Терапия", teethFdi: ["3.6"], costRub: 28000, status: "completed", procedures: ["Лечение каналов под микроскопом"] },
				{ id: "st-s4", orderIndex: 4, titleRu: "Виниры E.max и коронка #1.6", categoryRu: "Ортопедия", teethFdi: ["1.1-2.2", "1.6"], costRub: 89000, status: "completed", procedures: ["4 винира E.max", "Коронка цирконий #1.6"] },
				{ id: "st-s5", orderIndex: 5, titleRu: "Постоянное циркониевое протезирование импланта #2.6", categoryRu: "Ортопедия", teethFdi: ["2.6"], costRub: 35000, status: "in_progress", procedures: ["Индивидуальный титановый абатмент", "Циркониевая коронка Katana ML"] },
			],
		},
		{
			tierId: "premium",
			tierNameRu: "Премиум (VIP All-Inclusive)",
			subtitleRu: "Премиум импланты Straumann, ультратонкие виниры и куратор 24/7",
			totalCostRub: 580000,
			warrantyMonths: 60,
			durationWeeks: 8,
			benefits: ["Импланты Straumann BLX Roxolid SLA", "Премиальная керамика e.max с послойным нанесением", "Персональный врач-куратор 24/7", "Расширенная гарантия 5 лет"],
			stages: [
				{ id: "st-p1", orderIndex: 1, titleRu: "Digital Smile Design и SPA-гигиена", categoryRu: "Диагностика", teethFdi: ["1.1-4.8"], costRub: 40000, status: "completed", procedures: ["3D-моделирование", "SPA-гигиена"] },
				{ id: "st-p2", orderIndex: 2, titleRu: "Имплантация Straumann BLX", categoryRu: "Хирургия", teethFdi: ["1.6", "2.6"], costRub: 240000, status: "completed", procedures: ["Имплантаты Straumann", "3D-шаблон"] },
				{ id: "st-p3", orderIndex: 3, titleRu: "Керамическая реабилитация All-Ceramic", categoryRu: "Ортопедия", teethFdi: ["1.1-2.2", "1.6", "2.6"], costRub: 300000, status: "in_progress", procedures: ["Ультратонкие виниры", "Цирконий Straumann"] },
			],
		},
	],
};
