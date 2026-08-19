import type { FullForm043uPayload } from "./forms043u.js";
import { toothStatusCodeShortMap } from "./forms043u.js";
import type { OrthodonticCard043_1uPayload } from "./forms043_1u.js";
import type { DailyDentistDiary037uPayload } from "./forms037u.js";
import type { SummaryDentistStatement039uPayload } from "./forms039u.js";
import type { MedicalCardExtract003vuPayload } from "./forms003vu.js";
import type { RadiationDoseSheetPayload } from "./radiationDoseSheet.js";
import { dentalRadiologyStudyLabels } from "./radiationDoseSheet.js";

/** Утилита экранирования HTML для предотвращения XSS и mojibake */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/** Базовые стили для печати клинических документов А4 */
export const CLINICAL_DOCUMENT_PRINT_STYLES = `
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 15mm 15mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    font-family: "Liberation Sans", "DejaVu Sans", "Segoe UI", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  .doc-container {
    max-width: 100%;
    margin: 0 auto;
  }
  .header-grid {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 16px;
    border-bottom: 2px solid #222;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .clinic-info {
    font-size: 9.5pt;
  }
  .clinic-title {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .doc-requisites {
    text-align: right;
    font-size: 8.5pt;
    color: #333;
    line-height: 1.25;
  }
  .doc-title-block {
    text-align: center;
    margin: 12px 0 16px 0;
  }
  .doc-main-title {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 4px 0;
  }
  .doc-sub-title {
    font-size: 10pt;
    font-weight: normal;
    color: #444;
    margin: 0;
  }
  .section-title {
    font-size: 10.5pt;
    font-weight: bold;
    background: #f0f4f8;
    padding: 4px 8px;
    margin: 14px 0 6px 0;
    border-left: 4px solid #1a56db;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 9.5pt;
  }
  .data-table th, .data-table td {
    border: 1px solid #777;
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
  }
  .data-table th {
    background-color: #f5f5f5;
    font-weight: bold;
    text-align: center;
  }
  .data-table td.center {
    text-align: center;
  }
  .data-table td.right {
    text-align: right;
  }
  .odontogram-grid {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    text-align: center;
    font-size: 8.5pt;
  }
  .odontogram-grid th, .odontogram-grid td {
    border: 1px solid #444;
    padding: 3px 2px;
    min-width: 22px;
  }
  .odontogram-grid th {
    background: #e9edf2;
    font-weight: bold;
  }
  .tooth-active-status {
    font-weight: bold;
    color: #b91c1c;
  }
  .tooth-norm {
    color: #047857;
  }
  .soap-entry {
    border: 1px solid #bbb;
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 10px;
    background: #fafbfc;
    page-break-inside: avoid;
  }
  .soap-tag {
    display: inline-block;
    font-weight: bold;
    background: #e0e7ff;
    color: #3730a3;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 8.5pt;
    margin-right: 4px;
  }
  .signature-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 24px;
    page-break-inside: avoid;
  }
  .sig-line {
    border-bottom: 1px solid #000;
    margin-top: 28px;
    position: relative;
  }
  .sig-caption {
    font-size: 8pt;
    color: #666;
    text-align: center;
    margin-top: 2px;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 8.5pt;
    font-weight: bold;
  }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  @media print {
    body { font-size: 9.5pt; }
    .no-print { display: none; }
    .page-break-after { page-break-after: always; }
  }
</style>
`;

/** 1. Рендерер Формы № 043/у — Медицинская карта стоматологического больного */
export function renderForm043uHtml(payload: FullForm043uPayload): string {
	// Подготовка формулы зубов верхней и нижней челюсти
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

	const toothMap = new Map(payload.odontogramTeeth.map((t) => [t.toothNumber, t]));

	const renderToothRow = (teeth: number[]) =>
		teeth
			.map((num) => {
				const rec = toothMap.get(num);
				const code = rec ? rec.statusCode : "healthy";
				const label = toothStatusCodeShortMap[code] || "Norm";
				const isAbnormal = code !== "healthy";
				return `<td class="${isAbnormal ? "tooth-active-status" : "tooth-norm"}">${escapeHtml(label)}</td>`;
			})
			.join("");

	const renderToothHeaders = (teeth: number[]) =>
		teeth.map((num) => `<th>${num}</th>`).join("");

	// Дневники приёма SOAP
	const diariesHtml =
		payload.soapDiaries.length > 0
			? payload.soapDiaries
					.map(
						(d) => `
      <div class="soap-entry">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong>Дата приёма: ${escapeHtml(d.entryDate)} ${d.toothNumber ? `| Зуб: ${escapeHtml(d.toothNumber)}` : ""}</strong>
          <span>Врач: <strong>${escapeHtml(d.doctorFullName)}</strong></span>
        </div>
        <p style="margin:4px 0;"><span class="soap-tag">S</span> <strong>Жалобы:</strong> ${escapeHtml(d.subjectiveComplaints)}</p>
        <p style="margin:4px 0;"><span class="soap-tag">O</span> <strong>Объективно (Status localis):</strong> ${escapeHtml(d.objectiveStatusLocalis)}</p>
        <p style="margin:4px 0; font-size:9pt; color:#444;">
          Перкуссия верт.: <strong>${escapeHtml(d.percussionVertical)}</strong>, гор.: <strong>${escapeHtml(d.percussionHorizontal)}</strong> |
          Зондирование: <strong>${escapeHtml(d.probingTenderness)}</strong> |
          Термопроба: <strong>${escapeHtml(d.thermalTestResponse)}</strong>
          ${d.eodMicroamperes !== null && d.eodMicroamperes !== undefined ? ` | ЭОД: <strong>${d.eodMicroamperes} мкА</strong>` : ""}
        </p>
        <p style="margin:4px 0;"><span class="soap-tag">A</span> <strong>Диагноз:</strong> ${escapeHtml(d.assessmentDiagnosisText)} (Код МКБ-10: <strong>${escapeHtml(d.assessmentIcd10Code)}</strong>)</p>
        <p style="margin:4px 0;"><span class="soap-tag">P</span> <strong>Лечение и протокол:</strong> ${escapeHtml(d.procedureProtocol)}</p>
        ${d.anesthesiaDetails ? `<p style="margin:2px 0 2px 24px; font-size:9pt;">• Анестезия: ${escapeHtml(d.anesthesiaDetails)}</p>` : ""}
        ${d.appliedMaterials ? `<p style="margin:2px 0 2px 24px; font-size:9pt;">• Материалы: ${escapeHtml(d.appliedMaterials)}</p>` : ""}
        ${d.homeCareRecommendations ? `<p style="margin:2px 0 2px 24px; font-size:9pt;">• Назначения/рекомендации: ${escapeHtml(d.homeCareRecommendations)}</p>` : ""}
        ${d.nextVisitDate ? `<p style="margin:4px 0; font-weight:bold; color:#1e40af;">Следующий визит назначен на: ${escapeHtml(d.nextVisitDate)}</p>` : ""}
      </div>
    `,
					)
					.join("")
			: `<p><em>Дневники приёма отсутствуют.</em></p>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта стоматологического пациента № ${escapeHtml(payload.medicalCardNumber)} (Форма 043/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>${escapeHtml(payload.clinicAddress || "")}</div>
      <div>ОГРН: ${escapeHtml(payload.clinicOgrn || "—")} | ИНН: ${escapeHtml(payload.clinicInn || "—")}</div>
      <div>Лицензия № ${escapeHtml(payload.clinicLicenseNumber || "—")} от ${escapeHtml(payload.clinicLicenseDate || "—")} (${escapeHtml(payload.clinicLicenseIssuer || "")})</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      Медицинская документация<br/>
      <strong>Форма № 043/у</strong><br/>
      Утв. приказом Минздрава СССР № 1030
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(payload.medicalCardNumber)}</h1>
    <p class="doc-sub-title">Дата открытия карты: <strong>${escapeHtml(payload.cardOpenedDate)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Ф.И.О. пациента:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(payload.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Возраст:</strong></td>
      <td style="width:15%;">${payload.patientSex === "male" ? "Мужской" : "Женский"} / ${escapeHtml(payload.patientBirthDate)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(payload.patientPhone || "—")}</td>
      <td><strong>СНИЛС:</strong></td>
      <td>${escapeHtml(payload.patientSnils || "—")}</td>
    </tr>
    <tr>
      <td><strong>Адрес регистрации:</strong></td>
      <td colspan="3">${escapeHtml(payload.patientAddressRegistration || payload.patientAddressResidence || "—")}</td>
    </tr>
    <tr>
      <td><strong>Документ личности:</strong></td>
      <td>${escapeHtml(payload.patientIdentityDocument || "—")}</td>
      <td><strong>Полис ОМС/ДМС:</strong></td>
      <td>${escapeHtml(payload.patientInsurancePolicy || "—")}</td>
    </tr>
    <tr>
      <td><strong>Лечащий врач:</strong></td>
      <td colspan="3"><strong>${escapeHtml(payload.attendingDoctorFullName)}</strong> (${escapeHtml(payload.attendingDoctorSpecialty)})</td>
    </tr>
  </table>

  <div class="section-title">2. Анамнез жизни и сопутствующие заболевания</div>
  <table class="data-table">
    <tr>
      <td style="width:30%;"><strong>Аллергологический анамнез:</strong></td>
      <td>${escapeHtml(payload.allergologicalHistory)}</td>
    </tr>
    <tr>
      <td><strong>Сопутствующие патологии:</strong></td>
      <td>${escapeHtml(payload.concomitantDiseases)}</td>
    </tr>
    <tr>
      <td><strong>Принимаемые препараты:</strong></td>
      <td>${escapeHtml(payload.currentMedications)}</td>
    </tr>
    <tr>
      <td><strong>Беременность / Лактация:</strong></td>
      <td>${escapeHtml(payload.pregnancyLactationStatus)}</td>
    </tr>
    <tr>
      <td><strong>Ранее перенесенные вмешательства:</strong></td>
      <td>${escapeHtml(payload.pastDentalInterventions)}</td>
    </tr>
  </table>

  <div class="section-title">3. Данные первичного осмотра и зубная формула FDI</div>
  <p><strong>Жалобы при обращении:</strong> ${escapeHtml(payload.chiefComplaint)}</p>
  <p><strong>Развитие настоящего заболевания:</strong> ${escapeHtml(payload.historyOfPresentIllness)}</p>

  <table class="odontogram-grid">
    <tr>
      <th colspan="16" style="background:#dbeafe;">ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ СТОРОНА — ЛЕВАЯ СТОРОНА)</th>
    </tr>
    <tr>${renderToothHeaders(upperTeeth)}</tr>
    <tr>${renderToothRow(upperTeeth)}</tr>
    <tr><td colspan="16" style="border:none; height:4px; background:#fff;"></td></tr>
    <tr>${renderToothRow(lowerTeeth)}</tr>
    <tr>${renderToothHeaders(lowerTeeth)}</tr>
    <tr>
      <th colspan="16" style="background:#dbeafe;">НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ СТОРОНА — ЛЕВАЯ СТОРОНА)</th>
    </tr>
  </table>

  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px;">
    <div>
      <p style="margin:2px 0;"><strong>Индекс КПУ зубов:</strong> <strong>${payload.dmftIndex.totalDmft}</strong> (К=${payload.dmftIndex.decayed}, П=${payload.dmftIndex.filled}, У=${payload.dmftIndex.missing}) | КПУ(п)=${payload.dmftIndex.totalDmfs}</p>
      <p style="margin:2px 0;"><strong>Уровень интенсивности кариеса:</strong> <span class="badge ${payload.dmftIndex.intensityLevel === "high" || payload.dmftIndex.intensityLevel === "very_high" ? "badge-red" : "badge-green"}">${payload.dmftIndex.intensityLevel.toUpperCase()}</span></p>
      <p style="margin:2px 0;"><strong>Индекс гигиены:</strong> ${escapeHtml(payload.hygieneIndexOhiS)}</p>
    </div>
    <div>
      <p style="margin:2px 0;"><strong>Индекс CPITN (секстанты):</strong> ${payload.cpitnIndex.sextant18_14} | ${payload.cpitnIndex.sextant13_23} | ${payload.cpitnIndex.sextant24_28} / ${payload.cpitnIndex.sextant48_44} | ${payload.cpitnIndex.sextant43_33} | ${payload.cpitnIndex.sextant34_38}</p>
      <p style="margin:2px 0;"><strong>Прикус:</strong> ${escapeHtml(payload.biteDescription)}</p>
      <p style="margin:2px 0;"><strong>Состояние СОПР:</strong> ${escapeHtml(payload.oralMucosaStatus.color)}, ${escapeHtml(payload.oralMucosaStatus.tongueStatus)}</p>
    </div>
  </div>

  <div class="section-title">4. Рентгенологическое обследование и план лечения</div>
  <p><strong>Данные рентгенографии:</strong> ${escapeHtml(payload.xrayFindingsDescription)}</p>
  <p><strong>Общий план лечения:</strong> ${escapeHtml(payload.generalTreatmentPlan)}</p>

  <div class="section-title">5. Дневники приёма и протоколы лечения (SOAP)</div>
  ${diariesHtml}

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись лечащего врача: ${escapeHtml(payload.attendingDoctorFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись пациента / законного представителя</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 2. Рендерер Формы № 043-1/у — Медицинская карта ортодонтического пациента */
export function renderForm043_1uHtml(payload: OrthodonticCard043_1uPayload): string {
	const stagesHtml = payload.appliancePlan.treatmentStages
		.map((st) => `<li>${escapeHtml(st)}</li>`)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Карта ортодонтического пациента № ${escapeHtml(payload.medicalCardNumber)} (Форма 043-1/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>${escapeHtml(payload.clinicAddress || "")}</div>
      <div>ОГРН: ${escapeHtml(payload.clinicOgrn || "—")} | ИНН: ${escapeHtml(payload.clinicInn || "—")}</div>
      <div>Лицензия № ${escapeHtml(payload.clinicLicenseNumber || "—")} от ${escapeHtml(payload.clinicLicenseDate || "—")}</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      Медицинская документация<br/>
      <strong>Форма № 043-1/у</strong><br/>
      Ортодонтическая амбулаторная карта
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(payload.medicalCardNumber)}</h1>
    <p class="doc-sub-title">Дата открытия карты: <strong>${escapeHtml(payload.cardOpenedDate)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть и клинический диагноз</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Ф.И.О. пациента:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(payload.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Д.Р.:</strong></td>
      <td style="width:15%;">${payload.patientSex === "male" ? "Муж." : "Жен."} / ${escapeHtml(payload.patientBirthDate)}</td>
    </tr>
    <tr>
      <td><strong>Представитель:</strong></td>
      <td>${escapeHtml(payload.legalRepresentativeFullName || "—")}</td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(payload.patientPhone || "—")}</td>
    </tr>
    <tr>
      <td><strong>Врач-ортодонт:</strong></td>
      <td colspan="3"><strong>${escapeHtml(payload.orthodontistFullName)}</strong></td>
    </tr>
    <tr>
      <td><strong>Клинический диагноз:</strong></td>
      <td colspan="3"><strong>${escapeHtml(payload.orthodonticDiagnosis)}</strong> (МКБ-10: <strong>${escapeHtml(payload.icd10DiagnosisCode)}</strong>)</td>
    </tr>
    <tr>
      <td><strong>Соотношение моляров/клыков:</strong></td>
      <td colspan="3">Справа: Моляры ${escapeHtml(payload.angleMolarClassRight)}, Клыки ${escapeHtml(payload.angleCanineClassRight)} | Слева: Моляры ${escapeHtml(payload.angleMolarClassLeft)}, Клыки ${escapeHtml(payload.angleCanineClassLeft)}</td>
    </tr>
  </table>

  <div class="section-title">2. Антропометрия и фотометрия лица</div>
  <table class="data-table">
    <tr>
      <td style="width:30%;"><strong>Морфологический тип лица:</strong></td>
      <td>${escapeHtml(payload.anthropometry.facialType)} (${payload.anthropometry.facialSymmetry === "symmetric" ? "Симметричное" : `Асимметрия, смещение ${payload.anthropometry.chinDeviationMm} мм`})</td>
    </tr>
    <tr>
      <td><strong>Профиль лица:</strong></td>
      <td>${escapeHtml(payload.anthropometry.profileType)}, носогубный угол: <strong>${payload.anthropometry.nasolabialAngleDegrees}°</strong>, подбородочная складка: ${escapeHtml(payload.anthropometry.mentolabialSulcus)}</td>
    </tr>
    <tr>
      <td><strong>Смыкание губ в покое / Улыбка:</strong></td>
      <td>${escapeHtml(payload.anthropometry.lipCompetenceAtRest)}, экспозиция резцов: <strong>${payload.anthropometry.incisalDisplayAtSmileMm} мм</strong> ${payload.anthropometry.gummySmileMm > 0 ? `(десневая улыбка ${payload.anthropometry.gummySmileMm} мм)` : ""}</td>
    </tr>
  </table>

  <div class="section-title">3. Цефалометрия ТРГ (Телерентгенография)</div>
  <table class="data-table">
    <tr>
      <th>Параметр</th>
      <th>Измеренное значение</th>
      <th>Норма</th>
      <th>Клиническая интерпретация</th>
    </tr>
    <tr>
      <td><strong>SNA</strong> (положение верхней челюсти)</td>
      <td class="center"><strong>${payload.cephalometry.snaAngle}°</strong></td>
      <td class="center">82° ± 2°</td>
      <td>${payload.cephalometry.snaAngle > 84 ? "Прогнатия в/ч" : payload.cephalometry.snaAngle < 80 ? "Ретрогнатия в/ч" : "Нормальное сагиттальное положение"}</td>
    </tr>
    <tr>
      <td><strong>SNB</strong> (положение нижней челюсти)</td>
      <td class="center"><strong>${payload.cephalometry.snbAngle}°</strong></td>
      <td class="center">80° ± 2°</td>
      <td>${payload.cephalometry.snbAngle > 82 ? "Прогнатия н/ч" : payload.cephalometry.snbAngle < 78 ? "Ретрогнатия н/ч" : "Нормальное сагиттальное положение"}</td>
    </tr>
    <tr>
      <td><strong>ANB</strong> (сагиттальное соотношение)</td>
      <td class="center"><strong>${payload.cephalometry.anbAngle}°</strong></td>
      <td class="center">2° ± 1°</td>
      <td><strong>${payload.cephalometry.skeletalClass.toUpperCase()}</strong> (Wits = ${payload.cephalometry.witsAppraisalMm} мм)</td>
    </tr>
    <tr>
      <td><strong>FMA / Sn-GoGn</strong> (вертикальный рост)</td>
      <td class="center"><strong>${payload.cephalometry.fmaAngle}° / ${payload.cephalometry.snGoGnAngle}°</strong></td>
      <td class="center">25° / 32°</td>
      <td>Тип роста: <strong>${payload.cephalometry.growthPattern}</strong></td>
    </tr>
    <tr>
      <td><strong>Межрезцовый угол (1-1)</strong></td>
      <td class="center"><strong>${payload.cephalometry.interincisalAngle}°</strong></td>
      <td class="center">130° ± 5°</td>
      <td>Наклон резцов: 1-NA = ${payload.cephalometry.upperIncisorToNaAngle}°, 1-NB = ${payload.cephalometry.lowerIncisorToNbAngle}°</td>
    </tr>
  </table>

  <div class="section-title">4. Ортодонтические индексы (Тона, Пона, Болтона, Коркхауза)</div>
  <ul style="margin:6px 0; padding-left:20px; font-size:9.5pt;">
    <li><strong>Индекс Тона:</strong> ${escapeHtml(payload.tonnIndexNotes)}</li>
    <li><strong>Индекс Пона:</strong> ${escapeHtml(payload.pontIndexNotes)}</li>
    <li><strong>Индекс Болтона:</strong> ${escapeHtml(payload.boltonIndexNotes)}</li>
    <li><strong>Индекс Коркхауза:</strong> ${escapeHtml(payload.korkhausIndexNotes)}</li>
  </ul>

  <div class="section-title">5. План аппаратурного лечения и ретенционный протокол</div>
  <p><strong>Выбранная аппаратура:</strong> <strong>${escapeHtml(payload.appliancePlan.applianceType)}</strong> (Планируемый срок лечения: <strong>${payload.appliancePlan.estimatedDurationMonths} мес.</strong>)</p>
  <p><strong>План экстракции:</strong> ${escapeHtml(payload.appliancePlan.extractionPlan)}</p>
  <p><strong>Этапы ортодонтического лечения:</strong></p>
  <ol style="margin:4px 0; padding-left:20px; font-size:9.5pt;">
    ${stagesHtml}
  </ol>
  <p><strong>Ретенционный протокол:</strong> ${escapeHtml(payload.appliancePlan.retentionProtocol)}</p>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-ортодонт: ${escapeHtml(payload.orthodontistFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись пациента / законного представителя</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 3. Рендерер Формы № 037/у-88 — Листок ежедневного учета работы врача-стоматолога */
export function renderForm037uHtml(payload: DailyDentistDiary037uPayload): string {
	const rowsHtml = payload.patientRecords
		.map(
			(r) => `
    <tr>
      <td class="center">${r.sequenceNumber}</td>
      <td><strong>${escapeHtml(r.patientFullName)}</strong></td>
      <td class="center">${r.patientAge} (${r.patientCategory === "adult" ? "Взр." : r.patientCategory === "child_under_14" ? "Дет." : "Подр."})</td>
      <td class="center">${escapeHtml(r.medicalCardNumber)}</td>
      <td class="center">${r.isPrimaryVisit ? "Перв." : "Повт."} ${r.isSanatedInVisit ? "<strong>(Сан)</strong>" : ""}</td>
      <td>${escapeHtml(r.diagnosisIcd10)}: ${escapeHtml(r.diagnosisText)}</td>
      <td>${escapeHtml(r.performedProceduresSummary)}</td>
      <td class="center"><strong>${r.totalUetForVisit.toFixed(2)}</strong></td>
    </tr>
  `,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Листок ежедневного учета № 037/у-88 от ${escapeHtml(payload.shiftDate)} — ${escapeHtml(payload.doctorFullName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>Отделение: <strong>${escapeHtml(payload.clinicDepartment)}</strong></div>
      <div>Врач: <strong>${escapeHtml(payload.doctorFullName)}</strong> (${escapeHtml(payload.doctorSpecialty)})</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав СССР / РФ</strong><br/>
      Медицинская документация<br/>
      <strong>Форма № 037/у-88</strong><br/>
      Утв. приказом № 50-88
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Дата смены: <strong>${escapeHtml(payload.shiftDate)}</strong> | Смена: <strong>${escapeHtml(payload.shiftNumber)}</strong> (${escapeHtml(payload.shiftWorkingHours)})</p>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width:30px;">№</th>
        <th>Ф.И.О. пациента</th>
        <th style="width:65px;">Возраст</th>
        <th style="width:75px;">№ карты</th>
        <th style="width:65px;">Визит</th>
        <th>Диагноз (МКБ-10)</th>
        <th>Объем выполненной работы</th>
        <th style="width:55px;">УЕТ</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="8" class="center">Записи за смену отсутствуют</td></tr>`}
    </tbody>
  </table>

  <div class="section-title">Сводные итоги за смену</div>
  <table class="data-table" style="width:100%;">
    <tr>
      <td><strong>Всего принято пациентов:</strong></td>
      <td class="center"><strong>${payload.summaryTotals.totalPatientsCount}</strong></td>
      <td><strong>Взрослых:</strong></td>
      <td class="center">${payload.summaryTotals.totalAdultsCount}</td>
      <td><strong>Детей (до 14):</strong></td>
      <td class="center">${payload.summaryTotals.totalChildrenUnder14Count}</td>
      <td><strong>Подростков (15-17):</strong></td>
      <td class="center">${payload.summaryTotals.totalAdolescents15_17Count}</td>
    </tr>
    <tr>
      <td><strong>Первичных / Повторных:</strong></td>
      <td class="center">${payload.summaryTotals.totalPrimaryVisitsCount} / ${payload.summaryTotals.totalRepeatVisitsCount}</td>
      <td><strong>Санировано:</strong></td>
      <td class="center"><strong>${payload.summaryTotals.totalSanatedCount}</strong></td>
      <td><strong>Выработано УЕТ:</strong></td>
      <td class="center"><strong>${payload.summaryTotals.totalUetAccumulated.toFixed(2)}</strong></td>
      <td><strong>Выполнение нормы:</strong></td>
      <td class="center"><span class="badge ${payload.summaryTotals.planExecutionPercentage >= 100 ? "badge-green" : "badge-yellow"}">${payload.summaryTotals.planExecutionPercentage}%</span></td>
    </tr>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись врача-стоматолога: ${escapeHtml(payload.doctorFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись зав. отделением / ответственного лица</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 4. Рендерер Формы № 039/у-88 — Сводная ведомость учета работы врача-стоматолога */
export function renderForm039uHtml(payload: SummaryDentistStatement039uPayload): string {
	const m = payload.consolidatedMetrics;
	const u = payload.uetBreakdown;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Сводная ведомость № 039/у-88 за ${escapeHtml(payload.reportingPeriodMonthYear)} — ${escapeHtml(payload.doctorFullName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>Отделение: <strong>${escapeHtml(payload.clinicDepartment)}</strong></div>
      <div>Врач: <strong>${escapeHtml(payload.doctorFullName)}</strong> (${escapeHtml(payload.doctorSpecialty)})</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав СССР / РФ</strong><br/>
      Медицинская документация<br/>
      <strong>Форма № 039/у-88</strong><br/>
      Сводная ведомость по УЕТ (Приказ 804н)
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Отчетный период: <strong>${escapeHtml(payload.reportingPeriodMonthYear)}</strong> | Отработано дней/часов: <strong>${payload.workingDaysCount} дн. / ${payload.workingHoursCount} ч.</strong></p>
  </div>

  <div class="section-title">1. Сводка посещений и санации пациентов</div>
  <table class="data-table">
    <tr>
      <th>Показатель</th>
      <th>Всего</th>
      <th>Взрослые</th>
      <th>Дети (0-14)</th>
      <th>Подростки (15-17)</th>
      <th>Первичные</th>
      <th>Повторные</th>
      <th>Профосмотры</th>
    </tr>
    <tr>
      <td><strong>Число посещений</strong></td>
      <td class="center"><strong>${m.visitsTotal}</strong></td>
      <td class="center">${m.visitsAdults}</td>
      <td class="center">${m.visitsChildrenUnder14}</td>
      <td class="center">${m.visitsAdolescents15_17}</td>
      <td class="center">${m.visitsPrimary}</td>
      <td class="center">${m.visitsRepeat}</td>
      <td class="center">${m.visitsPreventativeExam}</td>
    </tr>
    <tr>
      <td><strong>Санировано пациентов</strong></td>
      <td class="center"><strong>${m.sanatedTotal}</strong></td>
      <td class="center">${m.sanatedAdults}</td>
      <td class="center">${m.sanatedChildren}</td>
      <td class="center">—</td>
      <td class="center">—</td>
      <td class="center">—</td>
      <td class="center">—</td>
    </tr>
  </table>

  <div class="section-title">2. Выполненный объем лечебно-профилактической работы</div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
    <div>
      <table class="data-table">
        <tr><th colspan="2">Терапевтическая работа</th></tr>
        <tr><td>Наложено пломб при кариесе (всего):</td><td class="center"><strong>${m.fillingsCariesTotal}</strong></td></tr>
        <tr><td>— из них светоотверждаемый композит:</td><td class="center">${m.fillingsCompositePhotopolymer}</td></tr>
        <tr><td>— из них стеклоиономерный цемент (СИЦ):</td><td class="center">${m.fillingsGlassIonomer}</td></tr>
        <tr><td>Вылечено пульпитов:</td><td class="center"><strong>${m.pulpitisTreatedTotal}</strong></td></tr>
        <tr><td>Вылечено периодонтитов:</td><td class="center"><strong>${m.periodontitisTreatedTotal}</strong></td></tr>
        <tr><td>Запломбировано корневых каналов:</td><td class="center">${m.canalsFilledTotal}</td></tr>
        <tr><td>Проведено профессиональных гигиен:</td><td class="center">${m.hygieneProceduresTotal}</td></tr>
      </table>
    </div>
    <div>
      <table class="data-table">
        <tr><th colspan="2">Хирургия, ортопедия, диагностика</th></tr>
        <tr><td>Удалено зубов (простое удаление):</td><td class="center">${m.extractionsSimple}</td></tr>
        <tr><td>Удалено зубов (сложное / атипичное):</td><td class="center">${m.extractionsComplex}</td></tr>
        <tr><td>Удалено ретинированных 8-х зубов:</td><td class="center">${m.extractionsImpactedWisdom}</td></tr>
        <tr><td>Проведено амбулаторных операций:</td><td class="center">${m.outpatientOperationsCount}</td></tr>
        <tr><td>Установлено дентальных имплантатов:</td><td class="center">${m.implantsInstalledCount}</td></tr>
        <tr><td>Изготовлено искусственных коронок:</td><td class="center">${m.crownsDeliveredCount}</td></tr>
        <tr><td>Местная анестезия (инфильтрационная/проводниковая):</td><td class="center">${m.anesthesiaInfiltrationCount} / ${m.anesthesiaConductionCount}</td></tr>
      </table>
    </div>
  </div>

  <div class="section-title">3. Автоматический расчет УЕТ (Условных Единиц Трудоемкости)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Раздел стоматологической помощи</th>
        <th>Выработано УЕТ</th>
        <th>Доля в объеме (%)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Терапевтическое лечение (кариес)</td><td class="center"><strong>${u.uetTherapy.toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? ((u.uetTherapy / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr><td>Эндодонтия (пульпит, периодонтит, распломбировка)</td><td class="center"><strong>${u.uetEndodontics.toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? ((u.uetEndodontics / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr><td>Хирургическая помощь и имплантология</td><td class="center"><strong>${u.uetSurgery.toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? ((u.uetSurgery / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr><td>Профессиональная гигиена и пародонтология</td><td class="center"><strong>${u.uetHygieneAndPerio.toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? ((u.uetHygieneAndPerio / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr><td>Ортопедическая и ортодонтическая помощь</td><td class="center"><strong>${(u.uetProsthetics + u.uetOrthodontics).toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? (((u.uetProsthetics + u.uetOrthodontics) / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr><td>Анестезиологическое пособие и радиодиагностика</td><td class="center"><strong>${u.uetAnesthesiaAndDiagnostics.toFixed(2)}</strong></td><td class="center">${u.totalUetAccumulated > 0 ? ((u.uetAnesthesiaAndDiagnostics / u.totalUetAccumulated) * 100).toFixed(1) : 0}%</td></tr>
      <tr style="background:#eef2ff; font-weight:bold;">
        <td>ИТОГО ВЫРАБОТАНО УЕТ ЗА ПЕРИОД:</td>
        <td class="center" style="font-size:11pt; color:#1e40af;">${u.totalUetAccumulated.toFixed(2)} УЕТ</td>
        <td class="center">100.0%</td>
      </tr>
      <tr>
        <td>Норма выработки за период (план):</td>
        <td class="center">${u.periodStandardQuotaUet.toFixed(2)} УЕТ</td>
        <td class="center">Выполнение: <span class="badge ${u.planExecutionPercentage >= 100 ? "badge-green" : "badge-yellow"}">${u.planExecutionPercentage}%</span></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-стоматолог: ${escapeHtml(payload.doctorFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Главный врач / Зав. отделением</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 5. Рендерер Формы № 003-В/у — Выписка из медицинской карты */
export function renderForm003vuHtml(payload: MedicalCardExtract003vuPayload): string {
	const timelineHtml = payload.treatmentStagesTimeline
		.map(
			(st) => `
    <tr>
      <td class="center"><strong>${escapeHtml(st.treatmentDate)}</strong></td>
      <td class="center"><strong>${escapeHtml(st.toothOrAnatomicalArea)}</strong></td>
      <td><strong>${escapeHtml(st.diagnosisIcd10)}:</strong> ${escapeHtml(st.diagnosisText)}</td>
      <td>${escapeHtml(st.performedIntervention)} ${st.anesthesiaUsed ? `<br/><small><em>Анестезия: ${escapeHtml(st.anesthesiaUsed)}</em></small>` : ""}</td>
      <td>${escapeHtml(st.attendingDoctorFullName)}</td>
    </tr>
  `,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Выписка № ${escapeHtml(payload.extractRegistrationNumber)} (Форма 003-В/у) — ${escapeHtml(payload.patientFullName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>${escapeHtml(payload.clinicAddress || "")}</div>
      <div>ОГРН: ${escapeHtml(payload.clinicOgrn || "—")} | ИНН: ${escapeHtml(payload.clinicInn || "—")}</div>
      <div>Лицензия № ${escapeHtml(payload.clinicLicenseNumber || "—")} от ${escapeHtml(payload.clinicLicenseDate || "—")} (${escapeHtml(payload.clinicLicenseIssuer || "")})</div>
    </div>
    <div class="doc-requisites">
      <strong>Минздрав России</strong><br/>
      Медицинская документация<br/>
      <strong>Форма № 003-В/у</strong><br/>
      Выписка из амбулаторной карты
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО № ${escapeHtml(payload.extractRegistrationNumber)}</h1>
    <p class="doc-sub-title">Дата выдачи: <strong>${escapeHtml(payload.extractIssueDate)}</strong> | Куда направляется: <strong>${escapeHtml(payload.extractDestinationInstitution)}</strong></p>
  </div>

  <div class="section-title">1. Паспортные данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Ф.И.О. пациента:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(payload.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:15%;">${payload.patientSex === "male" ? "Мужской" : "Женский"} / ${escapeHtml(payload.patientBirthDate)}</td>
    </tr>
    <tr>
      <td><strong>Номер карты 043/у:</strong></td>
      <td><strong>${escapeHtml(payload.medicalCardNumber)}</strong></td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(payload.patientPhone || "—")}</td>
    </tr>
    <tr>
      <td><strong>Период лечения:</strong></td>
      <td colspan="3">с <strong>${escapeHtml(payload.treatmentPeriodStartDate)}</strong> по <strong>${escapeHtml(payload.treatmentPeriodEndDate)}</strong></td>
    </tr>
    <tr>
      <td><strong>Основной диагноз:</strong></td>
      <td colspan="3"><strong>${escapeHtml(payload.primaryDiagnosisText)}</strong> (МКБ-10: <strong>${escapeHtml(payload.primaryDiagnosisIcd10)}</strong>)</td>
    </tr>
    ${payload.concomitantDiagnosisText ? `<tr><td><strong>Сопутствующий диагноз:</strong></td><td colspan="3">${escapeHtml(payload.concomitantDiagnosisText)} (Код МКБ: ${escapeHtml(payload.concomitantDiagnosisIcd10 || "—")})</td></tr>` : ""}
  </table>

  <div class="section-title">2. Анамнез и результаты диагностических исследований</div>
  <p><strong>Краткий анамнез и течение заболевания:</strong> ${escapeHtml(payload.briefAnamnesisAndClinicalCourse)}</p>
  <p><strong>Данные лучевой и функциональной диагностики:</strong> ${escapeHtml(payload.diagnosticStudiesSummary)}</p>

  <div class="section-title">3. Хронология проведенного стоматологического лечения</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:85px;">Дата</th>
        <th style="width:55px;">Зуб</th>
        <th>Диагноз (МКБ-10)</th>
        <th>Проведенные лечебные мероприятия и материалы</th>
        <th>Врач</th>
      </tr>
    </thead>
    <tbody>
      ${timelineHtml || `<tr><td colspan="5" class="center">Записи о проведенном лечении отсутствуют</td></tr>`}
    </tbody>
  </table>

  <div class="section-title">4. Состояние при завершении лечения и рекомендации</div>
  <p><strong>Состояние при выписке:</strong> ${escapeHtml(payload.conditionAtDischarge)}</p>
  <p><strong>Назначения и рекомендации:</strong></p>
  <div style="white-space:pre-line; font-size:9.5pt; margin-left:10px;">${escapeHtml(payload.followUpRecommendations)}</div>
  <p style="margin-top:6px;"><strong>Гарантийные обязательства:</strong> ${escapeHtml(payload.warrantyConditions)}</p>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач-стоматолог: ${escapeHtml(payload.attendingDoctorFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">${escapeHtml(payload.headOfDepartmentFullName)} / М.П. клиники</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 6. Рендерер Листа учета дозовых нагрузок пациента */
export function renderRadiationDoseSheetHtml(payload: RadiationDoseSheetPayload): string {
	const rowsHtml = payload.exposureEntries
		.map(
			(e) => `
    <tr>
      <td class="center"><strong>${escapeHtml(e.studyDate)}</strong></td>
      <td>${escapeHtml(dentalRadiologyStudyLabels[e.studyType] || e.studyType)}</td>
      <td><strong>${escapeHtml(e.anatomicalArea)}</strong></td>
      <td>${escapeHtml(e.apparatusModel)} (${e.tubeVoltageKv} кВ, ${e.tubeCurrentMa} мА, ${e.exposureTimeSeconds} с)</td>
      <td class="center"><strong>${e.effectiveDoseMsv.toFixed(4)}</strong></td>
      <td class="center">${e.effectiveDoseMicrosieverts.toFixed(1)}</td>
      <td>${escapeHtml(e.radiologistFullName)}</td>
    </tr>
  `,
		)
		.join("");

	const summary = payload.annualSummary;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Лист учета дозовых нагрузок — ${escapeHtml(payload.patientFullName)} (${payload.reportingYear} г.)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(payload.clinicLegalName)}</div>
      <div>${escapeHtml(payload.clinicAddress || "")}</div>
      <div>ОГРН: ${escapeHtml(payload.clinicOgrn || "—")} | Лицензия № ${escapeHtml(payload.clinicLicenseNumber || "—")}</div>
    </div>
    <div class="doc-requisites">
      <strong>СанПиН 2.6.1.1192-03</strong><br/>
      СанПиН 2.6.1.2523-09 (НРБ-99/2009)<br/>
      <strong>Радиационный паспорт</strong><br/>
      Лист учета дозовых нагрузок
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</h1>
    <p class="doc-sub-title">Отчетный календарный год: <strong>${payload.reportingYear} г.</strong> | Карта пациента № <strong>${escapeHtml(payload.medicalCardNumber)}</strong></p>
  </div>

  <div class="section-title">1. Паспортные данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Ф.И.О. пациента:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(payload.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:15%;">${payload.patientSex === "male" ? "Мужской" : "Женский"} / ${escapeHtml(payload.patientBirthDate)}</td>
    </tr>
  </table>

  <div class="section-title">2. Реестр проведенных рентгенологических исследований</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:85px;">Дата</th>
        <th>Вид исследования</th>
        <th>Область</th>
        <th>Аппарат и экспозиция</th>
        <th style="width:75px;">Доза (мЗв)</th>
        <th style="width:75px;">Доза (мкЗв)</th>
        <th>Рентгенолаборант / Врач</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="7" class="center">Рентгенологические исследования в текущем году не проводились</td></tr>`}
    </tbody>
  </table>

  <div class="section-title">3. Суммарная накопленная доза и радиационная безопасность</div>
  <table class="data-table">
    <tr>
      <td style="width:40%;"><strong>Суммарная эффективная доза за ${payload.reportingYear} год:</strong></td>
      <td style="font-size:12pt; font-weight:bold; color:#1e40af;">${summary.totalDoseYearMsv.toFixed(4)} мЗв (${summary.totalDoseYearMicrosieverts.toFixed(1)} мкЗв)</td>
    </tr>
    <tr>
      <td><strong>Категория радиационной безопасности:</strong></td>
      <td><span class="badge ${summary.safetyZone === "green_optimal" ? "badge-green" : summary.safetyZone === "yellow_moderate" ? "badge-yellow" : "badge-red"}">${escapeHtml(summary.safetyZoneLabel)}</span></td>
    </tr>
    <tr>
      <td><strong>Заключение и рекомендации:</strong></td>
      <td>${escapeHtml(summary.safetyRecommendation)}</td>
    </tr>
  </table>

  <div class="signature-row">
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Ответственный за радиационную безопасность: ${escapeHtml(payload.responsibleOfficerFullName)}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-caption">Подпись врача-рентгенолога / оператора КЛКТ</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
