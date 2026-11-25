import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "../sharedStyles.js";

interface ExposureEntryLike {
	readonly studyDate?: string | null | undefined;
	readonly date?: string | null | undefined;
	readonly studyType?: string | null | undefined;
	readonly procedureName?: string | null | undefined;
	readonly anatomicalArea?: string | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly apparatusModel?: string | null | undefined;
	readonly xrayApparatus?: string | null | undefined;
	readonly tubeVoltageKv?: number | null | undefined;
	readonly tubeCurrentMa?: number | null | undefined;
	readonly exposureTimeSeconds?: number | null | undefined;
	readonly effectiveDoseMsv?: number | null | undefined;
	readonly effectiveDoseMicrosieverts?: number | null | undefined;
	readonly radiologistFullName?: string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface RadiationDoseSheetRenderPayload {
	readonly organization?: { readonly fullName?: string | null; readonly address?: string | null } | undefined;
	readonly clinicLegalName?: string | null | undefined;
	readonly clinic?: { readonly name?: string | null } | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicLicenseNumber?: string | null | undefined;
	readonly patient?: {
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly gender?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
	} | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientSex?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly reportingYear?: number | string | undefined;
	readonly year?: number | string | undefined;
	readonly exposureEntries?: readonly ExposureEntryLike[] | undefined;
	readonly exposures?: readonly ExposureEntryLike[] | undefined;
	readonly radiationStudies?: readonly ExposureEntryLike[] | undefined;
	readonly annualSummary?: { readonly totalDoseYearMsv?: number | undefined } | undefined;
	readonly summaryAnnualDose?: { readonly totalDoseYearMsv?: number | undefined } | undefined;
	readonly cumulativeDoseMsv?: number | undefined;
	readonly responsibleOfficerFullName?: string | null | undefined;
	readonly chiefSafetyOfficer?: string | null | undefined;
	readonly [key: string]: unknown;
}

/**
 * 6. Рендерер Листа учета дозовых нагрузок пациента при рентгенологических исследованиях
 * СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09 (НРБ-99/2009)
 * Annual safety limit 1.0 mSv progress gauge + X-ray equipment log + modality breakdown + ALARA safety note
 */
export function renderRadiationDoseSheetHtml(payload: RadiationDoseSheetRenderPayload): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const licenseNumber = payload.clinicLicenseNumber || "ЛО-77-01-012345";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const year = payload.reportingYear || payload.year || new Date().getFullYear();

	const exposures: readonly ExposureEntryLike[] = payload.exposureEntries || payload.exposures || payload.radiationStudies || [];
	const annualSummary = payload.annualSummary || payload.summaryAnnualDose || {};

	// Calculate cumulative annual dose
	let sumDoseMsv = 0;
	let sumDoseMksv = 0;
	const modalityMap = new Map<string, { count: number; doseMsv: number }>();

	for (const ex of exposures) {
		const dMsv = Number(ex.effectiveDoseMsv ?? (ex.effectiveDoseMicrosieverts ? ex.effectiveDoseMicrosieverts / 1000 : 0));
		const dMksv = Number(ex.effectiveDoseMicrosieverts ?? (dMsv * 1000));
		sumDoseMsv += dMsv;
		sumDoseMksv += dMksv;

		const typeKey = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const cur = modalityMap.get(typeKey) || { count: 0, doseMsv: 0 };
		cur.count++;
		cur.doseMsv += dMsv;
		modalityMap.set(typeKey, cur);
	}

	const totalDoseMsv = sumDoseMsv > 0 ? Number(sumDoseMsv.toFixed(4)) : Number((annualSummary.totalDoseYearMsv ?? payload.cumulativeDoseMsv ?? 0).toFixed(4));
	const totalDoseMksv = sumDoseMksv > 0 ? Number(sumDoseMksv.toFixed(1)) : Number((totalDoseMsv * 1000).toFixed(1));

	// SanPiN threshold evaluation (1.0 mSv annual limit)
	const sanpinLimitMsv = 1.0;
	const pctOfLimit = Number(((totalDoseMsv / sanpinLimitMsv) * 100).toFixed(1));
	const gaugeWidthPct = Math.min(100, Math.max(2, pctOfLimit));

	let zoneClass = "green";
	let zoneBadgeClass = "badge-green";
	let zoneTitle = "ЗЕЛЕНАЯ ЗОНА (Оптимальная радиационная безопасность)";
	let zoneRecommendation = "Накопленная эффективная доза находится в пределах фоновых нормативных значений СанПиН. Дополнительных ограничений нет.";

	if (totalDoseMsv >= 1.0) {
		zoneClass = "red";
		zoneBadgeClass = "badge-red";
		zoneTitle = "КРАСНАЯ ЗОНА (Превышение контрольного годового уровня 1.0 мЗв)";
		zoneRecommendation = "Внимание: достигнут рекомендуемый годовой порог 1.0 мЗв (СанПиН 2.6.1.2523-09 НРБ-99/2009). Все последующие исследования проводятся по обоснованным клиническим показаниям с записью в медицинской карте без блокировки съемки.";
	} else if (totalDoseMsv >= 0.5) {
		zoneClass = "yellow";
		zoneBadgeClass = "badge-yellow";
		zoneTitle = "ЖЕЛТАЯ ЗОНА (Умеренная лучевая нагрузка 0.5–1.0 мЗв)";
		zoneRecommendation = "Нагрузка допустима. Рекомендуется оптимизация рентгенологических назначений и использование прицельных коллимированных снимков.";
	}

	const studyLabels: Record<string, string> = {
		intraoral_radiovisiography: "Прицельная радиовизиография (цифровая)",
		optg_digital_panoramic: "Ортопантомограмма (цифровая ОПТГ)",
		trg_cephalometric_lateral: "Телерентгенограмма ТРГ (боковая)",
		trg_cephalometric_frontal: "Телерентгенограмма ТРГ (прямая)",
		cbct_segment_5x5: "КЛКТ сегмента зубного ряда (FOV 5x5 см)",
		cbct_jaw_8x8: "КЛКТ челюстей (FOV 8x8 см)",
		cbct_full_maxillofacial_15x15: "КЛКТ челюстно-лицевой области (15x15 см)",
		film_intraoral_legacy: "Пленочная прицельная рентгенография",
	};

	const exposureRows = exposures.map((ex: ExposureEntryLike, idx: number) => {
		const d = ex.studyDate || ex.date || "—";
		const rawType = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const typeLabel = studyLabels[rawType] || rawType;
		const area = ex.anatomicalArea || ex.toothNumber || "—";
		const apparat = ex.apparatusModel || ex.xrayApparatus || "Vatech Pax-i / Planmeca ProX";
		const params = `${ex.tubeVoltageKv ?? 65} кВ / ${ex.tubeCurrentMa ?? 7} мА / ${ex.exposureTimeSeconds ?? 0.1} с`;
		const dMsv = Number(ex.effectiveDoseMsv ?? 0.003).toFixed(4);
		const dMksv = Number((ex.effectiveDoseMsv ? ex.effectiveDoseMsv * 1000 : (ex.effectiveDoseMicrosieverts ?? 3.0))).toFixed(1);
		const staff = ex.radiologistFullName || ex.operatorName || "Врач-рентгенолог";

		return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(d)}</td>
        <td class="left"><strong>${escapeHtml(typeLabel)}</strong></td>
        <td class="center">${escapeHtml(area)}</td>
        <td class="left">${escapeHtml(apparat)}</td>
        <td class="center">${escapeHtml(params)}</td>
        <td class="right"><strong>${dMsv}</strong></td>
        <td class="right">${dMksv}</td>
        <td class="left">${escapeHtml(staff)}</td>
        <td class="center" style="font-size:7pt; color:#64748b;">Подписано</td>
      </tr>
    `;
	}).join("");

	// Modality breakdown rows
	const modalityRows = Array.from(modalityMap.entries()).map(([k, v]) => {
		const label = studyLabels[k] || k;
		return `
      <tr>
        <td><strong>${escapeHtml(label)}</strong></td>
        <td class="center">${v.count}</td>
        <td class="right"><strong>${v.doseMsv.toFixed(4)} мЗв</strong> (${(v.doseMsv * 1000).toFixed(1)} мкЗв)</td>
        <td class="right">${((v.doseMsv / (totalDoseMsv || 1)) * 100).toFixed(1)}%</td>
      </tr>
    `;
	}).join("");

	const safetyOfficer = payload.responsibleOfficerFullName || payload.chiefSafetyOfficer || "Д-р Смирнов А.П. (Ответственный за РБ)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientName)} (${year} г.)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)} | Лицензия: № ${escapeHtml(licenseNumber)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">САНПИН 2.6.1.1192-03</div>
      <div>Радиационная безопасность</div>
      <div><strong>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК</strong></div>
      <div>НРБ-99/2009 (СанПиН 2.6.1.2523-09)</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</h1>
    <p class="doc-sub-title">Вкладыш в медицинскую карту № <strong>${escapeHtml(cardNum)}</strong> (Форма № 043/у) | Год учета: <strong>${escapeHtml(String(year))}</strong></p>
  </div>

  <div class="section-title">1. Данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Медицинская карта:</strong></td>
      <td>№ ${escapeHtml(cardNum)} (Форма 043/у)</td>
      <td><strong>Год учета:</strong></td>
      <td><strong>${escapeHtml(String(year))} г.</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Монитор лучевой нагрузки и шкала безопасности СанПиН</div>
  <div class="dose-gauge-container">
    <div class="kpi-grid" style="grid-template-columns:repeat(4, 1fr); margin-bottom:8px;">
      <div class="kpi-card">
        <div class="kpi-val" style="color:${zoneClass === 'green' ? '#16a34a' : (zoneClass === 'yellow' ? '#d97706' : '#dc2626')};">${totalDoseMsv.toFixed(4)} мЗв</div>
        <div class="kpi-lbl">Накопленная доза (${totalDoseMksv.toFixed(1)} мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">1.0000 мЗв</div>
        <div class="kpi-lbl">Предел СанПиН (1000 мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${pctOfLimit}%</div>
        <div class="kpi-lbl">Загрузка годового лимита</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${exposures.length}</div>
        <div class="kpi-lbl">Проведено снимков / КТ</div>
      </div>
    </div>

    <div style="font-size:7.5pt; font-weight:700; margin-bottom:2px;">
      Индикатор лучевой нагрузки (0.00 — 1.00 мЗв):
      <span class="badge ${zoneBadgeClass}" style="margin-left:6px;">${zoneTitle}</span>
    </div>

    <div class="dose-gauge-track">
      <div class="dose-gauge-fill ${zoneClass}" style="width:${gaugeWidthPct}%;"></div>
    </div>
    <div class="dose-gauge-scale">
      <span>0.00 мЗв (Фон)</span>
      <span>0.50 мЗв (Порог умеренной нагрузки)</span>
      <span>1.00 мЗв (Предел СанПиН 2.6.1.1192-03)</span>
    </div>

    <div style="font-size:7.5pt; color:#475569; margin-top:6px; line-height:1.25;">
      <strong>Заключение по радиационной безопасности:</strong> ${escapeHtml(zoneRecommendation)}
    </div>
  </div>

  <div class="section-title">3. Реестр проведенных рентгенологических исследований</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th style="width:3%;">№</th>
        <th style="width:10%;">Дата</th>
        <th style="width:20%;">Вид исследования</th>
        <th style="width:10%;">Область</th>
        <th style="width:18%;">Аппарат (модель)</th>
        <th style="width:13%;">кВ / мА / с</th>
        <th style="width:7%;">мЗв</th>
        <th style="width:7%;">мкЗв</th>
        <th style="width:12%;">Рентгенлаборант / Врач</th>
        <th style="width:6%;">Подпись</th>
      </tr>
    </thead>
    <tbody>
      ${exposureRows || `
      <tr>
        <td colspan="10" class="center" style="padding:8px;">Рентгенологические исследования в ${year} году не проводились</td>
      </tr>
      `}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" class="center">ИТОГО ЗА ${year} ГОД:</td>
        <td class="left">Всего исследований: <strong>${exposures.length}</strong></td>
        <td class="right"><strong>ИТОГО ДОЗА:</strong></td>
        <td class="right"><strong>${totalDoseMsv.toFixed(4)}</strong></td>
        <td class="right"><strong>${totalDoseMksv.toFixed(1)}</strong></td>
        <td colspan="2" class="center" style="font-size:6.5pt; color:#475569;">СанПиН 2.6.1.1192-03</td>
      </tr>
    </tfoot>
  </table>

  ${modalityRows ? `
  <div class="section-title">4. Структура исследований по модальностям</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:40%;">Модальность исследования</th>
        <th style="width:20%;">Количество</th>
        <th style="width:25%;">Суммарная доза</th>
        <th style="width:15%;">Доля в нагрузке</th>
      </tr>
    </thead>
    <tbody>
      ${modalityRows}
    </tbody>
  </table>
  ` : ""}

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:7pt; color:#475569; line-height:1.25;">
    <strong>Нормативная справка (СанПиН 2.6.1.2523-09 НРБ-99/2009):</strong>
    Допустимая эффективная доза облучения населения при проведении профилактических медицинских рентгенологических исследований не должна превышать <strong>1.0 мЗв (1000 мкЗв) в год</strong>. При диагностических исследованиях дозовые нагрузки нормируются клинической целесообразностью и принципом ALARA (As Low As Reasonably Achievable — максимально достижимый низкий уровень облучения).
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Ответственный за радиационную безопасность: <strong>${escapeHtml(safetyOfficer)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Лечащий врач: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
