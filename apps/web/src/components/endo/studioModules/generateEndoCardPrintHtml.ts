import type { EndoCanalData } from "@dental/shared";

/**
 * Генератор канонического печатного бланка эндодонтической карты А4 (Мандаты 8e, 8b/8zi).
 * Извлечён из EndodonticStudioModal для соблюдения бюджетных ограничений размера файлов.
 */
export function generateEndoCardPrintHtml(params: {
	clinicName: string;
	clinicPhone: string;
	patientName: string;
	doctorName: string;
	toothNumber: number;
	toothAnatomicalName: string;
	stageStamp: string;
	canals: readonly EndoCanalData[];
	irrigation: string;
	rotarySystem: string;
	radiologyControl: string;
	protocolText: string;
	totalRubles: number;
}): string {
	const dateStr = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	const stageLabel = params.stageStamp === "COMPLETED"
		? "Постоянная обтурация каналов (завершено)"
		: params.stageStamp === "TEMP_CAOH2"
			? "Временная обтурация лечебной пастой Ca(OH)2"
			: "Черновик этапа";

	const rowsHtml = params.canals.map((c, i) => `
		<tr>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${i + 1}</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${c.canalName}</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${c.isObliterated ? "Облитерирован" : `${c.workingLengthMm || "—"} мм`}</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${c.apexLocatorReading || "0.0 (Apex)"}</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${c.masterApicalFile || "#25.04"} (${c.taper || ".04"})</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${c.sealer || "AH Plus"}</td>
			<td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${c.obturationTechnique || "Латеральная компакция"}</td>
		</tr>
	`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Эндодонтическая карта зуба #${params.toothNumber} — ${params.patientName}</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 0; padding: 0; line-height: 1.4; }
		h1 { font-size: 15pt; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
		.header { border-bottom: 2px solid var(--primary, #0d9488); padding-bottom: 8px; margin-bottom: 12px; }
		.clinic { font-size: 10pt; color: #475569; margin-bottom: 4px; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 12px; font-size: 10pt; }
		.meta-item { display: flex; }
		.meta-label { font-weight: 600; color: #475569; width: 140px; }
		.meta-val { font-weight: 500; }
		table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
		th { background: #f1f5f9; padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600; text-align: left; }
		.protocol-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 9pt; white-space: pre-wrap; font-family: inherit; margin-top: 10px; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10pt; }
		.sig-block { width: 45%; }
		.sig-line { border-bottom: 1px solid #0f172a; margin-top: 30px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic">${params.clinicName} • Тел: ${params.clinicPhone}</div>
		<h1>ЭНДОДОНТИЧЕСКАЯ КАРТА ЛЕЧЕНИЯ КОРНЕВЫХ КАНАЛОВ</h1>
		<div style="font-weight: 600; color: var(--primary, #0d9488);">Зуб FDI: #${params.toothNumber} (${params.toothAnatomicalName})</div>
	</div>

	<div class="meta-grid">
		<div class="meta-item"><span class="meta-label">Пациент:</span><span class="meta-val">${params.patientName}</span></div>
		<div class="meta-item"><span class="meta-label">Дата процедуры:</span><span class="meta-val">${dateStr}</span></div>
		<div class="meta-item"><span class="meta-label">Лечащий врач:</span><span class="meta-val">${params.doctorName}</span></div>
		<div class="meta-item"><span class="meta-label">Клинический этап:</span><span class="meta-val">${stageLabel}</span></div>
		<div class="meta-item"><span class="meta-label">NiTi-система:</span><span class="meta-val">${params.rotarySystem}</span></div>
		<div class="meta-item"><span class="meta-label">Ирригация:</span><span class="meta-val">${params.irrigation}</span></div>
	</div>

	<h3 style="font-size: 11pt; margin: 12px 0 4px 0;">Протокол калибровки и обтурации каналов</h3>
	<table>
		<thead>
			<tr>
				<th style="width: 30px; text-align: center;">№</th>
				<th>Канал</th>
				<th style="text-align: center;">Длина WL</th>
				<th style="text-align: center;">Апекс</th>
				<th style="text-align: center;">Мастер-файл MAF</th>
				<th>Силер</th>
				<th>Метод обтурации</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div style="font-size: 9.5pt; color: #334155; margin-top: 6px;">
		<strong>Рентгенологический контроль:</strong> ${params.radiologyControl}
	</div>

	<h3 style="font-size: 11pt; margin: 14px 0 4px 0;">Клинический протокол дневника приёма (SOAP)</h3>
	<div class="protocol-box">${params.protocolText}</div>

	<div class="signatures">
		<div class="sig-block">
			<div>Врач-стоматолог: ${params.doctorName}</div>
			<div class="sig-line"></div>
		</div>
		<div class="sig-block">
			<div>Пациент: ${params.patientName}</div>
			<div class="sig-line"></div>
		</div>
	</div>
</body>
</html>`;
}
