import type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
} from "../../../pages/payoutDashboard/types.js";

export type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
};

export interface DoctorPayoutMobileWalletProps {
	readonly report: DoctorPayoutReport | null;
	readonly month: string;
	readonly onMonthChange: (newMonth: string) => void;
	readonly onRefresh: () => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
	readonly canEditRates: boolean;
	readonly onEditRate?: (doctorUserId: string) => void;
	readonly isLoading: boolean;
	readonly onRequestPayout?: (doctor: DoctorPayoutRow, amountKopecks: number) => void;
}

export type CategoryIconType =
	| "therapy"
	| "ortho"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "deduction";

export interface CategoryCardItem {
	readonly id: string;
	readonly name: string;
	readonly iconType: CategoryIconType;
	readonly badge?: string;
	readonly ratePct: number | null;
	readonly grossRevenueRub: number;
	readonly amountRub: number;
	readonly isDeduction?: boolean;
}

export interface ShiftSummaryItem {
	readonly date: string;
	readonly formattedDate: string;
	readonly dayOfWeek: string;
	readonly visits: readonly DoctorPayoutVisit[];
	readonly patientCount: number;
	readonly estimatedHours: number;
	readonly shiftRevenueRub: number;
	readonly shiftEarnedRub: number;
}

/** Заявка врача на вывод начисленных средств через СБП или кассу клиники. */
export type PayoutWithdrawalStatus = "pending" | "approved" | "processed" | "rejected";
export type PayoutWithdrawalMethod = "sbp" | "cash_desk" | "bank_account";

export interface DoctorPayoutWithdrawalRequest {
	readonly id: string;
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly amountKopecks: number;
	readonly status: PayoutWithdrawalStatus;
	readonly method: PayoutWithdrawalMethod;
	readonly createdAt: string;
	readonly processedAt?: string | null;
	readonly note?: string;
}

/** Детализация процентных ставок по направлениям лечения. */
export interface DoctorCategoryRateDetail {
	readonly categoryId: string;
	readonly categoryName: string;
	readonly ratePct: number;
	readonly grossKopecks: number;
	readonly earnedKopecks: number;
}

/** Demo showcase row strictly for Demo Showcase Mode: Д-р Смирнова А. В., терапевт (38 услуг, 184 000 ₽ выручка, 0 ₽ ЗТЛ, 30% ставка, 55 200 ₽ к выплате) */
export const DEMO_SHOWCASE_DOCTOR: DoctorPayoutRow = {
	doctorUserId: "demo_doc_smirnova",
	doctorName: "Д-р Смирнова А. В.",
	role: "Стоматолог-терапевт",
	isActive: true,
	revenueRub: 184000,
	paymentCount: 14,
	materialCostRub: 0,
	materialMovements: 0,
	materialMovementsUnpriced: 0,
	materialsState: "counted",
	labCostRub: 0,
	labOrdersCount: 0,
	withheldLabRub: 0,
	commissionPct: 30,
	materialDeductionPct: 0,
	labDeductionPct: 0,
	rateEffectiveFrom: "2026-01-01",
	rateRowCount: 1,
	state: "computed",
	accruedRub: 55200,
	withheldMaterialRub: 0,
	payoutRub: 55200,
	note: "Сдельная оплата 30% от фактически оплаченных терапевтических услуг (184 000 ₽)",
	visits: [
		{
			visitId: "v-demo-1",
			appointmentId: "app-1",
			paidAt: "2026-10-05T14:30:00.000Z",
			visitDate: "2026-10-05",
			patientId: "p-1",
			patientName: "Иванова Мария Сергеевна",
			medicalCardNumber: "1042/26",
			revenueRub: 32000,
			paymentCount: 1,
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
			visitId: "v-demo-2",
			appointmentId: "app-2",
			paidAt: "2026-10-09T17:00:00.000Z",
			visitDate: "2026-10-09",
			patientId: "p-2",
			patientName: "Петров Константин Евгеньевич",
			medicalCardNumber: "1088/26",
			revenueRub: 26000,
			paymentCount: 1,
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
			visitId: "v-demo-3",
			appointmentId: "app-3",
			paidAt: "2026-10-14T11:15:00.000Z",
			visitDate: "2026-10-14",
			patientId: "p-3",
			patientName: "Смирнов Виктор Игоревич",
			medicalCardNumber: "1105/26",
			revenueRub: 36000,
			paymentCount: 1,
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
			visitId: "v-demo-4",
			appointmentId: "app-4",
			paidAt: "2026-10-18T15:45:00.000Z",
			visitDate: "2026-10-18",
			patientId: "p-4",
			patientName: "Васильева Татьяна Алексеевна",
			medicalCardNumber: "1140/26",
			revenueRub: 30000,
			paymentCount: 1,
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
			visitId: "v-demo-5",
			appointmentId: "app-5",
			paidAt: "2026-10-22T12:00:00.000Z",
			visitDate: "2026-10-22",
			patientId: "p-5",
			patientName: "Козлов Дмитрий Николаевич",
			medicalCardNumber: "1182/26",
			revenueRub: 28000,
			paymentCount: 1,
			services: [
				{ id: "s-25", title: "Наложение коффердама (4.5)", order804nCode: "A16.07.002.001", toothCode: "4.5", priceRub: 1500, quantity: 1 },
				{ id: "s-26", title: "Инфильтрационная анестезия (4.5)", order804nCode: "A16.07.002.002", toothCode: "4.5", priceRub: 1500, quantity: 1 },
				{ id: "s-27", title: "Препарирование полости (4.5)", order804nCode: "A16.07.002", toothCode: "4.5", priceRub: 3000, quantity: 1 },
				{ id: "s-28", title: "Восстановление коронковой части зуба Estelite (4.5)", order804nCode: "A16.07.002", toothCode: "4.5", priceRub: 14000, quantity: 1 },
				{ id: "s-29", title: "Шлифовка и финишная полировка (4.5)", order804nCode: "A16.07.002.005", toothCode: "4.5", priceRub: 2000, quantity: 1 },
				{ id: "s-30", title: "Наложение коффердама (4.6)", order804nCode: "A16.07.002.001", toothCode: "4.6", priceRub: 1500, quantity: 1 },
				{ id: "s-31", title: "Герметизация фиссур светоотверждаемым герметиком (4.6)", order804nCode: "A16.07.002", toothCode: "4.6", priceRub: 4500, quantity: 1 },
			],
			materials: [],
		},
		{
			visitId: "v-demo-6",
			appointmentId: "app-6",
			paidAt: "2026-10-27T16:30:00.000Z",
			visitDate: "2026-10-27",
			patientId: "p-6",
			patientName: "Новикова Елена Павловна",
			medicalCardNumber: "1210/26",
			revenueRub: 32000,
			paymentCount: 1,
			services: [
				{ id: "s-32", title: "Наложение коффердама (1.4)", order804nCode: "A16.07.002.001", toothCode: "1.4", priceRub: 1500, quantity: 1 },
				{ id: "s-33", title: "Анестезия инфильтрационная Убистезин (1.4)", order804nCode: "A16.07.002.002", toothCode: "1.4", priceRub: 1500, quantity: 1 },
				{ id: "s-34", title: "Лечение среднего кариеса (1.4)", order804nCode: "A16.07.002", toothCode: "1.4", priceRub: 11000, quantity: 1 },
				{ id: "s-35", title: "Наложение коффердама (1.5)", order804nCode: "A16.07.002.001", toothCode: "1.5", priceRub: 1500, quantity: 1 },
				{ id: "s-36", title: "Анестезия Убистезин (1.5)", order804nCode: "A16.07.002.002", toothCode: "1.5", priceRub: 1500, quantity: 1 },
				{ id: "s-37", title: "Лечение среднего кариеса (1.5)", order804nCode: "A16.07.002", toothCode: "1.5", priceRub: 11000, quantity: 1 },
				{ id: "s-38", title: "Реминерализующая терапия Tooth Mousse", order804nCode: "A16.07.053", toothCode: null, priceRub: 4000, quantity: 1 },
			],
			materials: [],
		},
	],
	labOrders: [],
};

/** Demo showcase row strictly for Demo Showcase Mode: Д-р Ковалёв И. С., ортопед, аренда кресла (выручка 320 000 ₽, ЗТЛ 45 000 ₽, сплит 70 / 30, 192 500 ₽ к выплате) */
export const DEMO_SHOWCASE_SOLO_DOCTOR: DoctorPayoutRow = {
	doctorUserId: "demo_doc_kovalev",
	doctorName: "Д-р Ковалёв И. С.",
	role: "Стоматолог-ортопед (аренда кресла)",
	isActive: true,
	revenueRub: 320000,
	paymentCount: 8,
	materialCostRub: 0,
	materialMovements: 0,
	materialMovementsUnpriced: 0,
	materialsState: "counted",
	labCostRub: 45000,
	labOrdersCount: 4,
	withheldLabRub: 45000,
	commissionPct: 70,
	materialDeductionPct: 0,
	labDeductionPct: 100,
	rateEffectiveFrom: "2026-01-01",
	rateRowCount: 1,
	state: "computed",
	accruedRub: 192500,
	withheldMaterialRub: 0,
	payoutRub: 192500,
	note: "Аренда кресла: сплит 70 / 30 (70% врачу после вычета ЗТЛ 45 000 ₽, клиника 30% = 82 500 ₽)",
	visits: [
		{
			visitId: "v-kov-1",
			appointmentId: "app-kov-1",
			paidAt: "2026-10-08T12:00:00.000Z",
			visitDate: "2026-10-08",
			patientId: "p-kov-1",
			patientName: "Морозов Андрей Викторович",
			medicalCardNumber: "940/26",
			revenueRub: 100000,
			paymentCount: 1,
			services: [
				{ id: "sk-1", title: "Керамическая коронка E.max CAD (2.1)", order804nCode: "A16.07.004", toothCode: "2.1", priceRub: 65000, quantity: 1 },
				{ id: "sk-2", title: "Культевая вкладка из диоксида циркония (2.1)", order804nCode: "A16.07.003", toothCode: "2.1", priceRub: 35000, quantity: 1 },
			],
			materials: [],
		},
		{
			visitId: "v-kov-2",
			appointmentId: "app-kov-2",
			paidAt: "2026-10-15T15:30:00.000Z",
			visitDate: "2026-10-15",
			patientId: "p-kov-2",
			patientName: "Сидорова Анна Сергеевна",
			medicalCardNumber: "982/26",
			revenueRub: 90000,
			paymentCount: 1,
			services: [
				{ id: "sk-3", title: "Коронка из диоксида циркония (1.4)", order804nCode: "A16.07.004", toothCode: "1.4", priceRub: 60000, quantity: 1 },
				{ id: "sk-4", title: "Временная коронка фрезерованная PMMA (1.4)", order804nCode: "A16.07.004.002", toothCode: "1.4", priceRub: 30000, quantity: 1 },
			],
			materials: [],
		},
		{
			visitId: "v-kov-3",
			appointmentId: "app-kov-3",
			paidAt: "2026-10-21T11:00:00.000Z",
			visitDate: "2026-10-21",
			patientId: "p-kov-3",
			patientName: "Белов Михаил Юрьевич",
			medicalCardNumber: "1015/26",
			revenueRub: 75000,
			paymentCount: 1,
			services: [
				{ id: "sk-5", title: "Металлокерамическая коронка Duceram Plus (4.6)", order804nCode: "A16.07.004", toothCode: "4.6", priceRub: 45000, quantity: 1 },
				{ id: "sk-6", title: "Снятие прецизионного двухслойного слепка А-силиконом", order804nCode: "A16.07.003.001", toothCode: null, priceRub: 30000, quantity: 1 },
			],
			materials: [],
		},
		{
			visitId: "v-kov-4",
			appointmentId: "app-kov-4",
			paidAt: "2026-10-26T16:00:00.000Z",
			visitDate: "2026-10-26",
			patientId: "p-kov-4",
			patientName: "Фролова Ольга Игоревна",
			medicalCardNumber: "1055/26",
			revenueRub: 55000,
			paymentCount: 1,
			services: [
				{ id: "sk-7", title: "Коронка из диоксида циркония на индивидуальном титановом абатменте (3.6)", order804nCode: "A16.07.004", toothCode: "3.6", priceRub: 55000, quantity: 1 },
			],
			materials: [],
		},
	],
	labOrders: [
		{
			id: "lab-kov-1",
			orderNumber: "1042",
			toothFdi: "2.1",
			restorationType: "Коронка E.max CAD",
			material: "Дисиликат лития",
			patientName: "Морозов Андрей Викторович",
			status: "completed",
			completedAt: "2026-10-07T10:00:00.000Z",
			priceRub: 15000,
			withheldRub: 15000,
			deductionPct: 100,
		},
		{
			id: "lab-kov-2",
			orderNumber: "1058",
			toothFdi: "1.4",
			restorationType: "Коронка диоксид циркония",
			material: "Диоксид циркония",
			patientName: "Сидорова Анна Сергеевна",
			status: "completed",
			completedAt: "2026-10-14T11:00:00.000Z",
			priceRub: 8000,
			withheldRub: 8000,
			deductionPct: 100,
		},
		{
			id: "lab-kov-3",
			orderNumber: "1074",
			toothFdi: "4.6",
			restorationType: "Металлокерамическая коронка",
			material: "КХС / Керамика",
			patientName: "Белов Михаил Юрьевич",
			status: "completed",
			completedAt: "2026-10-20T14:00:00.000Z",
			priceRub: 10000,
			withheldRub: 10000,
			deductionPct: 100,
		},
		{
			id: "lab-kov-4",
			orderNumber: "1092",
			toothFdi: "3.6",
			restorationType: "Коронка на винтовой фиксации",
			material: "Диоксид циркония + Титан",
			patientName: "Фролова Ольга Игоревна",
			status: "completed",
			completedAt: "2026-10-25T15:00:00.000Z",
			priceRub: 12000,
			withheldRub: 12000,
			deductionPct: 100,
		},
	],
};

/** Demo showcase report strictly for Demo Showcase Mode (Mandate 8n, 8wy) */
export const DEMO_SHOWCASE_REPORT: DoctorPayoutReport = {
	scope: "all",
	period: { from: "2026-10-01", to: "2026-10-31" },
	rows: [DEMO_SHOWCASE_DOCTOR, DEMO_SHOWCASE_SOLO_DOCTOR],
	totals: {
		revenueRub: 504000,
		paymentCount: 18,
		attributableRevenueRub: 504000,
		unattributedRevenueRub: 0,
		materialCostRub: 0,
		labCostRub: 45000,
		accruedRub: 247700,
		withheldMaterialRub: 0,
		withheldLabRub: 45000,
		payoutRub: 247700,
		doctorsCounted: 2,
		doctorsWithoutRate: 0,
	},
	methodNote: "Сдельная оплата по фактически оплаченным услугам за вычетом ЗТЛ (Мандат 8n).",
	limitations: [],
	isEmpty: false,
};

export function formatMonthLabel(monthValue: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return monthValue;
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return monthValue;
	return new Date(Number(match[1]), monthIndex, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});
}

export function formatShiftDate(dateStr: string): { formatted: string; dayOfWeek: string } {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
	if (!match) return { formatted: dateStr, dayOfWeek: "" };
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const d = new Date(year, month, day);
	const formatted = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
	const dayOfWeek = d.toLocaleDateString("ru-RU", { weekday: "short" });
	return {
		formatted: `${formatted}, ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
		dayOfWeek,
	};
}
