/**
 * demoDoctorVisits.ts — Список демонстрационных визитов врача-терапевта (Showcase).
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutVisit } from "../../../pages/payoutDashboard/types.js";

export const DEMO_DOCTOR_VISITS: readonly DoctorPayoutVisit[] = [
	{
		visitId: "v-demo-1", appointmentId: "app-1", paidAt: "2026-10-05T14:30:00.000Z", visitDate: "2026-10-05", patientId: "p-1", patientName: "Иванова Мария Сергеевна", medicalCardNumber: "1042/26", revenueRub: 32000, paymentCount: 1,
		services: [
			{ id: "s-1", title: "Наложение коффердама (1.6)", order804nCode: "A16.07.002.001", toothCode: "1.6", priceRub: 1500, quantity: 1 },
			{ id: "s-2", title: "Препарирование кариозной полости (1.6)", order804nCode: "A16.07.030.001", toothCode: "1.6", priceRub: 3500, quantity: 1 },
			{ id: "s-3", title: "Механическая обработка корневого канала (1.6)", order804nCode: "A16.07.030.002", toothCode: "1.6", priceRub: 7000, quantity: 1 },
			{ id: "s-4", title: "Медикаментозная обработка канала (1.6)", order804nCode: "A16.07.030.003", toothCode: "1.6", priceRub: 4000, quantity: 1 },
			{ id: "s-5", title: "Пломбирование канала гуттаперчей (1.6)", order804nCode: "A16.07.008.002", toothCode: "1.6", priceRub: 6000, quantity: 1 },
			{ id: "s-6", title: "Восстановление зуба пломбой световой полимеризации (1.6)", order804nCode: "A16.07.002.010", toothCode: "1.6", priceRub: 10000, quantity: 1 },
		],
		materials: [],
	},
	{
		visitId: "v-demo-2", appointmentId: "app-2", paidAt: "2026-10-09T17:00:00.000Z", visitDate: "2026-10-09", patientId: "p-2", patientName: "Петров Константин Евгеньевич", medicalCardNumber: "1088/26", revenueRub: 26000, paymentCount: 1,
		services: [
			{ id: "s-7", title: "Наложение коффердама (1.1)", order804nCode: "A16.07.002.001", toothCode: "1.1", priceRub: 1500, quantity: 1 },
			{ id: "s-8", title: "Инфильтрационная анестезия (1.1)", order804nCode: "A16.07.002.002", toothCode: "1.1", priceRub: 1500, quantity: 1 },
			{ id: "s-9", title: "Препарирование полости (1.1)", order804nCode: "A16.07.002.003", toothCode: "1.1", priceRub: 3000, quantity: 1 },
			{ id: "s-10", title: "Художественная реставрация зуба Estelite Asteria (1.1)", order804nCode: "A16.07.002", toothCode: "1.1", priceRub: 18000, quantity: 1 },
			{ id: "s-11", title: "Шлифовка и полировка реставрации (1.1)", order804nCode: "A16.07.002.005", toothCode: "1.1", priceRub: 2000, quantity: 1 },
		],
		materials: [],
	},
	{
		visitId: "v-demo-3", appointmentId: "app-3", paidAt: "2026-10-14T11:15:00.000Z", visitDate: "2026-10-14", patientId: "p-3", patientName: "Смирнов Виктор Игоревич", medicalCardNumber: "1105/26", revenueRub: 36000, paymentCount: 1,
		services: [
			{ id: "s-12", title: "Профессиональная гигиена полости рта (Air-Flow)", order804nCode: "A16.07.051", toothCode: null, priceRub: 8000, quantity: 1 },
			{ id: "s-13", title: "Ультразвуковое удаление зубных отложений", order804nCode: "A16.07.051.001", toothCode: null, priceRub: 6000, quantity: 1 },
			{ id: "s-14", title: "Полировка пастой Cleanic", order804nCode: "A16.07.051.002", toothCode: null, priceRub: 2000, quantity: 1 },
			{ id: "s-15", title: "Глубокое фторирование эмали (Bifluorid 10)", order804nCode: "A16.07.053", toothCode: null, priceRub: 2000, quantity: 1 },
			{ id: "s-16", title: "Наложение коффердама (2.4)", order804nCode: "A16.07.002.001", toothCode: "2.4", priceRub: 1500, quantity: 1 },
			{ id: "s-17", title: "Анестезия проводниковая (2.4)", order804nCode: "A16.07.002.002", toothCode: "2.4", priceRub: 1500, quantity: 1 },
			{ id: "s-18", title: "Лечение глубокого кариеса с лечебной прокладкой (2.4)", order804nCode: "A16.07.002", toothCode: "2.4", priceRub: 15000, quantity: 1 },
		],
		materials: [],
	},
	{
		visitId: "v-demo-4", appointmentId: "app-4", paidAt: "2026-10-18T15:45:00.000Z", visitDate: "2026-10-18", patientId: "p-4", patientName: "Васильева Татьяна Алексеевна", medicalCardNumber: "1140/26", revenueRub: 30000, paymentCount: 1,
		services: [
			{ id: "s-19", title: "Наложение коффердама (3.6)", order804nCode: "A16.07.002.001", toothCode: "3.6", priceRub: 1500, quantity: 1 },
			{ id: "s-20", title: "Эндодонтическая ревизия (3.6)", order804nCode: "A16.07.030.001", toothCode: "3.6", priceRub: 6500, quantity: 1 },
			{ id: "s-21", title: "Обработка двух каналов (3.6)", order804nCode: "A16.07.030.002", toothCode: "3.6", priceRub: 6000, quantity: 1 },
			{ id: "s-22", title: "Временное пломбирование гидроокисью кальция (3.6)", order804nCode: "A16.07.030.003", toothCode: "3.6", priceRub: 4000, quantity: 1 },
			{ id: "s-23", title: "Наложение временной повязки (3.6)", order804nCode: "A16.07.002.001", toothCode: "3.6", priceRub: 2000, quantity: 1 },
			{ id: "s-24", title: "Лечение поверхностного кариеса (3.5)", order804nCode: "A16.07.002", toothCode: "3.5", priceRub: 10000, quantity: 1 },
		],
		materials: [],
	},
	{
		visitId: "v-demo-5", appointmentId: "app-5", paidAt: "2026-10-22T12:00:00.000Z", visitDate: "2026-10-22", patientId: "p-5", patientName: "Козлов Дмитрий Николаевич", medicalCardNumber: "1182/26", revenueRub: 28000, paymentCount: 1,
		services: [
			{ id: "s-25", title: "Наложение коффердама (4.5)", order804nCode: "A16.07.002.001", toothCode: "4.5", priceRub: 1500, quantity: 1 },
			{ id: "s-26", title: "Инфильтрационная анестезия (4.5)", order804nCode: "A16.07.002.002", toothCode: "4.5", priceRub: 1500, quantity: 1 },
			{ id: "s-27", title: "Препарирование полости (4.5)", order804nCode: "A16.07.002", toothCode: "4.5", priceRub: 3000, quantity: 1 },
			{ id: "s-28", title: "Восстановление коронковой части зуба Estelite (4.5)", order804nCode: "A16.07.002", toothCode: "4.5", priceRub: 14000, quantity: 1 },
			{ id: "s-29", title: "Шлифовка и финишная полировка (4.5)", order804nCode: "A16.07.002.005", toothCode: "4.5", priceRub: 2000, quantity: 1 },
			{ id: "s-30", title: "Коронка временная ортопедическая (4.6)", order804nCode: "A16.07.004", toothCode: "4.6", priceRub: 6000, quantity: 1 },
		],
		materials: [],
	},
	{
		visitId: "v-demo-6", appointmentId: "app-6", paidAt: "2026-10-27T16:30:00.000Z", visitDate: "2026-10-27", patientId: "p-6", patientName: "Новикова Елена Павловна", medicalCardNumber: "1210/26", revenueRub: 32000, paymentCount: 1,
		services: [
			{ id: "s-32", title: "Наложение коффердама (1.4)", order804nCode: "A16.07.002.001", toothCode: "1.4", priceRub: 1500, quantity: 1 },
			{ id: "s-33", title: "Анестезия инфильтрационная Убистезин (1.4)", order804nCode: "A16.07.002.002", toothCode: "1.4", priceRub: 1500, quantity: 1 },
			{ id: "s-34", title: "Лечение среднего кариеса (1.4)", order804nCode: "A16.07.002", toothCode: "1.4", priceRub: 11000, quantity: 1 },
			{ id: "s-35", title: "Наложение коффердама (1.5)", order804nCode: "A16.07.002.001", toothCode: "1.5", priceRub: 1500, quantity: 1 },
			{ id: "s-36", title: "Анестезия Убистезин (1.5)", order804nCode: "A16.07.002.002", toothCode: "1.5", priceRub: 1500, quantity: 1 },
			{ id: "s-37", title: "Коронка цельнолитая (1.5)", order804nCode: "A16.07.004", toothCode: "1.5", priceRub: 11000, quantity: 1 },
			{ id: "s-38", title: "Реминерализующая терапия Tooth Mousse", order804nCode: "A16.07.053", toothCode: null, priceRub: 4000, quantity: 1 },
		],
		materials: [],
	},
];
