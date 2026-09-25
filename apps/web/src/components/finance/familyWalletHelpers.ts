import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";

export interface FamilyMember {
	id: string;
	fullName: string;
	phone: string;
}

export interface FamilyGroup {
	id: string;
	/**
	 * Название может отсутствовать: колонка family_groups.name объявлена
	 * без NOT NULL (db/schema.ts), обязателен только group_name.
	 */
	name: string | null;
	balance: string;
	members: FamilyMember[];
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
