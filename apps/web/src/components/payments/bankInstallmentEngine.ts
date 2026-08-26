/**
 * bankInstallmentEngine.ts — Движок банковской рассрочки на этапы лечения DENTE CRM.
 * 
 * ПОДДЕРЖИВАЕМЫЕ БАНКОВСКИЕ ПАРТНЕРЫ:
 * • СберБанк («Покупай со Сбером», 0-0-6 / 0-0-12 / 0-0-24, без переплат для пациента).
 * • Т-Банк («Т-Банк Рассрочка», 3 / 6 / 10 / 12 / 24 мес, быстрое одобрение по паспорту).
 * • Подели («Подели BNPL», 4 платежа по 25% каждые 2 недели, 0% переплаты).
 * • Яндекс Сплит («Сплит», 2 / 4 / 6 мес, моментальное оформление в приложении).
 * 
 * ФИНАНСОВЫЕ ИНВАРИАНТЫ:
 * • Все расчеты ведутся строго в целых копейках (Kopecks) с распределением остатка от деления на последний/первый платеж.
 * • Сумма всех частей графика строго равна общей сумме этапа лечения: sum(parts) === total.
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";

export type BankInstallmentProviderId = "sberbank" | "tbank" | "podeli" | "yandex_split";

export interface BankInstallmentProviderConfig {
	readonly id: BankInstallmentProviderId;
	readonly name: string;
	readonly brandTitle: string;
	readonly shortLabel: string;
	readonly logoColor: string;
	readonly badgeClass: string;
	readonly defaultTermMonths: number;
	readonly availableTermsMonths: readonly number[];
	readonly minAmountRub: number;
	readonly maxAmountRub: number;
	readonly overpaymentPercent: number; // 0% для честной рассрочки
	readonly descriptionRu: string;
	readonly advantages: readonly string[];
}

export const BANK_INSTALLMENT_PROVIDERS: Record<
	BankInstallmentProviderId,
	BankInstallmentProviderConfig
> = {
	sberbank: {
		id: "sberbank",
		name: "СберБанк",
		brandTitle: "Покупай со Сбером (Рассрочка 0-0-6 / 0-0-12)",
		shortLabel: "Сбер Рассрочка",
		logoColor: "#21a038",
		badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
		defaultTermMonths: 12,
		availableTermsMonths: [6, 12, 24],
		minAmountRub: 3000,
		maxAmountRub: 300000,
		overpaymentPercent: 0,
		descriptionRu: "Рассрочка без переплат и первого взноса в приложении СберБанк Онлайн за 2 минуты.",
		advantages: [
			"0% первый взнос",
			"0% переплаты (проценты компенсирует клиника)",
			"Одобрение в мобильном приложении Сбера за 2 мин",
			"Без визита в банк и справок о доходах",
		],
	},
	tbank: {
		id: "tbank",
		name: "Т-Банк",
		brandTitle: "Т-Банк Рассрочка (Тинькофф)",
		shortLabel: "Т-Банк",
		logoColor: "#ffdd2d",
		badgeClass: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 border-yellow-500/30",
		defaultTermMonths: 6,
		availableTermsMonths: [3, 6, 10, 12, 24],
		minAmountRub: 3000,
		maxAmountRub: 500000,
		overpaymentPercent: 0,
		descriptionRu: "Онлайн-рассрочка Т-Банка на дорогостоящее протезирование и имплантацию.",
		advantages: [
			"Высокий лимит до 500 000 ₽",
			"Выбор удобного срока от 3 до 24 месяцев",
			"Быстрое подписание по СМС",
			"Бесплатное досрочное погашение",
		],
	},
	podeli: {
		id: "podeli",
		name: "Подели (BNPL)",
		brandTitle: "Подели — Оплата 4 частями",
		shortLabel: "Подели (4 платежа)",
		logoColor: "#ff4d00",
		badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
		defaultTermMonths: 2, // 4 платежа по 2 недели
		availableTermsMonths: [2],
		minAmountRub: 1000,
		maxAmountRub: 100000,
		overpaymentPercent: 0,
		descriptionRu: "Оплата 4 равными частями каждые 2 недели (25% сразу, далее по графику).",
		advantages: [
			"Без кредитных договоров и проверки кредитной истории",
			"25% оплачивается сразу, 75% списываются каждые 2 недели",
			"Никаких скрытых комиссий",
			"Идеально для терапевтического и подготовительного этапа",
		],
	},
	yandex_split: {
		id: "yandex_split",
		name: "Яндекс Сплит",
		brandTitle: "Яндекс Сплит для медицины",
		shortLabel: "Яндекс Сплит",
		logoColor: "#fc3f1d",
		badgeClass: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
		defaultTermMonths: 4,
		availableTermsMonths: [2, 4, 6],
		minAmountRub: 1000,
		maxAmountRub: 150000,
		overpaymentPercent: 0,
		descriptionRu: "Сплит на комфортный срок с оплатой любой банковской картой.",
		advantages: [
			"Оплата картой любого российского банка",
			"Удобный график списаний в приложении Яндекса",
			"Моментальное подтверждение по номеру телефона",
		],
	},
};

export interface InstallmentScheduleItem {
	readonly paymentNumber: number;
	readonly title: string;
	readonly dueDateText: string;
	readonly amountKopecks: Kopecks;
	readonly amountRub: number;
	readonly percentShare: number;
}

export interface BankInstallmentCalculationResult {
	readonly provider: BankInstallmentProviderConfig;
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly termMonths: number;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly partsKopecks: readonly Kopecks[];
	readonly overpaymentKopecks: Kopecks;
	readonly schedule: readonly InstallmentScheduleItem[];
	readonly isWithinLimits: boolean;
	readonly validationErrorRu?: string | undefined;
}

export interface BankInstallmentDeepLinkParams {
	readonly providerId: BankInstallmentProviderId;
	readonly amountRub: number;
	readonly stageTitle: string;
	readonly stageNumber?: number | undefined;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly planId?: string | undefined;
	readonly termMonths?: number | undefined;
}

/**
 * Kopeck-exact расчет графика рассрочки без накопления погрешности float
 */
export function calculateBankInstallment(
	totalKopecks: Kopecks,
	providerId: BankInstallmentProviderId = "sberbank",
	termMonths?: number,
): BankInstallmentCalculationResult {
	const provider = BANK_INSTALLMENT_PROVIDERS[providerId] || BANK_INSTALLMENT_PROVIDERS.sberbank;
	const selectedTerm =
		termMonths && provider.availableTermsMonths.includes(termMonths)
			? termMonths
			: provider.defaultTermMonths;

	const totalRub = Math.round(totalKopecks / 100);
	const minKopecks = rublesToKopecks(provider.minAmountRub);
	const maxKopecks = rublesToKopecks(provider.maxAmountRub);

	let validationErrorRu: string | undefined;
	if (totalKopecks < minKopecks) {
		validationErrorRu = `Минимальная сумма для оформления ${provider.shortLabel} — ${provider.minAmountRub.toLocaleString("ru-RU")} ₽.`;
	} else if (totalKopecks > maxKopecks) {
		validationErrorRu = `Максимальный лимит для ${provider.shortLabel} — ${provider.maxAmountRub.toLocaleString("ru-RU")} ₽.`;
	}

	const isWithinLimits = !validationErrorRu;

	// Для "Подели" 4 платежа каждые 2 недели
	const paymentsCount = providerId === "podeli" ? 4 : selectedTerm;

	const basePartKopecks = Math.floor(totalKopecks / paymentsCount);
	const remainderKopecks = totalKopecks - basePartKopecks * paymentsCount;

	const partsKopecks: Kopecks[] = [];
	const schedule: InstallmentScheduleItem[] = [];
	const today = new Date();

	for (let i = 0; i < paymentsCount; i++) {
		// Добавляем копеечный остаток к первому платежу
		const part = i === 0 ? basePartKopecks + remainderKopecks : basePartKopecks;
		partsKopecks.push(part);

		let dueDateText: string;
		if (providerId === "podeli") {
			if (i === 0) {
				dueDateText = "Сегодня (при оформлении)";
			} else {
				const d = new Date(today);
				d.setDate(d.getDate() + i * 14);
				dueDateText = `Через ${i * 2} нед. (${d.toLocaleDateString("ru-RU")})`;
			}
		} else {
			if (i === 0) {
				dueDateText = "1-й месяц (через 30 дней)";
			} else {
				const d = new Date(today);
				d.setMonth(d.getMonth() + i);
				dueDateText = `${i + 1}-й платеж (${d.toLocaleDateString("ru-RU")})`;
			}
		}

		const percentShare = totalKopecks > 0 ? Math.round((part / totalKopecks) * 100) : 0;

		schedule.push({
			paymentNumber: i + 1,
			title:
				providerId === "podeli"
					? `Платеж ${i + 1} из 4 (25%)`
					: `Ежемесячный платеж ${i + 1} из ${selectedTerm}`,
			dueDateText,
			amountKopecks: part,
			amountRub: Math.round(part / 100),
			percentShare,
		});
	}

	const monthlyPaymentKopecks = partsKopecks[0] ?? 0;
	const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);

	return {
		provider,
		totalKopecks,
		totalRub,
		termMonths: selectedTerm,
		monthlyPaymentKopecks,
		monthlyPaymentRub,
		partsKopecks,
		overpaymentKopecks: 0,
		schedule,
		isWithinLimits,
		...(validationErrorRu ? { validationErrorRu } : {}),
	};
}

/**
 * Генерация deep-link URL и QR-пейлоада для банковской рассрочки
 */
export function generateBankInstallmentDeepLink(
	params: BankInstallmentDeepLinkParams,
): {
	readonly deepLinkUrl: string;
	readonly qrPayload: string;
	readonly formattedSmsText: string;
	readonly applicationOrderId: string;
} {
	const orderId = `INST-${params.providerId.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`;
	const clinicInn = params.clinicInn || "7701234567";
	const clinicName = encodeURIComponent(params.clinicName || "ООО ДЕНТЕ СТОМАТОЛОГИЯ");
	const amount = params.amountRub;
	const term = params.termMonths || 12;

	let deepLinkUrl: string;

	if (params.providerId === "sberbank") {
		// Стандартный deep-link СберБанк Онлайн (Покупай со Сбером)
		deepLinkUrl = `https://pos.gosuslugi.ru/sberpay/installment?orderId=${orderId}&inn=${clinicInn}&amount=${amount}&term=${term}&patientId=${params.patientId}`;
	} else if (params.providerId === "tbank") {
		// Т-Банк Кредит Лайн QR
		deepLinkUrl = `https://forma.tbank.ru/installment?orderId=${orderId}&shopInn=${clinicInn}&sum=${amount}&term=${term}&clientPhone=${encodeURIComponent(params.patientPhone || "")}`;
	} else if (params.providerId === "podeli") {
		// Подели BNPL
		deepLinkUrl = `https://podeli.ru/checkout?orderId=${orderId}&merchantInn=${clinicInn}&amount=${amount}&stage=${encodeURIComponent(params.stageTitle)}`;
	} else {
		// Яндекс Сплит
		deepLinkUrl = `https://split.yandex.ru/pay?orderId=${orderId}&inn=${clinicInn}&amount=${amount}&splitMonths=${term}`;
	}

	const providerConfig = BANK_INSTALLMENT_PROVIDERS[params.providerId];
	const formattedSmsText = `Стоматология ДЕНТЕ: Вам доступна беспроцентная рассрочка на ${providerConfig.shortLabel} на этап «${params.stageTitle}» на сумму ${amount.toLocaleString("ru-RU")} ₽. Оформить онлайн в 1 клик: ${deepLinkUrl}`;

	return {
		deepLinkUrl,
		qrPayload: deepLinkUrl,
		formattedSmsText,
		applicationOrderId: orderId,
	};
}

/**
 * Имитация быстрого одобрения кредитного скоринга банком (для мгновенного закрытия аванса в CRM)
 */
export function simulateBankApproval(
	approvedAmountKopecks: Kopecks,
	providerId: BankInstallmentProviderId,
	patientName = "Пациент",
	termMonths = 12,
): {
	readonly isApproved: boolean;
	readonly approvalId: string;
	readonly providerName: string;
	readonly approvedAmountKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly timestampIso: string;
	readonly confirmationMessageRu: string;
} {
	const provider = BANK_INSTALLMENT_PROVIDERS[providerId];
	const calc = calculateBankInstallment(approvedAmountKopecks, providerId, termMonths);
	const approvalId = `APP-${providerId.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`;
	const timestampIso = new Date().toISOString();

	return {
		isApproved: true,
		approvalId,
		providerName: provider.name,
		approvedAmountKopecks,
		monthlyPaymentRub: calc.monthlyPaymentRub,
		timestampIso,
		confirmationMessageRu: `Рассрочка на сумму ${formatKopecksRu(approvedAmountKopecks)} успешно одобрена банком ${provider.name} (№${approvalId})! Аванс за этап зачислен на депозит пациента.`,
	};
}
