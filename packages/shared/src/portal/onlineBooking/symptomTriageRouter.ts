/**
 * symptomTriageRouter.ts — Specialty Metadata Registry and Patient Symptom Triage Routing.
 */

import type { DoctorSpecialtyCategory, SpecialtyMetadata } from "./types.js";

export const SPECIALTY_METADATA_REGISTRY: Record<DoctorSpecialtyCategory, SpecialtyMetadata> = {
	therapy: {
		category: "therapy",
		titleRu: "Терапевтическая стоматология (Лечение кариеса и каналов)",
		shortTitleRu: "Терапевт",
		descriptionRu: "Лечение кариеса, пульпита, периодонтита, эстетическая реставрация зубов.",
		defaultSlotDurationMinutes: 45,
	},
	orthopedics: {
		category: "orthopedics",
		titleRu: "Ортопедическая стоматология (Коронки, виниры, протезы)",
		shortTitleRu: "Ортопед",
		descriptionRu: "Керамические виниры e.max, коронки из диоксида циркония, мостовидные и съемные протезы.",
		defaultSlotDurationMinutes: 60,
	},
	surgery: {
		category: "surgery",
		titleRu: "Хирургическая стоматология и имплантация",
		shortTitleRu: "Хирург-имплантолог",
		descriptionRu: "Атравматичное удаление зубов, установка дентальных имплантатов, синус-лифтинг и костная пластика.",
		defaultSlotDurationMinutes: 60,
	},
	orthodontics: {
		category: "orthodontics",
		titleRu: "Ортодонтия (Брекеты и элайнеры)",
		shortTitleRu: "Ортодонт",
		descriptionRu: "Исправление прикуса у детей и взрослых, установка брекет-систем, прозрачные элайнеры.",
		defaultSlotDurationMinutes: 30,
	},
	periodontics: {
		category: "periodontics",
		titleRu: "Пародонтология (Лечение дёсен)",
		shortTitleRu: "Пародонтолог",
		descriptionRu: "Лечение гингивита и пародонтита, вектор-терапия, закрытый кюретаж пародонтальных карманов.",
		defaultSlotDurationMinutes: 45,
	},
	pediatric: {
		category: "pediatric",
		titleRu: "Детская стоматология",
		shortTitleRu: "Детский стоматолог",
		descriptionRu: "Адаптационный прием детей, лечение молочных и постоянных зубов, цветные пломбы, седация.",
		defaultSlotDurationMinutes: 30,
	},
	hygiene: {
		category: "hygiene",
		titleRu: "Профессиональная гигиена и профилактика",
		shortTitleRu: "Гигиенист",
		descriptionRu: "Комплексная чистка Air-Flow, ультразвуковое снятие камня, глубокое фторирование и отбеливание.",
		defaultSlotDurationMinutes: 45,
	},
	all: {
		category: "all",
		titleRu: "Все стоматологические направления",
		shortTitleRu: "Все врачи",
		descriptionRu: "Полный каталог специалистов клиники.",
		defaultSlotDurationMinutes: 30,
	},
};
