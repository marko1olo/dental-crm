import {
	type MigrationAnalyzeResponse,
	migrationEntityKindTitles,
} from "@dental/shared";
import { transformRow } from "../rowTransform.js";
import {
	prepareSource,
	sourceProfileFor,
} from "./checksumValidator.js";
import {
	DEFAULT_CONFIDENCE_THRESHOLD,
	type EngineInput,
} from "./types.js";

/**
 * Фаза анализа: разбор, определение кодировки, карта соответствия и оценка того,
 * сколько строк пройдёт. Ничего не записывает, даже в стейджинг.
 */
export async function analyzeSource(
	input: EngineInput,
): Promise<MigrationAnalyzeResponse> {
	const { parsed, tables, warnings } = await prepareSource(input);

	if (tables.length === 0) {
		throw new Error(
			`Источник «${input.sourceName}» не содержит распознаваемых таблиц. ${warnings.join(" ")}`.trim(),
		);
	}

	// Анализ показывает первую таблицу; остальные упоминаются в предупреждениях.
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const primary = tables[0]!;

	let projectedReady = 0;
	let projectedQuarantine = 0;
	const findingsByMessage = new Map<
		string,
		{ severity: "info" | "warning" | "blocker"; rows: number }
	>();

	for (const [index, row] of primary.table.rows.entries()) {
		const transformed = transformRow({
			entityKind: primary.entityKind,
			columns: primary.table.columns,
			row,
			mapping: primary.mapping.columns,
			dateHints: primary.dateHints,
			confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
		});

		const blocking = transformed.issues.some((issue) => issue.blocking);
		if (blocking) projectedQuarantine += 1;
		else projectedReady += 1;

		for (const issue of transformed.issues) {
			/**
			 * Замечания группируются по смыслу, а не показываются построчно: «нет
			 * телефона у 340 строк» — полезно, а 340 отдельных сообщений оператор
			 * закроет не читая. Номер строки в тексте заменяется на «N».
			 */
			const key = `${issue.reason}|${issue.fieldPath ?? ""}|${issue.message.replace(/\d+/g, "N")}`;
			const existing = findingsByMessage.get(key);
			if (existing) existing.rows += 1;
			else {
				findingsByMessage.set(key, {
					severity: issue.blocking ? "blocker" : "warning",
					rows: 1,
				});
			}
		}
		void index;
	}

	const qualityFindings = [
		...[...findingsByMessage.entries()].map(([key, value]) => ({
			severity: value.severity,
			message: key.split("|").slice(2).join("|"),
			affectedRows: value.rows,
		})),
		...primary.mapping.warnings.map((message) => ({
			severity: "warning" as const,
			message,
			affectedRows: 0,
		})),
		...warnings.map((message) => ({
			severity: "info" as const,
			message,
			affectedRows: 0,
		})),
	]
		// Сначала блокирующее и то, что затрагивает больше строк.
		.sort((left, right) => {
			const weight = { blocker: 0, warning: 1, info: 2 } as const;
			const bySeverity = weight[left.severity] - weight[right.severity];
			return bySeverity !== 0
				? bySeverity
				: right.affectedRows - left.affectedRows;
		})
		.slice(0, 40);

	if (tables.length > 1) {
		qualityFindings.unshift({
			severity: "info",
			message: `В источнике ${tables.length} таблиц(ы): ${tables
				.map(
					(item) =>
						`${item.table.name} → ${migrationEntityKindTitles[item.entityKind]}`,
				)
				.join("; ")}. Перенос обработает все.`,
			affectedRows: 0,
		});
	}

	return {
		sourceName: input.sourceName,
		profile: sourceProfileFor(parsed, primary),
		mapping: primary.mapping,
		projectedReady,
		projectedQuarantine,
		qualityFindings,
	};
}
