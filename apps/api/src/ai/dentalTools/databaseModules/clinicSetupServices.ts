/**
 * clinicSetupServices.ts — Базовый начальный каталог услуг для автонастройки клиники.
 * Мандаты: 8b (<= 120 строк), 8n (соло-врач), 8x (живой клинический язык).
 */

export interface InitialClinicService {
	readonly code: string;
	readonly title: string;
	readonly category: "therapy" | "surgery" | "prosthetics" | "orthodontics" | "hygiene" | "consultation";
	readonly specialty: "therapist" | "surgeon" | "orthopedist" | "orthodontist" | "hygienist" | "universal";
	readonly priceRub: number;
	readonly durationMinutes: number;
}

export const STANDARD_INITIAL_SERVICES: readonly InitialClinicService[] = [
	{ code: "B01.065.001", title: "Первичный приём и консультация стоматолога-терапевта", category: "consultation", specialty: "therapist", priceRub: 1000, durationMinutes: 30 },
	{ code: "B01.066.001", title: "Первичный приём и консультация стоматолога-ортопеда", category: "consultation", specialty: "orthopedist", priceRub: 1200, durationMinutes: 30 },
	{ code: "B01.067.001", title: "Первичный приём и консультация стоматолога-хирурга", category: "consultation", specialty: "surgeon", priceRub: 1200, durationMinutes: 30 },
	{ code: "A11.07.012", title: "Инфильтрационная анестезия препаратом артикаина", category: "therapy", specialty: "therapist", priceRub: 650, durationMinutes: 10 },
	{ code: "A11.07.013", title: "Проводниковая анестезия", category: "therapy", specialty: "therapist", priceRub: 750, durationMinutes: 10 },
	{ code: "A16.07.002", title: "Лечение поверхностного и среднего кариеса с постановкой пломбы", category: "therapy", specialty: "therapist", priceRub: 3500, durationMinutes: 40 },
	{ code: "A16.07.002.001", title: "Изоляция операционного поля (коффердам / раббердам)", category: "therapy", specialty: "therapist", priceRub: 500, durationMinutes: 15 },
	{ code: "A16.07.002.010", title: "Эстетическая реставрация зуба светоотверждаемым нанокомпозитом", category: "therapy", specialty: "therapist", priceRub: 5200, durationMinutes: 60 },
	{ code: "A16.07.030", title: "Механическая и медикаментозная обработка корневого канала", category: "therapy", specialty: "therapist", priceRub: 2200, durationMinutes: 35 },
	{ code: "A16.07.008", title: "Пломбирование корневого канала методом вертикальной конденсации", category: "therapy", specialty: "therapist", priceRub: 1900, durationMinutes: 30 },
	{ code: "A16.07.020", title: "Ультразвуковое удаление зубных отложений (1 челюсть)", category: "hygiene", specialty: "hygienist", priceRub: 2500, durationMinutes: 30 },
	{ code: "A16.07.051", title: "Комплексная профессиональная чистка зубов Air-Flow с полировкой", category: "hygiene", specialty: "hygienist", priceRub: 4500, durationMinutes: 45 },
	{ code: "A16.07.001", title: "Простое удаление зуба", category: "surgery", specialty: "surgeon", priceRub: 2500, durationMinutes: 30 },
	{ code: "A16.07.001.001", title: "Сложное удаление зуба с разъединением корней", category: "surgery", specialty: "surgeon", priceRub: 4900, durationMinutes: 45 },
	{ code: "A16.07.001.002", title: "Удаление ретинированного или дистопированного зуба мудрости", category: "surgery", specialty: "surgeon", priceRub: 7800, durationMinutes: 60 },
	{ code: "A16.07.006", title: "Установка дентального винтового имплантата", category: "surgery", specialty: "surgeon", priceRub: 29500, durationMinutes: 60 },
	{ code: "A16.07.004", title: "Коронка металлокерамическая на каркасе", category: "prosthetics", specialty: "orthopedist", priceRub: 12000, durationMinutes: 45 },
	{ code: "A16.07.004.001", title: "Коронка из диоксида циркония Prettau / Multi-layer", category: "prosthetics", specialty: "orthopedist", priceRub: 19500, durationMinutes: 45 },
	{ code: "A16.07.004.002", title: "Керамический винир / коронка E.max", category: "prosthetics", specialty: "orthopedist", priceRub: 24000, durationMinutes: 60 },
	{ code: "A16.07.047", title: "Фиксация вестибулярной металлической брекет-системы (1 зубной ряд)", category: "orthodontics", specialty: "orthodontist", priceRub: 38000, durationMinutes: 60 },
	{ code: "A16.07.048", title: "Контрольный осмотр и замена ортодонтической дуги", category: "orthodontics", specialty: "orthodontist", priceRub: 2500, durationMinutes: 30 },
];
