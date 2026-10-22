/**
 * homeCarePrintHelper.ts — Печать стандартизированной памятки пациента А4.
 */

import { showToast } from "../GlobalToast";
import type { HygieneHomeCareRecommendations } from "./homeCarePresets";

export function printHomeCareMemo(
	care: HygieneHomeCareRecommendations,
	patientName: string,
	doctorName: string,
): void {
	if (typeof window === "undefined") return;
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Всплывающее окно заблокировано браузером", "warning", 3500);
		return;
	}

	printWindow.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="utf-8" />
			<title>Памятка домашней гигиены — ${patientName}</title>
			<style>
				@page { size: A4 portrait; margin: 15mm; }
				body {
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
					font-size: 11pt;
					line-height: 1.45;
					color: #1a202c;
					margin: 0;
					padding: 0;
				}
				.header {
					border-bottom: 2px solid #0d9488;
					padding-bottom: 8px;
					margin-bottom: 14px;
					display: flex;
					justify-content: space-between;
					align-items: flex-end;
				}
				.logo { font-size: 16pt; font-weight: 900; color: #0d9488; letter-spacing: 0.5px; }
				.sublogo { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold; }
				.meta { font-size: 9pt; color: #475569; text-align: right; }
				h1 { font-size: 13pt; font-weight: 800; margin: 0 0 10px 0; color: #0f172a; }
				.item {
					margin-bottom: 10px;
					padding-bottom: 8px;
					border-bottom: 1px dashed #e2e8f0;
				}
				.item-title {
					font-size: 9pt;
					font-weight: 800;
					color: #0d9488;
					text-transform: uppercase;
					letter-spacing: 0.3px;
					margin-bottom: 2px;
				}
				.item-desc { font-size: 10pt; font-weight: 500; }
				.footer {
					margin-top: 18px;
					padding-top: 10px;
					border-top: 1px solid #cbd5e1;
					font-size: 8.5pt;
					color: #64748b;
					display: flex;
					justify-content: space-between;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<div>
					<div class="logo">DENTE CLINIC</div>
					<div class="sublogo">Индивидуальная карта гигиены и профилактики</div>
				</div>
				<div class="meta">
					<div><strong>Пациент:</strong> ${patientName}</div>
					<div><strong>Дата:</strong> ${new Date().toLocaleDateString("ru-RU")}</div>
				</div>
			</div>

			<h1>РЕКОМЕНДАЦИИ ПО ДОМАШНЕМУ УХОДУ</h1>

			<div class="item">
				<div class="item-title">1. Основная зубная щетка</div>
				<div class="item-desc">${care.toothbrush}</div>
			</div>

			<div class="item">
				<div class="item-title">2. Монопучковая щетка (точечный уход)</div>
				<div class="item-desc">${care.monotufts}</div>
			</div>

			<div class="item">
				<div class="item-title">3. Межзубные ершики (калибр)</div>
				<div class="item-desc">${care.interdentalBrushes}</div>
			</div>

			<div class="item">
				<div class="item-title">4. Зубная нить (флосс)</div>
				<div class="item-desc">${care.floss}</div>
			</div>

			<div class="item">
				<div class="item-title">5. Ирригатор полости рта</div>
				<div class="item-desc">${care.irrigator}</div>
			</div>

			<div class="item">
				<div class="item-title">6. Зубная паста (контроль абразивности)</div>
				<div class="item-desc">${care.toothpaste}</div>
			</div>

			<div class="item">
				<div class="item-title">7. Реминерализующая терапия / Ополаскиватель</div>
				<div class="item-desc">${care.rinseOrGel}</div>
			</div>

			${
				care.customNotes
					? `
			<div class="item">
				<div class="item-title">Особые указания лечащего врача</div>
				<div class="item-desc">${care.customNotes}</div>
			</div>
			`
					: ""
			}

			<div class="footer">
				<div><strong>Лечащий врач:</strong> ${doctorName}</div>
				<div><strong>Следующий осмотр:</strong> через ${care.hygieneRecallMonths} мес.</div>
			</div>

			<script>
				window.onload = function() {
					window.print();
				};
			</script>
		</body>
		</html>
	`);
	printWindow.document.close();
	showToast("Бланк памятки подготовлен для печати", "success", 3000);
}
