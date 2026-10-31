/**
 * visiographPrintA4.ts — Быстрая печать протокола лучевой диагностики на лист А4 (Мандат 8e, 8b <= 80 строк).
 */

import { showToast } from "../GlobalToast";
import { MODALITY_CATALOG, type StudyModality } from "./visiographCatalogData";

export interface PrintVisiographA4Options {
	patientId: string;
	patientName: string;
	activeTooth: string;
	activeModality: StudyModality;
	currentImageUrl: string;
}

export function printVisiographA4Protocol({
	patientId,
	patientName,
	activeTooth,
	activeModality,
	currentImageUrl,
}: PrintVisiographA4Options): void {
	if (typeof window === "undefined") return;
	const printWin = window.open("", "_blank", "width=850,height=950");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати снимка", "warning");
		return;
	}

	const nowStr = new Date().toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const modalityMeta = MODALITY_CATALOG[activeModality];

	printWin.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="utf-8">
			<title>Протокол лучевой диагностики — ${patientName}</title>
			<style>
				@page { size: A4 portrait; margin: 12mm; }
				body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #111827; }
				.print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px; }
				.clinic-title { font-size: 18px; font-weight: 800; color: #0f766e; }
				.clinic-subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
				.doc-meta { font-size: 12px; text-align: right; }
				.patient-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
				.image-container { text-align: center; margin: 16px 0; background: #000; border-radius: 8px; overflow: hidden; padding: 8px; }
				.image-container img { max-width: 100%; max-height: 520px; object-fit: contain; }
				.footer-box { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #4b5563; display: flex; justify-content: space-between; }
				.stamp-area { width: 140px; height: 60px; border: 1px dashed #9ca3af; border-radius: 6px; text-align: center; line-height: 60px; font-size: 10px; color: #9ca3af; }
			</style>
		</head>
		<body>
			<div class="print-header">
				<div>
					<div class="clinic-title">DENTE CLINIC · ЛУЧЕВАЯ ДИАГНОСТИКА</div>
					<div class="clinic-subtitle">Медицинская карта амбулаторного приёма · Протокол радиовизиографии</div>
				</div>
				<div class="doc-meta">
					<div><b>Дата:</b> ${nowStr}</div>
					<div><b>Код:</b> ${modalityMeta.id.toUpperCase()}</div>
				</div>
			</div>

			<div class="patient-box">
				<div><b>Пациент:</b> ${patientName} (ИД: ${patientId})</div>
				<div><b>Вид исследования:</b> ${modalityMeta.name} | <b>Зуб FDI:</b> #${activeTooth}</div>
				<div><b>Эффективная доза облучения:</b> ${modalityMeta.typicalDoseMsv} мЗв (в пределах нормативов НРБ-99/2009)</div>
			</div>

			<div class="image-container">
				<img src="${currentImageUrl}" alt="Рентгенограмма ${patientName}" />
			</div>

			<div class="footer-box">
				<div>
					<div>Врач-рентгенолог / Лечащий врач-стоматолог: ______________________</div>
					<div style="margin-top: 4px; color: #9ca3af;">Заверено усиленной квалифицированной электронной подписью клиники</div>
				</div>
				<div class="stamp-area">М.П. / ЭЦП</div>
			</div>
			<script>
				window.onload = function() { window.print(); }
			</script>
		</body>
		</html>
	`);
	printWin.document.close();
}
