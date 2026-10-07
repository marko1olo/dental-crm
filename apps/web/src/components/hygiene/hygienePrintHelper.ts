/**
 * hygienePrintHelper.ts — Формирование и вывод на печать протокола клинических индексов гигиены (Форма 043/у).
 */

import {
	calculateSextantHygieneIndices,
	formatSextantHygieneSummary,
	type CombinedHygieneReport,
	type ExtendedToothAssessment,
	type FedorovVolodkinaResult,
	type PhpResult,
	type SilnessLoeResult,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export function printHygieneProtocol(
	report: CombinedHygieneReport,
	silnessResult: SilnessLoeResult,
	fedorovResult: FedorovVolodkinaResult,
	phpResult: PhpResult,
	assessments: Record<number, ExtendedToothAssessment>,
): void {
	const sextantsResult = calculateSextantHygieneIndices(assessments);
	const sextantSummary = formatSextantHygieneSummary(sextantsResult);
	const printContent = [
		"═══════════════════════════════════════════════════════════════",
		"ПРОТОКОЛ КЛИНИЧЕСКИХ ИНДЕКСОВ ГИГИЕНЫ И ПАРОДОНТА",
		"═══════════════════════════════════════════════════════════════",
		"",
		`Дата осмотра: ${new Date().toLocaleDateString("ru-RU")}`,
		"",
		`1. Индекс OHI-S (Грин-Вермиллион): ${report.ohiS.ratingText}`,
		`   - Зубной налет (DI-S): ${report.ohiS.debrisScore}`,
		`   - Зубной камень (CI-S): ${report.ohiS.calculusScore}`,
		`   - Экспресс-скрининг по 6 секстантам ВОЗ: ${sextantSummary}`,
		`2. Индекс Silness-Löe (Сиднесс-Лоэ): ${silnessResult.ratingText}`,
		`3. Индекс Федорова-Володкиной: ${fedorovResult.ratingText}`,
		`4. Индекс PHP (Подошадлей-Хейли): ${phpResult.ratingText}`,
		`5. Индекс PMA (Парма / воспаление десны): ${report.pma.ratingText}`,
		`6. КПИ Леуса (состояние периодонта): ${report.kpi.ratingText}`,
		"",
		"ЗАКЛЮЧЕНИЕ:",
		report.summaryText043,
		"",
		"───────────────────────────────────────────────────────────────",
		"Врач-стоматолог / гигиенист: ____________________ / ____________",
		"───────────────────────────────────────────────────────────────",
	].join("\n");

	if (typeof window !== "undefined") {
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>Протокол индексов гигиены</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; max-width: 700px; margin: 0 auto; }
						h2 { font-size: 15px; margin-bottom: 12px; border-bottom: 2px solid #333; padding-bottom: 6px; text-transform: uppercase; }
						pre { white-space: pre-wrap; font-size: 12px; line-height: 1.5; font-family: inherit; }
						.footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; }
						@media print { body { padding: 0; } }
					</style>
				</head>
				<body>
					<h2>Протокол клинических индексов гигиены и пародонта</h2>
					<pre>${printContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
					<div class="footer">
						<span>DENTE Dental CRM • Медицинская карта пациента</span>
						<span>Распечатано: ${new Date().toLocaleString("ru-RU")}</span>
					</div>
					<script>
						window.onload = function() { window.print(); window.close(); }
					</script>
				</body>
				</html>
			`);
			printWindow.document.close();
		} else {
			window.print();
		}
	}
	showToast("Протокол отправлен на печать", "info", 3000);
}
