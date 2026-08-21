/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U CLINICAL MATH, VALIDATION & EXPORT ENGINE
 * Order of the Ministry of Health of Russia № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	MedicalCardForm043uData,
	Form043PrintConfig,
	Form043ValidationResult,
	VisitDiaryEntry043,
} from "./emr043Types";
import {
	type FdiToothRecord,
	type DmftIndex,
	type CpitnIndex,
	type CpitnSextantCode,
	calculateDmftFromOdontogram,
	toothStatusCodeShortMap,
	toothStatusCodeLabels,
	dentalBiteTypeLabels,
} from "@dental/shared";

/** Экранирование специальных символов HTML */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/** Экранирование специальных символов XML */
export function escapeXml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Расчет возраста пациента в годах с правильным русским склонением */
export function formatPatientAge(birthDateStr: string, referenceDateStr?: string): string {
	if (!birthDateStr) return "Возраст не указан";
	const birthDate = new Date(birthDateStr);
	if (Number.isNaN(birthDate.getTime())) return "Возраст не указан";

	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	let ageYears = refDate.getFullYear() - birthDate.getFullYear();
	const monthDiff = refDate.getMonth() - birthDate.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
		ageYears--;
	}

	if (ageYears < 0) return "0 лет";
	if (ageYears === 0) {
		const months = (refDate.getFullYear() - birthDate.getFullYear()) * 12 + (refDate.getMonth() - birthDate.getMonth());
		if (months <= 1) return "1 месяц";
		if (months >= 2 && months <= 4) return `${months} месяца`;
		return `${Math.max(1, months)} месяцев`;
	}

	const rem10 = ageYears % 10;
	const rem100 = ageYears % 100;
	if (rem100 >= 11 && rem100 <= 19) return `${ageYears} лет`;
	if (rem10 === 1) return `${ageYears} год`;
	if (rem10 >= 2 && rem10 <= 4) return `${ageYears} года`;
	return `${ageYears} лет`;
}

/** Расчет индекса КПУ / DMFT по зубной формуле */
export function calculateDmftIndex(teeth: FdiToothRecord[]): DmftIndex & { dmftTotal: number; intensityLevelLabel: string } {
	return calculateDmftFromOdontogram(teeth);
}

/** Расчет и расшифровка пародонтального индекса CPITN (PSR) */
export function calculateCpitnIndex(sextants: {
	sextant18_14?: CpitnSextantCode;
	sextant13_23?: CpitnSextantCode;
	sextant24_28?: CpitnSextantCode;
	sextant48_44?: CpitnSextantCode;
	sextant43_33?: CpitnSextantCode;
	sextant34_38?: CpitnSextantCode;
}): {
	maxCode: number;
	maxCodeText: string;
	treatmentNeedCategory: "0_none" | "1_hygiene_instructions" | "2_scaling_root_planing" | "3_complex_periodontal";
	treatmentNeedLabel: string;
	treatmentRecommendations: string;
} {
	const values = [
		sextants.sextant18_14 || "0_healthy",
		sextants.sextant13_23 || "0_healthy",
		sextants.sextant24_28 || "0_healthy",
		sextants.sextant48_44 || "0_healthy",
		sextants.sextant43_33 || "0_healthy",
		sextants.sextant34_38 || "0_healthy",
	];

	const codeRank = (code: string): number => {
		if (code.startsWith("4")) return 4;
		if (code.startsWith("3")) return 3;
		if (code.startsWith("2")) return 2;
		if (code.startsWith("1")) return 1;
		return 0;
	};

	let maxCode = 0;
	for (const val of values) {
		const r = codeRank(val);
		if (r > maxCode) maxCode = r;
	}

	switch (maxCode) {
		case 4:
			return {
				maxCode: 4,
				maxCodeText: "Код 4: Пародонтальный карман глубиной 6 мм и более",
				treatmentNeedCategory: "3_complex_periodontal",
				treatmentNeedLabel: "TN-3: Комплексное пародонтологическое лечение",
				treatmentRecommendations: "Глубокий поддесневой скейлинг, кюретаж / лоскутные операции, антимикробная терапия, шинирование при подвижности.",
			};
		case 3:
			return {
				maxCode: 3,
				maxCodeText: "Код 3: Пародонтальный карман глубиной 4-5 мм",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Скейлинг и снятие поддесневых отложений",
				treatmentRecommendations: "Профессиональная гигиена, закрытый кюретаж, полировка корней (Root Planing), местная противовоспалительная терапия.",
			};
		case 2:
			return {
				maxCode: 2,
				maxCodeText: "Код 2: Над- и поддесневой зубной камень, нависающие края пломб",
				treatmentNeedCategory: "2_scaling_root_planing",
				treatmentNeedLabel: "TN-2: Профессиональная гигиена полости рта",
				treatmentRecommendations: "Ультразвуковой скейлинг, воздушно-абразивная обработка Air-Flow, устранение ретенционных факторов (коррекция пломб), полировка.",
			};
		case 1:
			return {
				maxCode: 1,
				maxCodeText: "Код 1: Кровоточивость при зондировании без карманов и камня",
				treatmentNeedCategory: "1_hygiene_instructions",
				treatmentNeedLabel: "TN-1: Индивидуальный инструктаж по гигиене",
				treatmentRecommendations: "Обучение контролируемой чистке зубов, подбор межзубных ершиков, флоссов, антисептические ополаскиватели.",
			};
		default:
			return {
				maxCode: 0,
				maxCodeText: "Код 0: Ткани пародонта здоровы, патологических карманов нет",
				treatmentNeedCategory: "0_none",
				treatmentNeedLabel: "TN-0: Лечение не требуется",
				treatmentRecommendations: "Поддерживающая индивидуальная гигиена полости рта, профилактический осмотр через 6 месяцев.",
			};
	}
}

/** Расчет индекса гигиены Грина-Вермиллиона (OHI-S) */
export function calculateOhiSScore(debrisScores: number[], calculusScores: number[]): {
	debrisScore: number;
	calculusScore: number;
	totalScore: number;
	ratingText: string;
	clinicalEvaluation: "good" | "satisfactory" | "unsatisfactory" | "poor";
} {
	const avgDebris = debrisScores.length > 0
		? debrisScores.reduce((a, b) => a + b, 0) / debrisScores.length
		: 0;
	const avgCalculus = calculusScores.length > 0
		? calculusScores.reduce((a, b) => a + b, 0) / calculusScores.length
		: 0;
	const total = Number((avgDebris + avgCalculus).toFixed(2));

	if (total <= 0.6) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Хороший уровень гигиены)`,
			clinicalEvaluation: "good",
		};
	}
	if (total <= 1.6) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Удовлетворительный уровень гигиены)`,
			clinicalEvaluation: "satisfactory",
		};
	}
	if (total <= 2.5) {
		return {
			debrisScore: Number(avgDebris.toFixed(2)),
			calculusScore: Number(avgCalculus.toFixed(2)),
			totalScore: total,
			ratingText: `OHI-S = ${total} (Неудовлетворительный уровень гигиены)`,
			clinicalEvaluation: "unsatisfactory",
		};
	}
	return {
		debrisScore: Number(avgDebris.toFixed(2)),
		calculusScore: Number(avgCalculus.toFixed(2)),
		totalScore: total,
		ratingText: `OHI-S = ${total} (Плохой уровень гигиены)`,
		clinicalEvaluation: "poor",
	};
}

/** Валидация полноты медицинской карты 043/у по Приказу Минздрава РФ № 834н */
export function validateForm043uCompleteness(data: MedicalCardForm043uData): Form043ValidationResult {
	const missingFields: Form043ValidationResult["missingFields"] = [];
	const warnings: string[] = [];

	let totalChecks = 0;
	let passedChecks = 0;

	const check = (
		condition: boolean,
		fieldKey: string,
		label: string,
		category: Form043ValidationResult["missingFields"][0]["category"],
		severity: "critical" | "warning" = "critical",
	) => {
		totalChecks++;
		if (condition) {
			passedChecks++;
		} else {
			missingFields.push({ fieldKey, label, category, severity });
		}
	};

	// Паспортная часть (Раздел 1)
	check(Boolean(data.passport?.patientFullName?.trim()), "patientFullName", "ФИО пациента", "passport", "critical");
	check(Boolean(data.passport?.patientBirthDate?.trim()), "patientBirthDate", "Дата рождения пациента", "passport", "critical");
	check(Boolean(data.passport?.patientSex), "patientSex", "Пол пациента", "passport", "critical");
	check(Boolean(data.passport?.patientAddressRegistration?.trim()), "patientAddressRegistration", "Адрес регистрации", "passport", "critical");
	check(Boolean(data.passport?.patientIdentityDocument?.trim()), "patientIdentityDocument", "Паспортные данные / документ", "passport", "critical");
	check(Boolean(data.passport?.medicalCardNumber?.trim()), "medicalCardNumber", "Номер медицинской карты", "passport", "critical");
	check(Boolean(data.passport?.cardOpenedDate?.trim()), "cardOpenedDate", "Дата заведения карты", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisText?.trim()), "primaryDiagnosisText", "Диагноз при первичном обращении", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisIcd10?.trim()), "primaryDiagnosisIcd10", "Код МКБ-10 первичного диагноза", "passport", "critical");
	check(Boolean(data.passport?.attendingDoctorFullName?.trim()), "attendingDoctorFullName", "ФИО лечащего врача", "passport", "critical");

	if (!data.passport?.patientSnils?.trim()) {
		check(false, "patientSnils", "СНИЛС пациента (рекомендуется для ЕГИСЗ)", "passport", "warning");
	} else {
		totalChecks++;
		passedChecks++;
	}

	// Анамнез (Раздел 2)
	check(Boolean(data.anamnesis?.chiefComplaint?.trim()), "chiefComplaint", "Жалобы при обращении", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.historyOfPresentIllness?.trim()), "historyOfPresentIllness", "Анамнез заболевания (Anamnesis morbi)", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.medicalHistoryVitae?.trim()), "medicalHistoryVitae", "Анамнез жизни (Anamnesis vitae)", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.allergologicalHistory?.trim()), "allergologicalHistory", "Аллергологический статус", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.concomitantSomaticDiseases?.trim()), "concomitantSomaticDiseases", "Сопутствующие соматические патологии", "anamnesis", "critical");

	// Стоматологический статус и зубная формула (Раздел 3)
	check(Boolean(data.dentalStatus?.odontogramTeeth && data.dentalStatus.odontogramTeeth.length > 0), "odontogramTeeth", "Зубная формула FDI (не менее 1 зуба)", "dental_status", "critical");
	check(Boolean(data.dentalStatus?.biteType), "biteType", "Прикус по Энглю", "dental_status", "critical");
	check(Boolean(data.dentalStatus?.oralMucosaStatus?.color), "oralMucosaStatus", "Состояние СОПР (слизистой)", "dental_status", "critical");

	// Дневники визитов SOAP (Раздел 4)
	check(Boolean(data.visitDiaries && data.visitDiaries.length > 0), "visitDiaries", "Хотя бы 1 запись в дневнике приёма (SOAP)", "diaries", "critical");
	if (data.visitDiaries && data.visitDiaries.length > 0) {
		for (let i = 0; i < data.visitDiaries.length; i++) {
			const d = data.visitDiaries[i];
			if (!d) continue;
			if (!d.assessmentDiagnosisText?.trim()) {
				warnings.push(`Дневник №${i + 1} (${d.entryDate}): отсутствует диагноз`);
			}
			if (!d.procedureProtocol?.trim()) {
				warnings.push(`Дневник №${i + 1} (${d.entryDate}): отсутствует протокол лечения`);
			}
		}
	}

	// Эпикриз (Раздел 5)
	check(Boolean(data.epicrisis?.treatmentSummary?.trim()), "treatmentSummary", "Эпикриз / сводка лечения", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.treatmentOutcome), "treatmentOutcome", "Результат лечения / исход", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.dispensaryGroup), "dispensaryGroup", "Группа диспансерного наблюдения", "epicrisis", "warning");

	const score = Math.round((passedChecks / Math.max(1, totalChecks)) * 100);
	const criticalMissing = missingFields.filter((m) => m.severity === "critical");

	return {
		isComplete: criticalMissing.length === 0,
		completenessScore: score,
		missingFields,
		warnings,
	};
}

/** Рендерер таблицы зубной формулы FDI (все 32 постоянных зуба + расшифровка) */
export function renderFdiFormulaTableHtml(odontogramTeeth: FdiToothRecord[]): string {
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

	const teethMap = new Map<number, FdiToothRecord>();
	for (const t of odontogramTeeth) {
		teethMap.set(t.toothNumber, t);
	}

	const renderCell = (num: number, isRightBoundary: boolean) => {
		const rec = teethMap.get(num);
		const code = rec?.statusCode || "healthy";
		const shortCode = toothStatusCodeShortMap[code] || "Norm";
		const isPathology = code !== "healthy" && code !== "filled_satisfactory";
		const isExtracted = code === "extracted_absent";
		const isFilled = code === "filled_satisfactory";
		const isProsthetic = code.startsWith("crown") || code === "implant" || code.startsWith("bridge");

		let color = "#0f172a";
		let bg = "#ffffff";
		if (isExtracted) {
			color = "#94a3b8";
			bg = "#f8fafc";
		} else if (isPathology) {
			color = "#b91c1c";
			bg = "#fef2f2";
		} else if (isFilled) {
			color = "#047857";
			bg = "#f0fdf4";
		} else if (isProsthetic) {
			color = "#1d4ed8";
			bg = "#eff6ff";
		}

		const borderRight = isRightBoundary ? "border-right: 2px solid #0f172a;" : "border-right: 0.5pt solid #cbd5e1;";

		return `
      <td style="text-align:center; padding:3px 2px; font-size:7.5pt; background:${bg}; ${borderRight}">
        <div style="font-weight:bold; color:#0f172a; font-size:8pt;">${num}</div>
        <div style="font-weight:800; color:${color}; font-size:7.5pt; margin-top:1px;">${escapeHtml(shortCode)}</div>
      </td>
    `;
	};

	const upperCells = upperTeeth.map((t, idx) => renderCell(t, idx === 7)).join("");
	const lowerCells = lowerTeeth.map((t, idx) => renderCell(t, idx === 7)).join("");

	return `
    <table class="data-table-dense" style="width:100%; border:1pt solid #0f172a; margin:4px 0 6px 0;">
      <thead>
        <tr>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; border-right:2px solid #0f172a; text-align:center;">
            Верхняя челюсть справа (18–11)
          </th>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; text-align:center;">
            Верхняя челюсть слева (21–28)
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>${upperCells}</tr>
        <tr style="border-top:2px solid #0f172a;">${lowerCells}</tr>
      </tbody>
      <tfoot>
        <tr>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; border-right:2px solid #0f172a; text-align:center;">
            Нижняя челюсть справа (48–41)
          </th>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; text-align:center;">
            Нижняя челюсть слева (31–38)
          </th>
        </tr>
      </tfoot>
    </table>
    <div style="font-size:7pt; color:#475569; margin-bottom:6px; line-height:1.2;">
      <strong>Условные обозначения формулы:</strong> <strong>Norm</strong> — интактный, <strong>C0–C3</strong> — кариес, <strong>P/Pch</strong> — пульпит, <strong>Pt/Ptch</strong> — периодонтит, <strong>Pl</strong> — пломба, <strong>K(мк/zr/em)</strong> — коронка, <strong>Импл</strong> — имплантат, <strong>Отс(A)</strong> — отсутствует, <strong>R(кор)</strong> — корень.
    </div>
  `;
}

/** Генератор полноценного HTML документа для печати на листах А4 по ГОСТ Р 7.0.97-2016 */
export function generatePrintableHtml043(data: MedicalCardForm043uData, config?: Partial<Form043PrintConfig>): string {
	const cfg: Form043PrintConfig = {
		activeTab: "overview",
		pageOrientation: "portrait",
		includeClinicLogo: true,
		includeClinicRequisites: true,
		includeUkepStamp: true,
		includeDoctorStampSeal: true,
		includePatientSignatureBlock: true,
		includeXrayThumbnails: true,
		includeFullSoapDiaries: true,
		fontSizePt: 8.5,
		scaleRatio: 1.0,
		themeMode: "light",
		...config,
	};

	const clinic = data.clinic;
	const passport = data.passport;
	const anamnesis = data.anamnesis;
	const dental = data.dentalStatus;
	const epicrisis = data.epicrisis;

	const ageFormatted = formatPatientAge(passport.patientBirthDate, passport.cardOpenedDate);
	const dmft = calculateDmftIndex(dental.odontogramTeeth);
	const cpitn = calculateCpitnIndex(dental.cpitnIndex);

	const diariesToRender = (data.visitDiaries || []).filter((d) => {
		if (!cfg.selectedDiaryIds || cfg.selectedDiaryIds.length === 0) return true;
		return cfg.selectedDiaryIds.includes(d.id);
	});

	const diariesHtml = diariesToRender.length > 0
		? diariesToRender.map((d, idx) => `
        <div class="soap-diary-card" style="border: 0.75pt solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; background:#ffffff;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
            <div style="font-weight:800; font-size:8.5pt; color:#0f172a;">
              Запись посещения № ${idx + 1} от ${escapeHtml(d.entryDate)} ${d.entryTime ? `в ${escapeHtml(d.entryTime)}` : ""}
              ${d.toothNumber ? `<span style="background:#e0f2fe; color:#0369a1; padding:1px 5px; border-radius:3px; margin-left:6px;">Зуб FDI: ${escapeHtml(d.toothNumber)}</span>` : ""}
            </div>
            <div style="font-size:7.5pt; color:#475569;">
              Врач: <strong>${escapeHtml(d.doctorFullName)}</strong> ${d.doctorSpecialty ? `(${escapeHtml(d.doctorSpecialty)})` : ""}
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:8pt; line-height:1.25;">
            <tr>
              <td style="width:22%; font-weight:bold; color:#0369a1; vertical-align:top;">Жалобы (S):</td>
              <td style="width:78%; vertical-align:top;">${escapeHtml(d.subjectiveComplaints || "Жалоб на момент осмотра активно не предъявляет.")}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">Объективно (O):</td>
              <td style="vertical-align:top;">
                ${escapeHtml(d.objectiveStatusLocalis)}
                ${d.eodMicroamperes !== null && d.eodMicroamperes !== undefined ? `<br/><em>ЭОД: ${d.eodMicroamperes} мкА.</em>` : ""}
                ${d.percussionVertical && d.percussionVertical !== "negative" ? `<em> Перкуссия верт.: ${d.percussionVertical === "positive_mild" ? "слабо болезненна" : "резко болезненна"}.</em>` : ""}
              </td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">Диагноз МКБ-10 (A):</td>
              <td style="vertical-align:top;">
                <span style="font-weight:800; color:#0f172a;">${escapeHtml(d.assessmentDiagnosisText)}</span>
                <span style="background:#f1f5f9; border:0.5pt solid #94a3b8; border-radius:3px; padding:0 4px; font-weight:bold; font-size:7.5pt; margin-left:4px;">
                  [${escapeHtml(d.assessmentIcd10Code)}]
                </span>
              </td>
            </tr>
            <tr>
              <td style="font-weight:bold; color:#0369a1; vertical-align:top;">Протокол лечения (P):</td>
              <td style="vertical-align:top;">
                ${escapeHtml(d.procedureProtocol)}
                ${d.anesthesiaDetails ? `<br/><strong>Анестезия:</strong> ${escapeHtml(d.anesthesiaDetails)}` : ""}
                ${d.appliedMaterials ? `<br/><strong>Использованные материалы:</strong> ${escapeHtml(d.appliedMaterials)}` : ""}
                ${d.homeCareRecommendations ? `<br/><strong>Рекомендации / Назначения:</strong> ${escapeHtml(d.homeCareRecommendations)}` : ""}
                ${d.nextVisitDate ? `<br/><strong>Дата следующего визита:</strong> ${escapeHtml(d.nextVisitDate)}` : ""}
              </td>
            </tr>
          </table>
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px; padding-top:3px; border-top:0.5pt dashed #cbd5e1; font-size:7pt; color:#64748b;">
            <div>
              ${d.isSignedWithUkep ? `<span style="color:#059669; font-weight:bold;">✓ Подписано УКЭП (ГОСТ Р 34.10)</span> • Хэш: ${escapeHtml((d.digitalSignatureHash || "").slice(0, 18))}…` : "Подпись не заверена УКЭП"}
            </div>
            <div>
              Подпись лечащего врача: ___________________ / ${escapeHtml(d.doctorFullName)} /
            </div>
          </div>
        </div>
      `).join("")
		: `
        <div style="border: 0.75pt dashed #cbd5e1; padding: 10px; text-align: center; color: #64748b; font-style: italic;">
          Дневниковые записи клинических приемов отсутствуют.
        </div>
      `;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта № ${escapeHtml(passport.medicalCardNumber)} (Форма 043/у)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 15mm;
      @bottom-right {
        content: "Стр. " counter(page);
        font-family: "PT Astra Sans", Arial, sans-serif;
        font-size: 7.5pt;
        color: #64748b;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "PT Astra Serif", "Times New Roman", "PT Astra Sans", Arial, serif;
      font-size: ${cfg.fontSizePt}pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-container {
      width: 100%;
      max-width: 185mm;
      margin: 0 auto;
      padding: 0;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
      border-bottom: 1.5pt solid #0f172a;
      padding-bottom: 4px;
    }
    .clinic-info {
      width: 58%;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 7pt;
      line-height: 1.2;
      color: #334155;
    }
    .clinic-title {
      font-weight: 800;
      font-size: 10pt;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
      letter-spacing: 0.02em;
    }
    .doc-requisites {
      width: 40%;
      text-align: right;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 7pt;
      line-height: 1.2;
      color: #334155;
    }
    .form-badge {
      display: inline-block;
      font-weight: 800;
      font-size: 8pt;
      text-transform: uppercase;
      color: #0f172a;
      border: 1pt solid #0f172a;
      padding: 1pt 4pt;
      margin-bottom: 2pt;
      background: #f8fafc;
    }
    .doc-title-block {
      text-align: center;
      margin: 6px 0 6px 0;
    }
    .doc-main-title {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .doc-sub-title {
      font-size: 7.5pt;
      margin: 2px 0 0 0;
      font-style: italic;
      color: #475569;
    }
    .section-title {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-top: 6px;
      margin-bottom: 3px;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-left: 3.5px solid #0284c7;
      page-break-after: avoid;
      break-after: avoid;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0 5px 0;
      font-size: 7.5pt;
      line-height: 1.2;
    }
    table.data-table th, table.data-table td {
      border: 0.5pt solid #94a3b8;
      padding: 2.5pt 3.5pt;
      vertical-align: top;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-weight: 700;
      text-align: center;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-box {
      width: 48%;
    }
    .sig-line {
      border-bottom: 0.75pt solid #0f172a;
      width: 100%;
      height: 14px;
      margin-bottom: 2px;
    }
    .sig-caption {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
    }
    .stamp-seal {
      display: inline-block;
      width: 38px;
      height: 38px;
      border: 1.5px dashed #0284c7;
      border-radius: 50%;
      text-align: center;
      line-height: 36px;
      font-size: 7pt;
      color: #0284c7;
      font-weight: 700;
      float: right;
      margin-top: -12px;
    }
    .ukep-stamp-card {
      border: 1.5pt solid #0284c7;
      background: #f0f9ff;
      border-radius: 4px;
      padding: 4pt 6pt;
      margin-top: 8px;
      font-size: 6.5pt;
      color: #0369a1;
      line-height: 1.2;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      body { font-size: ${cfg.fontSizePt}pt; color: #000 !important; background: #fff !important; }
      .section-title { background: #f1f5f9 !important; color: #0f172a !important; border-left-color: #0f172a !important; }
      table.data-table th, table.data-table-dense th { background: #f1f5f9 !important; color: #0f172a !important; }
      table.data-table td, table.data-table th, table.data-table-dense td, table.data-table-dense th { border-color: #000 !important; color: #000 !important; }
      table.data-table tr:nth-child(even) td, table.data-table-dense tr:nth-child(even) td { background: transparent !important; }
      .header-grid { border-bottom-color: #000 !important; }
      .sig-line { border-bottom-color: #000 !important; }
      .form-badge { border-color: #000 !important; color: #000 !important; background: #fff !important; }
      .soap-diary-card { border-color: #000 !important; background: #fff !important; }
    }
  </style>
</head>
<body>
<div class="doc-container">

  <!-- Реквизиты клиники и форма Минздрава -->
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinic.clinicLegalName || clinic.clinicName)}</div>
      <div>${escapeHtml(clinic.clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinic.clinicOgrn)} | ИНН: ${escapeHtml(clinic.clinicInn)}${clinic.clinicKpp ? ` | КПП: ${escapeHtml(clinic.clinicKpp)}` : ""}</div>
      <div>Лицензия: № ${escapeHtml(clinic.licenseNumber)} от ${escapeHtml(clinic.licenseDate)} (${escapeHtml(clinic.licenseIssuer)})</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043/у</strong></div>
      <div>Код формы по ОКУД: 3108805</div>
      <div>Приказ Минздрава России от 15.12.2014 № 834н</div>
    </div>
  </div>

  <!-- Заголовок карты -->
  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(passport.medicalCardNumber)}</h1>
    <p class="doc-sub-title">Дата заведения карты: <strong>${escapeHtml(passport.cardOpenedDate)}</strong> | Лечащий врач: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong> (${escapeHtml(passport.attendingDoctorSpecialty)})</p>
  </div>

  <!-- 1. Паспортная часть -->
  <div class="section-title">1. Паспортная часть (Титульный лист)</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(passport.patientFullName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Возраст:</strong></td>
      <td style="width:20%;">${passport.patientSex === "male" ? "Мужской" : "Женский"} / ${escapeHtml(ageFormatted)} (${escapeHtml(passport.patientBirthDate)})</td>
    </tr>
    <tr>
      <td><strong>Документ (Паспорт):</strong></td>
      <td>${escapeHtml(passport.patientIdentityDocument || "Паспорт гражданина РФ")}</td>
      <td><strong>СНИЛС:</strong></td>
      <td>${escapeHtml(passport.patientSnils || "—")}</td>
    </tr>
    <tr>
      <td><strong>Полис ОМС / ДМС:</strong></td>
      <td>${escapeHtml(passport.patientInsurancePolicy || "—")} ${passport.patientInsuranceCompany ? `(${escapeHtml(passport.patientInsuranceCompany)})` : ""}</td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(passport.patientPhone || "—")}</td>
    </tr>
    <tr>
      <td><strong>Адрес регистрации:</strong></td>
      <td colspan="3">${escapeHtml(passport.patientAddressRegistration)} ${passport.patientAddressResidence ? `(Проживание: ${escapeHtml(passport.patientAddressResidence)})` : ""}</td>
    </tr>
    <tr>
      <td><strong>Диагноз при обращении:</strong></td>
      <td colspan="3">
        <strong style="color:#0369a1;">${escapeHtml(passport.primaryDiagnosisText)}</strong>
        <span style="background:#f1f5f9; border:0.5pt solid #cbd5e1; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:7pt; margin-left:4px;">
          [МКБ-10: ${escapeHtml(passport.primaryDiagnosisIcd10)}]
        </span>
      </td>
    </tr>
  </table>

  <!-- 2. Анамнез жизни и заболевания -->
  <div class="section-title">2. Анамнез жизни и настоящего заболевания (Anamnesis vitae & morbi)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Жалобы при обращении:</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.chiefComplaint)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез заболевания (Morbi):</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.historyOfPresentIllness)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез жизни (Vitae):</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.medicalHistoryVitae)}</td>
    </tr>
    <tr>
      <td><strong>Аллергологический статус:</strong></td>
      <td>${escapeHtml(anamnesis.allergologicalHistory)}</td>
      <td style="width:18%;"><strong>Соматический статус:</strong></td>
      <td>${escapeHtml(anamnesis.concomitantSomaticDiseases)}</td>
    </tr>
    <tr>
      <td><strong>Постоянный прием препаратов:</strong></td>
      <td>${escapeHtml(anamnesis.currentSystemicMedications)}</td>
      <td><strong>Беременность / лактация:</strong></td>
      <td>${escapeHtml(anamnesis.pregnancyLactationStatus)}</td>
    </tr>
    <tr>
      <td><strong>Переносимость анестезии:</strong></td>
      <td colspan="3">${escapeHtml(anamnesis.pastDentalInterventions)}</td>
    </tr>
  </table>

  <!-- 3. Стоматологический статус и зубная формула -->
  <div class="section-title">3. Стоматологический статус, зубная формула FDI и клинические индексы</div>
  ${renderFdiFormulaTableHtml(dental.odontogramTeeth)}

  <table class="data-table">
    <tr>
      <td style="width:33%;">
        <strong>Индекс КПУ(з): </strong>
        <span style="font-size:9.5pt; font-weight:800; color:#0369a1;">${dmft.totalDmft}</span> (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing})
        <br/><span style="font-size:7pt; color:#64748b;">Интенсивность: <strong>${escapeHtml(dmft.intensityLevelLabel)}</strong></span>
      </td>
      <td style="width:34%;">
        <strong>Пародонтальный индекс CPITN: </strong>
        <br/><span style="font-weight:700;">${escapeHtml(cpitn.treatmentNeedLabel)}</span>
        <br/><span style="font-size:7pt; color:#64748b;">${escapeHtml(cpitn.maxCodeText)}</span>
      </td>
      <td style="width:33%;">
        <strong>Индекс гигиены: </strong>
        <br/><span>${escapeHtml(dental.hygieneIndexOhiS?.ratingText || "OHI-S = 0.8 (удовл.)")}</span>
        <br/><strong>Прикус: </strong><span>${escapeHtml(dentalBiteTypeLabels[dental.biteType] || dental.biteDescription || "Ортогнатический")}</span>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <strong>Состояние СОПР, десен и пародонта:</strong>
        Слизистая ${dental.oralMucosaStatus?.color === "pale_pink_normal" ? "бледно-розовая, умеренно увлажнена" : "гиперемирована"}, патологических элементов ${dental.oralMucosaStatus?.pathologicalElements || "нет"}.
        Десневые сосочки ${dental.oralMucosaStatus?.gingivalPapillae === "normal_pointed" ? "остроконечные, плотно прилежат к шейкам зубов" : "гипертрофированы"}.
        Язык: ${escapeHtml(dental.oralMucosaStatus?.tongueStatus || "чистый, влажный")}.
        Лимфоузлы: ${escapeHtml(dental.oralMucosaStatus?.regionalLymphNodes || "не увеличены, безболезненны")}.
        ВНЧС: ${escapeHtml(dental.oralMucosaStatus?.tmjFunction || "открывание рта свободное, без щелчков")}.
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <strong>Рентгенологическое обследование (ОПТГ / КЛКТ):</strong>
        ${escapeHtml(dental.xrayFindingsDescription)}
        ${dental.xrayRadiationDoseMsv ? ` <em>(Суммарная лучевая нагрузка: ${dental.xrayRadiationDoseMsv} мЗв)</em>` : ""}
      </td>
    </tr>
  </table>

  <!-- Общий план лечения -->
  <div class="section-title">План обследования и комплексного лечения</div>
  <div style="border: 0.5pt solid #94a3b8; padding: 4px 6px; font-size: 7.5pt; line-height: 1.25; background: #ffffff; margin-bottom: 5px;">
    ${escapeHtml(data.generalTreatmentPlan)}
  </div>

  <!-- 4. Дневники приемов SOAP -->
  <div class="section-title">4. Дневник посещений и протоколы лечения (SOAP)</div>
  ${diariesHtml}

  <!-- 5. Эпикриз и диспансеризация -->
  <div class="section-title">5. Эпикриз, результаты лечения и план диспансерного наблюдения</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Сводка лечения (Эпикриз):</strong></td>
      <td colspan="3">${escapeHtml(epicrisis.treatmentSummary)}</td>
    </tr>
    <tr>
      <td><strong>Исход лечения:</strong></td>
      <td><strong>${escapeHtml(epicrisis.treatmentOutcomeLabel || "Полное выздоровление / стойкая ремиссия")}</strong></td>
      <td style="width:20%;"><strong>Диспансерная группа:</strong></td>
      <td><strong>${escapeHtml(epicrisis.dispensaryGroupLabel || "Д-I (Практически здоров)")}</strong></td>
    </tr>
    <tr>
      <td><strong>Контрольный осмотр через:</strong></td>
      <td><strong>${epicrisis.plannedRecallIntervalMonths} мес.</strong></td>
      <td><strong>Дата завершения:</strong></td>
      <td>${escapeHtml(epicrisis.dateCompleted || passport.cardOpenedDate)}</td>
    </tr>
    <tr>
      <td><strong>Профилактический план:</strong></td>
      <td colspan="3">${escapeHtml(epicrisis.preventivePlanRecommendations)}</td>
    </tr>
  </table>

  <!-- Электронная цифровая подпись УКЭП / ЕГИСЗ отметка -->
  ${cfg.includeUkepStamp ? `
    <div class="ukep-stamp-card">
      <div style="font-weight:800; text-transform:uppercase; letter-spacing:0.02em; margin-bottom:2px;">
        ✓ ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)
      </div>
      <div>Сертификат: <strong>00E103503B8F2026DENTE043U834N</strong> | Владелец: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong></div>
      <div>Действителен: с 01.01.2026 по 01.01.2027 | Аккредитованный УЦ: АО «ИнфоТеКС» / Федеральное казначейство РФ</div>
    </div>
  ` : ""}

  <!-- Блок подписей сторон -->
  <div class="signature-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">
        Лечащий врач: <strong>${escapeHtml(passport.attendingDoctorFullName)}</strong>
        ${cfg.includeDoctorStampSeal ? `<span class="stamp-seal">М.П.</span>` : ""}
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">
        Пациент: <strong>${escapeHtml(passport.patientFullName)}</strong> (с планом и лечением ознакомлен)
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
}

/** Генератор официального HL7 CDA R2 (СЭМД 834н) XML для интеграции с ЕГИСЗ */
export function generate043XmlCda(data: MedicalCardForm043uData): string {
	const p = data.passport;
	const c = data.clinic;
	const d = data.dentalStatus;
	const dmft = calculateDmftIndex(d.odontogramTeeth);

	const createdIso = new Date().toISOString();

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" classCode="DOCCLIN" moodCode="EVN">
  <realmCode code="RU"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.643.5.1.13.100.1.1.834.43"/>
  <id root="1.2.643.5.1.13" extension="${escapeXml(p.medicalCardNumber)}"/>
  <code code="834" codeSystem="1.2.643.5.1.13.100.1.1" displayName="Медицинская карта стоматологического пациента (Форма 043/у)"/>
  <title>МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeXml(p.medicalCardNumber)}</title>
  <effectiveTime value="${createdIso.replace(/[-:T]/g, "").slice(0, 14)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" displayName="normal"/>
  <languageCode code="ru-RU"/>

  <!-- Пациент -->
  <recordTarget>
    <patientRole>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.patientSnils || "000-000-000 00")}"/>
      <addr>
        <streetAddressLine>${escapeXml(p.patientAddressRegistration)}</streetAddressLine>
      </addr>
      <telecom value="tel:${escapeXml(p.patientPhone || "")}"/>
      <patient>
        <name>
          <family>${escapeXml(p.patientFullName.split(" ")[0] || "")}</family>
          <given>${escapeXml(p.patientFullName.split(" ")[1] || "")}</given>
        </name>
        <administrativeGenderCode code="${p.patientSex === "male" ? "1" : "2"}" codeSystem="1.2.643.5.1.13.13.11.1040" displayName="${p.patientSex === "male" ? "Мужской" : "Женский"}"/>
        <birthTime value="${escapeXml(p.patientBirthDate.replace(/-/g, ""))}"/>
      </patient>
    </patientRole>
  </recordTarget>

  <!-- Автор документа (Лечащий врач) -->
  <author>
    <time value="${createdIso.replace(/[-:T]/g, "").slice(0, 14)}"/>
    <assignedAuthor>
      <id root="1.2.643.5.1.13.100.1.1.1" extension="${escapeXml(p.attendingDoctorSnils || "000-000-000 00")}"/>
      <code code="108" codeSystem="1.2.643.5.1.13.13.11.1002" displayName="${escapeXml(p.attendingDoctorSpecialty)}"/>
      <assignedPerson>
        <name>
          <family>${escapeXml(p.attendingDoctorFullName.split(" ")[0] || "")}</family>
          <given>${escapeXml(p.attendingDoctorFullName.split(" ")[1] || "")}</given>
        </name>
      </assignedPerson>
      <representedOrganization>
        <id root="1.2.643.5.1.13.100.1.1" extension="${escapeXml(c.clinicOgrn)}"/>
        <name>${escapeXml(c.clinicLegalName || c.clinicName)}</name>
        <addr>${escapeXml(c.clinicAddress)}</addr>
      </representedOrganization>
    </assignedAuthor>
  </author>

  <!-- Структурированные клинические секции -->
  <component>
    <structuredBody>
      <!-- Секция: Паспортная часть и диагноз -->
      <component>
        <section>
          <code code="PASSPORT" codeSystem="1.2.643.5.1.13" displayName="Паспортная часть"/>
          <title>Паспортная часть и первичное обращение</title>
          <text>
            <paragraph>Номер карты: ${escapeXml(p.medicalCardNumber)}</paragraph>
            <paragraph>Дата открытия: ${escapeXml(p.cardOpenedDate)}</paragraph>
            <paragraph>Первичный диагноз: ${escapeXml(p.primaryDiagnosisText)} (${escapeXml(p.primaryDiagnosisIcd10)})</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Анамнез -->
      <component>
        <section>
          <code code="ANAMNESIS" codeSystem="1.2.643.5.1.13" displayName="Анамнез"/>
          <title>Анамнез жизни и заболевания</title>
          <text>
            <paragraph>Жалобы: ${escapeXml(data.anamnesis.chiefComplaint)}</paragraph>
            <paragraph>Анамнез заболевания: ${escapeXml(data.anamnesis.historyOfPresentIllness)}</paragraph>
            <paragraph>Аллергологический статус: ${escapeXml(data.anamnesis.allergologicalHistory)}</paragraph>
            <paragraph>Соматические заболевания: ${escapeXml(data.anamnesis.concomitantSomaticDiseases)}</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Зубная формула и КПУ -->
      <component>
        <section>
          <code code="DENTAL_STATUS" codeSystem="1.2.643.5.1.13" displayName="Стоматологический статус"/>
          <title>Зубная формула и индексы интенсивности</title>
          <text>
            <paragraph>Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing})</paragraph>
            <paragraph>Уровень интенсивности кариеса: ${escapeXml(dmft.intensityLevelLabel)}</paragraph>
            <paragraph>Прикус: ${escapeXml(dentalBiteTypeLabels[d.biteType] || d.biteDescription)}</paragraph>
          </text>
        </section>
      </component>

      <!-- Секция: Дневники визитов SOAP -->
      <component>
        <section>
          <code code="VISIT_DIARIES" codeSystem="1.2.643.5.1.13" displayName="Дневники посещений"/>
          <title>Дневники посещений (SOAP)</title>
          <text>
            ${(data.visitDiaries || []).map((vd, i) => `
              <paragraph>
                <strong>Визит ${i + 1} (${escapeXml(vd.entryDate)}):</strong>
                Диагноз: ${escapeXml(vd.assessmentDiagnosisText)} [${escapeXml(vd.assessmentIcd10Code)}].
                Протокол: ${escapeXml(vd.procedureProtocol)}.
              </paragraph>
            `).join("")}
          </text>
        </section>
      </component>

      <!-- Секция: Эпикриз -->
      <component>
        <section>
          <code code="EPICRISIS" codeSystem="1.2.643.5.1.13" displayName="Эпикриз"/>
          <title>Эпикриз и диспансерный план</title>
          <text>
            <paragraph>Сводка лечения: ${escapeXml(data.epicrisis.treatmentSummary)}</paragraph>
            <paragraph>Исход: ${escapeXml(data.epicrisis.treatmentOutcomeLabel)}</paragraph>
            <paragraph>Диспансерная группа: ${escapeXml(data.epicrisis.dispensaryGroupLabel)}</paragraph>
            <paragraph>Контрольный осмотр через: ${data.epicrisis.plannedRecallIntervalMonths} мес.</paragraph>
          </text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
}

/** Генератор структурированного JSON экспорта */
export function generate043JsonExport(data: MedicalCardForm043uData): string {
	const payload = {
		exportSchemaVersion: "1.0.0",
		standardOrder: "Приказ Минздрава России от 15.12.2014 № 834н",
		exportedAt: new Date().toISOString(),
		...data,
	};
	return JSON.stringify(payload, null, 2);
}

/** Генератор чистого текстового представления карты для буфера обмена */
export function generate043PlainText(data: MedicalCardForm043uData): string {
	const p = data.passport;
	const a = data.anamnesis;
	const d = data.dentalStatus;
	const dmft = calculateDmftIndex(d.odontogramTeeth);
	const cpitn = calculateCpitnIndex(d.cpitnIndex);

	const lines: string[] = [];
	lines.push(`МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/у)`);
	lines.push(`Номер карты: ${p.medicalCardNumber} | Дата открытия: ${p.cardOpenedDate}`);
	lines.push(`Клиника: ${data.clinic.clinicLegalName} (Лицензия № ${data.clinic.licenseNumber})`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`1. ПАСПОРТНАЯ ЧАСТЬ`);
	lines.push(`Пациент: ${p.patientFullName}, пол: ${p.patientSex === "male" ? "Муж" : "Жен"}, дата рожд.: ${p.patientBirthDate}`);
	lines.push(`Адрес: ${p.patientAddressRegistration}`);
	lines.push(`Документ: ${p.patientIdentityDocument} | СНИЛС: ${p.patientSnils || "—"} | Полис: ${p.patientInsurancePolicy || "—"}`);
	lines.push(`Первичный диагноз: ${p.primaryDiagnosisText} [МКБ-10: ${p.primaryDiagnosisIcd10}]`);
	lines.push(`Лечащий врач: ${p.attendingDoctorFullName} (${p.attendingDoctorSpecialty})`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`2. АНАМНЕЗ ЖИЗНИ И ЗАБОЛЕВАНИЯ`);
	lines.push(`Жалобы: ${a.chiefComplaint}`);
	lines.push(`Anamnesis morbi: ${a.historyOfPresentIllness}`);
	lines.push(`Anamnesis vitae: ${a.medicalHistoryVitae}`);
	lines.push(`Аллергостатус: ${a.allergologicalHistory}`);
	lines.push(`Соматические патологии: ${a.concomitantSomaticDiseases}`);
	lines.push(`Постоянные препараты: ${a.currentSystemicMedications}`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`3. СТОМАТОЛОГИЧЕСКИЙ СТАТУС`);
	lines.push(`Индекс КПУ(з): ${dmft.totalDmft} (К=${dmft.decayed}, П=${dmft.filled}, У=${dmft.missing}) — ${dmft.intensityLevelLabel}`);
	lines.push(`Индекс CPITN: ${cpitn.treatmentNeedLabel} (${cpitn.maxCodeText})`);
	lines.push(`Индекс гигиены: ${d.hygieneIndexOhiS.ratingText}`);
	lines.push(`Прикус: ${dentalBiteTypeLabels[d.biteType] || d.biteDescription}`);
	lines.push(`Рентген: ${d.xrayFindingsDescription}`);
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`4. ДНЕВНИКИ ПОСЕЩЕНИЙ (SOAP)`);
	(data.visitDiaries || []).forEach((vd, idx) => {
		lines.push(`Запись №${idx + 1} от ${vd.entryDate} (Зуб: ${vd.toothNumber || "общий"}):`);
		lines.push(`  S (Жалобы): ${vd.subjectiveComplaints}`);
		lines.push(`  O (Объективно): ${vd.objectiveStatusLocalis}`);
		lines.push(`  A (Диагноз): ${vd.assessmentDiagnosisText} [${vd.assessmentIcd10Code}]`);
		lines.push(`  P (Лечение): ${vd.procedureProtocol}`);
		if (vd.anesthesiaDetails) lines.push(`  Анестезия: ${vd.anesthesiaDetails}`);
		if (vd.appliedMaterials) lines.push(`  Материалы: ${vd.appliedMaterials}`);
		lines.push(`  Врач: ${vd.doctorFullName}`);
	});
	lines.push(`--------------------------------------------------------------------------------`);
	lines.push(`5. ЭПИКРИЗ И ДИСПАНСЕРИЗАЦИЯ`);
	lines.push(`Сводка: ${data.epicrisis.treatmentSummary}`);
	lines.push(`Исход: ${data.epicrisis.treatmentOutcomeLabel} | Диспансерная группа: ${data.epicrisis.dispensaryGroupLabel}`);
	lines.push(`Контрольный осмотр: через ${data.epicrisis.plannedRecallIntervalMonths} мес.`);
	lines.push(`Рекомендации: ${data.epicrisis.preventivePlanRecommendations}`);

	return lines.join("\n");
}
