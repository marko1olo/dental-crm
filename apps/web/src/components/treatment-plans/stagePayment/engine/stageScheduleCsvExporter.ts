import { getStagePresetByKind } from "../stagePaymentPresets.js";
import type { MilestoneStage } from "./types";

/**
 * Экспорт графика платежей по стандарту RFC 4180 с UTF-8 BOM (\uFEFF)
 */
export function exportStageScheduleToCsv(
	stages: readonly MilestoneStage[],
	planTitle = "Комплексный план стоматологического лечения",
	patientName = "Пациент",
): string {
	const BOM = "\uFEFF";
	const escapeCsv = (str: string | number): string => {
		const val = String(str).replace(/"/g, '""');
		return `"${val}"`;
	};

	const headers = [
		"№ этапа",
		"Наименование этапа",
		"Вид лечения",
		"Статус оплаты",
		"Общая стоимость (руб)",
		"Требуемый аванс (руб)",
		"Внесенный аванс (руб)",
		"Заблокировано в эскроу (руб)",
		"Окончательная доплата (руб)",
		"Остаток к доплате (руб)",
		"Номер акта сдачи-приемки",
		"Дата подписания акта",
		"Правовое основание (ГК РФ)",
	];

	const rows: string[][] = [];

	rows.push([escapeCsv(`ПЛАН ПОЭТАПНОЙ ОПЛАТЫ: ${planTitle}`)]);
	rows.push([escapeCsv(`ПАЦИЕНТ: ${patientName}`)]);
	rows.push([escapeCsv(`ДАТА ФОРМИРОВАНИЯ: ${new Date().toLocaleDateString("ru-RU")}`)]);
	rows.push([]);
	rows.push(headers.map(escapeCsv));

	let grandTotal = 0;
	let totalAdvance = 0;
	let totalPaid = 0;

	for (const stage of stages) {
		const preset = getStagePresetByKind(stage.kind);
		const totalRub = stage.totalKopecks / 100;
		const advanceReqRub = stage.advanceRequiredKopecks / 100;
		const advancePaidRub = stage.advancePaidKopecks / 100;
		const escrowRub = stage.escrowLockedKopecks / 100;
		const completionRub = stage.completionPaidKopecks / 100;
		const dueRub = Math.max(0, (stage.totalKopecks - (stage.advancePaidKopecks + stage.completionPaidKopecks)) / 100);

		grandTotal += stage.totalKopecks;
		totalAdvance += stage.advancePaidKopecks;
		totalPaid += (stage.advancePaidKopecks + stage.completionPaidKopecks);

		rows.push([
			escapeCsv(stage.stageNumber),
			escapeCsv(stage.title),
			escapeCsv(preset.shortTitle),
			escapeCsv(stage.status),
			escapeCsv(totalRub.toFixed(2)),
			escapeCsv(advanceReqRub.toFixed(2)),
			escapeCsv(advancePaidRub.toFixed(2)),
			escapeCsv(escrowRub.toFixed(2)),
			escapeCsv(completionRub.toFixed(2)),
			escapeCsv(dueRub.toFixed(2)),
			escapeCsv(stage.actNumber || "-"),
			escapeCsv(stage.actSignedAt ? new Date(stage.actSignedAt).toLocaleDateString("ru-RU") : "-"),
			escapeCsv(preset.legalBasisRu),
		]);
	}

	rows.push([]);
	rows.push([
		escapeCsv("ИТОГО ПО ВСЕМ ЭТАПАМ:"),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv((grandTotal / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv((totalAdvance / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(((grandTotal - totalPaid) / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv("ГК РФ ст. 709, 711"),
	]);

	const csvContent = rows.map((r) => r.join(",")).join("\r\n");
	return BOM + csvContent;
}
