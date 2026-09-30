/**
 * DENTE CRM — CBCT Clinical Planning Protocol HTML/A4 Print Template
 * Standards: Misch CE (2008), Buser et al. (2004), Order 804n / Form 043/u
 *
 * Implements:
 * 1. Sanitized HTML escaping for clinical metadata.
 * 2. Structured 043/u outpatient diary renderer with clinical unit normalization (Н·см).
 * 3. Responsive, magazine-grade A4 printable HTML/CSS report with:
 *    - Clinic branding, vector logo, and 152-FZ anonymization.
 *    - Patient, study, and target tooth badges.
 *    - 4-Slice MPR matrix (Axial, Coronal, Sagittal, Cross-Section/Panoramic) with calibrated 10mm rulers.
 *    - Carl Misch D1-D4 bone classification & density tables.
 *    - Implant fixture dimensions, insertion torque, and ISQ stability predictions.
 *    - Mandatory Inferior Alveolar Nerve (IAN) clearance and 2.0 mm safety corridor banner.
 *    - Doctor and diagnostic radiology verification signatures.
 */

import {
	type CbctReportData,
	type CbctReportRenderOptions,
	type CbctReportImplantRow,
	DEFAULT_CLINIC_VECTOR_LOGO_SVG,
} from "./cbctExportEngine";

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function renderStructuredDiary043(text: string): string {
	const lines = text.split("\n");
	const output: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || /^={4,}$/.test(line) || /^-{4,}$/.test(line)) {
			continue;
		}
		// Clean line: purge emojis, unify torque units and warnings
		const cleanLine = line
			.replace(/🏥\s*/g, "")
			.replace(/🌱\s*/g, "")
			.replace(/⚠️\s*ПРИБЛИЖЕНИЕ/g, "ВНИМАНИЕ: ЗОНА ПРИБЛИЖЕНИЯ К НЕРВУ")
			.replace(/⚠️\s*/g, "")
			.replace(/⛔\s*/g, "")
			.replace(/✅\s*/g, "")
			.replace(/N[·*]?cm/gi, "Н·см")
			.replace(/Н[·*]см/gi, "Н·см")
			.replace(/Нсм/gi, "Н·см")
			.replace(/Н\s+см/gi, "Н·см");

		// Document Title
		if (cleanLine.includes("ПРОТОКОЛ ОПЕРАЦИИ") || cleanLine.includes("ФОРМА 043/У")) {
			output.push(`<div style="font-weight:800; color:#0f172a; margin-bottom:2px; font-size:9px;">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Patient / Clinic meta line
		if (cleanLine.startsWith("Пациент:")) {
			output.push(`<div class="diary-meta-row">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Numbered section titles (e.g. "1. ВЫБОР...", "2. АНАТОМИЧЕСКАЯ...", "3. Зуб...", "4. ЗАКЛЮЧЕНИЕ...")
		if (/^\d+\.\s/.test(cleanLine)) {
			output.push(`<div class="diary-section-header">${escapeHtml(cleanLine)}</div>`);
			continue;
		}
		// Bullet items (e.g. "   - Система: ...", "- Класс: ...", "• ...")
		if (cleanLine.startsWith("- ") || cleanLine.startsWith("• ") || cleanLine.startsWith("– ")) {
			const cleanItem = cleanLine.replace(/^[-•–]\s*/, "");
			output.push(`<div class="diary-item">${escapeHtml(cleanItem)}</div>`);
			continue;
		}
		// Default paragraph line
		output.push(`<div style="margin-bottom: 1.5px;">${escapeHtml(cleanLine)}</div>`);
	}

	return output.join("");
}

/**
 * Generates responsive, high-grade HTML/CSS print protocol for A4 output.
 */
export function renderCbctReportHtml(data: CbctReportData, options: CbctReportRenderOptions = {}): string {
	const { patient, targetToothFdi, snapshots, implant, bone, stability, nerve, clinicalRecommendations, diary043Text, implantsTable } = data;

	const isTonerSaving = options.tonerSaving ?? (data.tonerSavingEnabled ?? true);
	const isAnon = Boolean(options.isAnonymized ?? patient.isAnonymized);
	const fovText = options.fov || patient.fov || "8×8 см";
	const wlText =
		options.windowWidth != null && options.windowLevel != null
			? `W:${options.windowWidth} L:${options.windowLevel} HU`
			: patient.windowWidth != null && patient.windowLevel != null
				? `W:${patient.windowWidth} L:${patient.windowLevel} HU`
				: "W:4400 L:1300 HU";
	const clinicLogo = patient.clinicLogoSvg || options.clinicLogoSvg || DEFAULT_CLINIC_VECTOR_LOGO_SVG;

	const axialImg = snapshots.axial?.dataUrl;
	const coronalImg = snapshots.coronal?.dataUrl;
	const panoImg = snapshots.panoramic?.dataUrl;
	const crossSectionImg = snapshots.crossSection?.dataUrl;
	const sagittalImg = snapshots.sagittal?.dataUrl;

	const effectiveImplantsTable: readonly CbctReportImplantRow[] =
		implantsTable && implantsTable.length > 0
			? implantsTable
			: [
					{
						toothFdi: targetToothFdi,
						brandName: implant.brandName,
						lineName: implant.lineName,
						diameterMm: implant.diameterMm,
						lengthMm: implant.lengthMm,
						platformDiameterMm: implant.platformDiameterMm,
						apexDiameterMm: implant.apexDiameterMm,
						articleNumber: implant.articleNumber,
						angulationDeg: implant.angulationDeg,
						entryDepthMm: implant.entryDepthMm,
						mischClass: bone.mischClass,
						boneDensityHU: bone.overallMeanHU,
						expectedTorqueNcm: stability.expectedTorqueNcm,
						minTorqueNcm: stability.minTorqueNcm,
						maxTorqueNcm: stability.maxTorqueNcm,
						distanceToIanMm: nerve?.netClearanceToCanalWallMm,
						ianSafetyStatus: nerve?.safetyStatus ?? "na",
						ianMessageRu: nerve?.clinicalMessageRu,
						immediateLoading: stability.isImmediateLoadingEligible,
					},
				];

	const mischBadgeColor =
		bone.mischClass === "D1"
			? "#3b82f6"
			: bone.mischClass === "D2"
				? "#10b981"
				: bone.mischClass === "D3"
					? "#f59e0b"
					: "#ef4444";

	const nerveStatusColor =
		nerve?.safetyStatus === "safe"
			? "#10b981"
			: nerve?.safetyStatus === "warning"
				? "#f59e0b"
				: "#ef4444";

	const formatSurgeonSigner = (name?: string): string => {
		const trimmed = name?.trim();
		if (
			!trimmed ||
			trimmed === "Врач-хирург-имплантолог" ||
			trimmed === "Врач-стоматолог-хирург-имплантолог" ||
			trimmed === "Хирург-имплантолог"
		) {
			return "Врач-стоматолог-хирург-имплантолог";
		}
		if (trimmed.startsWith("Врач-стоматолог-хирург-имплантолог:")) {
			return trimmed;
		}
		if (trimmed.startsWith("Врач-стоматолог-хирург-имплантолог")) {
			return trimmed.replace(/^Врач-стоматолог-хирург-имплантолог\s*/, "Врач-стоматолог-хирург-имплантолог: ");
		}
		return `Врач-стоматолог-хирург-имплантолог: ${trimmed}`;
	};
	const surgeonSigner = formatSurgeonSigner(patient.doctorName);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Клинический протокол КЛКТ — ${escapeHtml(patient.patientName)} (FDI #${targetToothFdi})</title>
<style>
  @page { size: A4 portrait; margin: 5mm 8mm; }
  @media print {
    @page { size: A4 portrait; margin: 5mm 8mm; }
    html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cbct-report-page { width: 100% !important; max-height: 275mm !important; page-break-inside: avoid !important; page-break-after: auto !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; font-size: 10px; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cbct-report-page { width: 100%; max-width: 194mm; max-height: 275mm; page-break-inside: avoid; margin: 0 auto; }
  .page { width: 100%; max-width: 194mm; margin: 0 auto; }
  /* Header */
  .header-table { width: 100%; border-bottom: 2px solid #0284c7; padding-bottom: 3px; margin-bottom: 4px; }
  .clinic-title { font-size: 12.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px; }
  .clinic-sub { font-size: 8px; color: #64748b; }
  .doc-title { font-size: 10.5px; font-weight: 800; color: #0369a1; text-align: right; text-transform: uppercase; }
  .doc-meta { font-size: 8px; color: #64748b; text-align: right; }
  /* Patient & Tooth Grid */
  .info-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 6px; margin-bottom: 4px; }
  .info-group { display: flex; gap: 8px; align-items: center; }
  .info-item { font-size: 9px; }
  .info-item b { color: #0f172a; }
  .right-badges { display: flex; align-items: center; gap: 6px; }
  .tooth-pill { background: #0284c7; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 10px; letter-spacing: 0.5px; }
  /* 4-Slice MPR Matrix (2x2) */
  .mpr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; }
  .mpr-card { background: #090d16; border: 1px solid #334155; border-radius: 4px; overflow: hidden; position: relative; height: 105px; max-height: 105px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .mpr-card img { width: 100%; height: 100%; object-fit: contain; }
  .mpr-label { position: absolute; top: 3px; left: 3px; background: rgba(15, 23, 42, 0.9); color: #38bdf8; font-size: 7.5px; font-weight: 700; padding: 1.5px 4px; border-radius: 3px; border: 0.5px solid #0284c7; }
  .mpr-ruler-badge { position: absolute; bottom: 3px; left: 3px; background: rgba(15, 23, 42, 0.9); color: #38bdf8; font-size: 7px; font-family: monospace; font-weight: 700; padding: 1px 4px; border-radius: 2px; border: 0.5px solid #0284c7; }
  .mpr-empty { color: #94a3b8; font-size: 8px; text-align: center; padding: 10px; }
  /* Structured Implants Table */
  .table-implants { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .table-implants th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 2px 4px; border-bottom: 1px solid #cbd5e1; font-size: 8px; text-transform: uppercase; }
  .table-implants td { padding: 2px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 8.5px; }
  .table-implants tr:nth-child(even) { background: #f8fafc; }
  .misch-pill { display: inline-block; padding: 1px 3px; border-radius: 3px; font-weight: 800; font-size: 7.5px; color: #ffffff; margin-right: 3px; }
  /* Two Column Data Tables */
  .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; }
  .section-box { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
  .section-header { background: #f1f5f9; padding: 2px 5px; font-size: 9px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .table-clean { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .table-clean tr:nth-child(even) { background: #f8fafc; }
  .table-clean td { padding: 2px 4px; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  .table-clean td:first-child { color: #64748b; width: 55%; }
  .table-clean td:last-child { font-weight: 600; color: #0f172a; text-align: right; }
  /* Nerve & Safety Banner */
  .safety-banner { border-radius: 4px; padding: 2px 5px; margin-bottom: 4px; font-size: 8.5px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${nerveStatusColor}; background: #f8fafc; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  /* Recommendations & Form 043 */
  .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 5px; margin-bottom: 4px; font-size: 8.5px; }
  .notes-box h4 { font-size: 8.5px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .notes-box ul { list-style: none; padding-left: 0; }
  .notes-box li { margin-bottom: 1px; color: #334155; }
  /* Form 043/u Proportional Medical Typography */
  .diary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8.5px; line-height: 1.25; color: #334155; }
  .diary-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 2px; }
  .diary-title { font-size: 8.5px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 4px; }
  .diary-badge { background: #e0f2fe; color: #0369a1; font-size: 7px; font-weight: 700; padding: 1px 3px; border-radius: 3px; border: 0.5px solid #bae6fd; text-transform: uppercase; }
  .diary-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8.5px; line-height: 1.25; color: #334155; }
  .diary-section-header { font-weight: 700; color: #0369a1; margin-top: 2px; margin-bottom: 1px; font-size: 8.5px; }
  .diary-item { padding-left: 8px; position: relative; margin-bottom: 0.5px; font-size: 8.5px; }
  .diary-item::before { content: "•"; position: absolute; left: 1px; color: #0284c7; font-weight: bold; }
  .diary-meta-row { font-size: 7.5px; color: #64748b; margin-bottom: 1.5px; }
  /* Signatures */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 8.5px; }
  .sig-line { border-bottom: 1px solid #94a3b8; margin-top: 8px; margin-bottom: 2px; }
  .sig-sub { font-size: 7.5px; color: #64748b; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page cbct-report-page">
  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="width: 40px; vertical-align: middle;">
        ${clinicLogo}
      </td>
      <td style="vertical-align: middle; padding-left: 8px;">
        <div class="clinic-title">${escapeHtml(options.customClinicTitle || patient.clinicName || "Стоматологический центр DENTE")}</div>
        <div class="clinic-sub">Отделение цифровой имплантологии и челюстно-лицевой рентгенодиагностики</div>
      </td>
      <td style="vertical-align: middle; text-align: right;">
        <div class="doc-title">Протокол 3D КЛКТ-планирования</div>
        <div class="doc-meta">Номенклатура МЗ РФ A16.07.054 • Дата: ${escapeHtml(isAnon ? "[СКРЫТО]" : (patient.reportDate || patient.studyDate || ""))}</div>
      </td>
    </tr>
  </table>

  <!-- Patient & Target Tooth Bar -->
  <div class="info-bar">
    <div class="info-group">
      <div class="info-item">Пациент: <b>${escapeHtml(patient.patientName)}</b></div>
      <div class="info-item">Карта: <b>${escapeHtml(patient.cardRecordNumber || "043/у")}</b></div>
      <div class="info-item">Врач: <b>${escapeHtml((patient.doctorName || "Лечащий врач").trim().replace(/^Врач[-:\s]*/i, ""))}</b></div>
      <div class="info-item">FOV: <b>${escapeHtml(fovText)}</b></div>
      <div class="info-item">HU: <b>${escapeHtml(wlText)}</b></div>
    </div>
    <div class="right-badges">
      ${isAnon ? `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:1px 5px; border-radius:3px; font-weight:700; font-size:7.5px; text-transform:uppercase;">152-ФЗ: Деперсонализировано</span>` : ""}
      <div class="tooth-pill">ЗУБ FDI #${targetToothFdi}</div>
    </div>
  </div>

  <!-- 4-Slice MPR Visual Matrix -->
  <div class="mpr-grid">
    <div class="mpr-card">
      <div class="mpr-label">1. Аксиальный срез (Z)</div>
      ${axialImg ? `<img src="${axialImg}" alt="Axial MPR" />` : `<div class="mpr-empty">Аксиальный срез</div>`}
      <div class="mpr-ruler-badge">10 мм • 1 мм/дел</div>
    </div>
    <div class="mpr-card">
      <div class="mpr-label">${coronalImg ? "2. Корональный срез (Y)" : "2. Панорамная реконструкция (ОПТГ)"}</div>
      ${coronalImg ? `<img src="${coronalImg}" alt="Coronal MPR" />` : panoImg ? `<img src="${panoImg}" alt="Panorama OPG" />` : `<div class="mpr-empty">Панорамная реконструкция</div>`}
      <div class="mpr-ruler-badge">10 мм • 1 мм/дел</div>
    </div>
    <div class="mpr-card">
      <div class="mpr-label">${coronalImg ? "3. Сагиттальный срез (X)" : `3. Кросс-секция ложа FDI #${targetToothFdi}`}</div>
      ${coronalImg ? (sagittalImg ? `<img src="${sagittalImg}" alt="Sagittal MPR" />` : `<div class="mpr-empty">Сагиттальный срез</div>`) : crossSectionImg ? `<img src="${crossSectionImg}" alt="Cross Section" />` : `<div class="mpr-empty">Кросс-секция ложа</div>`}
      <div class="mpr-ruler-badge">10 мм • 1 мм/дел</div>
    </div>
    <div class="mpr-card">
      <div class="mpr-label">${coronalImg ? "4. 3D-реконструкция / Панорама" : "4. Косой сагиттальный срез"}</div>
      ${coronalImg ? ((panoImg || crossSectionImg) ? `<img src="${panoImg || crossSectionImg}" alt="Panorama/3D" />` : `<div class="mpr-empty">3D/Панорама</div>`) : (sagittalImg ? `<img src="${sagittalImg}" alt="Sagittal MPR" />` : `<div class="mpr-empty">Сагиттальный срез</div>`)}
      <div class="mpr-ruler-badge">10 мм • 1 мм/дел</div>
    </div>
  </div>

  <!-- Structured Implants Registry Table -->
  <div class="section-box">
    <div class="section-header">
      <span>Структурированная таблица установленных имплантатов</span>
      <span style="font-size: 8.5px; color: #64748b;">Всего запланировано: ${effectiveImplantsTable.length} шт.</span>
    </div>
    <table class="table-implants">
      <thead>
        <tr>
          <th style="width: 11%; text-align: center;">Зуб FDI</th>
          <th style="width: 22%;">Система / Бренд</th>
          <th style="width: 17%;">Размер (Ø × L)</th>
          <th style="width: 16%;">Плотность HU (Misch)</th>
          <th style="width: 16%;">Первичный торк</th>
          <th style="width: 10%;">Дистанция IAN</th>
          <th style="width: 8%; text-align: center;">Безопасность</th>
        </tr>
      </thead>
      <tbody>
        ${effectiveImplantsTable
					.map((row) => {
						const rowMischColor =
							row.mischClass === "D1"
								? "#3b82f6"
								: row.mischClass === "D2"
									? "#10b981"
									: row.mischClass === "D3"
										? "#f59e0b"
										: "#ef4444";
						const ianColor =
							row.ianSafetyStatus === "safe"
								? "#10b981"
								: row.ianSafetyStatus === "warning"
									? "#f59e0b"
									: row.ianSafetyStatus === "danger"
										? "#ef4444"
										: "#64748b";
						const ianLabel =
							row.ianSafetyStatus === "safe"
								? "Безопасно"
								: row.ianSafetyStatus === "warning"
									? "Внимание"
									: row.ianSafetyStatus === "danger"
										? "Опасно"
										: "N/A";
						return `
        <tr>
          <td style="font-weight: 800; color: #0284c7; text-align: center;">FDI #${row.toothFdi}</td>
          <td><b>${escapeHtml(row.brandName)}</b> <span style="color:#64748b;">(${escapeHtml(row.lineName || "")})</span></td>
          <td><b>Ø${row.diameterMm.toFixed(1)} × ${row.lengthMm.toFixed(1)} мм</b></td>
          <td>
            <span class="misch-pill" style="background:${rowMischColor};">${row.mischClass}</span>
            <span>${row.boneDensityHU} HU</span>
          </td>
          <td>
            <b>${row.expectedTorqueNcm} Н·см</b>
            ${row.minTorqueNcm !== undefined && row.maxTorqueNcm !== undefined ? `<span style="color:#64748b; font-size:8.5px;">(${row.minTorqueNcm}–${row.maxTorqueNcm})</span>` : ""}
          </td>
          <td>
            ${row.distanceToIanMm !== undefined ? `<b>${row.distanceToIanMm.toFixed(1)} мм</b>` : `<span style="color:#94a3b8;">N/A (В/Ч)</span>`}
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: ${ianColor};">${ianLabel}</span>
          </td>
        </tr>`;
					})
					.join("")}
      </tbody>
    </table>
  </div>

  <!-- Clinical Data Tables (2 Columns) -->
  <div class="tables-grid">
    <!-- Left Column: Misch Bone Density & Alveolar Ridge -->
    <div class="section-box">
      <div class="section-header">
        <span>Плотность кости (Carl E. Misch)</span>
        <span style="background:${mischBadgeColor}; color:#fff; padding:1px 5px; border-radius:3px; font-weight:800; font-size:9px;">
          ${bone.mischClass}
        </span>
      </div>
      <table class="table-clean">
        <tr><td>Классификация</td><td>${escapeHtml(bone.classNameRu)}</td></tr>
        <tr><td>Кортикальный слой (Coronal 20%)</td><td>${bone.coronalCrestalHU} HU</td></tr>
        <tr><td>Губчатое ядро (Trabecular 60%)</td><td>${bone.trabecularCoreHU} HU</td></tr>
        <tr><td>Апикальная опора (Apical 20%)</td><td>${bone.apicalBaseHU} HU</td></tr>
        <tr><td>Средневзвешенная плотность</td><td><b>${bone.overallMeanHU} HU</b></td></tr>
        <tr><td>Ширина альвеолярного гребня</td><td>${typeof bone.ridgeWidthMm === "number" ? `${bone.ridgeWidthMm.toFixed(1)} мм` : "Не измерялась (—)"}</td></tr>
        <tr><td>Высота альвеолярного гребня</td><td>${typeof bone.ridgeHeightMm === "number" ? `${bone.ridgeHeightMm.toFixed(1)} мм` : "Не измерялась (—)"}</td></tr>
        <tr><td>Остаточная щечная пластинка</td><td>${typeof bone.residualBuccalBoneMm === "number" ? `${bone.residualBuccalBoneMm.toFixed(1)} мм ${bone.residualBuccalBoneMm < 1.5 ? "(< 1.5 мм — Дефицит)" : "(Норма)"}` : "—"}</td></tr>
        <tr><td>Остаточная язычная пластинка</td><td>${typeof bone.residualLingualBoneMm === "number" ? `${bone.residualLingualBoneMm.toFixed(1)} мм` : "—"}</td></tr>
        <tr><td>Потребность в НКР/GBR</td><td>${bone.requiresGbrAugmentation ? "<b>Требуется аугментация</b>" : "Не требуется"}</td></tr>
      </table>
    </div>

    <!-- Right Column: Implant Specs & Biomechanical Stability -->
    <div class="section-box">
      <div class="section-header">
        <span>Параметры имплантата & Биомеханика</span>
        <span style="color:#0284c7; font-weight:700; font-size:9px;">Ø${implant.diameterMm} x ${implant.lengthMm} мм</span>
      </div>
      <table class="table-clean">
        <tr><td>Система / Бренд</td><td>${escapeHtml(implant.brandName)} (${escapeHtml(implant.lineName)})</td></tr>
        <tr><td>Артикул / Модель</td><td>${escapeHtml(implant.articleNumber || "Стандарт")}</td></tr>
        <tr><td>Габариты фикстуры</td><td>Ø${implant.diameterMm.toFixed(1)} мм • L ${implant.lengthMm.toFixed(1)} мм</td></tr>
        <tr><td>Угол наклона оси / Погружение</td><td>${implant.angulationDeg.toFixed(1)}° • ${implant.entryDepthMm.toFixed(1)} мм</td></tr>
        <tr><td>Расчетный торк фиксации</td><td><b>${stability.expectedTorqueNcm} Н·см</b> (${stability.minTorqueNcm}–${stability.maxTorqueNcm} Н·см)</td></tr>
        <tr><td>Прогноз стабильности ISQ</td><td><b>${stability.expectedIsq} ISQ</b> (Osstell)</td></tr>
        <tr><td>Протокол нагрузки</td><td>${stability.isImmediateLoadingEligible ? "<b>Немедленная нагрузка (Торк >= 35)</b>" : "Двухэтапный протокол"}</td></tr>
        <tr><td>Режим остеотомии / Сверление</td><td>${escapeHtml(stability.recommendedDrillingRpm)}</td></tr>
        <tr><td>Период остеоинтеграции</td><td>${stability.healingPeriodWeeks} недель</td></tr>
      </table>
    </div>
  </div>

  <!-- Mandatory Mandibular Nerve / Anatomical Clearance Banner -->
  ${
		nerve
			? `
  <div class="safety-banner">
    <div>
      <b>Анатомический контроль (N. alveolaris inferior):</b> 
      Дистанция до канала: <b>${nerve.netClearanceToCanalWallMm.toFixed(1)} мм</b> (Буфер 2.0 мм: <b>${nerve.netClearanceToSafetyCorridorMm >= 0 ? `+${nerve.netClearanceToSafetyCorridorMm.toFixed(1)} мм` : `${nerve.netClearanceToSafetyCorridorMm.toFixed(1)} мм`}</b>).
      <span>${escapeHtml(nerve.clinicalMessageRu)}</span>
    </div>
    <div style="font-weight:800; color:${nerveStatusColor}; text-transform:uppercase;">
      ${nerve.safetyStatus === "safe" ? "БЕЗОПАСНО" : nerve.safetyStatus === "warning" ? "ВНИМАНИЕ" : "ОПАСНО"}
    </div>
  </div>
  `
			: ""
	}

  <!-- Clinical Recommendations & Surgery Protocol -->
  ${
		clinicalRecommendations && clinicalRecommendations.length > 0
			? `
  <div class="notes-box">
    <h4>Клинические рекомендации хирургу:</h4>
    <ul>
      ${clinicalRecommendations.map((r) => `<li>• ${escapeHtml(r)}</li>`).join("")}
    </ul>
  </div>
  `
			: ""
	}

  <!-- Form 043/u Diary Record -->
  ${
		diary043Text
			? `
  <div class="diary-card">
    <div class="diary-header">
      <div class="diary-title">
        <span>Запись для медицинской карты:</span>
        <span class="diary-badge">Приказ МЗ РФ № 804н / 043-у</span>
      </div>
      <div style="font-size: 8.5px; color: #64748b;">Медицинский протокол</div>
    </div>
    <div class="diary-content">
      ${renderStructuredDiary043(diary043Text)}
    </div>
  </div>
  `
			: ""
	}

  <!-- Signatures -->
  <div class="sig-grid">
    <div>
      <div>Оперирующий хирург-имплантолог:</div>
      <div class="sig-line"></div>
      <div class="sig-sub">
        <span>(Подпись)</span>
        <span>${escapeHtml(surgeonSigner)}</span>
      </div>
    </div>
    <div>
      <div>Врач-рентгенолог / КЛКТ-диагност:</div>
      <div class="sig-line"></div>
      <div class="sig-sub">
        <span>(Подпись / М.П.)</span>
        <span>Дата: ${escapeHtml(patient.reportDate || "")}</span>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
