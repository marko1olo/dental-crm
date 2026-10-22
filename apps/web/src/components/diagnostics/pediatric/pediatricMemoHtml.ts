import { getFranklDefinition } from "../../odontogram/pediatricDentitionEngine";
import { type PediatricMemoPrintData, RESORPTION_STAGES } from "./pediatricTypes";
import { PEDIATRIC_MEMO_CSS } from "./pediatricMemoStyles";

function renderResorptionSection(resorptionItem: (typeof RESORPTION_STAGES)[number] | undefined, toothNumber?: number): string {
	if (!resorptionItem) return "";
	return `
	<div class="section-card">
		<div class="section-title">2. СТАТУС СМЕНЫ ЗУБА #${toothNumber} (ФИЗИОЛОГИЧЕСКАЯ РЕЗОРБЦИЯ)</div>
		<p style="margin: 4px 0; font-size: 10pt;">
			Зафиксирована <strong>${resorptionItem.stageName}</strong> (${resorptionItem.percent}% длины корня).
			Это естественный процесс подготовки к прорезыванию постоянного зуба.
		</p>
	</div>`;
}

export function generatePediatricMemoHtml(data: PediatricMemoPrintData): string {
	const patientName = data.patientName || "Юный пациент";
	const patientAgeYears = data.patientAgeYears ?? 6;
	const doctorName = data.doctorName || "Детский врач-стоматолог";
	const toothNumber = data.toothNumber;
	const franklRating = data.franklRating ?? 3;
	const franklDef = getFranklDefinition(franklRating);
	const clinicName = data.clinicName || "ООО «Стоматологическая клиника DENTE» (Детское отделение)";
	const clinicPhone = data.clinicPhone || "+7 (495) 000-00-00";
	const todayStr = new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
	const resorptionItem = data.resorptionStage ? RESORPTION_STAGES.find((s) => s.stage === data.resorptionStage) : undefined;

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8" />
	<title>Памятка для родителей — ${patientName}</title><style>${PEDIATRIC_MEMO_CSS}</style></head><body>
	<div class="no-print" style="background:#f0fdfa; border:1px solid #0d9488; padding:10px 14px; border-radius:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
		<span style="font-size:12px; color:#0f766e;"><strong>Памятка для родителей после детского приёма</strong></span>
		<button onclick="window.print()" style="padding:6px 14px; background:#0d9488; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">Печать (Ctrl+P)</button>
	</div>
	<div class="memo-header">
		<div>
			<div class="clinic-title">${clinicName}</div>
			<div class="doc-title">ПАМЯТКА ДЛЯ РОДИТЕЛЕЙ</div>
			<div class="doc-subtitle">Рекомендации по уходу и режиму после детского стоматологического приёма</div>
		</div>
		<div class="date-badge"><div>Дата: <strong>${todayStr}</strong></div><div>Тел.: ${clinicPhone}</div></div>
	</div>
	<div class="info-grid">
		<div class="info-item"><span class="info-label">Пациент:</span><span class="info-val">${patientName}, ${patientAgeYears} лет</span></div>
		<div class="info-item"><span class="info-label">Лечащий врач:</span><span class="info-val">${doctorName}</span></div>
		<div class="info-item"><span class="info-label">Зуб (FDI):</span><span class="info-val">${toothNumber ? `#${toothNumber}` : "Осмотр"}</span></div>
		<div class="info-item"><span class="info-label">Шкала Франкла:</span><span class="info-val">${franklDef.symbol} (${franklDef.nameRu})</span></div>
	</div>
	<div class="section-card">
		<div class="section-title">1. ПОВЕДЕНИЕ НА ПРИЕМЕ И ПСИХОЛОГИЧЕСКАЯ АДАПТАЦИЯ</div>
		<p style="margin: 4px 0 6px 0; font-size: 10pt;"><strong>Оценка контакта:</strong> ${franklDef.descriptionRu}</p>
		<p style="margin: 4px 0; font-size: 10pt;">Применены техники Tell-Show-Do («Сказать — Показать — Сделать»). <strong>Похвалите ребенка</strong> за смелость и сотрудничество!</p>
	</div>
	${renderResorptionSection(resorptionItem, toothNumber)}
	<div class="section-card">
		<div class="section-title">${resorptionItem ? "3" : "2"}. Важные рекомендации после анестезии и лечения</div>
		<div class="alert-box"><strong>Контроль онемения тканей:</strong> действие анестезии длится 1.5–2.5 ч. Следите, чтобы ребенок <strong>не кусал губу, щеку или язык</strong>.</div>
		<ul>
			<li><strong>Прием пищи:</strong> воздержитесь от приема твердой пищи до окончания действия анестезии.</li>
			<li><strong>Питьевой режим:</strong> негазированная вода комнатной температуры.</li>
			<li><strong>При болезненности:</strong> детский обезболивающий сироп (Ибупрофен / Парацетамол) по назначению врача.</li>
		</ul>
	</div>
	<div class="section-card">
		<div class="section-title">${resorptionItem ? "4" : "3"}. Домашняя гигиена и профилактика</div>
		<ul>
			<li><strong>Контроль родителей:</strong> до 8–9 лет помогайте дочищать зубы ребенку минимум 1 раз в день.</li>
			<li><strong>Профилактический осмотр:</strong> каждые 3–4 месяца.</li>
		</ul>
	</div>
	<div class="signatures-row">
		<div class="sig-col"><div>Врач-стоматолог детский:</div><div class="sig-line"><span>Подпись: ________________________</span><span>/ ${doctorName} /</span></div></div>
		<div class="sig-col"><div>Памятку получил(а):</div><div class="sig-line"><span>Подпись родителя: __________________</span><span>/ ________________________ /</span></div></div>
	</div>
	<script>if (window.opener) { setTimeout(function() { window.print(); }, 250); }</script></body></html>`;
}
