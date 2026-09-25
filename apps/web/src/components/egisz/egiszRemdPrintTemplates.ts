/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION PRINTABLE TEMPLATES — DENTE DENTAL CRM
 * Form 043/u (Медицинская карта) & FNS KND 1151156 (Справка об оплате услуг)
 * Compliant with Order 804n, Order ED-7-11/755@, and Mandate 8d p. 7 (Zero Emojis)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
} from "./remdXml/egiszRemdPresets";

import {
	type EgiszDentalCdaPayload,
	type FnsTaxCertificatePayload,
	escapeXml,
	formatKopecksToRubles,
	formatRuDate,
	generateGostSignatureStampHtml,
} from "./cdaR2XmlBuilder";

export function generateForm043uPrintHtml(payload: EgiszDentalCdaPayload): string {
	const docDef = EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode as EgiszDentalSemdCode] || {
		title: "Протокол консультации стоматолога (Форма 043/у)",
		nsiCode: "105",
	};
	const visitDateStr = formatRuDate(payload.encounterDate || new Date());
	const birthDateStr = formatRuDate(payload.patient.patientBirthDate);

	const renderTeethQuadrant = (teeth: readonly number[]) => {
		return teeth
			.map((t) => {
				const st = payload.toothStates[t] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", labelRu: st };
				const surfs = payload.toothSurfaces?.[t] || [];
				return `
					<div class="tooth-cell">
						<div class="tooth-num">${t}</div>
						<div class="tooth-sym ${st !== "Healthy" ? "abnormal" : ""}">${stObj.shortSymbol}</div>
						${surfs.length > 0 ? `<div class="tooth-surf">${surfs.join("")}</div>` : ""}
					</div>
				`;
			})
			.join("");
	};

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
		.doc-semd { font-size: 11px; font-family: monospace; color: #555; }
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
		<div class="doc-semd">СЭМД ЕГИСЗ РЭМД: ${escapeXml(docDef.title)} (Вид ${escapeXml(docDef.nsiCode)})</div>
	</div>

	${!payload.doctorSignature ? `
	<div style="border: 2px dashed #b91c1c; color: #b91c1c; font-weight: bold; text-align: center; padding: 6px; margin-bottom: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
		[ ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП ]
	</div>` : ""}

	<div class="field-row">
		<span class="field-label">Номер карты:</span> ${escapeXml(payload.patient.cardNumber || "б/н")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата приема:</span> ${visitDateStr}
	</div>

	<div class="field-row">
		<span class="field-label">Пациент (ФИО):</span> <strong>${escapeXml(payload.patient.patientFullName)}</strong> &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата рождения:</span> ${birthDateStr} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС:</span> ${escapeXml(payload.patient.patientSnils || "Не указан")}
	</div>

	<div class="field-row">
		<span class="field-label">Полис ОМС:</span> ${escapeXml(payload.patient.patientPolisOms || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Телефон:</span> ${escapeXml(payload.patient.patientPhone || "—")}
	</div>

	<div class="section-title">1. ЖАЛОБЫ И АНАМНЕЗ</div>
	<div class="field-row"><span class="field-label">Жалобы:</span> ${escapeXml(payload.complaints || "Не предъявляет.")}</div>
	<div class="field-row"><span class="field-label">Анамнез заболевания:</span> ${escapeXml(payload.anamnesisMorbi || "Без особенностей.")}</div>
	<div class="field-row"><span class="field-label">Анамнез жизни:</span> ${escapeXml(payload.anamnesisVitae || "Без соматических отягощений.")}</div>

	<div class="section-title">2. ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)</div>
	<div class="formula-table">
		${renderTeethQuadrant(FDI_ADULT_TEETH.slice(0, 16))}
		${renderTeethQuadrant(FDI_ADULT_TEETH.slice(16, 32))}
	</div>

	<div class="section-title">3. КЛИНИЧЕСКИЙ ДИАГНОЗ ПО МКБ-10</div>
	<ul>
		${payload.diagnoses.map((d) => `<li><strong>${d.isPrimary ? "[Основной] " : "[Сопутствующий] "}</strong>${escapeXml(d.icd10Code)} — ${escapeXml(d.icd10Name)}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</li>`).join("")}
	</ul>

	<div class="section-title">4. ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ (НОМЕНКЛАТУРА 804Н)</div>
	<table class="services-table">
		<thead>
			<tr>
				<th style="width: 120px;">Код 804н</th>
				<th>Наименование услуги</th>
				<th style="width: 70px;">Зуб</th>
			</tr>
		</thead>
		<tbody>
			${payload.procedures.map((p) => `<tr><td>${escapeXml(p.code)}</td><td>${escapeXml(p.name)}</td><td>${escapeXml(p.tooth ? String(p.tooth) : "—")}</td></tr>`).join("")}
		</tbody>
	</table>

	<div class="section-title">5. НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ</div>
	<div>${escapeXml(payload.recommendations || "Индивидуальная гигиена полости рта.")}</div>

	<div class="signature-box">
		<div>
			<div><strong>Лечащий врач:</strong> ${escapeXml(payload.doctor.doctorFullName)}</div>
			<div>${escapeXml(payload.doctor.doctorPosition)}</div>
			<div>СНИЛС: ${escapeXml(payload.doctor.doctorSnils)}</div>
		</div>

		${payload.doctorSignature ? generateGostSignatureStampHtml({
			signerName: payload.doctor.doctorFullName,
			certificateNumber: payload.doctorSignature.certificateSerialNumber,
			validFrom: payload.doctorSignature.validFrom || new Date().toISOString(),
			validTo: payload.doctorSignature.validTo || new Date().toISOString(),
			orgName: payload.clinic.clinicName,
		}) : `
		<div style="text-align: right;">
			<div style="font-weight: bold; color: #b91c1c; font-size: 11px; margin-bottom: 4px;">ШТАМП: ЧЕРНОВИК</div>
			<div style="border: 1px dashed #b91c1c; padding: 4px 8px; margin-bottom: 6px; display: inline-block; color: #b91c1c; font-weight: bold; font-size: 10px;">ДОКУМЕНТ НЕ ЗАВЕРЕН ЭЦП — ПРЕДВАРИТЕЛЬНЫЙ ЭКЗЕМПЛЯР</div>
			<div>Подпись врача: ___________________ / ${escapeXml(payload.doctor.doctorFullName)}</div>
		</div>`}
	</div>
</body>
</html>`;
}

export function generateFnsTaxCertificatePrintHtml(payload: FnsTaxCertificatePayload): string {
	const docDateStr = formatRuDate(payload.documentDate);
	const payments = payload.payments || [];
	const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code1Kopecks = payments
		.filter((p) => p.serviceCode === "1")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code2Kopecks = payments
		.filter((p) => p.serviceCode === "2")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);

	const totalRublesStr = formatKopecksToRubles(totalKopecks);
	const code1RublesStr = formatKopecksToRubles(code1Kopecks);
	const code2RublesStr = formatKopecksToRubles(code2Kopecks);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг (КНД 1151156) — № ${escapeXml(payload.documentNumber)}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
		.form-code { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 8px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
		.doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.doc-subtitle { font-size: 12px; margin-top: 4px; }
		.doc-meta { font-size: 13px; font-weight: bold; margin-top: 6px; }
		.section-header { font-size: 13px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; border-left: 4px solid #000; margin-top: 12px; margin-bottom: 6px; }
		.field-row { margin-bottom: 5px; }
		.field-label { font-weight: bold; }
		.table-payments { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
		.table-payments th, .table-payments td { border: 1px solid #666; padding: 5px 8px; text-align: left; }
		.table-payments th { background: #f8f8f8; }
		.table-payments td.num { text-align: right; font-family: monospace; font-size: 12px; }
		.total-box { margin-top: 10px; padding: 8px; border: 1px solid #000; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; }
		.signature-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 12px; }
	</style>
</head>
<body>
	<div class="form-code">
		Форма по КНД 1151156<br/>
		Приказ ФНС России от 08.11.2023 № ЕД-7-11/755@
	</div>

	<div class="doc-header">
		<div class="doc-title">СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</div>
		<div class="doc-subtitle">для представления в налоговый орган Российской Федерации</div>
		<div class="doc-meta">№ ${escapeXml(payload.documentNumber)} от ${docDateStr} г.</div>
	</div>

	<div class="section-header">1. СВЕДЕНИЯ О МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ / ИП</div>
	<div class="field-row"><span class="field-label">Наименование:</span> ${escapeXml(payload.clinic.name)}</div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${escapeXml(payload.clinic.inn)} &nbsp;&nbsp;|&nbsp;&nbsp;
		${payload.clinic.kpp ? `<span class="field-label">КПП:</span> ${escapeXml(payload.clinic.kpp)} &nbsp;&nbsp;|&nbsp;&nbsp;` : ""}
		<span class="field-label">ОГРН:</span> ${escapeXml(payload.clinic.ogrn)}
	</div>

	<div class="section-header">2. СВЕДЕНИЯ О НАЛОГОПЛАТЕЛЬЩИКЕ (ФЛ)</div>
	<div class="field-row"><span class="field-label">ФИО налогоплательщика:</span> <strong>${escapeXml(payload.taxpayer.fullName)}</strong></div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${escapeXml(payload.taxpayer.inn || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС:</span> ${escapeXml(payload.taxpayer.snils || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата рождения:</span> ${formatRuDate(payload.taxpayer.birthDate) || "—"}
	</div>

	<div class="section-header">3. СВЕДЕНИЯ О ПАЦИЕНТЕ И СТЕПЕНИ РОДСТВА</div>
	<div class="field-row"><span class="field-label">ФИО пациента:</span> <strong>${escapeXml(payload.patient.fullName)}</strong></div>
	<div class="field-row">
		<span class="field-label">Степень родства:</span> Код ${escapeXml(payload.patient.relationshipCode)} (${escapeXml(payload.patient.relationshipName || (payload.patient.relationshipCode === "1" ? "Сам налогоплательщик" : "Родственник"))}) &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС пациента:</span> ${escapeXml(payload.patient.snils || "—")}
	</div>

	<div class="section-header">4. СВЕДЕНИЯ О ПРОИЗВЕДЕННЫХ ОПЛАТАХ ЗА ${payload.taxYear} ГОД</div>
	<table class="table-payments">
		<thead>
			<tr>
				<th style="width: 30px;">№</th>
				<th>Дата оплаты</th>
				<th>Код услуги</th>
				<th>Описание услуги</th>
				<th style="width: 110px; text-align: right;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			${payments.map((p, idx) => `
				<tr>
					<td>${idx + 1}</td>
					<td>${formatRuDate(p.date)}</td>
					<td>${p.serviceCode === "1" ? "1 (Стандартная мед. услуга)" : "2 (Дорогостоящее лечение)"}</td>
					<td>${escapeXml(p.serviceDescription || "Медицинские стоматологические услуги")}</td>
					<td class="num">${formatKopecksToRubles(p.amountKopecks)}</td>
				</tr>
			`).join("")}
		</tbody>
	</table>

	<div class="total-box">
		<div>
			<div>По коду 1 (Стандартные услуги): ${code1RublesStr} руб.</div>
			<div>По коду 2 (Дорогостоящее лечение): ${code2RublesStr} руб.</div>
		</div>
		<div style="font-size: 15px; align-self: center;">
			ИТОГО К ВЫЧЕТУ: ${totalRublesStr} руб.
		</div>
	</div>

	<div class="signature-box">
		<div>
			<div><strong>Руководитель МО / Уполномоченное лицо:</strong></div>
			<div style="margin-top: 4px;">${escapeXml(payload.signer.fullName)} (${escapeXml(payload.signer.position || "Руководитель")})</div>
			${payload.signer.snils ? `<div>СНИЛС: ${escapeXml(payload.signer.snils)}</div>` : ""}
		</div>

		${payload.doctorSignature ? generateGostSignatureStampHtml({
			signerName: payload.signer.fullName,
			certificateNumber: payload.doctorSignature.certificateSerialNumber,
			validFrom: payload.doctorSignature.validFrom || new Date().toISOString(),
			validTo: payload.doctorSignature.validTo || new Date().toISOString(),
			orgName: payload.clinic.name,
		}) : `
		<div style="text-align: right;">
			<div>Подпись: ___________________ / ${escapeXml(payload.signer.fullName)}</div>
			<div style="font-size: 10px; color: #555; margin-top: 4px;">М.П.</div>
		</div>`}
	</div>
</body>
</html>`;
}
