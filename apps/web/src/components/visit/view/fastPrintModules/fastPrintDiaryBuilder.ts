/**
 * apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts
 *
 * Генератор печатного бланка дневника стоматологического осмотра (вкладыш в медкарту)
 * и печатной формы медицинской карты приёма.
 * Строго 0 мультяшных эмодзи (Мандат 8d, Грех №7) — только официальная медицинская типографика.
 */

import { formatRuDateShort } from "../../../../utils/dateUtils";
import type { A4DocumentMedicalCardData } from "@dental/shared";

export interface FastPrintClinicalDiaryParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly activeAppointment?: any;
	readonly visitNoteForm?: any;
	readonly isClosed?: boolean;
	readonly watermarkText?: string;
	readonly dashboard?: any;
	readonly teethFormula?: Record<string | number, any>;
	readonly selectedToothForMenu?: any;
}

export type FastPrint043Params = FastPrintClinicalDiaryParams;

export interface FastPrintDiarySheetParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly visitNoteForm?: any;
	readonly visitDate?: Date | string;
	readonly toothNumber?: number | string;
	readonly isSigned?: boolean;
	readonly clinicName?: string;
}

export function printHtmlViaIframe(htmlContent: string, documentTitle = "Печать"): void {
	if (typeof document === "undefined") return;

	const iframe = document.createElement("iframe");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.border = "0";
	iframe.title = documentTitle;

	document.body.appendChild(iframe);

	const iframeDoc = iframe.contentWindow?.document;
	if (!iframeDoc) {
		document.body.removeChild(iframe);
		return;
	}

	iframeDoc.open();
	iframeDoc.write(htmlContent);
	iframeDoc.close();

	iframe.onload = () => {
		try {
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
		} catch (e) {
			console.error("[fastPrint] Error invoking print dialog:", e);
		} finally {
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 2000);
		}
	};
}

export function extractClinicRequisites(dashboard: any) {
	const clinicName =
		dashboard?.organization?.name ||
		dashboard?.organizationName ||
		dashboard?.clinicSettings?.clinicName ||
		"Стоматологическая клиника";
	const clinicAddress =
		dashboard?.organization?.address ||
		dashboard?.clinicSettings?.address ||
		"—";
	const clinicPhone =
		dashboard?.organization?.phone ||
		dashboard?.clinicSettings?.phone ||
		"—";
	const clinicOgrn =
		dashboard?.organization?.ogrn ||
		dashboard?.clinicSettings?.ogrn ||
		"—";
	const clinicInn =
		dashboard?.organization?.inn ||
		dashboard?.clinicSettings?.inn ||
		"—";
	const license =
		dashboard?.organization?.licenseNumber ||
		dashboard?.organization?.license ||
		dashboard?.clinicSettings?.licenseNumber ||
		"—";

	return {
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicOgrn,
		clinicInn,
		license,
	};
}

export function normalizeOdontogramForDmft(teethFormula: any) {
	let decayed = 0;
	let missing = 0;
	let filled = 0;

	if (!teethFormula) return { decayed: 0, missing: 0, filled: 0, total: 0 };

	for (const tooth of Object.values(teethFormula) as any[]) {
		const state = String(tooth?.state || tooth?.status || "").toLowerCase().trim();
		if (
			state.includes("caries") ||
			state.includes("кариес") ||
			state.includes("pulp") ||
			state.includes("пульп") ||
			state.includes("perio") ||
			state.includes("перио") ||
			state === "c" ||
			state.startsWith("c_")
		) {
			decayed++;
		} else if (
			state.includes("miss") ||
			state.includes("extract") ||
			state.includes("отсутств") ||
			state.includes("удал") ||
			state === "r" ||
			state.startsWith("r_")
		) {
			missing++;
		} else if (
			state.includes("fill") ||
			state.includes("пломб") ||
			state.includes("crown") ||
			state.includes("коронк") ||
			state === "f" ||
			state.startsWith("f_")
		) {
			filled++;
		}
	}

	return {
		decayed,
		missing,
		filled,
		total: decayed + missing + filled,
	};
}

/**
 * Собирает официальный HTML-лист дневника приёма для вклейки в медицинскую карту 043/у.
 * 0 эмодзи, строго регламентированная медицинская типографика ГОСТ.
 */
export function buildFastPrintDiarySheetHtml(params: FastPrintDiarySheetParams): string {
	if (!params.activePatient || !params.activePatient.fullName) {
		throw new Error("Пациент не выбран. Печать невозможна");
	}
	const patientName = params.activePatient.fullName;
	const cardNumber = params.activePatient.cardNumber || params.activePatient.medicalCardNumber || params.activePatient.id || "—";
	const doctorName = params.activeDoctor?.fullName || "Лечащий врач";
	const specialty = params.activeDoctor?.specialty || "Стоматолог-терапевт";
	const dateStr = params.visitDate ? formatRuDateShort(params.visitDate) : new Date().toLocaleDateString("ru-RU");

	const complaints = params.visitNoteForm?.complaint || "Жалоб активно не предъявляет (профилактический осмотр).";
	const anamnesis = params.visitNoteForm?.anamnesis || "Соматически здоров. Аллергоанамнез не отягощен.";
	const objective = params.visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта бледно-розовая, влажная. Зондирование безболезненно.";
	const diagnosis = params.visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)";
	const treatmentPlan = params.visitNoteForm?.treatmentPlan || "Проведена профессиональная гигиена и санация полости рта.";
	const recommendations = params.visitNoteForm?.recommendations || "Плановый осмотр через 6 месяцев. Щадящая диета 24 ч.";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Дневник приёма — ${patientName} (${cardNumber})</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 20mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
		.watermark { position: fixed; top: 40%; left: 15%; width: 70%; text-align: center; font-size: 52pt; font-weight: bold; color: rgba(180, 180, 180, 0.22); transform: rotate(-30deg); pointer-events: none; z-index: 9999; }
		.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
		.clinic-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
		.doc-sub { font-size: 10pt; font-style: italic; margin-top: 2px; }
		.meta-grid { display: table; width: 100%; margin-bottom: 12px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
		.meta-row { display: table-row; }
		.meta-cell { display: table-cell; padding: 2px 4px; font-size: 10pt; }
		.meta-label { font-weight: bold; width: 22%; }
		.section-title { font-weight: bold; font-size: 10.5pt; text-decoration: underline; margin-top: 8px; margin-bottom: 3px; }
		.section-body { margin-left: 8px; margin-bottom: 6px; text-align: justify; }
		.sign-block { margin-top: 24px; display: table; width: 100%; page-break-inside: avoid; }
		.sign-cell { display: table-cell; width: 50%; vertical-align: bottom; }
		.line-field { border-bottom: 1px solid #000; width: 85%; display: inline-block; margin-top: 14px; }
	</style>
</head>
<body>
	${!params.isSigned ? `<div class="watermark">ЧЕРНОВИК</div>` : `<div class="watermark signed" style="color: rgba(13, 148, 136, 0.12);">ПОДПИСАНО ВРАЧОМ</div>`}
	<div class="header">
		<div class="clinic-title">${params.clinicName || "Стоматологическая клиника DENTE"}</div>
		<div class="doc-sub">Дневник приёма стоматологического пациента<!-- Вкладыш в медицинскую карту стоматологического пациента № 043/у --></div>
	</div>
	<div class="meta-grid">
		<div class="meta-row">
			<div class="meta-cell meta-label">Дата приёма:</div>
			<div class="meta-cell">${dateStr}</div>
			<div class="meta-cell meta-label">Карта №:</div>
			<div class="meta-cell">${cardNumber}</div>
		</div>
		<div class="meta-row">
			<div class="meta-cell meta-label">Пациент:</div>
			<div class="meta-cell">${patientName}</div>
			<div class="meta-cell meta-label">Врач:</div>
			<div class="meta-cell">${doctorName} (${specialty})</div>
		</div>
	</div>

	<div class="section-title">Жалобы (Subjective):</div>
	<div class="section-body">${complaints}</div>

	<div class="section-title">Анамнез заболевания и жизни:</div>
	<div class="section-body">${anamnesis}</div>

	<div class="section-title">Объективный статус (Objective):</div>
	<div class="section-body">${objective}</div>

	<div class="section-title">Клинический диагноз (Assessment):</div>
	<div class="section-body" style="font-weight: bold;">${diagnosis}</div>

	<div class="section-title">Проведённое лечение (Plan):</div>
	<div class="section-body">${treatmentPlan}</div>

	<div class="section-title">Рекомендации и назначения:</div>
	<div class="section-body">${recommendations}</div>

	<div class="sign-block">
		<div class="sign-cell">
			<div>Врач: ${doctorName}</div>
			<div class="line-field"></div>
			<div style="font-size: 8pt; color: #444;">(подпись, личная печать)</div>
		</div>
		<div class="sign-cell" style="text-align: right;">
			<div>Статус: ${params.isSigned ? "Подписано врачом" : "Дневник осмотра"}</div>
			<div style="font-size: 9pt; margin-top: 16px;">М.П. Клиники</div>
		</div>
	</div>
</body>
</html>`;
}

export function executeFastPrintDiarySheet(params: FastPrintDiarySheetParams): void {
	const html = buildFastPrintDiarySheetHtml(params);
	printHtmlViaIframe(html, `Дневник_${params.activePatient?.fullName || "Пациент"}`);
}

/**
 * Единый канонический SSOT-трансформер данных приёма в структуру медицинской карты А4 (A4DocumentMedicalCardData).
 * Исключает расхождение данных между быстрой печатью и формой MedicalCardSheet.tsx.
 */
export function buildMedicalCardDataFromFastPrintParams(params: FastPrintClinicalDiaryParams): A4DocumentMedicalCardData {
	if (!params.activePatient || !params.activePatient.fullName) {
		throw new Error("Пациент не выбран. Печать невозможна");
	}
	const req = extractClinicRequisites(params.dashboard);
	const activePatient = params.activePatient;
	const activeDoctor = params.activeDoctor;
	const activeAppointment = params.activeAppointment;
	const visitNoteForm = params.visitNoteForm;

	const patientName = activePatient.fullName;
	const cardNumber = activePatient.cardNumber || activePatient.medicalCardNumber || activePatient.id || "—";
	const visitDate = activeAppointment?.startsAt ? formatRuDateShort(activeAppointment.startsAt) : new Date().toLocaleDateString("ru-RU");

	const rawDiagnosis = visitNoteForm?.diagnosis || (params.selectedToothForMenu ? `Зуб ${params.selectedToothForMenu}: K02.1 Кариес дентина` : "K02.1 Кариес дентина");
	const icd10Match = rawDiagnosis.match(/([A-Z]\d{2}(?:\.\d+)?)/i);
	const diagnosisIcd10 = icd10Match ? icd10Match[1].toUpperCase() : "Z01.2";
	const diagnosisDescription = rawDiagnosis.replace(/^[A-Z]\d{2}(?:\.\d+)?\s*/i, "").trim() || "Стоматологическое обследование и лечение";

	return {
		cardNumber,
		visitDate,
		clinic: {
			name: req.clinicName,
			legalName: req.clinicName,
			shortName: req.clinicName,
			address: req.clinicAddress,
			actualAddress: req.clinicAddress,
			phone: req.clinicPhone,
			inn: req.clinicInn,
			ogrn: req.clinicOgrn,
			licenseNumber: req.license,
			licenseDate: "",
			city: "г. Москва",
		},
		patient: {
			fullName: patientName,
			birthDate: activePatient?.birthDate ? formatRuDateShort(activePatient.birthDate) : "—",
			gender: activePatient?.gender || "unknown",
			phone: activePatient?.phone || "—",
			address: activePatient?.address || "—",
			registrationAddress: activePatient?.address || "—",
			snils: activePatient?.snils || activePatient?.administrativeProfile?.snils || "",
			omsPolis: activePatient?.omsPolis || activePatient?.administrativeProfile?.omsPolis || "",
		},
		doctorFullName: activeDoctor?.fullName || "Лечащий врач",
		doctorSpecialty: activeDoctor?.specialty || "Врач-стоматолог",
		complaints: visitNoteForm?.complaint || "Жалоб на момент осмотра не предъявляет.",
		anamnesisMorbi: visitNoteForm?.anamnesis || "Соматически здоров. Аллергологический анамнез не отягощен.",
		allergyStatus: activePatient?.allergies?.length ? activePatient.allergies.join(", ") : "Не отягощен (со слов пациента)",
		somaticStatus: "Соматически здоров, сопутствующих заболеваний нет",
		statusLocalis: visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта бледно-розовая, влажная. Прикус физиологический.",
		diagnosisIcd10,
		diagnosisDescription,
		diagnosisTooth: params.selectedToothForMenu || undefined,
		teethFormulaMap: params.teethFormula as any,
		treatmentProtocol: visitNoteForm?.treatmentPlan || "Препарирование кариозной полости, медикаментозная обработка, постановка пломбы светового отверждения.",
		recommendations: visitNoteForm?.recommendations || "Соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.",
	};
}

export function executeFastPrintClinicalDiary({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	isClosed = false,
	watermarkText = "ЧЕРНОВИК",
	dashboard,
	teethFormula,
	selectedToothForMenu,
}: FastPrintClinicalDiaryParams) {
	if (!activePatient || !activePatient.fullName) {
		throw new Error("Пациент не выбран. Печать невозможна");
	}

	const req = extractClinicRequisites(dashboard);
	const dmft = normalizeOdontogramForDmft(teethFormula);

	const patientName = activePatient.fullName;
	const cardNumber = activePatient.cardNumber || activePatient.medicalCardNumber || activePatient.id || "—";
	const birthDate = activePatient.birthDate ? formatRuDateShort(activePatient.birthDate) : "—";
	const phone = activePatient.phone || "—";
	const address = activePatient.address || "—";
	const doctorName = activeDoctor?.fullName || "Лечащий врач";
	const specialty = activeDoctor?.specialty || "Стоматолог общей практики";
	const visitDate = activeAppointment?.startsAt ? formatRuDateShort(activeAppointment.startsAt) : new Date().toLocaleDateString("ru-RU");

	const complaint = visitNoteForm?.complaint || "Жалоб на момент осмотра не предъявляет.";
	const anamnesis = visitNoteForm?.anamnesis || "Соматически здоров. Аллергологический анамнез не отягощен.";
	const objectiveStatus = visitNoteForm?.objectiveStatus || "Слизистая оболочка полости рта бледно-розовая, влажная. Прикус физиологический.";
	const diagnosis = visitNoteForm?.diagnosis || (selectedToothForMenu ? `Зуб ${selectedToothForMenu}: K02.1 Кариес дентина` : "K02.1 Кариес дентина");
	const treatmentPlan = visitNoteForm?.treatmentPlan || "Препарирование кариозной полости, медикаментозная обработка, постановка пломбы светового отверждения.";
	const recommendations = visitNoteForm?.recommendations || "Соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.";

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Медицинская карта приёма — ${patientName}</title>
	<style>
		@page { size: A4; margin: 12mm 15mm 15mm 20mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
		.watermark { position: fixed; top: 40%; left: 15%; width: 70%; text-align: center; font-size: 52pt; font-weight: bold; color: rgba(180, 180, 180, 0.22); transform: rotate(-30deg); pointer-events: none; z-index: 9999; }
		.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 12px; }
		.clinic-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
		.clinic-info { font-size: 9pt; color: #333; margin-top: 2px; }
		.form-title { font-size: 12pt; font-weight: bold; margin-top: 8px; text-transform: uppercase; }
		.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5pt; }
		.meta-table td { padding: 3px 4px; vertical-align: top; }
		.meta-label { font-weight: bold; width: 28%; }
		.dmft-box { border: 1px solid #000; padding: 6px 10px; margin: 8px 0; font-size: 10pt; background: #fafafa; display: flex; justify-content: space-around; }
		.section-header { font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #777; }
		.section-content { margin-left: 6px; margin-bottom: 8px; text-align: justify; font-size: 10.5pt; }
		.signature-block { margin-top: 26px; width: 100%; display: table; page-break-inside: avoid; }
		.signature-cell { display: table-cell; width: 50%; vertical-align: bottom; }
		.underline { border-bottom: 1px solid #000; display: inline-block; width: 80%; height: 18px; margin-top: 14px; }
	</style>
</head>
<body>
	${!isClosed ? `<div class="watermark">${watermarkText || "ЧЕРНОВИК"}</div>` : `<div class="watermark signed" style="color: rgba(13, 148, 136, 0.12);">ПОДПИСАНО ВРАЧОМ</div>`}

	<div class="header">
		<div class="clinic-name">${req.clinicName}</div>
		<div class="clinic-info">Адрес: ${req.clinicAddress} | Тел: ${req.clinicPhone} | Лицензия: ${req.license}</div>
		<div class="form-title">Медицинская карта приёма стоматологического пациента</div>
		<div class="clinic-info">Официальный клинический дневник стоматологического осмотра и лечения</div>
	</div>

	<table class="meta-table">
		<tr>
			<td class="meta-label">Номер карты:</td>
			<td><strong>${cardNumber}</strong></td>
			<td class="meta-label">Дата визита:</td>
			<td>${visitDate}</td>
		</tr>
		<tr>
			<td class="meta-label">Пациент (Ф.И.О.):</td>
			<td colspan="3"><strong>${patientName}</strong></td>
		</tr>
		<tr>
			<td class="meta-label">Дата рождения:</td>
			<td>${birthDate}</td>
			<td class="meta-label">Телефон:</td>
			<td>${phone}</td>
		</tr>
		<tr>
			<td class="meta-label">Адрес:</td>
			<td colspan="3">${address}</td>
		</tr>
		<tr>
			<td class="meta-label">Лечащий врач:</td>
			<td colspan="3">${doctorName} (${specialty})</td>
		</tr>
	</table>

	<div class="dmft-box">
		<span><strong>Индекс КПУ:</strong> ${dmft.total}</span>
		<span>К (Кариес): <strong>${dmft.decayed}</strong></span>
		<span>П (Пломба): <strong>${dmft.filled}</strong></span>
		<span>У (Удален): <strong>${dmft.missing}</strong></span>
		<span>Степень активности: <strong>${dmft.total > 6 ? "Высокая" : dmft.total > 3 ? "Средняя" : "Низкая"}</strong></span>
	</div>

	<div class="section-header">1. Жалобы пациента</div>
	<div class="section-content">${complaint}</div>

	<div class="section-header">2. Анамнез заболевания и соматический статус</div>
	<div class="section-content">${anamnesis}</div>

	<div class="section-header">3. Данные объективного осмотра</div>
	<div class="section-content">${objectiveStatus}</div>

	<div class="section-header">4. Диагноз по МКБ-10</div>
	<div class="section-content"><strong>${diagnosis}</strong></div>

	<div class="section-header">5. Проведённое лечение</div>
	<div class="section-content">${treatmentPlan}</div>

	<div class="section-header">6. Рекомендации и назначения врача</div>
	<div class="section-content">${recommendations}</div>

	<div class="signature-block">
		<div class="signature-cell">
			<div>Врач: ${doctorName}</div>
			<div class="underline"></div>
			<div style="font-size: 8pt; color: #555;">(подпись, личная печать врача)</div>
		</div>
		<div class="signature-cell" style="text-align: right;">
			<div>Пациент: ${patientName}</div>
			<div class="underline"></div>
			<div style="font-size: 8pt; color: #555;">(подпись пациента)</div>
		</div>
	</div>
</body>
</html>`;

	printHtmlViaIframe(html, `Медицинская_карта_${patientName}`);
}

/**
 * Алиас обратной совместимости
 */
export const executeFastPrint043u = executeFastPrintClinicalDiary;
