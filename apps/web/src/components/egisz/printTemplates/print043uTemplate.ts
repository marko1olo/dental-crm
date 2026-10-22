/**
 * print043uTemplate.ts — Form 043/u printable HTML template
 */

import {
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
} from "./../remdXml/egiszRemdPresets";
import {
	type EgiszDentalCdaPayload,
	escapeXml,
	formatRuDate,
	generateGostSignatureStampHtml,
} from "./../cdaR2XmlBuilder";

export function generateForm043uPrintHtml(payload: EgiszDentalCdaPayload): string {
	const docDef = EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode as EgiszDentalSemdCode] || {
		title: "Протокол консультации стоматолога (Форма 043/у)",
		nsiCode: "105",
	};
	const visitDateStr = formatRuDate(payload.encounterDate || new Date());
	const birthDateStr = formatRuDate(payload.patient.patientBirthDate);

	const renderTeethQuadrant = (teeth: readonly number[]) => teeth.map((t) => {
		const st = payload.toothStates[t] || "Healthy";
		const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", labelRu: st };
		const surfs = payload.toothSurfaces?.[t] || [];
		return `<div class="tooth-cell"><div class="tooth-num">${t}</div><div class="tooth-sym ${st !== "Healthy" ? "abnormal" : ""}">${stObj.shortSymbol}</div>${surfs.length > 0 ? `<div class="tooth-surf">${surfs.join("")}</div>` : ""}</div>`;
	}).join("");

	const signatureHtml = payload.doctorSignature ? generateGostSignatureStampHtml({
		signerName: payload.doctor.doctorFullName,
		certificateNumber: payload.doctorSignature.certificateSerialNumber,
		validFrom: payload.doctorSignature.validFrom || new Date().toISOString(),
		validTo: payload.doctorSignature.validTo || new Date().toISOString(),
		orgName: payload.clinic.clinicName,
	}) : `<div style="text-align: right;"><div style="font-weight: bold; color: #b91c1c; font-size: 11px; margin-bottom: 4px;">ШТАМП: ЧЕРНОВИК</div><div style="border: 1px dashed #b91c1c; padding: 4px 8px; margin-bottom: 6px; display: inline-block; color: #b91c1c; font-weight: bold; font-size: 10px;">ДОКУМЕНТ НЕ ЗАВЕРЕН ЭЦП — ПРЕДВАРИТЕЛЬНЫЙ ЭКЗЕМПЛЯР</div><div>Подпись врача: ___________________ / ${escapeXml(payload.doctor.doctorFullName)}</div></div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Медицинская карта ф. 043/у — ${escapeXml(payload.patient.patientFullName)}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 8px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
		.mo-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.mo-sub { font-size: 11px; color: #333; }
		.doc-title { font-size: 16px; font-weight: bold; margin-top: 8px; }
		.field-row { margin-bottom: 6px; }
		.field-label { font-weight: bold; }
		.section-title { font-size: 14px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
		.formula-table { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; text-align: center; margin: 8px 0; border: 1px solid #666; padding: 4px; }
		.tooth-cell { border: 1px solid #ccc; padding: 2px; min-height: 38px; }
		.tooth-num { font-size: 10px; color: #666; font-weight: bold; }
		.tooth-sym { font-size: 12px; font-weight: bold; }
		.tooth-sym.abnormal { color: #b91c1c; }
		.tooth-surf { font-size: 9px; color: #1e40af; }
		.services-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
		.services-table th, .services-table td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
		.services-table th { background: #f0f0f0; }
		.signature-box { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 10px; }
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="mo-title">${escapeXml(payload.clinic.clinicName)}</div>
		<div class="mo-sub">ОГРН: ${escapeXml(payload.clinic.clinicOgrn)} | ИНН: ${escapeXml(payload.clinic.clinicInn)} | OID: ${escapeXml(payload.clinic.clinicOid)}</div>
		<div class="mo-sub">${escapeXml(payload.clinic.clinicAddress)} | тел: ${escapeXml(payload.clinic.clinicPhone)}</div>
		<div class="doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)</div>
		<div style="font-size: 11px; font-family: monospace; color: #555;">СЭМД ЕГИСЗ РЭМД: ${escapeXml(docDef.title)} (Вид ${escapeXml(docDef.nsiCode)})</div>
	</div>
	${!payload.doctorSignature ? `<div style="border: 2px dashed #b91c1c; color: #b91c1c; font-weight: bold; text-align: center; padding: 6px; margin-bottom: 12px; font-size: 13px; text-transform: uppercase;">[ ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП ]</div>` : ""}
	<div class="field-row"><span class="field-label">Номер карты:</span> ${escapeXml(payload.patient.cardNumber || "б/н")} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">Дата приема:</span> ${visitDateStr}</div>
	<div class="field-row"><span class="field-label">Пациент (ФИО):</span> <strong>${escapeXml(payload.patient.patientFullName)}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">Дата рождения:</span> ${birthDateStr} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">СНИЛС:</span> ${escapeXml(payload.patient.patientSnils || "Не указан")}</div>
	<div class="field-row"><span class="field-label">Полис ОМС:</span> ${escapeXml(payload.patient.patientPolisOms || "—")} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="field-label">Телефон:</span> ${escapeXml(payload.patient.patientPhone || "—")}</div>

	<div class="section-title">1. ЖАЛОБЫ И АНАМНЕЗ</div>
	<div class="field-row"><span class="field-label">Жалобы:</span> ${escapeXml(payload.complaints || "Не предъявляет.")}</div>
	<div class="field-row"><span class="field-label">Анамнез заболевания:</span> ${escapeXml(payload.anamnesisMorbi || "Без особенностей.")}</div>
	<div class="field-row"><span class="field-label">Анамнез жизни:</span> ${escapeXml(payload.anamnesisVitae || "Без соматических отягощений.")}</div>

	<div class="section-title">2. ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)</div>
	<div class="formula-table">${renderTeethQuadrant(FDI_ADULT_TEETH.slice(0, 16))}${renderTeethQuadrant(FDI_ADULT_TEETH.slice(16, 32))}</div>

	<div class="section-title">3. КЛИНИЧЕСКИЙ ДИАГНОЗ ПО МКБ-10</div>
	<ul>${payload.diagnoses.map((d) => `<li><strong>${d.isPrimary ? "[Основной] " : "[Сопутствующий] "}</strong>${escapeXml(d.icd10Code)} — ${escapeXml(d.icd10Name)}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</li>`).join("")}</ul>

	<div class="section-title">4. ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ</div>
	<table class="services-table">
		<thead><tr><th style="width: 120px;">Код услуги</th><th>Наименование услуги</th><th style="width: 70px;">Зуб</th></tr></thead>
		<tbody>${payload.procedures.map((p) => `<tr><td>${escapeXml(p.code)}</td><td>${escapeXml(p.name)}</td><td>${escapeXml(p.tooth ? String(p.tooth) : "—")}</td></tr>`).join("")}</tbody>
	</table>

	<div class="section-title">5. НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ</div>
	<div>${escapeXml(payload.recommendations || "Индивидуальная гигиена полости рта.")}</div>

	<div class="signature-box">
		<div>
			<div><strong>Лечащий врач:</strong> ${escapeXml(payload.doctor.doctorFullName)}</div>
			<div>${escapeXml(payload.doctor.doctorPosition)}</div>
			<div>СНИЛС: ${escapeXml(payload.doctor.doctorSnils)}</div>
		</div>
		${signatureHtml}
	</div>
</body>
</html>`;
}
