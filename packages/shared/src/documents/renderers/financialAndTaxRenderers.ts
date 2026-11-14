/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — FINANCIAL & STATS (Layer 2)
 * Renderers for Daily Dentist Diary (037/u-88) and Monthly Summary Statement (039/u-88)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	DailyDentistDiary037uPayload,
	SummaryDentistStatement039uPayload,
	UkepDigitalSignaturePayload,
} from "./types.js";
import { escapeHtml, CLINICAL_DOCUMENT_PRINT_STYLES } from "./sharedStyles.js";

/** Вспомогательный интерфейс записи пациента для формы 037/у */
export interface Form037uPatientRecordLike {
	sequenceNumber?: number;
	orderNumber?: number;
	entryNumber?: number;
	appointmentTime?: string;
	visitTime?: string;
	time?: string;
	patientFullName?: string;
	fullName?: string;
	name?: string;
	isChildUnder18?: boolean;
	patientCategory?: string;
	patientAge?: number | string;
	age?: number | string;
	birthYear?: number;
	patientSex?: string;
	gender?: string;
	medicalCardNumber?: string;
	cardNumber?: string;
	cardNum?: string;
	isRuralResident?: boolean;
	residenceType?: string;
	isPrimaryVisit?: boolean;
	isRepeatVisit?: boolean;
	visitType?: string;
	isSanatedInVisit?: boolean;
	isSanated?: boolean;
	sanated?: boolean;
	diagnosisIcd10?: string;
	mkb10?: string;
	diagnosis?: string;
	diagnosisText?: string;
	performedProceduresSummary?: string;
	procedures?: string;
	treatment?: string;
	workDone?: string;
	cariesBlackClass?: string;
	blackClass?: string;
	endodonticsCanalsTreated?: number;
	canalsTreated?: number;
	isSurgicalExtraction?: boolean;
	isHygieneProcedure?: boolean;
	isAnesthesiaConducted?: boolean;
	uetCaries?: number;
	uetPulpitisPeriodontitis?: number;
	uetSurgeryExtractions?: number;
	uetHygienePeriodontology?: number;
	uetAnesthesia?: number;
	totalUetForVisit?: number;
	uetTotal?: number;
	uet?: number;
	[key: string]: unknown;
}

/** Вспомогательный интерфейс записи календарного дня для формы 039/у */
export interface CalendarDayRecordLike {
	day?: number;
	date?: string;
	visits?: number;
	patientsCount?: number;
	adults?: number;
	children?: number;
	adolescents?: number;
	rural?: number;
	primary?: number;
	repeat?: number;
	preventive?: number;
	sanated?: number;
	fillings?: number;
	pulpitisPerio?: number;
	canals?: number;
	extractions?: number;
	hygiene?: number;
	uet?: number;
	[key: string]: unknown;
}

/** Вспомогательный интерфейс полезной нагрузки формы 037/у */
export interface Form037uRenderPayload {
	organization?: { fullName?: string; address?: string; ogrn?: string; inn?: string };
	clinicLegalName?: string;
	clinic?: { name?: string };
	clinicAddress?: string;
	clinicOgrn?: string;
	clinicInn?: string;
	clinicDepartment?: string;
	department?: string;
	doctor?: { fullName?: string; specialty?: string };
	doctorFullName?: string;
	doctorSpecialty?: string;
	date?: string;
	workDate?: string;
	shiftDate?: string;
	shiftNumber?: string;
	shift?: string;
	shiftWorkingHours?: string;
	patientRecords?: Form037uPatientRecordLike[];
	patients?: Form037uPatientRecordLike[];
	records?: Form037uPatientRecordLike[];
	summaryTotals?: Record<string, unknown>;
	totals?: Record<string, unknown>;
	dailyTotals?: Record<string, unknown>;
	watermarkText?: string;
	withStampAndSignature?: boolean;
	qrVerificationUrl?: string;
	ukepSignature?: UkepDigitalSignaturePayload;
	notesAndObservations?: string;
	[key: string]: unknown;
}

/** Вспомогательный интерфейс полезной нагрузки формы 039/у */
export interface Form039uRenderPayload {
	organization?: { fullName?: string; address?: string; ogrn?: string; inn?: string };
	clinicLegalName?: string;
	clinic?: { name?: string };
	clinicAddress?: string;
	clinicOgrn?: string;
	clinicInn?: string;
	clinicDepartment?: string;
	department?: string;
	reportingDoctor?: { fullName?: string; specialty?: string };
	doctor?: { fullName?: string; specialty?: string };
	doctorFullName?: string;
	doctorSpecialty?: string;
	period?: string;
	periodLabel?: string;
	reportingPeriodMonthYear?: string;
	workingDaysCount?: number;
	workingDays?: number;
	workingHoursCount?: number;
	consolidatedMetrics?: Record<string, number>;
	metrics?: Record<string, number>;
	uetBreakdown?: Record<string, number>;
	uetGrandTotal?: number;
	totalVisits?: number;
	adultsCount?: number;
	childrenCount?: number;
	ruralResidentsCount?: number;
	primaryVisitsCount?: number;
	repeatVisitsCount?: number;
	sanatedTotal?: number;
	fillingsByBlackClass?: Record<string, number>;
	endodonticsCanalsCount?: number;
	surgicalExtractionsCount?: number;
	implantsPlaced?: number;
	orthopedicCrownsCount?: number;
	calendarDays?: CalendarDayRecordLike[];
	days?: CalendarDayRecordLike[];
	dailyBreakdown?: CalendarDayRecordLike[];
	watermarkText?: string;
	withStampAndSignature?: boolean;
	qrVerificationUrl?: string;
	ukepSignature?: UkepDigitalSignaturePayload;
	uetBySpecialty?: {
		therapy?: number;
		endodontics?: number;
		surgery?: number;
		hygiene?: number;
		prosthetics?: number;
		orthodontics?: number;
		anesthesia?: number;
	};
	[key: string]: unknown;
}

/**
 * 3. Рендерер Формы № 037/у-88 — Листок ежедневного учета работы врача-стоматолога (зубного врача)
 * Приказ Минздрава СССР от 25.01.1988 № 50 / Приказ Минздрава РФ № 804н
 * A4 Landscape, 20+ columns register table, daily totals summary row, shift KPI block
 */
export function renderForm037uHtml(payload: DailyDentistDiary037uPayload | Form037uRenderPayload): string {
	const p = payload as Form037uRenderPayload;
	const clinicName = p.organization?.fullName || p.clinicLegalName || p.clinic?.name || "Стоматологическая поликлиника";
	const clinicAddress = p.organization?.address || p.clinicAddress || "";
	const clinicOgrn = p.organization?.ogrn || p.clinicOgrn || "—";
	const clinicInn = p.organization?.inn || p.clinicInn || "—";
	const department = p.clinicDepartment || p.department || "Стоматологическое отделение";
	const doctorName = p.doctor?.fullName || p.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = p.doctorSpecialty || p.doctor?.specialty || "Врач-стоматолог-терапевт";
	const workDate = p.date || p.workDate || p.shiftDate || new Date().toISOString().slice(0, 10);
	const shift = p.shiftNumber === "shift_2_evening" ? "2 смена (вечерняя)" : (p.shiftNumber === "full_day" ? "Полный день" : (p.shift || "1 смена (утренняя)"));
	const workingHours = p.shiftWorkingHours || "08:00 - 14:36 (6.6 ч)";

	const rawRecords: Form037uPatientRecordLike[] = p.patientRecords || p.patients || p.records || [];
	const totals = (p.summaryTotals || p.totals || p.dailyTotals || {}) as Record<string, unknown>;

	// Aggregate column metrics
	let sumAdults = 0;
	let sumChildren = 0;
	let sumAdolescents = 0;
	let sumRural = 0;
	let sumPrimary = 0;
	let sumRepeat = 0;
	let sumSanated = 0;
	let sumBlackI = 0;
	let sumBlackII = 0;
	let sumBlackIII = 0;
	let sumBlackIV = 0;
	let sumBlackV = 0;
	let sumCanals1 = 0;
	let sumCanals2 = 0;
	let sumCanals3Plus = 0;
	let sumSurgery = 0;
	let sumHygiene = 0;
	let sumAnesthesia = 0;
	let sumUet = 0;

	const patientRows = rawRecords.map((p: Form037uPatientRecordLike, idx: number) => {
		const orderNum = p.sequenceNumber ?? p.orderNumber ?? p.entryNumber ?? (idx + 1);
		const time = p.appointmentTime || p.visitTime || p.time || "—";
		const name = p.patientFullName || p.fullName || p.name || "—";

		// Age / Sex
		const isChild = Boolean(p.isChildUnder18) || p.patientCategory === "child_under_14";
		const isAdol = p.patientCategory === "adolescent_15_17";
		if (isChild) sumChildren++;
		else if (isAdol) sumAdolescents++;
		else sumAdults++;

		const rawAge = p.patientAge ?? p.age ?? (p.birthYear ? (new Date().getFullYear() - p.birthYear) : "—");
		const genderLetter = (p.patientSex || p.gender || "male") === "female" ? "Ж" : "М";
		const ageSex = `${genderLetter} / ${rawAge}`;

		const cardNum = p.medicalCardNumber || p.cardNumber || p.cardNum || "—";

		// Rural
		const isRural = Boolean(p.isRuralResident) || p.residenceType === "rural";
		if (isRural) sumRural++;
		const ruralStr = isRural ? "Село" : "Город";

		// Visit type
		const isPreventive = p.visitPurpose === "preventive" || p.isPreventative;
		const isPrim = Boolean(p.isPrimaryVisit || p.isPrimary) || isPreventive;
		if (isPrim) sumPrimary++;
		else sumRepeat++;
		const visitTypeStr = isPreventive ? "Проф." : (isPrim ? "Перв." : "Повт.");

		// Sanated
		const isSan = Boolean(p.isSanatedInVisit || p.isSanated);
		if (isSan) sumSanated++;
		const sanStr = isSan ? "Да" : "—";

		// Diagnosis & Teeth
		const rawDiagnoses = p.diagnoses as readonly string[] | string | undefined;
		const diag = String(p.diagnosisIcd10 || (Array.isArray(rawDiagnoses) ? rawDiagnoses.join(", ") : rawDiagnoses) || p.diagnosisText || "—");
		const rawTreatedTeeth = p.treatedTeethNumbers as readonly string[] | string | undefined;
		const teeth = Array.isArray(rawTreatedTeeth) ? rawTreatedTeeth.join(",") : String(rawTreatedTeeth || p.toothNumber || p.diagnosisTooth || "—");

		// Black classes (I–V)
		const b1 = p.blackClassI ?? p.fillingsClassI ?? (diag.includes("K02") && !p.blackClassII ? 1 : 0);
		const b2 = p.blackClassII ?? p.fillingsClassII ?? 0;
		const b3 = p.blackClassIII ?? p.fillingsClassIII ?? 0;
		const b4 = p.blackClassIV ?? p.fillingsClassIV ?? 0;
		const b5 = p.blackClassV ?? p.fillingsClassV ?? 0;
		sumBlackI += Number(b1) || 0;
		sumBlackII += Number(b2) || 0;
		sumBlackIII += Number(b3) || 0;
		sumBlackIV += Number(b4) || 0;
		sumBlackV += Number(b5) || 0;

		// Endodontics canals
		const cCount = Number(p.endodonticsCanalsCount ?? ((p.uetPulpitisPeriodontitis ?? 0) > 0 ? 1 : 0));
		const c1 = p.canals1 ?? (cCount === 1 ? 1 : 0);
		const c2 = p.canals2 ?? (cCount === 2 ? 1 : 0);
		const c3 = p.canals3Plus ?? (cCount >= 3 ? 1 : 0);
		sumCanals1 += Number(c1) || 0;
		sumCanals2 += Number(c2) || 0;
		sumCanals3Plus += Number(c3) || 0;

		// Surgery, Hygiene, Anesthesia
		const surg = Number(p.extractionsSimpleCount ?? 0) + Number(p.extractionsComplicatedCount ?? 0) + Number(p.extractionsCount ?? 0) + Number(p.surgeryOperationsCount ?? 0) + ((p.uetSurgeryExtractions ?? 0) > 0 ? 1 : 0);
		const hyg = p.hygieneProcedures ?? p.hygieneCount ?? ((p.uetHygienePeriodontology ?? 0) > 0 ? 1 : 0);
		const anesth = p.anesthesiaCount ?? ((p.uetAnesthesia ?? 0) > 0 ? 1 : (p.anesthesiaUsed ? 1 : 0));
		sumSurgery += Number(surg) || 0;
		sumHygiene += Number(hyg) || 0;
		sumAnesthesia += Number(anesth) || 0;

		// Description & UET
		const rawProcedures = p.procedures as readonly string[] | string | undefined;
		const desc = p.performedProceduresSummary || (Array.isArray(rawProcedures) ? rawProcedures.join("; ") : rawProcedures) || p.proceduresPerformed || p.treatmentDescription || "—";
		const rawUetEarned = p.uetEarned as { totalUet?: number } | number | undefined;
		const uet = Number(p.totalUetForVisit ?? p.uetTotal ?? (typeof rawUetEarned === "object" && rawUetEarned !== null ? rawUetEarned.totalUet : rawUetEarned) ?? 0);
		sumUet += uet;

		return `
      <tr>
        <td class="center">${orderNum}</td>
        <td class="center">${escapeHtml(time)}</td>
        <td class="left"><strong>${escapeHtml(name)}</strong></td>
        <td class="center">${escapeHtml(ageSex)}</td>
        <td class="center">${escapeHtml(cardNum)}</td>
        <td class="center">${escapeHtml(ruralStr)}</td>
        <td class="center">${escapeHtml(visitTypeStr)}</td>
        <td class="center">${escapeHtml(sanStr)}</td>
        <td class="left">${escapeHtml(diag)}</td>
        <td class="center">${escapeHtml(teeth)}</td>
        <td class="center">${b1 || "—"}</td>
        <td class="center">${b2 || "—"}</td>
        <td class="center">${b3 || "—"}</td>
        <td class="center">${b4 || "—"}</td>
        <td class="center">${b5 || "—"}</td>
        <td class="center">${c1 || "—"}</td>
        <td class="center">${c2 || "—"}</td>
        <td class="center">${c3 || "—"}</td>
        <td class="center">${surg || "—"}</td>
        <td class="center">${hyg || "—"}</td>
        <td class="center">${anesth || "—"}</td>
        <td class="left">${escapeHtml(desc)}</td>
        <td class="right"><strong>${uet.toFixed(2)}</strong></td>
      </tr>
    `;
	}).join("");

	// Fallback totals from summaryTotals if raw records were empty
	const t = totals as Record<string, unknown>;
	const totalPatients = Number(rawRecords.length || t.totalPatientsCount || t.totalPatientsSeen || t.totalPatients || 0);
	const totalAdults = Number(sumAdults || t.totalAdultsCount || t.adultsCount || 0);
	const totalChildren = Number(sumChildren || t.totalChildrenUnder14Count || t.childrenCount || 0);
	const totalAdol = Number(sumAdolescents || t.totalAdolescents15_17Count || 0);
	const totalRural = Number(sumRural || t.ruralResidentsCount || 0);
	const totalPrimary = Number(sumPrimary || t.totalPrimaryVisitsCount || t.primaryVisitsCount || t.primaryCount || 0);
	const totalRepeat = Number(sumRepeat || t.totalRepeatVisitsCount || t.repeatVisitsCount || 0);
	const totalSanated = Number(sumSanated || t.totalSanatedCount || t.sanatedPatientsCount || t.sanatedCount || 0);
	const totalFillings = Number((sumBlackI + sumBlackII + sumBlackIII + sumBlackIV + sumBlackV) || t.totalFillingsPlaced || t.fillingsTotal || 0);
	const totalExtractions = Number(sumSurgery || t.totalTeethExtracted || t.extractionsTotal || 0);
	const rawUetTotals = t.uetTotals as { totalUet?: number } | undefined;
	const grandTotalUet = sumUet > 0 ? sumUet : Number(t.totalUetAccumulated ?? t.uetGrandTotal ?? rawUetTotals?.totalUet ?? 0);
	const quotaUet = Number(t.shiftStandardQuotaUet ?? t.shiftTargetUet ?? 21.0);
	const planPct = quotaUet > 0 ? Number(((grandTotalUet / quotaUet) * 100).toFixed(1)) : 100.0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Листок ежедневного учета 037/у-88 от ${escapeHtml(workDate)} — ${escapeHtml(doctorName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm 8mm 10mm; }
  </style>
</head>
<body>
<div class="doc-container-landscape">
  <div class="header-grid">
    <div class="clinic-info" style="width:60%;">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(department)} | ${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites" style="width:38%;">
      <div class="form-badge">МИНЗДРАВ СССР / РФ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 037/у-88</strong></div>
      <div>Утверждена Минздравом СССР 25.01.1988 № 50</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА (ЗУБНОГО ВРАЧА)</h1>
    <p class="doc-sub-title">Дата: <strong>${escapeHtml(workDate)}</strong> | Смена: <strong>${escapeHtml(shift)}</strong> (${escapeHtml(workingHours)}) | Врач: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</p>
  </div>

  <div class="section-title">1. Реестр принятых пациентов (форма 037/у-88)</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th rowspan="2" style="width:2%;">№</th>
        <th rowspan="2" style="width:4%;">Время</th>
        <th rowspan="2" style="width:11%;">ФИО Пациента</th>
        <th rowspan="2" style="width:5%;">Пол / Возр.</th>
        <th rowspan="2" style="width:5%;">№ карты 043/у</th>
        <th rowspan="2" style="width:4%;">Город / Село</th>
        <th rowspan="2" style="width:4%;">Вид посещ.</th>
        <th rowspan="2" style="width:3.5%;">Санир.</th>
        <th rowspan="2" style="width:7%;">Диагноз (МКБ-10)</th>
        <th rowspan="2" style="width:3.5%;">Зуб</th>
        <th colspan="5" style="width:9%;">Пломбы по Блэку</th>
        <th colspan="3" style="width:6%;">Эндодонтия (каналы)</th>
        <th rowspan="2" style="width:3.5%;">Хирург.</th>
        <th rowspan="2" style="width:3.5%;">Гигиен.</th>
        <th rowspan="2" style="width:3.5%;">Анест.</th>
        <th rowspan="2" style="width:14%;">Объем оказанной помощи и материалы</th>
        <th rowspan="2" style="width:4.5%;">УЕТ</th>
      </tr>
      <tr>
        <th style="width:1.8%;">I</th>
        <th style="width:1.8%;">II</th>
        <th style="width:1.8%;">III</th>
        <th style="width:1.8%;">IV</th>
        <th style="width:1.8%;">V</th>
        <th style="width:2%;">1к</th>
        <th style="width:2%;">2к</th>
        <th style="width:2%;">3+к</th>
      </tr>
      <tr style="background:#e2e8f0; font-size:5.5pt; color:#475569;">
        <th class="center">1</th>
        <th class="center">2</th>
        <th class="center">3</th>
        <th class="center">4</th>
        <th class="center">5</th>
        <th class="center">6</th>
        <th class="center">7</th>
        <th class="center">8</th>
        <th class="center">9</th>
        <th class="center">10</th>
        <th class="center">11</th>
        <th class="center">12</th>
        <th class="center">13</th>
        <th class="center">14</th>
        <th class="center">15</th>
        <th class="center">16</th>
        <th class="center">17</th>
        <th class="center">18</th>
        <th class="center">19</th>
        <th class="center">20</th>
        <th class="center">21</th>
        <th class="center">22</th>
        <th class="center">23</th>
      </tr>
    </thead>
    <tbody>
      ${patientRows || `<tr><td colspan="23" class="center" style="padding:10px;">Записи в листке ежедневного учета за данную смену отсутствуют</td></tr>`}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" class="center">ИТОГО ЗА СМЕНУ:</td>
        <td class="left"><strong>${totalPatients} чел.</strong></td>
        <td class="center">${totalAdults} взр. / ${totalChildren + totalAdol} дет.</td>
        <td class="center">—</td>
        <td class="center">${totalRural} село</td>
        <td class="center">${totalPrimary} перв.</td>
        <td class="center">${totalSanated} сан.</td>
        <td colspan="2" class="center">—</td>
        <td class="center">${sumBlackI || 0}</td>
        <td class="center">${sumBlackII || 0}</td>
        <td class="center">${sumBlackIII || 0}</td>
        <td class="center">${sumBlackIV || 0}</td>
        <td class="center">${sumBlackV || 0}</td>
        <td class="center">${sumCanals1 || 0}</td>
        <td class="center">${sumCanals2 || 0}</td>
        <td class="center">${sumCanals3Plus || 0}</td>
        <td class="center">${totalExtractions}</td>
        <td class="center">${sumHygiene || 0}</td>
        <td class="center">${sumAnesthesia || 0}</td>
        <td class="right"><strong>ИТОГО ВЫРАБОТКА УЕТ:</strong></td>
        <td class="right" style="font-size:8.5pt; font-weight:800; color:#0369a1;">${grandTotalUet.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">2. Сводные итоги работы за смену (Норматив УЕТ)</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${totalPatients}</div>
      <div class="kpi-lbl">Принято больных всего</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalPrimary} / ${totalRepeat}</div>
      <div class="kpi-lbl">Первичных / Повторных</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalSanated}</div>
      <div class="kpi-lbl">Санировано в смену</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalFillings}</div>
      <div class="kpi-lbl">Наложено пломб (I–V)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${sumCanals1 + sumCanals2 + sumCanals3Plus}</div>
      <div class="kpi-lbl">Каналов запломбировано</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalExtractions}</div>
      <div class="kpi-lbl">Удалено зубов</div>
    </div>
    <div class="kpi-card" style="border:1.5px solid #0284c7; background:#f0f9ff;">
      <div class="kpi-val" style="color:#0369a1; font-size:12pt;">${grandTotalUet.toFixed(2)} УЕТ</div>
      <div class="kpi-lbl">Выработка (Норма: ${quotaUet.toFixed(1)} УЕТ)</div>
    </div>
    <div class="kpi-card" style="border:1.5px solid ${planPct >= 100 ? '#16a34a' : '#d97706'}; background:${planPct >= 100 ? '#f0fdf4' : '#fffbeb'};">
      <div class="kpi-val" style="color:${planPct >= 100 ? '#15803d' : '#b45309'};">${planPct}%</div>
      <div class="kpi-lbl">Выполнение плана смены</div>
    </div>
  </div>

  ${payload.notesAndObservations ? `<div style="font-size:7.5pt; color:#475569; margin:4px 0;"><strong>Замечания и наблюдения:</strong> ${escapeHtml(payload.notesAndObservations)}</div>` : ""}

  <div class="signature-row" style="margin-top:12px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-стоматолог: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Медицинский регистратор / Статистик: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 4. Рендерер Формы № 039-2/у-88 — Сводная ведомость учета работы врача-стоматолога
 * Приказ Минздрава СССР от 25.01.1988 № 50 / Приказ Минздрава РФ № 804н
 * Monthly summary table with 31 calendar days + Month Total + Specialty UET breakdown
 */
export function renderForm039uHtml(payload: SummaryDentistStatement039uPayload | Form039uRenderPayload): string {
	const p = payload as Form039uRenderPayload;
	const clinicName = p.organization?.fullName || p.clinicLegalName || p.clinic?.name || "Стоматологическая поликлиника";
	const department = p.clinicDepartment || p.department || "Стоматологическое отделение";
	const doctorName = p.reportingDoctor?.fullName || p.doctor?.fullName || p.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = p.doctorSpecialty || "Врач-стоматолог-терапевт";
	const period = p.period || p.periodLabel || p.reportingPeriodMonthYear || "Отчетный месяц";
	const workingDays = p.workingDaysCount || p.workingDays || 21;
	const workingHours = p.workingHoursCount || Number((workingDays * 6.6).toFixed(1));

	const m = (p.consolidatedMetrics || p.metrics || {}) as Record<string, number>;
	const uetBreakdown = (p.uetBreakdown || {}) as Record<string, number>;
	const totalUet = p.uetGrandTotal ?? uetBreakdown.totalUetAccumulated ?? uetBreakdown.totalUetEarned ?? 0;
	const quotaUet = uetBreakdown.periodStandardQuotaUet ?? Number((workingDays * 21.0).toFixed(1));
	const planPct = uetBreakdown.planExecutionPercentage ?? (quotaUet > 0 ? Number(((totalUet / quotaUet) * 100).toFixed(1)) : 100.0);

	const visitsTotal = m.visitsTotal ?? p.totalVisits ?? 0;
	const visitsAdults = m.visitsAdults ?? p.adultsCount ?? 0;
	const visitsChildren = m.visitsChildrenUnder14 ?? p.childrenCount ?? 0;
	const visitsAdolescents = m.visitsAdolescents15_17 ?? 0;
	const visitsRural = m.visitsRuralResidents ?? p.ruralResidentsCount ?? 0;
	const visitsPrimary = m.visitsPrimary ?? p.primaryVisitsCount ?? 0;
	const visitsRepeat = m.visitsRepeat ?? p.repeatVisitsCount ?? (visitsTotal - visitsPrimary);
	const visitsPreventive = m.visitsPreventativeExam ?? 0;
	const sanatedTotal = m.sanatedTotal ?? p.sanatedTotal ?? 0;
	const sanatedAdults = m.sanatedAdults ?? 0;
	const sanatedChildren = m.sanatedChildren ?? 0;

	const fillingsCaries = m.fillingsCariesTotal ?? (p.fillingsByBlackClass ? (Object.values(p.fillingsByBlackClass).reduce((a: number, b: number) => Number(a) + Number(b), 0)) : 0);
	const fillingsComposite = m.fillingsCompositePhotopolymer ?? fillingsCaries;
	const fillingsSic = m.fillingsGlassIonomer ?? 0;
	const pulpitis = m.pulpitisTreatedTotal ?? 0;
	const periodontitis = m.periodontitisTreatedTotal ?? 0;
	const canalsFilled = m.canalsFilledTotal ?? p.endodonticsCanalsCount ?? 0;
	const hygiene = m.hygieneProceduresTotal ?? 0;
	const extractionsSimple = m.extractionsSimple ?? p.surgicalExtractionsCount ?? 0;
	const extractionsComplex = m.extractionsComplex ?? 0;
	const extractionsWisdom = m.extractionsImpactedWisdom ?? 0;
	const surgeries = m.outpatientOperationsCount ?? 0;
	const implants = m.implantsInstalledCount ?? p.implantsPlaced ?? 0;
	const crowns = m.crownsDeliveredCount ?? p.orthopedicCrownsCount ?? 0;
	const anesthesiaInfiltration = m.anesthesiaInfiltrationCount ?? 0;
	const anesthesiaConduction = m.anesthesiaConductionCount ?? 0;
	const xrays = m.radiographsCount ?? 0;

	// Build 31-day calendar matrix
	const calendarRows = [];
	const customDays: CalendarDayRecordLike[] = p.calendarDays || p.days || p.dailyBreakdown || [];

	for (let day = 1; day <= 31; day++) {
		const existing = customDays.find((d: CalendarDayRecordLike) => d.day === day || d.date?.endsWith(`-${String(day).padStart(2, "0")}`));
		if (existing) {
			calendarRows.push({
				day,
				visits: existing.visits ?? existing.patientsCount ?? 0,
				adults: existing.adults ?? 0,
				children: existing.children ?? 0,
				adolescents: existing.adolescents ?? 0,
				rural: existing.rural ?? 0,
				primary: existing.primary ?? 0,
				repeat: existing.repeat ?? 0,
				preventive: existing.preventive ?? 0,
				sanated: existing.sanated ?? 0,
				fillings: existing.fillings ?? 0,
				pulpitisPerio: existing.pulpitisPerio ?? 0,
				canals: existing.canals ?? 0,
				extractions: existing.extractions ?? 0,
				hygiene: existing.hygiene ?? 0,
				uet: existing.uet ?? 0,
			});
		} else {
			// Distribute working days evenly across the month if no explicit breakdown given
			const isWorkDay = day % 7 !== 0 && day % 7 !== 6 && day <= 28; // standard weekdays
			const dayFactor = isWorkDay && workingDays > 0 ? 1 / workingDays : 0;
			calendarRows.push({
				day,
				visits: isWorkDay ? Math.round(visitsTotal * dayFactor) : 0,
				adults: isWorkDay ? Math.round(visitsAdults * dayFactor) : 0,
				children: isWorkDay ? Math.round(visitsChildren * dayFactor) : 0,
				adolescents: isWorkDay ? Math.round(visitsAdolescents * dayFactor) : 0,
				rural: isWorkDay ? Math.round(visitsRural * dayFactor) : 0,
				primary: isWorkDay ? Math.round(visitsPrimary * dayFactor) : 0,
				repeat: isWorkDay ? Math.round(visitsRepeat * dayFactor) : 0,
				preventive: isWorkDay ? Math.round(visitsPreventive * dayFactor) : 0,
				sanated: isWorkDay ? Math.round(sanatedTotal * dayFactor) : 0,
				fillings: isWorkDay ? Math.round(fillingsCaries * dayFactor) : 0,
				pulpitisPerio: isWorkDay ? Math.round((pulpitis + periodontitis) * dayFactor) : 0,
				canals: isWorkDay ? Math.round(canalsFilled * dayFactor) : 0,
				extractions: isWorkDay ? Math.round((extractionsSimple + extractionsComplex) * dayFactor) : 0,
				hygiene: isWorkDay ? Math.round(hygiene * dayFactor) : 0,
				uet: isWorkDay ? Number((totalUet * dayFactor).toFixed(2)) : 0,
			});
		}
	}

	const calendarHtmlRows = calendarRows.map((r) => `
    <tr>
      <td class="center" style="font-weight:bold;">${r.day}</td>
      <td class="center">${r.visits || "—"}</td>
      <td class="center">${r.adults || "—"}</td>
      <td class="center">${r.children || "—"}</td>
      <td class="center">${r.adolescents || "—"}</td>
      <td class="center">${r.rural || "—"}</td>
      <td class="center">${r.primary || "—"}</td>
      <td class="center">${r.repeat || "—"}</td>
      <td class="center">${r.preventive || "—"}</td>
      <td class="center">${r.sanated || "—"}</td>
      <td class="center">${r.fillings || "—"}</td>
      <td class="center">${r.pulpitisPerio || "—"}</td>
      <td class="center">${r.canals || "—"}</td>
      <td class="center">${r.extractions || "—"}</td>
      <td class="center">${r.hygiene || "—"}</td>
      <td class="right">${r.uet > 0 ? Number(r.uet).toFixed(1) : "—"}</td>
    </tr>
  `).join("");

	const specTherapy = uetBreakdown.uetTherapy ?? p.uetBySpecialty?.therapy ?? (totalUet * 0.6);
	const specEndo = uetBreakdown.uetEndodontics ?? p.uetBySpecialty?.endodontics ?? (totalUet * 0.2);
	const specSurg = uetBreakdown.uetSurgery ?? p.uetBySpecialty?.surgery ?? (totalUet * 0.1);
	const specHyg = uetBreakdown.uetHygieneAndPerio ?? p.uetBySpecialty?.hygiene ?? (totalUet * 0.1);
	const specOrtho = uetBreakdown.uetProsthetics ?? uetBreakdown.uetOrthodontics ?? 0;
	const specAnesth = uetBreakdown.uetAnesthesiaAndDiagnostics ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Сводная ведомость 039/у-88 за ${escapeHtml(period)} — ${escapeHtml(doctorName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
  <style>
    @page { size: A4 portrait; margin: 10mm 10mm 10mm 15mm; }
  </style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(department)}</div>
      <div>Врач: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ СССР / РФ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 039/у-88</strong></div>
      <div>Сводная ведомость учета работы врача-стоматолога</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Отчетный период: <strong>${escapeHtml(period)}</strong> | Отработано рабочих дней: <strong>${workingDays}</strong> (${workingHours} ч)</p>
  </div>

  <div class="section-title">1. Объемы приёма, контингент и санация</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Всего посещений:</strong></td>
      <td style="width:25%; font-size:10pt; font-weight:bold; color:#0369a1;">${visitsTotal}</td>
      <td style="width:25%;"><strong>Санировано всего:</strong></td>
      <td style="width:25%; font-size:10pt; font-weight:bold; color:#15803d;">${sanatedTotal}</td>
    </tr>
    <tr>
      <td>В т.ч. взрослых:</td>
      <td>${visitsAdults}</td>
      <td>В т.ч. взрослых санировано:</td>
      <td>${sanatedAdults || Math.round(sanatedTotal * 0.8)}</td>
    </tr>
    <tr>
      <td>В т.ч. детей до 14 лет:</td>
      <td>${visitsChildren}</td>
      <td>В т.ч. детей санировано:</td>
      <td>${sanatedChildren || Math.round(sanatedTotal * 0.2)}</td>
    </tr>
    <tr>
      <td>Подростков (15–17 лет):</td>
      <td>${visitsAdolescents}</td>
      <td>Первичных / Повторных:</td>
      <td>${visitsPrimary} / ${visitsRepeat}</td>
    </tr>
    <tr>
      <td>Жителей села:</td>
      <td>${visitsRural}</td>
      <td>Профилактических осмотров:</td>
      <td>${visitsPreventive}</td>
    </tr>
  </table>

  <div class="section-title">2. Структура выполненных манипуляций и лечебная работа</div>
  <table class="data-table">
    <tr>
      <td style="width:30%;"><strong>Пломбы при кариесе:</strong></td>
      <td style="width:20%;">${fillingsCaries} (Композит: ${fillingsComposite}, СИЦ: ${fillingsSic})</td>
      <td style="width:30%;"><strong>Удалено зубов (всего):</strong></td>
      <td style="width:20%;">${extractionsSimple + extractionsComplex + extractionsWisdom} (Простых: ${extractionsSimple}, Сложн.: ${extractionsComplex})</td>
    </tr>
    <tr>
      <td><strong>Пульпит / Периодонтит:</strong></td>
      <td>Пульпит: ${pulpitis}, Периодонтит: ${periodontitis}</td>
      <td><strong>Амбулаторных операций:</strong></td>
      <td>${surgeries} (Имплантов: ${implants})</td>
    </tr>
    <tr>
      <td><strong>Корневых каналов:</strong></td>
      <td>${canalsFilled}</td>
      <td><strong>Ортопедических коронок:</strong></td>
      <td>${crowns}</td>
    </tr>
    <tr>
      <td><strong>Профессиональная гигиена:</strong></td>
      <td>${hygiene} процедур</td>
      <td><strong>Анестезия / Рентген:</strong></td>
      <td>Инфильтр.: ${anesthesiaInfiltration}, Проводн.: ${anesthesiaConduction}, Снимков: ${xrays}</td>
    </tr>
  </table>

  <div class="section-title">3. Выработка УЕТ по специальностям</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Терапия</th>
        <th>Эндодонтия</th>
        <th>Хирургия</th>
        <th>Гигиена / Пародонт</th>
        <th>Ортопедия / Ортодонтия</th>
        <th>Анестезия / Диагн.</th>
        <th style="background:#0369a1; color:#ffffff;">ИТОГО ВЫРАБОТКА</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">${Number(specTherapy).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specEndo).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specSurg).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specHyg).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specOrtho).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specAnesth).toFixed(1)} УЕТ</td>
        <td class="center" style="font-size:11.5pt; font-weight:800; color:#0369a1;">${Number(totalUet).toFixed(2)} УЕТ</td>
      </tr>
      <tr style="background:#f8fafc; font-size:7.5pt;">
        <td colspan="4">Плановый норматив месяца: <strong>${quotaUet.toFixed(1)} УЕТ</strong> (${workingDays} смен × 21.0 УЕТ)</td>
        <td colspan="3" class="right">Процент выполнения плана: <strong style="color:${planPct >= 100 ? '#15803d' : '#b45309'}; font-size:9pt;">${planPct}%</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. Сводный помесячный календарный реестр (Числа месяца 1–31)</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th style="width:4%;">День</th>
        <th style="width:6%;">Посещ.</th>
        <th style="width:6%;">Взр.</th>
        <th style="width:6%;">Дет.</th>
        <th style="width:6%;">Подр.</th>
        <th style="width:6%;">Село</th>
        <th style="width:6%;">Перв.</th>
        <th style="width:6%;">Повт.</th>
        <th style="width:6%;">Проф.</th>
        <th style="width:6%;">Санир.</th>
        <th style="width:6%;">Пломб</th>
        <th style="width:6%;">Пульп.</th>
        <th style="width:6%;">Канал</th>
        <th style="width:6%;">Удал.</th>
        <th style="width:6%;">Гигиен.</th>
        <th style="width:12%;">УЕТ</th>
      </tr>
    </thead>
    <tbody>
      ${calendarHtmlRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td class="center">ИТОГО</td>
        <td class="center">${visitsTotal}</td>
        <td class="center">${visitsAdults}</td>
        <td class="center">${visitsChildren}</td>
        <td class="center">${visitsAdolescents}</td>
        <td class="center">${visitsRural}</td>
        <td class="center">${visitsPrimary}</td>
        <td class="center">${visitsRepeat}</td>
        <td class="center">${visitsPreventive}</td>
        <td class="center">${sanatedTotal}</td>
        <td class="center">${fillingsCaries}</td>
        <td class="center">${pulpitis + periodontitis}</td>
        <td class="center">${canalsFilled}</td>
        <td class="center">${extractionsSimple + extractionsComplex}</td>
        <td class="center">${hygiene}</td>
        <td class="right"><strong>${Number(totalUet).toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>

  ${payload.chiefDoctorNotes ? `<div style="font-size:7.5pt; color:#475569; margin:4px 0;"><strong>Замечания главного врача:</strong> ${escapeHtml(payload.chiefDoctorNotes)}</div>` : ""}

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-стоматолог: <strong>${escapeHtml(doctorName)}</strong></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Главный врач: _________________ <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}
