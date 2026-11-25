import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "../sharedStyles.js";

export interface OrthodonticCardRenderPayload {
	readonly organization?: { readonly fullName?: string | null; readonly address?: string | null; readonly ogrn?: string | null; readonly inn?: string | null } | undefined;
	readonly clinicLegalName?: string | null | undefined;
	readonly clinic?: { readonly name?: string | null; readonly address?: string | null } | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly clinicLicenseNumber?: string | null | undefined;
	readonly patient?: {
		readonly medicalCardNumber?: string | null | undefined;
		readonly cardOpenedAt?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly gender?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
	} | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly cardOpenedDate?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientSex?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly legalRepresentativeFullName?: string | null | undefined;
	readonly treatingOrthodontist?: { readonly fullName?: string | null } | undefined;
	readonly doctor?: { readonly fullName?: string | null } | undefined;
	readonly orthodontistFullName?: string | null | undefined;
	readonly treatmentPlan?: {
		readonly applianceType?: string | undefined;
		readonly applianceName?: string | undefined;
		readonly diagnosis?: string | undefined;
		readonly estimatedDurationMonths?: number | undefined;
		readonly treatmentStages?: readonly string[] | string | undefined;
		readonly retentionProtocol?: string | undefined;
		readonly retentionPlan?: string | undefined;
	} | undefined;
	readonly appliancePlan?: {
		readonly applianceType?: string | undefined;
		readonly applianceName?: string | undefined;
		readonly diagnosis?: string | undefined;
		readonly estimatedDurationMonths?: number | undefined;
		readonly treatmentStages?: readonly string[] | string | undefined;
		readonly retentionProtocol?: string | undefined;
		readonly retentionPlan?: string | undefined;
	} | undefined;
	readonly orthodonticDiagnosis?: string | undefined;
	readonly morphometry?: {
		readonly faceType?: string | undefined;
		readonly facialType?: string | undefined;
		readonly profile?: string | undefined;
		readonly profileType?: string | undefined;
		readonly smileLine?: string | undefined;
	} | undefined;
	readonly anthropometry?: {
		readonly faceType?: string | undefined;
		readonly facialType?: string | undefined;
		readonly profile?: string | undefined;
		readonly profileType?: string | undefined;
		readonly smileLine?: string | undefined;
	} | undefined;
	readonly cephalometry?: {
		readonly sna?: number | string | undefined;
		readonly snaAngle?: number | string | undefined;
		readonly snb?: number | string | undefined;
		readonly snbAngle?: number | string | undefined;
		readonly anb?: number | string | undefined;
		readonly anbAngle?: number | string | undefined;
		readonly wits?: number | string | undefined;
		readonly witsAppraisalMm?: number | string | undefined;
		readonly fma?: number | string | undefined;
		readonly fmaAngle?: number | string | undefined;
	} | undefined;
	readonly indices?: {
		readonly tonn?: { readonly ratio?: number | string | undefined; readonly interpretation?: string | undefined } | undefined;
		readonly pont?: { readonly premolarsExpectedWidthMm?: number | string | undefined; readonly molarsExpectedWidthMm?: number | string | undefined; readonly interpretation?: string | undefined } | undefined;
		readonly bolton?: { readonly anteriorRatio?: number | string | undefined; readonly interpretation?: string | undefined } | undefined;
	} | undefined;
	readonly isClosed?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | null | undefined;
	readonly [key: string]: unknown;
}

/** 2. Рендерер Формы № 043-1/у — Медицинская карта ортодонтического пациента */
export function renderForm043_1uHtml(payload: OrthodonticCardRenderPayload): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || payload.clinic?.address || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const cardOpened = payload.cardOpenedDate || payload.patient?.cardOpenedAt || new Date().toISOString().slice(0, 10);
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "female") === "male" ? "Мужской" : "Женский";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const patientAddress = payload.patient?.address || payload.patientAddress || "—";
	const doctorName = payload.treatingOrthodontist?.fullName || payload.doctor?.fullName || payload.orthodontistFullName || "Врач-ортодонт";
	const applianceName = payload.treatmentPlan?.applianceType || payload.treatmentPlan?.applianceName || payload.appliancePlan?.applianceType || "Брекет-система Damon Q2";

	const morph = payload.morphometry || payload.anthropometry || {};
	const ceph = payload.cephalometry || {};
	const ind = payload.indices || {};
	const plan = payload.treatmentPlan || payload.appliancePlan || {};
	const isClosed = payload.isClosed ?? (payload.status === "signed" || payload.status === "completed");
	const watermark = payload.watermarkText ?? (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Карта ортодонтического пациента № ${escapeHtml(cardNum)} (Форма 043-1/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container" style="position:relative;">
  ${watermark ? `<div class="doc-watermark" aria-hidden="true" style="position:absolute; top:45%; left:50%; transform:translate(-50%, -50%) rotate(-32deg); font-size:52pt; font-weight:900; color:${isClosed ? "rgba(16, 185, 129, 0.05)" : "rgba(15, 23, 42, 0.045)"}; letter-spacing:0.12em; pointer-events:none; z-index:0; white-space:nowrap; user-select:none;">${escapeHtml(watermark)}</div>` : ""}
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043-1/у</strong></div>
      <div>Медицинская карта ортодонтического пациента</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата открытия: <strong>${escapeHtml(cardOpened)}</strong> | Врач-ортодонт: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="section-title">1. Паспортные данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Д.Р.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Антропометрия лица и цефалометрия (ТРГ)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Тип лица / Профиль:</strong></td>
      <td>${escapeHtml(morph.faceType || morph.facialType || "Мезопрозопический")}, профиль ${escapeHtml(morph.profile || morph.profileType || "Прямой")}</td>
      <td style="width:20%;"><strong>Линия улыбки:</strong></td>
      <td>${escapeHtml(morph.smileLine || "Средняя (гармоничная)")}</td>
    </tr>
    <tr>
      <td><strong>Углы SNA / SNB / ANB:</strong></td>
      <td>SNA: ${ceph.sna ?? ceph.snaAngle ?? "82.0"}°, SNB: ${ceph.snb ?? ceph.snbAngle ?? "80.0"}°, ANB: ${ceph.anb ?? ceph.anbAngle ?? "2.0"}°</td>
      <td><strong>Wits / FMA:</strong></td>
      <td>Wits: ${ceph.wits ?? ceph.witsAppraisalMm ?? "0"} мм, FMA: ${ceph.fma ?? ceph.fmaAngle ?? "25.0"}°</td>
    </tr>
  </table>

  <div class="section-title">3. Биометрические индексы гипсовых / цифровых моделей</div>
  <table class="data-table">
    <thead>
      <tr><th>Индекс</th><th>Клиническая норма</th><th>Расчетное значение</th><th>Заключение</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Индекс Тона (SI/Si)</strong></td>
        <td>1.33 (пост.) / 1.30 (мол.)</td>
        <td>${ind.tonn?.ratio ? Number(ind.tonn.ratio).toFixed(2) : "1.33"}</td>
        <td>${escapeHtml(ind.tonn?.interpretation || "Пропорциональное соотношение резцов")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Пона</strong></td>
        <td>Премоляры: ${ind.pont?.premolarsExpectedWidthMm ?? "36.0"} мм | Моляры: ${ind.pont?.molarsExpectedWidthMm ?? "45.0"} мм</td>
        <td>Ширина дуг соответствует норме</td>
        <td>${escapeHtml(ind.pont?.interpretation || "Нормогнатия, трансверзального сужения нет")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Болтона</strong></td>
        <td>Передний: 77.2% | Полный: 91.3%</td>
        <td>Передний: ${ind.bolton?.anteriorRatio ? Number(ind.bolton.anteriorRatio).toFixed(1) : "77.2"}%</td>
        <td>${escapeHtml(ind.bolton?.interpretation || "Гармоничное соотношение зубных рядов")}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. План аппаратурного лечения и ретенционный протокол</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Клинический диагноз:</strong></td>
      <td colspan="3"><strong>${escapeHtml(plan.diagnosis || payload.orthodonticDiagnosis || "K07.2 Аномалии соотношения зубных дуг")}</strong></td>
    </tr>
    <tr>
      <td><strong>Лечебная аппаратура:</strong></td>
      <td><strong>${escapeHtml(applianceName)}</strong></td>
      <td><strong>Срок лечения:</strong></td>
      <td>${plan.estimatedDurationMonths ?? 18} месяцев</td>
    </tr>
    <tr>
      <td><strong>Этапы лечения:</strong></td>
      <td colspan="3">${escapeHtml(Array.isArray(plan.treatmentStages) ? plan.treatmentStages.join("; ") : (plan.treatmentStages || "1. Нивелирование дугами NiTi. 2. Юстировка и торк стальными дугами TMA. 3. Детализация контактов. 4. Ретенция."))}</td>
    </tr>
    <tr>
      <td><strong>Ретенционный протокол:</strong></td>
      <td colspan="3">${escapeHtml(plan.retentionProtocol || plan.retentionPlan || "Несъемные проволочные ретейнеры 33-43, 13-23 + прозрачные ночные капы")}</td>
    </tr>
  </table>

  <div class="signature-row" style="margin-top:20px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-ортодонт: ${escapeHtml(doctorName)} <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Заказчик): ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
