import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "../sharedStyles.js";

export interface RadiologyReferralRenderPayload {
	readonly clinicLegalName?: string | undefined;
	readonly organization?: { readonly fullName?: string; readonly address?: string; readonly phone?: string } | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly referralNumber?: string | undefined;
	readonly referralDate?: string | undefined;
	readonly patientFullName?: string | undefined;
	readonly patient?: { readonly fullName?: string; readonly birthDate?: string; readonly phone?: string; readonly medicalCardNumber?: string } | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly diagnosisIcd10Code?: string | undefined;
	readonly diagnosisDetailed?: string | undefined;
	readonly studyType?: string | undefined;
	readonly studyGoal?: string | undefined;
	readonly targetTeethFdi?: string | undefined;
	readonly anatomicalArea?: string | undefined;
	readonly clinicalJustification?: string | undefined;
	readonly isPregnancyExcluded?: boolean | undefined;
	readonly hasMetallicArtifacts?: boolean | undefined;
	readonly [key: string]: unknown;
}

/** 8. Рендерер Направления на рентгенологическое исследование (КЛКТ / ОПТГ / ТРГ / Визио) */
export function renderRadiologyReferralHtml(payload: RadiologyReferralRenderPayload): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const refNum = payload.referralNumber || "—";
	const refDate = payload.referralDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientPhone = payload.patientPhone || payload.patient?.phone || "—";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог";
	const icdCode = payload.diagnosisIcd10Code || "K02.1";
	const diagnosisText = payload.diagnosisDetailed || icdCode;
	const studyType = payload.studyType || "cbct_jaw_8x8";
	const studyGoal = payload.studyGoal || "endodontics";
	const targetTeeth = payload.targetTeethFdi || "";
	const area = payload.anatomicalArea || "Челюстно-лицевая область";
	const justification = payload.clinicalJustification || "Диагностика и контроль лечения.";

	// Генерация ячеек зубной формулы FDI для визуальной отметки
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
	const targetTeethArray = targetTeeth.split(/[,;\s]+/).map((t: string) => Number.parseInt(t.trim(), 10));

	const upperCells = upperTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	const lowerCells = lowerTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Направление на рентген-исследование № ${escapeHtml(refNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | Тел: ${escapeHtml(clinicPhone)}</div>
      <div style="font-size:7pt; color:#64748b; margin-top:2px;">Направляющая медицинская организация</div>
    </div>
    <div class="doc-requisites">
      <div style="font-weight:800; font-size:9.5pt; color:#0f172a;">НАПРАВЛЕНИЕ</div>
      <div style="font-size:8pt; font-weight:bold; color:#0284c7;">на рентгенологическое исследование</div>
      <div style="font-size:7.5pt; color:#64748b;">№ ${escapeHtml(refNum)} от ${escapeHtml(refDate)}</div>
    </div>
  </div>

  <table class="data-table" style="margin-bottom:6px;">
    <tbody>
      <tr>
        <td style="width:25%; font-weight:bold; background:#f1f5f9;">Пациент (Ф.И.О.):</td>
        <td style="width:45%; font-weight:bold; font-size:9.5pt;">${escapeHtml(patientName)}</td>
        <td style="width:15%; font-weight:bold; background:#f1f5f9;">Дата рожд.:</td>
        <td style="width:15%;">${escapeHtml(patientBirth)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Номер медкарты:</td>
        <td><strong>${escapeHtml(cardNum)}</strong></td>
        <td style="font-weight:bold; background:#f1f5f9;">Телефон:</td>
        <td>${escapeHtml(patientPhone)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Лечащий врач:</td>
        <td colspan="3"><strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Диагноз (МКБ-10):</td>
        <td colspan="3"><span style="color:#0369a1; font-weight:bold;">${escapeHtml(icdCode)}</span> — ${escapeHtml(diagnosisText)}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1.5px solid #0284c7; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f0f9ff;">
    <div style="font-weight:bold; font-size:8.5pt; color:#0369a1; margin-bottom:4px;">
      1. Требуемый вид исследования:
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:8pt;">
      <div><span style="font-weight:bold; color:${studyType.startsWith("cbct") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("cbct") ? "X" : " "}]</span> <strong>Компьютерная томография (КЛКТ 3D)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "optg_digital_panoramic" ? "#0284c7" : "#64748b"};">[${studyType === "optg_digital_panoramic" ? "X" : " "}]</span> <strong>Ортопантомограмма (ОПТГ цифровая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType.startsWith("trg") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("trg") ? "X" : " "}]</span> <strong>Телерентгенограмма (ТРГ боковая/прямая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "intraoral_radiovisiography" ? "#0284c7" : "#64748b"};">[${studyType === "intraoral_radiovisiography" ? "X" : " "}]</span> <strong>Прицельная радиовизиография</strong></div>
    </div>
    <div style="margin-top:4px; font-size:8pt; border-top:1px dashed #bae6fd; padding-top:3px;">
      Параметры области: <strong>${escapeHtml(area)}</strong>
    </div>
  </div>

  <div style="margin:6px 0;">
    <div style="font-weight:bold; font-size:8pt; color:#0f172a; margin-bottom:2px;">
      2. Область исследования / Зубная формула (FDI):
    </div>
    <table class="data-table-dense" style="margin:2px 0;">
      <thead>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Верхняя справа (18–11)</th><th colspan="8">Верхняя слева (21–28)</th></tr>
      </thead>
      <tbody>
        <tr>${upperCells}</tr>
        <tr style="border-top:2px solid #0f172a;">${lowerCells}</tr>
      </tbody>
      <tfoot>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Нижняя справа (48–41)</th><th colspan="8">Нижняя слева (31–38)</th></tr>
      </tfoot>
    </table>
    ${targetTeeth ? `<div style="font-size:7.5pt; color:#0369a1; font-weight:bold;">Отмеченные целевые зубы: ${escapeHtml(targetTeeth)}</div>` : ""}
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:8pt; line-height:1.35;">
    <div><strong>3. Клиническая цель и задача исследования:</strong></div>
    <div style="color:#0f172a; margin-top:2px;">${escapeHtml(justification)}</div>
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 6px; margin:6px 0; font-size:7.5pt; color:#475569; display:flex; justify-content:space-between;">
    <span>[${payload.isPregnancyExcluded ? "X" : " "}] Беременность исключена</span>
    <span>[${payload.hasMetallicArtifacts ? "X" : " "}] Металлоконструкции / коронки</span>
    <span>Принцип ALARA / СанПиН 2.6.1.1192-03 соблюдён</span>
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Направивший врач: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Рентгенолаборант: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
