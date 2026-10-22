import { generateCollageWatermarkText } from '../photoProtocolMath';
import { BeforeAfterCollagePayload, escapeHtml } from './collageTypes';

export function generateBeforeAfterPrintableHtml(payload: BeforeAfterCollagePayload): string {
	const {
		clinicName,
		patientName,
		patientCardNumber,
		doctorName,
		beforeTitle,
		afterTitle,
		beforeImageUrl,
		afterImageUrl,
		beforeShade,
		afterShade,
		dateStr = new Date().toLocaleDateString('ru-RU'),
	} = payload;

	const watermark = generateCollageWatermarkText(clinicName, patientName, patientCardNumber, doctorName, dateStr);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Фотопротокол До/После — ${escapeHtml(patientName)} (${escapeHtml(patientCardNumber)})</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; color: #0f172a; line-height: 1.4; padding: 16px; }
		.sheet-container { max-width: 1200px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
		.sheet-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
		.clinic-brand { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
		.sheet-subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }
		.patient-block { text-align: right; font-size: 12px; color: #334155; }
		.patient-name { font-size: 15px; font-weight: 700; color: #0f172a; }
		.photos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
		.photo-box { background: #020617; border-radius: 10px; overflow: hidden; height: 380px; display: flex; flex-direction: column; position: relative; }
		.photo-tag { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; z-index: 2; }
		.photo-tag.before { color: #38bdf8; }
		.photo-tag.after { color: #4ade80; }
		.photo-img { width: 100%; height: 100%; object-fit: contain; background: #020617; }
		.photo-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b; font-size: 13px; font-weight: 600; }
		.shade-badge-bar { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; font-size: 13px; font-weight: 600; }
		.sheet-footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
		@media print { body { background: #fff; padding: 0; } .sheet-container { border: none; box-shadow: none; padding: 0; } .no-print { display: none !important; } }
	</style>
</head>
<body>
	<div class="sheet-container">
		<header class="sheet-header">
			<div>
				<div class="clinic-brand">${escapeHtml(clinicName)}</div>
				<div class="sheet-subtitle">Клинический фотопротокол До / После (Стоматологический стандарт СтАР)</div>
			</div>
			<div class="patient-block">
				<div class="patient-name">Пациент: ${escapeHtml(patientName)}</div>
				<div>Медицинская карта: <strong>${escapeHtml(patientCardNumber)}</strong> • Дата: ${escapeHtml(dateStr)}</div>
				<div>Лечащий врач: ${escapeHtml(doctorName)}</div>
			</div>
		</header>
		${beforeShade || afterShade ? `<div class="shade-badge-bar"><span>Динамика эстетической реставрации (Шкала VITA):</span><span><strong>ДО:</strong> ${escapeHtml(beforeShade || '—')} → <strong>ПОСЛЕ:</strong> ${escapeHtml(afterShade || '—')}</span></div>` : ''}
		<main class="photos-grid">
			<div class="photo-box">
				<div class="photo-tag before">ДО: ${escapeHtml(beforeTitle)}</div>
				${beforeImageUrl ? `<img src="${beforeImageUrl}" alt="До" class="photo-img" />` : `<div class="photo-empty">Снимок «До» отсутствует</div>`}
			</div>
			<div class="photo-box">
				<div class="photo-tag after">ПОСЛЕ: ${escapeHtml(afterTitle)}</div>
				${afterImageUrl ? `<img src="${afterImageUrl}" alt="После" class="photo-img" />` : `<div class="photo-empty">Снимок «После» отсутствует</div>`}
			</div>
		</main>
		<footer class="sheet-footer">
			<div>${escapeHtml(watermark)}</div>
			<div>Подпись врача: ____________________ / ${escapeHtml(doctorName)} /</div>
		</footer>
	</div>
	<script>window.onload = function() { window.focus(); };</script>
</body>
</html>`;
}
