/*
 * treatmentEstimatorValidation.ts — Человеческие объяснения, валидация для сохранения и сериализация API.
 * Мандаты 8b, 8e: <= 800 строк, модульность, честный интерфейс без обмана.
 */

import type {
	EstimatorPriceIssue,
	PlanItem,
} from "./treatmentEstimatorCatalogMatching";
import type { EstimatorRowMoney } from "./treatmentEstimatorMoney";

export const PRICE_LIST_PLACE = "«Настройки → Прайс»";

export function toothList(numbers: readonly number[]): string {
	const sorted = [...numbers].sort((left, right) => left - right);
	return sorted.length === 1 ? `зуб ${sorted[0]}` : `зубы ${sorted.join(", ")}`;
}

export function needLabel(humanName: string, teeth: readonly number[]): string {
	return teeth.length > 0 ? `${humanName} (${toothList(teeth)})` : humanName;
}

export function estimatorIssueMessages(items: readonly PlanItem[]): string[] {
	const emptyCatalogNeeds = new Map<string, number[]>();
	const groups = new Map<
		string,
		{ issue: EstimatorPriceIssue; teeth: number[] }
	>();
	for (const item of items) {
		if (!item.issue) continue;
		if (item.issue.kind === "catalog_empty") {
			const teeth = emptyCatalogNeeds.get(item.issue.humanName) ?? [];
			if (item.toothNumber !== undefined) teeth.push(item.toothNumber);
			emptyCatalogNeeds.set(item.issue.humanName, teeth);
			continue;
		}
		const key = `${item.issue.kind}|${item.issue.humanName}`;
		const group = groups.get(key);
		if (group) {
			if (item.toothNumber !== undefined) group.teeth.push(item.toothNumber);
		} else {
			groups.set(key, {
				issue: item.issue,
				teeth: item.toothNumber !== undefined ? [item.toothNumber] : [],
			});
		}
	}

	const messages: string[] = [];
	if (emptyCatalogNeeds.size > 0) {
		const needs = [...emptyCatalogNeeds.entries()].map(([humanName, teeth]) =>
			needLabel(humanName, teeth),
		);
		messages.push(
			`Ваш прайс-лист пуст, поэтому цены брать неоткуда. Заполните прайс в ${PRICE_LIST_PLACE} — для этого плана нужны: ${needs.join("; ")}. Найденное лечение из плана не исчезло: зубы и лечение видны, нет только цен.`,
		);
	}
	for (const { issue, teeth } of groups.values()) {
		const where = teeth.length > 0 ? ` (${toothList(teeth)})` : "";
		switch (issue.kind) {
			case "not_in_catalog":
				messages.push(
					`«${issue.humanName}»${where}: такой услуги нет в вашем прайсе. Добавьте её в ${PRICE_LIST_PLACE} — и в смете появится ваша цена. Пока цены нет, строку сохранить нельзя, но зуб и лечение она показывает верно.`,
				);
				break;
			case "service_disabled":
				messages.push(
					issue.catalogTitle
						? `«${issue.humanName}»${where}: такая услуга в вашем прайсе есть — «${issue.catalogTitle}», — но она выключена, поэтому в смету не берётся. Включите её в ${PRICE_LIST_PLACE}, и появится ваша цена. Заводить вторую такую же услугу не нужно.`
						: `«${issue.humanName}»${where}: подходящие услуги в вашем прайсе есть (${issue.matches}), но все выключены, поэтому в смету не берутся. Включите нужную в ${PRICE_LIST_PLACE}, и появится ваша цена.`,
				);
				break;
			case "ambiguous":
				messages.push(
					`«${issue.humanName}»${where}: в вашем прайсе несколько подходящих услуг (${issue.matches}). Какую из них поставить пациенту — решает врач, а не программа. Уточните названия в ${PRICE_LIST_PLACE}, чтобы под это лечение подходила ровно одна услуга.`,
				);
				break;
			case "price_missing":
				messages.push(
					`«${issue.humanName}»${where}: у услуги в прайсе не указана цена. Впишите её в ${PRICE_LIST_PLACE} — считать смету по неизвестной цене программа не станет.`,
				);
				break;
			case "service_unlinked":
				messages.push(
					`«${issue.humanName}»${where}: сумма в строке сохранена, а услуги прайса за ней нет — сервер такую строку не примет. Уберите строку корзиной и отметьте зуб на схеме заново: смета подставит услугу из вашего прайса вместе с ценой.`,
				);
				break;
			case "catalog_empty":
				break;
			default: {
				const unhandled: never = issue.kind;
				void unhandled;
				break;
			}
		}
	}
	return messages;
}

export interface EstimatorSaveBlock {
	rows: PlanItem[];
	message: string;
}

export type EstimatorRowBlockReason =
	| "no_price"
	| "no_service";

export function estimatorRowBlock(
	item: PlanItem,
): EstimatorRowBlockReason | null {
	if (item.price === null || !Number.isFinite(item.price) || item.price < 0) {
		return "no_price";
	}
	if (!item.priceId) return "no_service";
	return null;
}

export function estimatorRowMark(
	item: PlanItem,
	money: EstimatorRowMoney,
): string | null {
	if (!money.known) return rowIssueMark(item.issue);
	return estimatorRowBlock(item) === "no_service" ? "нет услуги прайса" : null;
}

export function rowIssueMark(issue: EstimatorPriceIssue | null | undefined): string {
	if (!issue) return "сумма в плане не читается";
	switch (issue.kind) {
		case "catalog_empty":
			return "прайс ещё не заполнен";
		case "service_disabled":
			return "услуга выключена в прайсе";
		case "not_in_catalog":
			return "нет в вашем прайсе";
		case "ambiguous":
			return "подходит несколько услуг";
		case "price_missing":
			return "в прайсе не указана цена";
		case "service_unlinked":
			return "нет услуги прайса";
		default: {
			const unhandled: never = issue.kind;
			void unhandled;
			return "цены нет";
		}
	}
}

export function namedRows(rows: readonly PlanItem[]): string {
	const named = rows.map((row) => {
		const label = row.issue?.humanName ?? row.name;
		return row.toothNumber !== undefined
			? `«${label}» (зуб ${row.toothNumber})`
			: `«${label}»`;
	});
	return [...new Set(named)].join(", ");
}

export function estimatorSaveBlock(
	items: readonly PlanItem[],
): EstimatorSaveBlock | null {
	const noPrice: PlanItem[] = [];
	const noService: PlanItem[] = [];
	for (const item of items) {
		const reason = estimatorRowBlock(item);
		if (reason === "no_price") noPrice.push(item);
		else if (reason === "no_service") noService.push(item);
	}
	const rows = [...noPrice, ...noService];
	if (rows.length === 0) return null;

	const parts: string[] = [];
	if (noPrice.length > 0) {
		parts.push(
			`в смете есть лечение без цены из вашего прайса — ${namedRows(noPrice)}. Добавьте эти услуги в ${PRICE_LIST_PLACE} и сохраните снова`,
		);
	}
	if (noService.length > 0) {
		parts.push(
			`у строк есть сумма, но нет услуги прайса — ${namedRows(noService)}. Уберите их корзиной и отметьте зуб на схеме заново: смета подставит услугу из вашего прайса вместе с ценой`,
		);
	}
	const message =
		`План не сохранён: ${parts.join(". Кроме того, ")}. ` +
		`Сервер не принимает строку сметы без услуги прайса, поэтому отказ пришёл бы на весь план. ` +
		`Можно и просто убрать спорную строку корзиной, чтобы сохранить остальное. Набранные позиции остались на экране.`;
	return { rows, message };
}

export interface EstimatorItemForApi {
	toothNumber?: number;
	priceId: string;
	name: string;
	quantity: number;
	price: number;
	discount: number;
	phase: number;
	isAuto?: boolean;
}

export function estimatorItemForApi(
	item: PlanItem,
): EstimatorItemForApi | null {
	if (estimatorRowBlock(item) !== null) return null;
	const { priceId, price } = item;
	if (priceId === null || price === null) return null;
	return {
		...(item.toothNumber !== undefined
			? { toothNumber: item.toothNumber }
			: {}),
		priceId,
		name: item.name,
		quantity: item.quantity,
		price,
		discount: item.discount,
		phase: item.phase,
		...(item.isAuto !== undefined ? { isAuto: item.isAuto } : {}),
	};
}
