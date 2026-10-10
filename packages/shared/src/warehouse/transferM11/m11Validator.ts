/**
 * m11Validator.ts — Statutory & Domain Validation for Form M-11 Requirements-Waybills.
 *
 * Statutory reference: Form M-11 (OKUD 0315003 / 0315006).
 * Invariants:
 * 1. Strict status transitions: DRAFT -> IN_TRANSIT -> ACCEPTED | DISCREPANCY | CANCELLED.
 * 2. Responsible Officer (МОЛ) verification (mandatory FIO, position, signature date).
 * 3. Russian Chart of Accounts correspondence validation (subaccounts 10.01, 10.06, 10.09).
 */

import {
	type TransferM11Status,
	type ResponsibleOfficer,
	responsibleOfficerSchema,
	transferM11StatusSchema,
	m11AccountCodeSchema,
	M11_ACCOUNT_SUBACCOUNTS,
} from "./types.js";

// ─── 1. STATUS TRANSITION STATE MACHINE VALIDATOR ──────────────────────────────

const ALLOWED_M11_TRANSITIONS: Record<TransferM11Status, TransferM11Status[]> = {
	DRAFT: ["IN_TRANSIT", "CANCELLED"],
	IN_TRANSIT: ["ACCEPTED", "DISCREPANCY", "CANCELLED"],
	ACCEPTED: [], // Терминальный статус
	DISCREPANCY: [], // Терминальный статус
	CANCELLED: [], // Терминальный статус
};

/**
 * Validates whether transition from current status to target status is statutory and legal.
 */
export function validateM11StatusTransition(
	currentStatus: TransferM11Status,
	targetStatus: TransferM11Status,
): void {
	transferM11StatusSchema.parse(currentStatus);
	transferM11StatusSchema.parse(targetStatus);

	if (currentStatus === targetStatus) {
		throw new Error(`Статус накладной уже установлен в «${currentStatus}»`);
	}

	const allowed = ALLOWED_M11_TRANSITIONS[currentStatus] ?? [];
	if (!allowed.includes(targetStatus)) {
		throw new Error(
			`Недопустимый переход статуса накладной М-11: из «${currentStatus}» в «${targetStatus}». Допустимые переходы: ${
				allowed.length > 0 ? allowed.join(", ") : "нет (терминальное состояние)"
			}`,
		);
	}
}

// ─── 2. RESPONSIBLE OFFICER (МОЛ) VALIDATION ────────────────────────────────────

/**
 * Validates Materially Responsible Officer (Материально ответственное лицо).
 * In clinical logistics, drugs, anesthetics, and sterile burs require designated officers.
 */
export function validateM11ResponsibleOfficer(
	officer: unknown,
	roleLabel = "Ответственное лицо",
): ResponsibleOfficer {
	const parsed = responsibleOfficerSchema.safeParse(officer);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message ?? "Ошибка валидации ответственного лица";
		throw new Error(`${roleLabel}: ${firstError}`);
	}
	return parsed.data;
}

// ─── 3. ACCOUNTING CORRESPONDENCE (РСБУ СЧЕТ 10.01 / 10.06 / 10.09) ─────────────

export interface AccountCorrespondenceResult {
	isValid: boolean;
	debitAccount: string;
	creditAccount: string;
	isSameSubaccount: boolean;
	descriptionRu: string;
}

/**
 * Validates correspondent accounts for Form M-11.
 * Internal transfer between clinic warehouses/cabinets:
 * Debit 10.01 (Cabinet/Branch) - Credit 10.01 (Central Warehouse)
 * Or Debit 10.06 (Other materials) - Credit 10.06
 */
export function validateM11AccountsCorrespondence(
	debitAccount: string,
	creditAccount: string,
): AccountCorrespondenceResult {
	const debitResult = m11AccountCodeSchema.safeParse(debitAccount);
	if (!debitResult.success) {
		throw new Error(`Недопустимый счет дебета «${debitAccount}». Требуется субсчет счета 10 (например, 10.01, 10.06)`);
	}

	const creditResult = m11AccountCodeSchema.safeParse(creditAccount);
	if (!creditResult.success) {
		throw new Error(`Недопустимый счет кредита «${creditAccount}». Требуется субсчет счета 10 (например, 10.01, 10.06)`);
	}

	const isSame = debitAccount === creditAccount;
	let desc = "Внутреннее перемещение ТМЦ между подразделениями";

	if (debitAccount === M11_ACCOUNT_SUBACCOUNTS.RAW_MATERIALS && creditAccount === M11_ACCOUNT_SUBACCOUNTS.RAW_MATERIALS) {
		desc = "Перемещение стоматологических материалов, медикаментов и анестетиков (счет 10.01)";
	} else if (debitAccount === M11_ACCOUNT_SUBACCOUNTS.OTHER_MATERIALS && creditAccount === M11_ACCOUNT_SUBACCOUNTS.OTHER_MATERIALS) {
		desc = "Перемещение прочих расходных материалов и средств дезинфекции (счет 10.06)";
	} else if (debitAccount === M11_ACCOUNT_SUBACCOUNTS.ACCESSORIES_INVENTORY && creditAccount === M11_ACCOUNT_SUBACCOUNTS.ACCESSORIES_INVENTORY) {
		desc = "Перемещение малоценного инвентаря и инструментов со сроком службы до 12 мес (счет 10.09)";
	} else if (!isSame) {
		desc = `Внутрихозяйственное перемещение со сменой субсчета: Дт ${debitAccount} — Кт ${creditAccount}`;
	}

	return {
		isValid: true,
		debitAccount,
		creditAccount,
		isSameSubaccount: isSame,
		descriptionRu: desc,
	};
}

// ─── 4. PHYSICAL WAREHOUSE ROUTING VALIDATION ───────────────────────────────────

/**
 * Validates that sender and receiver warehouse IDs are physically distinct.
 */
export function validateM11WarehousePair(fromWarehouseId: string, toWarehouseId: string): void {
	if (!fromWarehouseId || !toWarehouseId) {
		throw new Error("Склад-отправитель и склад-получатель обязательны для заполнения");
	}
	if (fromWarehouseId === toWarehouseId) {
		throw new Error("Склад-отправитель и склад-получатель не могут совпадать");
	}
}

/**
 * Validates that items list is non-empty and well-formed.
 */
export function validateM11ItemsNonEmpty(items: unknown[] | undefined | null): void {
	if (!items || !Array.isArray(items) || items.length === 0) {
		throw new Error("Накладная М-11 должна содержать хотя бы одну товарную позицию");
	}
}
