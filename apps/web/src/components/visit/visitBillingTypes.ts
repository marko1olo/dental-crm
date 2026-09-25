/**
 * apps/web/src/components/visit/visitBillingTypes.ts
 *
 * Types, contracts and default presets for Chairside Visit Service Billing.
 */

export interface VisitBillingServiceItem {
	id: string;
	code804n: string;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	unitPriceRub: number;
	discountPercent?: number | undefined;
	discountRub?: number | undefined;
	isWarranty?: boolean | undefined;
	warrantyReason?: string | undefined;
}

export interface VisitBillingTotals {
	rawTotalRub: number;
	discountRub: number;
	totalDueRub: number;
	effectiveDiscountPercent: number;
	isWarranty100: boolean;
	itemsCount: number;
}

export interface VisitServiceBillingWidgetProps {
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialServices?: readonly VisitBillingServiceItem[] | undefined;
	readonly onServicesChange?: ((services: VisitBillingServiceItem[]) => void) | undefined;
	readonly onSave?: ((services: VisitBillingServiceItem[], totals: VisitBillingTotals) => void) | undefined;
	readonly onOpenPayment?: ((totals: VisitBillingTotals) => void) | undefined;
	readonly onAddBillingItem?: ((item: { code804n?: string; title: string; priceRub: number; toothNumber?: number; quantity?: number }) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly className?: string | undefined;
}

export const DEFAULT_CHAIRSIDE_SERVICES: readonly VisitBillingServiceItem[] = [
	{
		id: "serv-1",
		code804n: "A16.07.002.010",
		title: "Препарирование и медикаментозная обработка кариозной полости",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 2500,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
	{
		id: "serv-2",
		code804n: "A16.07.002.011",
		title: "Восстановление зуба пломбой светового отверждения (композит)",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 4500,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
	{
		id: "serv-3",
		code804n: "A25.07.001",
		title: "Местная анестезия (инфильтрационная/проводниковая)",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 1200,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
];

export const DOCTOR_DISCOUNT_PRESETS = [
	{ percent: 0, label: "0% Без скидки", reason: "" },
	{ percent: 5, label: "5% Пенс/Утро", reason: "Пенсионная / Утренняя" },
	{ percent: 10, label: "10% Постоянный", reason: "Постоянный пациент" },
	{ percent: 15, label: "15% Комплекс", reason: "Комплексный план" },
	{ percent: 20, label: "20% Партнёр", reason: "Партнёрская скидка" },
	{ percent: 50, label: "50% Персонал", reason: "Сотрудники клиники / семья врача" },
	{ percent: 100, label: "100% Гарантия / Переделка", reason: "Гарантийная переделка" },
] as const;
