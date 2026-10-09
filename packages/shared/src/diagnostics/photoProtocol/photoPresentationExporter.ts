/**
 * photoPresentationExporter.ts — Layer 2: Clinical Report, HTML Presentation & ZTL Lab Order Exporter (@dental/shared)
 *
 * Compliant with:
 * - Приказ Минздрава РФ № 834н (Медицинская карта стоматологического пациента)
 * - ABO (American Board of Orthodontics) presentation guidelines
 * - Зуботехнические протоколы передачи цвета и формы зубов в лабораторию (ЗТЛ)
 */

import type {
	OrthodonticPhotoSession,
	OrthodonticReportPayload,
	DentalLabOrderPhotoExport,
	DentalPhotoShot,
} from "./types.js";
import {
	ORTHODONTIC_8_ANGLES,
	ORTHODONTIC_STAGE_METADATA,
	ANGLE_CLASS_LABELS_RU,
	SMILE_ARC_LABELS_RU,
	MIDLINE_SHIFT_LABELS_RU,
	calculateOrthodonticProtocolCompleteness,
} from "./shotAngleClassifier.js";
import { buildOrthodonticComparisonSeries } from "./beforeAfterComparator.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. REPORT BUILDER & HTML ESCAPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds structured diagnostic DTO for orthodontic reporting.
 */
export function generateOrthodonticClinicalReport(
	session: OrthodonticPhotoSession,
): OrthodonticReportPayload {
	const completeness = calculateOrthodonticProtocolCompleteness(session);
	const stageMeta = ORTHODONTIC_STAGE_METADATA[session.stage];
	const sessionDateObj = new Date(session.sessionDate);
	const formattedDateRu = isNaN(sessionDateObj.getTime())
		? session.sessionDate
		: new Intl.DateTimeFormat("ru-RU", {
				day: "2-digit",
				month: "long",
				year: "numeric",
			}).format(sessionDateObj);

	return {
		session,
		completeness,
		stageMeta,
		generatedAt: new Date().toISOString(),
		formattedDateRu,
	};
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL PRESENTATION HTML BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders an official, responsive, high-grade printable HTML orthodontic photo-protocol presentation
 * suitable for patient consults, treatment plan appendices, or PDF printing.
 */
export function renderOrthodonticPresentationHtml(
	session: OrthodonticPhotoSession,
	comparisonSession?: OrthodonticPhotoSession,
): string {
	const report = generateOrthodonticClinicalReport(session);
	const f = session.findings;

	let comparisonHtml = "";
	if (comparisonSession) {
		const series = buildOrthodonticComparisonSeries(comparisonSession, session);
		const compBeforeMeta = ORTHODONTIC_STAGE_METADATA[comparisonSession.stage];
		const compAfterMeta = ORTHODONTIC_STAGE_METADATA[session.stage];

		const rowsHtml = series.pairs
			.filter((p) => p.beforePhoto?.imageUrl || p.afterPhoto?.imageUrl)
			.map((p) => {
				const beforeSrc = p.beforePhoto?.imageUrl || "";
				const afterSrc = p.afterPhoto?.imageUrl || "";

				return `
					<div class="comp-card">
						<div class="comp-title">${escapeHtml(p.angleDefinition.titleRu)} (${escapeHtml(p.angleDefinition.shortLabelRu)})</div>
						<div class="comp-photos">
							<div class="comp-photo-box">
								<div class="comp-badge comp-badge-before">${escapeHtml(compBeforeMeta.shortLabelRu)}</div>
								${
									beforeSrc
										? `<img src="${beforeSrc}" alt="До: ${escapeHtml(p.angleDefinition.titleRu)}" class="comp-img" />`
										: `<div class="comp-empty">Нет снимка</div>`
								}
							</div>
							<div class="comp-photo-box">
								<div class="comp-badge comp-badge-after">${escapeHtml(compAfterMeta.shortLabelRu)}</div>
								${
									afterSrc
										? `<img src="${afterSrc}" alt="После: ${escapeHtml(p.angleDefinition.titleRu)}" class="comp-img" />`
										: `<div class="comp-empty">Нет снимка</div>`
								}
							</div>
						</div>
					</div>
				`;
			})
			.join("\n");

		comparisonHtml = `
			<section class="section">
				<h2 class="section-title">Сравнительный анализ динамики (До / После — ${series.daysBetweenSessions} дн.)</h2>
				<div class="comp-grid">
					${rowsHtml}
				</div>
			</section>
		`;
	}

	const gridSlotsHtml = ORTHODONTIC_8_ANGLES.map((angle) => {
		const slot = session.slots[angle.id];
		const imgUrl = slot?.imageUrl;

		return `
			<div class="photo-card">
				<div class="photo-header">
					<span class="photo-seq">${angle.sequenceNumber}</span>
					<span class="photo-label">${escapeHtml(angle.titleRu)}</span>
				</div>
				<div class="photo-viewport">
					${
						imgUrl
							? `<img src="${imgUrl}" alt="${escapeHtml(angle.titleRu)}" class="photo-img" style="transform: rotate(${slot.rotationDegrees || 0}deg) scale(${slot.zoom || 1}) ${slot.flipHorizontal ? "scaleX(-1)" : ""} ${slot.flipVertical ? "scaleY(-1)" : ""}; filter: brightness(${(slot.brightness || 0) + 100}%) contrast(${(slot.contrast || 0) + 100}%);" />`
							: `<div class="photo-placeholder">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${angle.svgPath}"></path></svg>
									<span class="placeholder-text">${escapeHtml(angle.shortLabelRu)}</span>
									<span class="placeholder-sub">Ракурс не загружен</span>
							   </div>`
					}
				</div>
				<div class="photo-footer">
					<span class="photo-cat">${angle.category === "intraoral" ? "Внутриротовой" : "Внеротовой"}</span>
					<span class="photo-equip">${escapeHtml(angle.recommendedAspectRatio)}</span>
				</div>
			</div>
		`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Ортодонтический фотопротокол — ${escapeHtml(session.patientName)}</title>
	<style>
		:root {
			--paper: #ffffff;
			--paper-subtle: #f8fafc;
			--ink: #0f172a;
			--muted: #64748b;
			--line: #e2e8f0;
			--teal: #0d9488;
			--blue: #2563eb;
			--amber: #d97706;
			--emerald: #059669;
			--card-border: #cbd5e1;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background-color: var(--paper-subtle);
			color: var(--ink);
			line-height: 1.5;
			padding: 24px;
		}
		.container {
			max-width: 1100px;
			margin: 0 auto;
			background: var(--paper);
			border: 1px solid var(--line);
			border-radius: 16px;
			padding: 32px;
			box-shadow: 0 4px 20px rgba(0,0,0,0.05);
		}
		.header-banner {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid var(--line);
			padding-bottom: 20px;
			margin-bottom: 24px;
		}
		.clinic-title { font-size: 20px; font-weight: 800; color: var(--teal); letter-spacing: -0.02em; }
		.doc-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-top: 4px; }
		.stage-badge {
			display: inline-block;
			padding: 6px 14px;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 700;
			color: #ffffff;
			background-color: ${report.stageMeta.color};
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 16px;
			background: var(--paper-subtle);
			padding: 16px 20px;
			border-radius: 12px;
			border: 1px solid var(--line);
			margin-bottom: 28px;
		}
		.meta-item { display: flex; flex-direction: column; }
		.meta-label { font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; }
		.meta-value { font-size: 14px; font-weight: 700; color: var(--ink); margin-top: 2px; }

		.section { margin-bottom: 32px; }
		.section-title {
			font-size: 16px;
			font-weight: 800;
			color: var(--ink);
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			gap: 8px;
			border-left: 4px solid var(--teal);
			padding-left: 10px;
		}

		/* 8-Shot Grid */
		.photo-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 16px;
		}
		@media (max-width: 900px) {
			.photo-grid { grid-template-columns: repeat(2, 1fr); }
		}
		@media (max-width: 500px) {
			.photo-grid { grid-template-columns: 1fr; }
		}
		.photo-card {
			background: var(--paper);
			border: 1px solid var(--card-border);
			border-radius: 12px;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		.photo-header {
			background: var(--paper-subtle);
			padding: 8px 12px;
			font-size: 12px;
			font-weight: 700;
			border-bottom: 1px solid var(--line);
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.photo-seq {
			background: var(--ink);
			color: #fff;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			font-size: 10px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.photo-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.photo-viewport {
			height: 180px;
			background: #1e293b;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			position: relative;
		}
		.photo-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.photo-placeholder {
			color: #94a3b8;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 6px;
			text-align: center;
			padding: 12px;
		}
		.placeholder-text { font-size: 12px; font-weight: 600; color: #cbd5e1; }
		.placeholder-sub { font-size: 10px; color: #64748b; }
		.photo-footer {
			padding: 6px 12px;
			background: var(--paper-subtle);
			border-top: 1px solid var(--line);
			display: flex;
			justify-content: space-between;
			font-size: 11px;
			color: var(--muted);
		}

		/* Findings Table */
		.findings-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 13px;
			background: var(--paper);
			border: 1px solid var(--line);
			border-radius: 8px;
			overflow: hidden;
		}
		.findings-table th, .findings-table td {
			padding: 10px 14px;
			border-bottom: 1px solid var(--line);
			text-align: left;
		}
		.findings-table th {
			background: var(--paper-subtle);
			font-weight: 700;
			color: var(--muted);
			font-size: 11px;
			text-transform: uppercase;
		}
		.findings-table tr:last-child td { border-bottom: none; }

		/* Comparison */
		.comp-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 16px;
		}
		@media (max-width: 700px) { .comp-grid { grid-template-columns: 1fr; } }
		.comp-card {
			border: 1px solid var(--card-border);
			border-radius: 12px;
			padding: 12px;
			background: var(--paper-subtle);
		}
		.comp-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
		.comp-photos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
		.comp-photo-box {
			height: 140px;
			background: #0f172a;
			border-radius: 8px;
			overflow: hidden;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.comp-badge {
			position: absolute;
			top: 6px;
			left: 6px;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 700;
			color: #fff;
			z-index: 2;
		}
		.comp-badge-before { background: var(--blue); }
		.comp-badge-after { background: var(--emerald); }
		.comp-img { width: 100%; height: 100%; object-fit: cover; }
		.comp-empty { color: #64748b; font-size: 11px; }

		.footer {
			margin-top: 32px;
			border-top: 1px solid var(--line);
			padding-top: 16px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 11px;
			color: var(--muted);
		}

		@media print {
			body { background: #fff; padding: 0; }
			.container { border: none; box-shadow: none; padding: 0; }
			.photo-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px; }
			.photo-viewport { height: 140px; }
		}
	</style>
</head>
<body>
	<div class="container">
		<header class="header-banner">
			<div>
				<div class="clinic-title">${escapeHtml(session.clinicName)}</div>
				<div class="doc-title">Ортодонтический диагностический фотопротокол (8 ракурсов)</div>
			</div>
			<div>
				<span class="stage-badge">${escapeHtml(report.stageMeta.labelRu)}</span>
			</div>
		</header>

		<div class="meta-grid">
			<div class="meta-item">
				<span class="meta-label">Пациент</span>
				<span class="meta-value">${escapeHtml(session.patientName)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Лечащий врач-ортодонт</span>
				<span class="meta-value">${escapeHtml(session.doctorName)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Дата фиксации</span>
				<span class="meta-value">${escapeHtml(report.formattedDateRu)}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Статус заполнения</span>
				<span class="meta-value">${report.completeness.uploadedCount} из 8 ракурсов (${report.completeness.completionPercentage}%)</span>
			</div>
			${
				session.treatmentStageTitle
					? `<div class="meta-item">
							<span class="meta-label">Этап плана лечения</span>
							<span class="meta-value">${escapeHtml(session.treatmentStageTitle)}</span>
					   </div>`
					: ""
			}
		</div>

		<!-- 8-Shot Grid -->
		<section class="section">
			<h2 class="section-title">Стандартная ортодонтическая сетка (8 ракурсов)</h2>
			<div class="photo-grid">
				${gridSlotsHtml}
			</div>
		</section>

		<!-- Clinical Findings -->
		<section class="section">
			<h2 class="section-title">Клиническая диагностика и окклюзионные параметры</h2>
			<table class="findings-table">
				<thead>
					<tr>
						<th>Параметр</th>
						<th>Клиническое значение</th>
						<th>Норма / Ориентир</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Взаимоотношения моляров (справа / слева)</strong></td>
						<td>${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassMolarRight])} / ${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassMolarLeft])}</td>
						<td>I класс по Энглю (нейтроокклюзия)</td>
					</tr>
					<tr>
						<td><strong>Взаимоотношения клыков (справа / слева)</strong></td>
						<td>${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassCanineRight])} / ${escapeHtml(ANGLE_CLASS_LABELS_RU[f.angleClassCanineLeft])}</td>
						<td>I класс (клык смыкается между клыком и премоляром)</td>
					</tr>
					<tr>
						<td><strong>Сагиттальная щель (Overjet)</strong></td>
						<td>${f.overjetMm} мм</td>
						<td>2.0 – 3.0 мм</td>
					</tr>
					<tr>
						<td><strong>Вертикальное резцовое перекрытие (Overbite)</strong></td>
						<td>${f.overbiteMm} мм (${f.overbitePercentage}%)</td>
						<td>1/3 высоты коронки (~30%)</td>
					</tr>
					<tr>
						<td><strong>Срединная линия (в/ч и н/ч)</strong></td>
						<td>В/Ч: ${f.midlineShiftUpperMm} мм (${escapeHtml(MIDLINE_SHIFT_LABELS_RU[f.midlineShiftUpperDirection])}), Н/Ч: ${f.midlineShiftLowerMm} мм (${escapeHtml(MIDLINE_SHIFT_LABELS_RU[f.midlineShiftLowerDirection])})</td>
						<td>Совпадает со срединно-лицевой линией</td>
					</tr>
					<tr>
						<td><strong>Эстетика дуги улыбки (Smile Arc)</strong></td>
						<td>${escapeHtml(SMILE_ARC_LABELS_RU[f.smileArc])}</td>
						<td>Консонантная</td>
					</tr>
					<tr>
						<td><strong>Диагноз и план</strong></td>
						<td colspan="2"><em>${escapeHtml(f.clinicalDiagnosisRu)}</em>. Рекомендовано: ${escapeHtml(f.recommendationsRu)}</td>
					</tr>
				</tbody>
			</table>
		</section>

		${comparisonHtml}

		<footer class="footer">
			<div>Протокол сформирован в системе DENTE Dental CRM • Приказ Минздрава РФ № 834н / СтАР</div>
			<div>Подпись врача-ортодонта: __________________ / ${escapeHtml(session.doctorName)} /</div>
		</footer>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DENTAL LABORATORY (ЗТЛ) ORDER EXPORTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds structured clinical photo export for dental laboratory (ЗТЛ) orders.
 */
export function buildZtlLabOrderPhotoExport(params: {
	session: OrthodonticPhotoSession;
	orderNumber: string;
	labName: string;
	shadeGuideVita: string;
	stumpShadeVita?: string;
	clinicalNotes?: string;
}): DentalLabOrderPhotoExport {
	const shots: DentalPhotoShot[] = [];
	for (const angle of ORTHODONTIC_8_ANGLES) {
		const slot = params.session.slots[angle.id];
		if (slot && slot.imageUrl) {
			shots.push({
				id: `${params.session.id}_${angle.id}`,
				angleId: angle.id,
				imageUrl: slot.imageUrl,
				capturedAt: slot.capturedAt || params.session.sessionDate,
			});
		}
	}

	return {
		patientId: params.session.patientId,
		patientName: params.session.patientName,
		orderNumber: params.orderNumber,
		labName: params.labName,
		shadeGuideVita: params.shadeGuideVita,
		stumpShadeVita: params.stumpShadeVita,
		shots,
		clinicalNotes: params.clinicalNotes || params.session.notes,
	};
}
