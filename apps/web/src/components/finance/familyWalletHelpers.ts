import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";
import { money } from "../../AppHelpers";
import { kopecksToRub, rubToKopecks } from "@dental/shared";

export interface FamilyMember {
	id: string;
	fullName: string;
	phone: string;
	relationship?: string | undefined;
	isHead?: boolean | undefined;
	isArchived?: boolean | undefined;
	mergedIntoPatientId?: string | undefined;
	mergedIntoPatientName?: string | undefined;
	isSpendingAuthorized?: boolean | undefined;
	individualLimitRub?: number | undefined;
	currentSpentRub?: number | undefined;
}

export interface FamilyLedgerEntry {
	id: string;
	createdAt: string;
	entryType: "deposit" | "debit" | "refund_deposit" | "refund_payout";
	amountRub: number;
	amountKopecks: number;
	payerPatientId?: string | undefined;
	payerFullName?: string | undefined;
	targetPatientId?: string | undefined;
	targetPatientFullName?: string | undefined;
	visitId?: string | undefined;
	documentId?: string | undefined;
	invoiceNumber?: string | undefined;
	actNumber?: string | undefined;
	fiscalReceiptNumber?: string | undefined;
	method?: string | undefined;
	notes?: string | undefined;
	clientMutationId?: string | undefined;
}

export interface FamilyGroup {
	id: string;
	/**
	 * Название может отсутствовать: колонка family_groups.name объявлена
	 * без NOT NULL (db/schema.ts), обязателен только group_name.
	 */
	name: string | null;
	balance: string;
	headPatientId?: string | null | undefined;
	headPatientName?: string | null | undefined;
	isArchived?: boolean | undefined;
	overdraftAllowed?: boolean | undefined;
	overdraftLimitRub?: number | undefined;
	members: FamilyMember[];
	ledger?: FamilyLedgerEntry[] | undefined;
}

/**
 * Как называть содержимое панели в сообщении об отказе.
 */
export const WALLET_PANEL_SUBJECT: PanelSubject = {
	notLoadedTitle: "Данные семейного кошелька не загружены",
	accusative: "семейный кошелёк",
	emptyTitle: "Пациент не входит в семью",
	emptyHint:
		"Семейный счёт появится, когда пациента добавят в семейную группу.",
	failureConsequence:
		"Не считайте, что семейного счёта нет: баланс не прочитан. Пока он не загрузился, списывать с него нельзя — примите оплату обычным способом или повторите загрузку.",
};

/**
 * Отказ сервера понятным языком. Показываем текст сервера только если есть кириллица.
 */
export function refusalToast(
	action: string,
	status: number,
	message: unknown,
): string {
	const serverText = typeof message === "string" ? message.trim() : "";
	return /[а-яё]/i.test(serverText)
		? serverText
		: actionFailureToast(action, status);
}

/**
 * Идентификатор пациента в базе — UUID.
 */
export const PATIENT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Способы внесения аванса на семейный счет.
 */
export type FamilyTopupMethod = "cash" | "card" | "bank_transfer";
export const FAMILY_TOPUP_METHODS: readonly FamilyTopupMethod[] = [
	"cash",
	"card",
	"bank_transfer",
];

export const BONUS_PRESETS: readonly number[] = [500, 1000, 2000, 5000];

/**
 * Безопасное форматирование денежных сумм без вываливания NaN или undefined.
 */
export function formatMoneyClean(rub: number | null | undefined): string {
	if (rub === null || rub === undefined || !Number.isFinite(rub) || Number.isNaN(rub)) {
		return "0 ₽";
	}
	return money(rub);
}

/**
 * Безопасное извлечение имени члена семьи без "undefined", "null" или "undefined member".
 */
export function safeFamilyMemberName(
	member?: Partial<FamilyMember> | null,
	fallback = "Член семьи",
): string {
	if (!member) return fallback;
	const name = (member.fullName || "").trim();
	if (!name || name === "null" || name === "undefined") {
		return fallback;
	}
	return name;
}

/**
 * Форматирует понятный бейдж баланса с указанием главы семьи.
 * Пример: «Семейный баланс: 42 150 ₽ (Глава семьи: Иванов С.П.)»
 */
export function formatFamilyBalanceLabel(
	balanceRub: number,
	headName?: string | null,
): string {
	const safeBalance = formatMoneyClean(balanceRub);
	const cleanHead = headName && headName.trim() && headName !== "null" && headName !== "undefined"
		? headName.trim()
		: null;

	if (cleanHead) {
		return `Семейный баланс: ${safeBalance} (Глава семьи: ${cleanHead})`;
	}
	return `Семейный баланс: ${safeBalance}`;
}

/**
 * Форматирует бейдж доступной к списанию суммы.
 * Пример: «Доступно для списания: 42 150 ₽»
 */
export function formatAvailableForDebitLabel(availableRub: number): string {
	return `Доступно для списания: ${formatMoneyClean(availableRub)}`;
}

/**
 * Валидация статуса члена семьи (защита от списаний по архивным или объединенным пациентам).
 */
export function validateFamilyMemberStatus(member: FamilyMember): {
	isValid: boolean;
	warning?: string | undefined;
	isArchived: boolean;
	isMerged: boolean;
	redirectPatientId?: string | undefined;
} {
	const isArchived = Boolean(member.isArchived);
	const isMerged = Boolean(member.mergedIntoPatientId && member.mergedIntoPatientId.trim());

	if (isMerged) {
		const targetName = member.mergedIntoPatientName?.trim() || "основным профилем";
		return {
			isValid: true,
			warning: `Пациент объединен с ${targetName}. Баланс сохранен и доступен в семейной группе.`,
			isArchived,
			isMerged: true,
			redirectPatientId: member.mergedIntoPatientId,
		};
	}

	if (isArchived) {
		return {
			isValid: true,
			warning: "Пациент находится в архиве. Семейный баланс не утерян и может использоваться другими членами семьи.",
			isArchived: true,
			isMerged: false,
		};
	}

	return {
		isValid: true,
		isArchived: false,
		isMerged: false,
	};
}

/**
 * Копеечно-точный расчет сплита семейного депозита (родитель -> ребенок).
 */
export function calculateFamilyAllocation(params: {
	depositAvailableRub: number;
	totalDueRub: number;
	requestedDebitRub?: number | undefined;
	individualLimitRub?: number | undefined;
	overdraftAllowed?: boolean | undefined;
}): {
	allocatedDepositRub: number;
	allocatedDepositKopecks: number;
	remainingDueRub: number;
	remainingDueKopecks: number;
	overdraftRub: number;
	exceedsLimit: boolean;
} {
	const totalDueKop = Math.max(0, rubToKopecks(params.totalDueRub));
	const depositAvailKop = Math.max(0, rubToKopecks(params.depositAvailableRub));

	let capKop = depositAvailKop;
	if (params.individualLimitRub !== undefined && params.individualLimitRub !== null) {
		const indLimitKop = Math.max(0, rubToKopecks(params.individualLimitRub));
		capKop = Math.min(capKop, indLimitKop);
	}

	const requestedKop = params.requestedDebitRub !== undefined && params.requestedDebitRub !== null
		? Math.max(0, rubToKopecks(params.requestedDebitRub))
		: totalDueKop;

	let allocatedKop = Math.min(requestedKop, totalDueKop);

	let overdraftKop = 0;
	let exceedsLimit = false;

	if (allocatedKop > capKop) {
		if (params.overdraftAllowed) {
			overdraftKop = allocatedKop - capKop;
		} else {
			allocatedKop = capKop;
			exceedsLimit = true;
		}
	}

	const remainingKop = Math.max(0, totalDueKop - allocatedKop);

	return {
		allocatedDepositRub: kopecksToRub(allocatedKop),
		allocatedDepositKopecks: allocatedKop,
		remainingDueRub: kopecksToRub(remainingKop),
		remainingDueKopecks: remainingKop,
		overdraftRub: kopecksToRub(overdraftKop),
		exceedsLimit,
	};
}

/**
 * Маршрутизация возвратов (Refund Routing):
 * При отмене визита ребенка средства возвращаются СТРОГО на семейный депозит.
 * При выплате наличными/картой — списание с баланса с чеком возврата прихода (54-ФЗ).
 */
export function calculateFamilyRefundRouting(params: {
	originalPaymentMethod: string;
	originalFamilyGroupId?: string | undefined;
	refundAmountRub: number;
	requestCashPayout?: boolean | undefined;
}): {
	destination: "family_deposit" | "cash_payout" | "card_payout";
	requiresFiscalReceipt54Fz: boolean;
	receiptType: "return_of_income";
	description: string;
} {
	const isFamilyWalletPayment =
		params.originalPaymentMethod === "family_wallet" ||
		params.originalPaymentMethod === "family_deposit" ||
		Boolean(params.originalFamilyGroupId);

	if (isFamilyWalletPayment && !params.requestCashPayout) {
		return {
			destination: "family_deposit",
			requiresFiscalReceipt54Fz: false,
			receiptType: "return_of_income",
			description:
				"Средства возвращаются на общий семейный депозит без фискализации выплаты из кассы.",
		};
	}

	if (params.requestCashPayout) {
		return {
			destination: "cash_payout",
			requiresFiscalReceipt54Fz: true,
			receiptType: "return_of_income",
			description:
				"Возврат наличными из кассы с обязательным формированием фискального чека «Возврат прихода» (54-ФЗ).",
		};
	}

	return {
		destination: "card_payout",
		requiresFiscalReceipt54Fz: true,
		receiptType: "return_of_income",
		description:
			"Безналичный возврат на карту плательщика с формированием фискального чека «Возврат прихода» (54-ФЗ).",
	};
}

/**
 * Проверка овердрафта: строгий запрет либо мягкое предупреждение с фиксацией долга главы семьи.
 */
export function checkOverdraftStatus(
	balanceRub: number,
	amountToDebitRub: number,
	overdraftAllowed = false,
	overdraftLimitRub = 0,
): {
	canDebit: boolean;
	overdraftAmountRub: number;
	warningMessage?: string | undefined;
} {
	const balKop = rubToKopecks(balanceRub);
	const debitKop = rubToKopecks(amountToDebitRub);

	if (debitKop <= balKop) {
		return {
			canDebit: true,
			overdraftAmountRub: 0,
		};
	}

	const overdraftKop = debitKop - balKop;
	const overdraftRub = kopecksToRub(overdraftKop);

	if (!overdraftAllowed) {
		return {
			canDebit: false,
			overdraftAmountRub: overdraftRub,
			warningMessage: `Сумма списания превышает доступный семейный баланс на ${formatMoneyClean(overdraftRub)}. Овердрафт запрещен.`,
		};
	}

	const maxOverdraftKop = rubToKopecks(overdraftLimitRub);
	if (maxOverdraftKop > 0 && overdraftKop > maxOverdraftKop) {
		return {
			canDebit: false,
			overdraftAmountRub: overdraftRub,
			warningMessage: `Превышен допустимый лимит мягкого овердрафта (${formatMoneyClean(overdraftLimitRub)}). Недостает ${formatMoneyClean(overdraftRub)}.`,
		};
	}

	return {
		canDebit: true,
		overdraftAmountRub: overdraftRub,
		warningMessage: `Внимание: списание переведет семейный счет в мягкий овердрафт на сумму ${formatMoneyClean(overdraftRub)}. Задолженность фиксируется за главой семьи.`,
	};
}
