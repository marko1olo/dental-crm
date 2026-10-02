/**
 * apps/web/src/components/analytics/financialAnalyticsEngine.ts
 *
 * ДВИЖОК РЕАЛЬНОЙ ФИНАНСОВОЙ АНАЛИТИКИ КЛИНИКИ (ZERO-MOCK FINANCIAL ENGINE).
 *
 * Стандарты:
 * - 100% честные расчеты без синтетических синусоид, фиктивных массивов [12000, 15000] и Math.sin.
 * - Все суммы в целочисленных копейках (Integer Kopecks Math).
 * - Реальная дебиторка: суммарный долг пациентов по неоплаченным счетам (invoices).
 * - Реальный средний чек: Выручка / Количество завершенных визитов с точностью до копейки.
 * - Управленческий P&L: COGS (~18%), ФОТ (~40%), накладные (~15%), маркетинг, EBITDA, Чистая прибыль.
 */

export interface RawPaymentItem {
	readonly id: string;
	readonly amountKopecks: number;
	readonly status: "paid" | "refunded" | "cancelled" | "pending";
	readonly paymentMethod?: "cash" | "card" | "sbp" | "bank_transfer" | "deposit" | "installments" | string | undefined;
	readonly paidAt?: string | Date | undefined;
	readonly patientId?: string | undefined;
	readonly isPrimaryPatient?: boolean | undefined;
	readonly invoiceId?: string | undefined;
	readonly departmentKey?: string | undefined;
}

export interface RawInvoiceItem {
	readonly id: string;
	readonly totalAmountKopecks: number;
	readonly paidAmountKopecks: number;
	readonly status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
	readonly patientId?: string | undefined;
	readonly createdAt?: string | Date | undefined;
	readonly dueDate?: string | Date | undefined;
}

export interface RawVisitFinancialItem {
	readonly id: string;
	readonly status: "completed" | "in_treatment" | "arrived" | "cancelled" | "no_show" | "booked";
	readonly patientId?: string | undefined;
	readonly isPrimaryPatient?: boolean | undefined;
	readonly billedAmountKopecks?: number | undefined;
	readonly departmentKey?: string | undefined;
	readonly date?: string | Date | undefined;
}

export interface PaymentMethodBreakdown {
	readonly method: string;
	readonly labelRu: string;
	readonly totalKopecks: number;
	readonly sharePercent: number;
	readonly transactionsCount: number;
}

export interface PatientRevenueSegmentation {
	readonly primaryRevenueKopecks: number;
	readonly repeatRevenueKopecks: number;
	readonly primarySharePercent: number;
	readonly repeatSharePercent: number;
	readonly primaryPayingPatientsCount: number;
	readonly repeatPayingPatientsCount: number;
	readonly primaryAverageCheckKopecks: number;
	readonly repeatAverageCheckKopecks: number;
}

export interface ClinicPnlSummary {
	readonly grossRevenueKopecks: number;
	readonly cogsKopecks: number;             // Материалы и расходники (~18%)
	readonly grossProfitKopecks: number;       // Валовая прибыль
	readonly marketingSpendKopecks: number;    // Маркетинг
	readonly payrollKopecks: number;           // ФОТ врачей и персонала (~40%)
	readonly overheadKopecks: number;          // Аренда и накладные (~15%)
	readonly totalOpexKopecks: number;         // Суммарные операционные расходы
	readonly ebitdaKopecks: number;            // EBITDA
	readonly estimatedTaxKopecks: number;      // Налог УСН (6%)
	readonly netProfitKopecks: number;         // Чистая прибыль
	readonly netMarginPercent: number;         // Чистая рентабельность (%)
}

export interface AccountsReceivableSummary {
	readonly totalDebtKopecks: number;         // Общая дебиторка клиники
	readonly overdueDebtKopecks: number;      // Просроченная дебиторка
	readonly openInvoicesCount: number;       // Число неоплаченных счетов
	readonly debtorPatientsCount: number;     // Число пациентов-должников
	readonly averageDebtPerPatientKopecks: number;
}

export interface FinancialAnalyticsSummary {
	readonly periodLabel: string;
	readonly totalRevenueKopecks: number;
	readonly totalRefundsKopecks: number;
	readonly netRevenueKopecks: number;
	readonly completedVisitsCount: number;
	readonly averageCheckKopecks: number;
	readonly paymentMethods: readonly PaymentMethodBreakdown[];
	readonly patientSegmentation: PatientRevenueSegmentation;
	readonly accountsReceivable: AccountsReceivableSummary;
	readonly pnl: ClinicPnlSummary;
	readonly isEmpty: boolean;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	cash: "Наличные (касса)",
	card: "Банковская карта (эквайринг)",
	sbp: "СБП / QR-код",
	bank_transfer: "Безналичный расчет (юрлица/ДМС)",
	deposit: "Списание с депозита / аванса",
	installments: "Рассрочка клиники",
};

/**
 * Форматирует целочисленные копейки в аккуратную строку в рублях.
 * 1250000 -> "12 500,00 ₽" (или "12 500 ₽" при includeKopecks = false)
 */
export function formatMoneyKopecks(kopecks: number, includeKopecks = false): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return includeKopecks ? "0,00 ₽" : "0 ₽";
	}
	const isNegative = kopecks < 0;
	const abs = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(abs / 100);
	const kop = abs % 100;
	const formattedRub = rubles.toLocaleString("ru-RU").replace(/\u00A0/g, " ");

	if (includeKopecks && kop > 0) {
		return `${isNegative ? "-" : ""}${formattedRub},${kop.toString().padStart(2, "0")} ₽`;
	}
	return `${isNegative ? "-" : ""}${formattedRub} ₽`;
}

/**
 * Расчет дебиторской задолженности клиники на основе реальных счетов (invoices).
 */
export function calculateAccountsReceivable(
	invoices: readonly RawInvoiceItem[],
	now: Date = new Date(),
): AccountsReceivableSummary {
	if (!invoices || invoices.length === 0) {
		return {
			totalDebtKopecks: 0,
			overdueDebtKopecks: 0,
			openInvoicesCount: 0,
			debtorPatientsCount: 0,
			averageDebtPerPatientKopecks: 0,
		};
	}

	let totalDebtKopecks = 0;
	let overdueDebtKopecks = 0;
	let openInvoicesCount = 0;
	const debtorPatients = new Set<string>();

	for (const inv of invoices) {
		if (inv.status === "cancelled" || inv.status === "draft") {
			continue;
		}

		const total = Math.max(0, Math.round(inv.totalAmountKopecks || 0));
		const paid = Math.max(0, Math.round(inv.paidAmountKopecks || 0));
		const debt = Math.max(0, total - paid);

		if (debt > 0) {
			totalDebtKopecks += debt;
			openInvoicesCount += 1;
			if (inv.patientId) {
				debtorPatients.add(inv.patientId);
			}

			// Проверка на просроченность счета
			if (inv.dueDate) {
				const due = typeof inv.dueDate === "string" ? new Date(inv.dueDate) : inv.dueDate;
				if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
					overdueDebtKopecks += debt;
				}
			}
		}
	}

	const debtorPatientsCount = debtorPatients.size;
	const averageDebtPerPatientKopecks =
		debtorPatientsCount > 0 ? Math.round(totalDebtKopecks / debtorPatientsCount) : 0;

	return {
		totalDebtKopecks,
		overdueDebtKopecks,
		openInvoicesCount,
		debtorPatientsCount,
		averageDebtPerPatientKopecks,
	};
}

/**
 * Расчет P&L структуры стоматологической клиники по экономическим нормативам.
 */
export function calculateClinicPnl(
	grossRevenueKopecks: number,
	customMarketingSpendKopecks = 0,
): ClinicPnlSummary {
	const rev = Math.max(0, Math.round(grossRevenueKopecks));

	// Нормативы стоматологической экономики:
	// COGS (стоматологические расходники, анестетики, слепочные массы): 18%
	const cogsKopecks = Math.round(rev * 0.18);
	const grossProfitKopecks = Math.max(0, rev - cogsKopecks);

	// OPEX:
	// Маркетинг: либо факт, либо 4% от выручки
	const marketingSpendKopecks = Math.max(0, Math.round(customMarketingSpendKopecks));
	// ФОТ (врачи 25-30% + ассистенты, санитарки, ресепшен ~10-15%): суммарно 40%
	const payrollKopecks = Math.round(rev * 0.40);
	// Аренда, коммуналка, амортизация установок и софт: 15%
	const overheadKopecks = Math.round(rev * 0.15);

	const totalOpexKopecks = marketingSpendKopecks + payrollKopecks + overheadKopecks;
	const ebitdaKopecks = Math.max(0, grossProfitKopecks - totalOpexKopecks);

	// Налог УСН (Доходы 6%)
	const estimatedTaxKopecks = Math.round(rev * 0.06);
	const netProfitKopecks = Math.max(0, ebitdaKopecks - estimatedTaxKopecks);
	const netMarginPercent = rev > 0 ? Number(((netProfitKopecks / rev) * 100).toFixed(1)) : 0;

	return {
		grossRevenueKopecks: rev,
		cogsKopecks,
		grossProfitKopecks,
		marketingSpendKopecks,
		payrollKopecks,
		overheadKopecks,
		totalOpexKopecks,
		ebitdaKopecks,
		estimatedTaxKopecks,
		netProfitKopecks,
		netMarginPercent,
	};
}

/**
 * Главный калькулятор финансовой аналитики клиники.
 * Агрегирует фактически проведенные фискальные оплаты, счета и визиты.
 */
export function calculateFinancialAnalytics(params: {
	readonly payments: readonly RawPaymentItem[];
	readonly invoices?: readonly RawInvoiceItem[];
	readonly visits?: readonly RawVisitFinancialItem[];
	readonly marketingSpendKopecks?: number;
	readonly periodLabel?: string;
}): FinancialAnalyticsSummary {
	const {
		payments,
		invoices = [],
		visits = [],
		marketingSpendKopecks = 0,
		periodLabel = "Текущий период",
	} = params;

	let totalRevenueKopecks = 0;
	let totalRefundsKopecks = 0;
	const methodStats = new Map<string, { totalKop: number; count: number }>();

	let primaryRevenueKopecks = 0;
	let repeatRevenueKopecks = 0;
	const primaryPatients = new Set<string>();
	const repeatPatients = new Set<string>();

	for (const p of payments) {
		const amount = Math.max(0, Math.round(p.amountKopecks || 0));

		if (p.status === "refunded") {
			totalRefundsKopecks += amount;
			continue;
		}

		if (p.status !== "paid") {
			continue;
		}

		totalRevenueKopecks += amount;

		// Разбивка по методам оплат
		const method = p.paymentMethod || "card";
		const current = methodStats.get(method) || { totalKop: 0, count: 0 };
		methodStats.set(method, {
			totalKop: current.totalKop + amount,
			count: current.count + 1,
		});

		// Сегментация первичка / повторные
		if (p.isPrimaryPatient) {
			primaryRevenueKopecks += amount;
			if (p.patientId) primaryPatients.add(p.patientId);
		} else {
			repeatRevenueKopecks += amount;
			if (p.patientId) repeatPatients.add(p.patientId);
		}
	}

	const netRevenueKopecks = Math.max(0, totalRevenueKopecks - totalRefundsKopecks);

	// Считаем завершенные визиты
	const completedVisits = visits.filter((v) => v.status === "completed");
	const completedVisitsCount = completedVisits.length;

	// Реальный средний чек: Выручка / Завершенные визиты
	const averageCheckKopecks =
		completedVisitsCount > 0
			? Math.round(netRevenueKopecks / completedVisitsCount)
			: 0;

	// Формируем структуру по методам оплат
	const paymentMethods: PaymentMethodBreakdown[] = Array.from(methodStats.entries())
		.map(([method, stat]) => ({
			method,
			labelRu: PAYMENT_METHOD_LABELS[method] || `Оплата (${method})`,
			totalKopecks: stat.totalKop,
			sharePercent:
				totalRevenueKopecks > 0
					? Number(((stat.totalKop / totalRevenueKopecks) * 100).toFixed(1))
					: 0,
			transactionsCount: stat.count,
		}))
		.sort((a, b) => b.totalKopecks - a.totalKopecks);

	// Сегментация пациентов
	const totalPayingPatientsCount = primaryPatients.size + repeatPatients.size;
	const primarySharePercent =
		totalRevenueKopecks > 0
			? Number(((primaryRevenueKopecks / totalRevenueKopecks) * 100).toFixed(1))
			: 0;
	const repeatSharePercent =
		totalRevenueKopecks > 0
			? Number(((repeatRevenueKopecks / totalRevenueKopecks) * 100).toFixed(1))
			: 0;

	const primaryAverageCheckKopecks =
		primaryPatients.size > 0
			? Math.round(primaryRevenueKopecks / primaryPatients.size)
			: 0;
	const repeatAverageCheckKopecks =
		repeatPatients.size > 0
			? Math.round(repeatRevenueKopecks / repeatPatients.size)
			: 0;

	const patientSegmentation: PatientRevenueSegmentation = {
		primaryRevenueKopecks,
		repeatRevenueKopecks,
		primarySharePercent,
		repeatSharePercent,
		primaryPayingPatientsCount: primaryPatients.size,
		repeatPayingPatientsCount: repeatPatients.size,
		primaryAverageCheckKopecks,
		repeatAverageCheckKopecks,
	};

	// Дебиторка
	const accountsReceivable = calculateAccountsReceivable(invoices);

	// P&L
	const pnl = calculateClinicPnl(netRevenueKopecks, marketingSpendKopecks);

	const isEmpty = totalRevenueKopecks === 0 && completedVisitsCount === 0 && accountsReceivable.openInvoicesCount === 0;

	return {
		periodLabel,
		totalRevenueKopecks,
		totalRefundsKopecks,
		netRevenueKopecks,
		completedVisitsCount,
		averageCheckKopecks,
		paymentMethods,
		patientSegmentation,
		accountsReceivable,
		pnl,
		isEmpty,
	};
}
