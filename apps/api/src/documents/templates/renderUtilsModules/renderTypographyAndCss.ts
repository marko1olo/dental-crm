import {
	type ClinicalToothRow,
	kopecksToNumericString,
	parseKopecks,
} from "@dental/shared";

export function escapeHtml(value: string | null | undefined) {
	if (value === null || value === undefined) return "";
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

/**
 * Целые копейки → рубли числом, для тех мест, где сумма дальше уходит в rub().
 *
 * Через строку numeric(12, 2) намеренно: это единственный способ получить из
 * копеек ровно то же число, которое лежит в денежной колонке базы, не заводя
 * второй способ считать деньги. Арифметика остаётся в @dental/shared.
 */
export function rublesFromKopecks(kopecks: number): number {
	return Number(kopecksToNumericString(kopecks));
}

/**
 * Денежная сумма для печатной формы: «1 500 руб.» и «1 500,50 руб.».
 *
 * Раньше здесь стоял `value.toLocaleString("ru-RU")`, и это давало два дефекта
 * в одной строке. Копеечная сумма печаталась с одним знаком — «600,6 руб.»
 * вместо «600,60 руб.». А сумма, пришедшая из сложения в плавающей точке,
 * молча пряталась: toLocaleString округляет до трёх знаков, поэтому
 * 1110.9999999999995 выглядело как «1 111 руб.», хотя проверки выдачи в этом же
 * файле сравнивали именно исходное дробное значение и документ не выдавали.
 *
 * Теперь сумма приводится к целым копейкам (parseKopecks из @dental/shared) и
 * печатается ровно. Копейки показываются только когда они есть, поэтому для
 * целых рублей вывод не изменился ни на один байт.
 *
 * Нечисловое значение — это не «0 руб.»: оно печатается как «не указана», а эта
 * строка входит в unresolvedPlaceholderPatterns, то есть документ с такой суммой
 * не выдаётся, вместо того чтобы уйти пациенту с «NaN руб.».
 */
export function rub(value: number | null) {
	if (value === null || !Number.isFinite(value)) return "не указана";
	const numeric = kopecksToNumericString(parseKopecks(value));
	const negative = numeric.startsWith("-");
	const [wholeRubles, fractionKopecks] = numeric.replace("-", "").split(".");
	const grouped = Number(wholeRubles).toLocaleString("ru-RU");
	const amount =
		fractionKopecks === "00" ? grouped : `${grouped},${fractionKopecks}`;
	return `${negative ? "-" : ""}${amount} руб.`;
}

export function row(label: string, value: string | null | undefined) {
	return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? "")}</td></tr>`;
}

export function cell(value: string | null | undefined) {
	return `<td>${escapeHtml(present(value) ?? "")}</td>`;
}

export function present(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function digitsOnly(value: string | null | undefined): string {
	return (value ?? "").replace(/\D+/g, "");
}

export function hasPersonNameParts(value: string | null | undefined): boolean {
	return (present(value) ?? "").split(/\s+/).filter(Boolean).length >= 2;
}

export function compactParts(parts: Array<string | null | undefined>): string {
	return parts
		.filter((part): part is string => Boolean(part?.trim()))
		.join("; ");
}

export function hasClinicalToothRows(
	value: { clinicalToothRows?: unknown } | null | undefined,
): boolean {
	return (
		Array.isArray(value?.clinicalToothRows) &&
		value.clinicalToothRows.length > 0
	);
}

export function clinicalToothSurfaceLabel(
	value: ClinicalToothRow["surfaces"][number],
): string {
	const labels: Record<ClinicalToothRow["surfaces"][number], string> = {
		occlusal: "окклюзионная",
		mesial: "мезиальная",
		distal: "дистальная",
		buccal: "щечная",
		lingual: "язычная",
		palatal: "небная",
		incisal: "режущий край",
		root: "корень",
		implant_site: "зона имплантации",
		not_applicable: "не применимо",
	};
	return labels[value] ?? value;
}

export function clinicalToothStatusLabel(value: ClinicalToothRow["status"]): string {
	const labels: Record<ClinicalToothRow["status"], string> = {
		Healthy: "без патологии (интактный)",
		Caries: "кариес",
		Pulpitis: "пульпит",
		Periodontitis: "периодонтит",
		Filled: "пломба (выполнено)",
		Crown: "коронка (ортопедия)",
		Planned_Crown: "планируемая коронка",
		Implant: "имплантат",
		Planned_Implant: "планируемый имплантат",
		Missing: "отсутствует",
		Retained: "ретинированный",
		Root: "разрушенный корень",
		sound: "без патологии",
		watch: "наблюдение",
		caries: "кариес",
		pulpitis_periodontitis: "пульпит/периодонтит",
		periodontal: "пародонтологический статус",
		missing: "отсутствует",
		extraction: "показан к удалению",
		implant: "имплантат",
		prosthetic: "ортопедическая конструкция",
		orthodontic: "ортодонтический статус",
		planned: "запланировано",
		completed: "выполнено",
		other: "иное",
	};
	return labels[value] ?? value;
}

export function clinicalToothRowsTable(rows: readonly ClinicalToothRow[]) {
	const toothRows = rows
		.map(
			(item) =>
				`<tr>${cell(item.toothOrArea)}${cell(item.surfaces.map(clinicalToothSurfaceLabel).join(", "))}${cell(
					clinicalToothStatusLabel(item.status),
				)}${cell(item.diagnosisOrFinding)}${cell(item.indication)}${cell(item.plannedAction)}${cell(item.prognosis)}${cell(
					item.periodontalStatus,
				)}${cell(item.implantOrProstheticNotes)}${cell(item.orthodonticNotes)}</tr>`,
		)
		.join("");

	return `<table>
    <tr>
      <th>Зуб/сегмент</th>
      <th>Поверхности</th>
      <th>Статус</th>
      <th>Диагноз/находка</th>
      <th>Показание</th>
      <th>Действие</th>
      <th>Прогноз</th>
      <th>Пародонт</th>
      <th>Имплант/ортопедия</th>
      <th>Ортодонтия</th>
    </tr>
    ${toothRows}
  </table>`;
}
