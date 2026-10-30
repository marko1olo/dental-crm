/**
 * DENTE Dental CRM — Canonical Payroll Catalog & Exact Kopeck Engine
 * Mandate 8b (Sweet Spot 250–350 lines), Mandate 8e (Doctor Autonomy), Mandate 8n (Solo Practice Sovereignty).
 * Formula: Net Revenue = Gross (54-FZ) − Dental Lab (ЗТЛ) − Direct Materials (Импланты).
 * Strict integer arithmetic in KOPECKS (1 RUB = 100 KOPECKS) eliminating float-drift.
 */

export type MotivationSchemeType = "net_percentage" | "gross_percentage" | "fixed_shift" | "chair_rental";
export type PayrollPayoutStatus = "accrued" | "paid_rko";
export type PayrollPeriodPreset = "today" | "yesterday" | "current_week" | "current_month" | "previous_month" | "shift" | "custom";

export interface PayrollDoctorProfile {
	readonly id: string;
	readonly name: string;
	readonly initials: string;
	readonly specialtyId: "orthopedics" | "therapy" | "surgery" | "hygiene" | "solo_rental";
	readonly specialtyTitleRu: string;
	readonly commissionPercent: number; // 20–35% (or 100% for solo chair rental)
	readonly payoutModel: "percentage" | "chair_rental";
	readonly motivationScheme?: MotivationSchemeType;
	readonly defaultShiftRateKop: number; // e.g. 400000 kop (4 000 ₽/смена)
	readonly minGuaranteeMonthlyKop: number; // e.g. 6000000 kop (60 000 ₽)
	readonly taxRegime: "employee" | "self_employed";
}

export interface PayrollServiceOrder {
	readonly id: string;
	readonly orderNumber: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly category: "orthopedics" | "therapy" | "surgery" | "hygiene" | "orthodontics";
	readonly categoryLabelRu: string;
	readonly grossKopecks: number; // Выручка по чеку 54-ФЗ
	readonly labCostKopecks: number; // Зуботехническая лаборатория (ЗТЛ)
	readonly materialCostKopecks: number; // Дорогие материалы (Импланты)
	readonly isPaid54Fz: boolean;
	readonly paidKopecks: number;
	readonly doctorId: string;
}

export interface DoctorPayrollCalculation {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyTitleRu: string;
	readonly periodLabelRu: string;
	readonly totalGrossKopecks: number;
	readonly totalLabCostKopecks: number;
	readonly totalMaterialCostKopecks: number;
	readonly totalNetBaseKopecks: number; // Gross − Lab − Materials
	readonly commissionPercent: number;
	readonly earnedDoctorKopecks: number;
	readonly chairRentalKopecks: number;
	readonly advanceKopecks: number;
	readonly minimumGuaranteeApplied: boolean;
	readonly grossPayoutBeforeTaxKop: number;
	readonly ndfl13TaxKopecks: number;
	readonly netPayoutToDoctorKopecks: number;
	readonly servicesCount: number;
	readonly isChairRental: boolean;
	readonly payoutStatus?: PayrollPayoutStatus;
}

export interface DoctorPayrollSummary {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly schemeType: MotivationSchemeType;
	readonly totalGrossKopecks: number;
	readonly totalLabCostKopecks: number;
	readonly totalMaterialCostKopecks: number;
	readonly totalNetBaseKopecks: number;
	readonly doctorAccruedKopecks: number;
	readonly chairRentalKopecks: number;
	readonly advanceKopecks: number;
	readonly ndfl13TaxKopecks: number;
	readonly payoutKopecks: number;
	readonly payoutStatus: PayrollPayoutStatus;
	readonly servicesCount: number;
	readonly minimumGuaranteeApplied: boolean;
}

export interface SoloRentalResult {
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly netBaseKop: number;
	readonly shiftsCount: number;
	readonly shiftRateKop: number;
	readonly chairRentKop: number;
	readonly advanceKop: number;
	readonly doctorNetPayoutKop: number;
	readonly clinicRentalProfitKop: number;
}

export interface AssistantPieceworkResult {
	readonly shiftsCount: number;
	readonly shiftRateKop: number;
	readonly hoursCount: number;
	readonly hourlyRateKop: number;
	readonly surgicalAssistanceCount: number;
	readonly surgicalBonusKop: number;
	readonly xraysCount: number;
	readonly xrayBonusKop: number;
	readonly totalAssistantPayoutKop: number;
}

/** Pure integer arithmetic: Net Base = Gross − Lab − Materials */
export function computeNetBaseKopecks(grossKop: number, labKop: number, matKop: number): number {
	return Math.max(0, Math.round(grossKop) - Math.round(labKop) - Math.round(matKop));
}

/** Pure integer arithmetic: Doctor Commission = Base × Percent */
export function calculateDoctorCommissionKopecks(baseKop: number, percent: number): number {
	return (baseKop <= 0 || percent <= 0) ? 0 : Math.round((baseKop * percent) / 100);
}

/** Mandate 8n: Solo Doctor Chair Rental Economics: [Gross] − [ЗТЛ] − [Материалы] − [Аренда] = Доход */
export function calculateSoloDoctorRentalModel(params: {
	grossRevenueKop: number; labCostKop: number; materialCostKop: number;
	shiftsCount: number; shiftRateKop: number; fixedRentKop?: number; advanceKop?: number;
}): SoloRentalResult {
	const netBaseKop = computeNetBaseKopecks(params.grossRevenueKop, params.labCostKop, params.materialCostKop);
	const chairRentKop = params.fixedRentKop && params.fixedRentKop > 0
		? Math.round(params.fixedRentKop)
		: Math.max(0, Math.round(params.shiftsCount * params.shiftRateKop));
	const advanceKop = Math.max(0, Math.round(params.advanceKop ?? 0));
	return {
		grossRevenueKop: params.grossRevenueKop, labCostKop: params.labCostKop, materialCostKop: params.materialCostKop,
		netBaseKop, shiftsCount: params.shiftsCount, shiftRateKop: params.shiftRateKop, chairRentKop, advanceKop,
		doctorNetPayoutKop: Math.max(0, netBaseKop - chairRentKop - advanceKop), clinicRentalProfitKop: chairRentKop,
	};
}

/** Assistant hourly and per-shift piecework calculation */
export function calculateAssistantPiecework(params: {
	shiftsCount: number; shiftRateKop: number; hoursCount: number; hourlyRateKop: number;
	surgicalAssistanceCount: number; surgicalBonusKop: number; xraysCount: number; xrayBonusKop: number;
}): AssistantPieceworkResult {
	const baseShiftKop = Math.round(params.shiftsCount * params.shiftRateKop);
	const hourlyKop = Math.round(params.hoursCount * params.hourlyRateKop);
	const surgKop = Math.round(params.surgicalAssistanceCount * params.surgicalBonusKop);
	const xrayKop = Math.round(params.xraysCount * params.xrayBonusKop);
	return {
		shiftsCount: params.shiftsCount, shiftRateKop: params.shiftRateKop, hoursCount: params.hoursCount,
		hourlyRateKop: params.hourlyRateKop, surgicalAssistanceCount: params.surgicalAssistanceCount,
		surgicalBonusKop: params.surgicalBonusKop, xraysCount: params.xraysCount, xrayBonusKop: params.xrayBonusKop,
		totalAssistantPayoutKop: baseShiftKop + hourlyKop + surgKop + xrayKop,
	};
}

/** SSOT Canonical Doctor Payroll Summary (Mandate 8n, 8e) */
export function calculateDoctorPayrollSummary(params: {
	orders: readonly PayrollServiceOrder[];
	doctor: PayrollDoctorProfile;
	schemeType?: MotivationSchemeType;
	percent?: number;
	shiftsCount?: number;
	shiftRateKop?: number;
	hourlyRateKop?: number;
	hoursWorked?: number;
	advanceKop?: number;
	isRkoPaid?: boolean;
}): DoctorPayrollSummary {
	const docOrders = params.orders.filter((o) => o.doctorId === params.doctor.id && o.isPaid54Fz);
	const totalGrossKopecks = docOrders.reduce((sum, o) => sum + o.paidKopecks, 0);
	const totalLabCostKopecks = docOrders.reduce((sum, o) => sum + o.labCostKopecks, 0);
	const totalMaterialCostKopecks = docOrders.reduce((sum, o) => sum + o.materialCostKopecks, 0);
	const totalNetBaseKopecks = computeNetBaseKopecks(totalGrossKopecks, totalLabCostKopecks, totalMaterialCostKopecks);

	const scheme: MotivationSchemeType = params.schemeType
		?? (params.doctor.payoutModel === "chair_rental" ? "chair_rental" : "net_percentage");
	const effectivePercent = params.percent ?? params.doctor.commissionPercent;
	const advanceKopecks = Math.max(0, Math.round(params.advanceKop ?? 0));
	let doctorAccruedKopecks = 0;
	let chairRentalKopecks = 0;

	if (scheme === "chair_rental") {
		const shifts = params.shiftsCount ?? 12;
		const rate = params.shiftRateKop ?? params.doctor.defaultShiftRateKop;
		const hours = params.hoursWorked ?? 0;
		const hourlyRate = params.hourlyRateKop ?? 0;
		chairRentalKopecks = hours > 0 && hourlyRate > 0 ? Math.round(hours * hourlyRate) : Math.round(shifts * rate);
		doctorAccruedKopecks = Math.max(0, totalNetBaseKopecks - chairRentalKopecks);
	} else if (scheme === "gross_percentage") {
		doctorAccruedKopecks = calculateDoctorCommissionKopecks(totalGrossKopecks, effectivePercent);
	} else if (scheme === "fixed_shift") {
		const shifts = params.shiftsCount ?? 12;
		const rate = params.shiftRateKop ?? params.doctor.defaultShiftRateKop;
		doctorAccruedKopecks = Math.round(shifts * rate);
	} else {
		// net_percentage (default)
		doctorAccruedKopecks = calculateDoctorCommissionKopecks(totalNetBaseKopecks, effectivePercent);
	}

	const minGuaranteeKop = params.doctor.minGuaranteeMonthlyKop;
	const minimumGuaranteeApplied = scheme !== "chair_rental" && docOrders.length > 0 && doctorAccruedKopecks < minGuaranteeKop;
	const grossPayout = Math.max(doctorAccruedKopecks, minimumGuaranteeApplied ? minGuaranteeKop : 0);
	const ndfl13TaxKopecks = params.doctor.taxRegime === "employee" ? Math.round((grossPayout * 13) / 100) : 0;
	const payoutKopecks = Math.max(0, grossPayout - ndfl13TaxKopecks - advanceKopecks);

	return {
		doctorId: params.doctor.id, doctorName: params.doctor.name, schemeType: scheme,
		totalGrossKopecks, totalLabCostKopecks, totalMaterialCostKopecks, totalNetBaseKopecks,
		doctorAccruedKopecks, chairRentalKopecks, advanceKopecks, ndfl13TaxKopecks, payoutKopecks,
		payoutStatus: params.isRkoPaid ? "paid_rko" : "accrued",
		servicesCount: docOrders.length, minimumGuaranteeApplied,
	};
}

/** Comprehensive Doctor Payroll Calculator from Orders */
export function calculateDoctorPayrollFromOrders(
	orders: readonly PayrollServiceOrder[],
	doctor: PayrollDoctorProfile,
	options: {
		periodLabelRu?: string; advanceKop?: number; shiftsCount?: number;
		shiftRateKop?: number; customPercent?: number; taxRegime?: "employee" | "self_employed";
		isRkoPaid?: boolean;
	} = {},
): DoctorPayrollCalculation {
	const summary = calculateDoctorPayrollSummary({
		orders, doctor, percent: options.customPercent,
		shiftsCount: options.shiftsCount, shiftRateKop: options.shiftRateKop,
		advanceKop: options.advanceKop, isRkoPaid: options.isRkoPaid,
	});

	return {
		doctorId: doctor.id, doctorName: doctor.name, specialtyTitleRu: doctor.specialtyTitleRu,
		periodLabelRu: options.periodLabelRu ?? "Текущий расчетный период",
		totalGrossKopecks: summary.totalGrossKopecks, totalLabCostKopecks: summary.totalLabCostKopecks,
		totalMaterialCostKopecks: summary.totalMaterialCostKopecks, totalNetBaseKopecks: summary.totalNetBaseKopecks,
		commissionPercent: options.customPercent ?? doctor.commissionPercent,
		earnedDoctorKopecks: summary.doctorAccruedKopecks, chairRentalKopecks: summary.chairRentalKopecks,
		advanceKopecks: summary.advanceKopecks, minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
		grossPayoutBeforeTaxKop: Math.max(summary.doctorAccruedKopecks, summary.minimumGuaranteeApplied ? doctor.minGuaranteeMonthlyKop : 0),
		ndfl13TaxKopecks: summary.ndfl13TaxKopecks, netPayoutToDoctorKopecks: summary.payoutKopecks,
		servicesCount: summary.servicesCount, isChairRental: doctor.payoutModel === "chair_rental",
		payoutStatus: summary.payoutStatus,
	};
}

/** Fast period calculator: [ Сегодня / Смена | Вчера | Текущая неделя | Текущий месяц | Прошлый месяц ] */
export function getQuickPeriodDates(preset: PayrollPeriodPreset): { startIso: string; endIso: string; labelRu: string } {
	const now = new Date();
	const toYmd = (d: Date) => {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	};
	if (preset === "today") return { startIso: toYmd(now), endIso: toYmd(now), labelRu: "Сегодня" };
	if (preset === "shift") return { startIso: toYmd(now), endIso: toYmd(now), labelRu: "Смена" };
	if (preset === "yesterday") {
		const y = new Date(now);
		y.setDate(y.getDate() - 1);
		return { startIso: toYmd(y), endIso: toYmd(y), labelRu: "Вчера" };
	}
	if (preset === "current_week") {
		const start = new Date(now);
		const day = start.getDay() || 7;
		start.setDate(start.getDate() - day + 1);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);
		return { startIso: toYmd(start), endIso: toYmd(end), labelRu: "Текущая неделя" };
	}
	if (preset === "previous_month") {
		const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const end = new Date(now.getFullYear(), now.getMonth(), 0);
		return { startIso: toYmd(start), endIso: toYmd(end), labelRu: "Прошлый месяц" };
	}
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return { startIso: toYmd(start), endIso: toYmd(end), labelRu: "Текущий месяц" };
}

/** Canonical 1-5 Chair Clinic & Solo Practice Doctors */
export const CANONICAL_PAYROLL_DOCTORS: readonly PayrollDoctorProfile[] = [
	{ id: "doc-volkov", name: "Д-р Волков Алексей Сергеевич", initials: "ВС", specialtyId: "orthopedics", specialtyTitleRu: "Стоматолог-ортопед", commissionPercent: 30, payoutModel: "percentage", motivationScheme: "net_percentage", defaultShiftRateKop: 400000, minGuaranteeMonthlyKop: 7000000, taxRegime: "employee" },
	{ id: "doc-sokolova", name: "Д-р Соколова Елена Владимировна", initials: "СЕ", specialtyId: "therapy", specialtyTitleRu: "Стоматолог-терапевт", commissionPercent: 25, payoutModel: "percentage", motivationScheme: "net_percentage", defaultShiftRateKop: 350000, minGuaranteeMonthlyKop: 6000000, taxRegime: "employee" },
	{ id: "doc-morozov", name: "Д-р Морозов Дмитрий Игоревич", initials: "МД", specialtyId: "surgery", specialtyTitleRu: "Стоматолог-хирург-имплантолог", commissionPercent: 35, payoutModel: "percentage", motivationScheme: "net_percentage", defaultShiftRateKop: 500000, minGuaranteeMonthlyKop: 8000000, taxRegime: "self_employed" },
	{ id: "doc-smirnova", name: "Д-р Смирнова Анна Павловна", initials: "СА", specialtyId: "hygiene", specialtyTitleRu: "Стоматолог-гигиенист", commissionPercent: 20, payoutModel: "percentage", motivationScheme: "net_percentage", defaultShiftRateKop: 300000, minGuaranteeMonthlyKop: 4500000, taxRegime: "employee" },
	{ id: "doc-kuznetsov", name: "Д-р Кузнецов Иван Михайлович", initials: "КИ", specialtyId: "solo_rental", specialtyTitleRu: "Соло-врач (Аренда кресла)", commissionPercent: 100, payoutModel: "chair_rental", motivationScheme: "chair_rental", defaultShiftRateKop: 400000, minGuaranteeMonthlyKop: 0, taxRegime: "self_employed" },
];

/** Realistic Canonical Service Orders in Kopecks */
export const CANONICAL_DEMO_ORDERS: readonly PayrollServiceOrder[] = [
	{ id: "ord-1", orderNumber: "ОРТ-2401", dateIso: "2026-10-25", patientName: "Васильев Олег Петрович", medicalCardNumber: "043-981", serviceNameRu: "Циркониевая коронка E.max Prettau (16)", category: "orthopedics", categoryLabelRu: "Ортопедия", grossKopecks: 3800000, labCostKopecks: 850000, materialCostKopecks: 150000, isPaid54Fz: true, paidKopecks: 3800000, doctorId: "doc-volkov" },
	{ id: "ord-2", orderNumber: "ОРТ-2402", dateIso: "2026-10-27", patientName: "Николаева Ирина Семеновна", medicalCardNumber: "043-984", serviceNameRu: "Керамический винир E.max CAD (21)", category: "orthopedics", categoryLabelRu: "Ортопедия", grossKopecks: 4200000, labCostKopecks: 950000, materialCostKopecks: 180000, isPaid54Fz: true, paidKopecks: 4200000, doctorId: "doc-volkov" },
	{ id: "ord-3", orderNumber: "ТЕР-1102", dateIso: "2026-10-26", patientName: "Григорьев Антон Викторович", medicalCardNumber: "043-855", serviceNameRu: "Эндодонтия 3-канального моляра (46)", category: "therapy", categoryLabelRu: "Терапия", grossKopecks: 1450000, labCostKopecks: 0, materialCostKopecks: 180000, isPaid54Fz: true, paidKopecks: 1450000, doctorId: "doc-sokolova" },
	{ id: "ord-4", orderNumber: "ТЕР-1103", dateIso: "2026-10-28", patientName: "Михайлова Дарья Сергеевна", medicalCardNumber: "043-912", serviceNameRu: "Эстетическая реставрация Estelite (11)", category: "therapy", categoryLabelRu: "Терапия", grossKopecks: 780000, labCostKopecks: 0, materialCostKopecks: 90000, isPaid54Fz: true, paidKopecks: 780000, doctorId: "doc-sokolova" },
	{ id: "ord-5", orderNumber: "ХИР-3301", dateIso: "2026-10-26", patientName: "Ковалев Сергей Андреевич", medicalCardNumber: "043-774", serviceNameRu: "Имплантация Astra Tech OsseoSpeed (36)", category: "surgery", categoryLabelRu: "Хирургия", grossKopecks: 6500000, labCostKopecks: 0, materialCostKopecks: 2400000, isPaid54Fz: true, paidKopecks: 6500000, doctorId: "doc-morozov" },
	{ id: "ord-6", orderNumber: "ГИГ-5501", dateIso: "2026-10-28", patientName: "Федорова Полина Игоревна", medicalCardNumber: "043-620", serviceNameRu: "Комплексная гигиена Air-Flow Plus", category: "hygiene", categoryLabelRu: "Гигиена", grossKopecks: 650000, labCostKopecks: 0, materialCostKopecks: 70000, isPaid54Fz: true, paidKopecks: 650000, doctorId: "doc-smirnova" },
	{ id: "ord-7", orderNumber: "СОЛ-7701", dateIso: "2026-10-28", patientName: "Баранов Максим Юрьевич", medicalCardNumber: "043-550", serviceNameRu: "Комплексное терапевтическое лечение", category: "therapy", categoryLabelRu: "Терапия", grossKopecks: 3200000, labCostKopecks: 250000, materialCostKopecks: 350000, isPaid54Fz: true, paidKopecks: 3200000, doctorId: "doc-kuznetsov" },
];

/** Printable Payslip A5 without bureaucratic Soviet labels (Mandate 8x) */
export function generateDoctorPayslipA5Html(calc: DoctorPayrollCalculation, doctor: PayrollDoctorProfile, clinicName: string = "Стоматологическая клиника DENTE"): string {
	const rub = (kop: number) => (Math.round(kop) / 100).toLocaleString("ru-RU") + " ₽";
	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Расчетный листок врача — ${doctor.name}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;padding:24px;color:#0f172a;font-size:13px;line-height:1.4}.header{border-bottom:2px solid #0d9488;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}.title{font-size:18px;font-weight:bold;margin:0}.clinic{font-size:12px;color:#64748b;margin-top:4px}.table{width:100%;border-collapse:collapse;margin:14px 0}.table th,.table td{padding:8px 10px;border:1px solid #e2e8f0;text-align:left}.table th{background:#f8fafc;font-weight:600;color:#475569}.total-row{font-weight:bold;background:#f0fdfa}.highlight{color:#0d9488;font-size:16px;font-weight:bold}.signatures{margin-top:32px;display:flex;justify-content:space-between;font-size:12px}.sign-line{border-top:1px solid #94a3b8;width:180px;margin-top:24px;text-align:center;padding-top:4px;color:#64748b}</style></head>
<body><div class="header"><div><h1 class="title">РАСЧЕТНЫЙ ЛИСТОК ВРАЧА</h1><div class="clinic">${clinicName} • Период: ${calc.periodLabelRu}</div></div><div style="text-align:right;"><div style="font-weight:600;">${doctor.name}</div><div style="color:#64748b;font-size:11px;">${doctor.specialtyTitleRu}</div></div></div>
<table class="table"><tr><th>Показатель расчета</th><th style="text-align:right;">Сумма</th></tr><tr><td>Выручка по чекам 54-ФЗ (Gross)</td><td style="text-align:right;">${rub(calc.totalGrossKopecks)}</td></tr><tr><td>Удержание: зуботехническая лаборатория (ЗТЛ)</td><td style="text-align:right;">− ${rub(calc.totalLabCostKopecks)}</td></tr><tr><td>Удержание: дорогостоящие расходные материалы</td><td style="text-align:right;">− ${rub(calc.totalMaterialCostKopecks)}</td></tr><tr style="background:#f8fafc;font-weight:600;"><td>Чистая расчетная база (Net Base)</td><td style="text-align:right;">${rub(calc.totalNetBaseKopecks)}</td></tr>${calc.isChairRental ? `<tr><td>Аренда стоматологического кресла</td><td style="text-align:right;">− ${rub(calc.chairRentalKopecks)}</td></tr>` : `<tr><td>Процент врача (${calc.commissionPercent}%)</td><td style="text-align:right;">${rub(calc.earnedDoctorKopecks)}</td></tr>`}${calc.advanceKopecks > 0 ? `<tr><td>Выплаченный аванс</td><td style="text-align:right;">− ${rub(calc.advanceKopecks)}</td></tr>` : ""}${calc.ndfl13TaxKopecks > 0 ? `<tr><td>НДФЛ 13%</td><td style="text-align:right;">− ${rub(calc.ndfl13TaxKopecks)}</td></tr>` : ""}<tr class="total-row"><td>ИТОГО К ВЫПЛАТЕ ВРАЧУ (НА РУКИ)</td><td style="text-align:right;" class="highlight">${rub(calc.netPayoutToDoctorKopecks)}</td></tr></table>
<div class="signatures"><div>Главный бухгалтер:<div class="sign-line">/ подпись /</div></div><div>Руководитель клиники:<div class="sign-line">/ подпись /</div></div><div>Врач-специалист:<div class="sign-line">/ подпись /</div></div></div></body></html>`;
}

/** Plaintext format for Messenger sharing (WhatsApp / Telegram) */
export function generateDoctorPayslipMessengerText(calc: DoctorPayrollCalculation, doctor: PayrollDoctorProfile, clinicName: string = "DENTE Clinic"): string {
	const rub = (kop: number) => (Math.round(kop) / 100).toLocaleString("ru-RU") + " ₽";
	return `📋 Расчетный листок врача: ${doctor.name}\n🏥 ${clinicName} • ${calc.periodLabelRu}\n━━━━━━━━━━━━━━━━━━\n💰 Выручка (54-ФЗ): ${rub(calc.totalGrossKopecks)}\n🔬 ЗТЛ (лаборатория): − ${rub(calc.totalLabCostKopecks)}\n📦 Материалы: − ${rub(calc.totalMaterialCostKopecks)}\n💎 Чистая база: ${rub(calc.totalNetBaseKopecks)}\n${calc.isChairRental ? `🪑 Аренда кресла: − ${rub(calc.chairRentalKopecks)}` : `📈 Ставка врача: ${calc.commissionPercent}% (${rub(calc.earnedDoctorKopecks)})`}\n${calc.advanceKopecks > 0 ? `💵 Аванс: − ${rub(calc.advanceKopecks)}\n` : ""}${calc.ndfl13TaxKopecks > 0 ? `🏛️ НДФЛ 13%: − ${rub(calc.ndfl13TaxKopecks)}\n` : ""}━━━━━━━━━━━━━━━━━━\n✅ К ВЫПЛАТЕ: ${rub(calc.netPayoutToDoctorKopecks)}`;
}
