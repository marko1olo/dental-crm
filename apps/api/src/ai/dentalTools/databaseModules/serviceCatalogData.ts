/**
 * serviceCatalogData.ts — Нормативный каталог базовых стоматологических процедур.
 * Мандаты: 8b (<= 120 строк), 8x (живой клинический язык).
 */

export interface StandardCatalogService {
	readonly code: string;
	readonly title: string;
	readonly category: string;
}

export const STANDARD_804N_CATALOG: readonly StandardCatalogService[] = [
	{ code: "A11.07.011", title: "Аппликационная анестезия", category: "anesthesia" },
	{ code: "A11.07.012", title: "Инфильтрационная анестезия", category: "anesthesia" },
	{ code: "A11.07.013", title: "Проводниковая анестезия", category: "anesthesia" },
	{ code: "A16.07.002", title: "Восстановление зуба пломбой (лечение кариеса)", category: "therapy" },
	{ code: "A16.07.002.001", title: "Наложение коффердама (раббердама) / Оптрагейт", category: "therapy" },
	{ code: "A16.07.002.010", title: "Восстановление зуба пломбой светоотверждаемым композитным материалом", category: "therapy" },
	{ code: "A16.07.030", title: "Инструментальная и медикаментозная обработка корневого канала", category: "endodontics" },
	{ code: "A16.07.008", title: "Пломбирование корневого канала зуба (гуттаперча, силер)", category: "endodontics" },
	{ code: "A16.07.001", title: "Удаление зуба (простое / сложное)", category: "surgery" },
	{ code: "A16.07.004", title: "Восстановление зуба коронкой (металлокерамика / диоксид циркония / E.max)", category: "orthopedics" },
	{ code: "A16.07.006", title: "Установка дентального имплантата", category: "surgery" },
	{ code: "A16.07.020", title: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", category: "hygiene" },
	{ code: "A16.07.051", title: "Профессиональная гигиена полости рта и зубов (Air-Flow)", category: "hygiene" },
	{ code: "B01.065.001", title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный", category: "consultation" },
];
