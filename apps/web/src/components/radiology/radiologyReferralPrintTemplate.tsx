/**
 * DENTE CRM — CBCT Clinical Referral Print Template & Preset Library
 * Standards: Russian MoH Orders № 560n & 804n, SanPiN 2.6.1.1192-03, ALARA principle
 */

import React from "react";
import { ADULT_FDI_TEETH } from "./radiologyMath.js";
import type {
	CbctDiagnosticGoal,
	CbctDiagnosticGoalId,
	CbctReferralPartner,
	CbctScanFovProtocol,
} from "./radiologyProtocols.js";

export interface RadiologyReferralPrintData {
	readonly clinic: string;
	readonly license: string;
	readonly address: string;
	readonly phone: string;
	readonly referralNumber: string;
	readonly partner: CbctReferralPartner;
	readonly barcodeSvg: string;
	readonly qrCodeSvg: string;
	readonly patientFullName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly patientPhoneStr: string;
	readonly docName: string;
	readonly docSpec: string;
	readonly diagnosisIcd10: string;
	readonly goal: CbctDiagnosticGoal;
	readonly fov: CbctScanFovProtocol;
	readonly clinicalNotes: string;
	readonly selectedTeeth: readonly string[];
	readonly targetTeethDisplay: string;
	readonly isPregnancyExcluded: boolean;
	readonly hasMetallicArtifacts: boolean;
	readonly isTmjOpenClosedProtocol: boolean;
}

export interface ClinicalExpressPreset {
	readonly label: string;
	readonly fovId: string;
	readonly goalId: CbctDiagnosticGoalId;
	readonly icd: string;
	readonly teeth?: readonly string[] | undefined;
	readonly note: string;
}

export interface RadiologyReferralModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly cardNumber?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
	} | null | undefined;
	readonly diary?: {
		readonly diagnosisIcd10?: string | null | undefined;
		readonly diagnosisTooth?: string | null | undefined;
		readonly statusLocalis?: string | null | undefined;
		readonly [key: string]: any;
	} | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly initialDiagnosisIcd10?: string | undefined;
	readonly initialTeeth?: string[] | undefined;
	readonly onSuccessReferralCreated?: ((referralData: any) => void) | undefined;
}

export const EMPTY_TEETH_LIST: readonly string[] = [];

// 1-Click Zone Presets
export const TOOTH_ZONE_PRESETS = [
	{
		label: "Обе челюсти (Все)",
		teeth: [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant4,
			...ADULT_FDI_TEETH.quadrant3,
		],
	},
	{
		label: "Верхняя челюсть",
		teeth: [...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2],
	},
	{
		label: "Нижняя челюсть",
		teeth: [...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3],
	},
	{
		label: "Фронт (13–23, 33–43)",
		teeth: ["13", "12", "11", "21", "22", "23", "33", "32", "31", "41", "42", "43"],
	},
	{
		label: "Сектор 1 (18–11)",
		teeth: [...ADULT_FDI_TEETH.quadrant1],
	},
	{
		label: "Сектор 2 (21–28)",
		teeth: [...ADULT_FDI_TEETH.quadrant2],
	},
	{
		label: "Сектор 3 (31–38)",
		teeth: [...ADULT_FDI_TEETH.quadrant3],
	},
	{
		label: "Сектор 4 (48–41)",
		teeth: [...ADULT_FDI_TEETH.quadrant4],
	},
] as const;

// 1-Click Clinical Express Presets for Doctor Fast-Path (0-5 Seconds)
export const CLINICAL_EXPRESS_PRESETS: readonly ClinicalExpressPreset[] = [
	{
		label: "Имплантация (Все)",
		fovId: "cbct_full_jaws_16x10",
		goalId: "implantation",
		icd: "K08.1",
		teeth: TOOTH_ZONE_PRESETS[0].teeth,
		note: "Планирование имплантации (обе челюсти, костный гребень)",
	},
	{
		label: "Синус-лифтинг (ВЧ)",
		fovId: "cbct_maxilla_sinuses_10x10",
		goalId: "implantation",
		icd: "K08.1",
		teeth: TOOTH_ZONE_PRESETS[1].teeth,
		note: "Синус-лифтинг ВЧ и субантральная аугментация",
	},
	{
		label: "НЧ (Канал / 8-ки)",
		fovId: "cbct_mandible_10x10",
		goalId: "orthodontics",
		icd: "K07.3",
		teeth: TOOTH_ZONE_PRESETS[2].teeth,
		note: "Нижнечелюстной канал и восьмерки #38, #48",
	},
	{
		label: "Эндо Micro-CT (MB2)",
		fovId: "cbct_endo_micro_5x5",
		goalId: "endodontics",
		icd: "K04.0",
		note: "Endo Micro-CT: поиск MB2 канала и трещин корня",
	},
	{
		label: "ВНЧС (2 сустава)",
		fovId: "cbct_tmj_both_joints",
		goalId: "tmj",
		icd: "K07.6",
		note: "ВНЧС 2 сустава (окклюзия + открытый рот)",
	},
];

/**
 * Generates an official, Russian statutory MoH 560n compliant A4 print document for CBCT referral.
 */
export function generateRadiologyReferralHtml(data: RadiologyReferralPrintData): string {
	const {
		clinic,
		license,
		address,
		phone,
		referralNumber,
		partner,
		barcodeSvg,
		qrCodeSvg,
		patientFullName,
		patientBirth,
		patientCard,
		patientPhoneStr,
		docName,
		docSpec,
		diagnosisIcd10,
		goal,
		fov,
		clinicalNotes,
		selectedTeeth,
		targetTeethDisplay,
		isPregnancyExcluded,
		hasMetallicArtifacts,
		isTmjOpenClosedProtocol,
	} = data;

	const today = new Date().toLocaleDateString("ru-RU");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Направление на КЛКТ № ${referralNumber}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9.5pt; color: #0f172a; line-height: 1.4; margin: 0; padding: 0; background: #fff; }
  .doc-container { width: 100%; max-width: 190mm; margin: 0 auto; }
  .header-grid { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .clinic-info { max-width: 60%; font-size: 8.5pt; color: #334155; }
  .clinic-title { font-size: 11pt; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; }
  .doc-requisites { text-align: right; }
  .doc-title { font-size: 13pt; font-weight: 900; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-number { font-size: 8.5pt; font-weight: bold; color: #475569; margin-top: 2px; }
  .barcodes-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; }
  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }
  .data-table td { padding: 4px 6px; border: 1px solid #cbd5e1; }
  .data-table .label { width: 25%; font-weight: bold; background: #f1f5f9; color: #334155; }
  .highlight-box { border: 1.5px solid #0f766e; border-radius: 6px; padding: 10px 12px; background: #f0fdfa; margin-bottom: 10px; }
  .fov-badge { display: inline-block; background: #0f766e; color: #fff; font-weight: bold; font-size: 8pt; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
  .teeth-grid { width: 100%; border-collapse: collapse; text-align: center; font-size: 8pt; font-weight: bold; margin: 6px 0; }
  .teeth-grid td { border: 1px solid #94a3b8; padding: 3px 2px; }
  .teeth-grid .target { background: #99f6e4; color: #0f766e; border: 1.5pt solid #0f766e; font-weight: 900; }
  .safety-box { font-size: 8pt; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; }
  .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; font-size: 9pt; }
  .sig-line { width: 160px; border-bottom: 1px solid #0f172a; margin-top: 25px; margin-bottom: 4px; }
  .seal-box { width: 64px; height: 64px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: #64748b; }
</style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${clinic}</div>
      <div>Лицензия: ${license}</div>
      <div>Адрес: ${address} | Тел: ${phone}</div>
    </div>
    <div class="doc-requisites">
      <div class="doc-title">НАПРАВЛЕНИЕ НА КЛКТ</div>
      <div class="doc-number">№ ${referralNumber} от ${today}</div>
      <div style="font-size:8pt; color:#0f766e; font-weight:bold; margin-top:2px;">Куда: ${partner.nameRu}</div>
    </div>
  </div>

  <div class="barcodes-row">
    <div>${barcodeSvg}</div>
    <div style="text-align:right; display:flex; align-items:center; gap:8px;">
      <div style="font-size:7.5pt; color:#475569; text-align:right;">
        <strong>Электронный QR-код</strong><br>для моментального сканирования<br>в рентген-центре
      </div>
      <div>${qrCodeSvg}</div>
    </div>
  </div>

  <table class="data-table">
    <tbody>
      <tr>
        <td class="label">Пациент (Ф.И.О.):</td>
        <td><strong>${patientFullName}</strong></td>
        <td class="label" style="width:18%;">Дата рожд.:</td>
        <td style="width:20%;">${patientBirth}</td>
      </tr>
      <tr>
        <td class="label">Номер мед. карты:</td>
        <td><strong>${patientCard}</strong></td>
        <td class="label">Телефон:</td>
        <td>${patientPhoneStr}</td>
      </tr>
      <tr>
        <td class="label">Направивший врач:</td>
        <td colspan="3"><strong>${docName}</strong> (${docSpec})</td>
      </tr>
      <tr>
        <td class="label">Диагноз (МКБ-10):</td>
        <td colspan="3"><strong style="color:#0f766e;">${diagnosisIcd10}</strong> — Стоматологическое обследование / ${goal.titleRu}</td>
      </tr>
    </tbody>
  </table>

  <div class="highlight-box">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div>
        <strong style="font-size:10pt; color:#0f766e; text-transform:uppercase;">1. Клиническая зона сканирования (FOV):</strong>
        <span class="fov-badge">${fov.fovDimensions}</span>
        ${fov.isHighResolution ? '<span class="fov-badge" style="background:#0284c7;">Ultra-High Res 75µm</span>' : ""}
        ${fov.isDualPhase ? '<span class="fov-badge" style="background:#7c3aed;">Двухфазный (Закрыт/Открыт)</span>' : ""}
      </div>
      <div style="font-size:8.5pt; font-weight:bold; color:#0f766e;">Доза ~${fov.typicalDoseMicrosv} мкЗв (ALARA)</div>
    </div>
    <div style="font-size:9pt; margin-bottom:4px;"><strong>Зона:</strong> ${fov.titleRu}</div>
    <div style="font-size:8.5pt; color:#334155;"><strong>Описание:</strong> ${fov.description}</div>
  </div>

  <div style="margin-bottom:10px;">
    <div style="font-weight:bold; font-size:8.5pt; text-transform:uppercase; color:#0f172a; margin-bottom:4px;">
      2. Клиническая цель и задачи исследования:
    </div>
    <div style="font-size:9pt; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px;">
      <div style="font-weight:bold; color:#0f766e; margin-bottom:2px;">${goal.titleRu} — ${goal.description}</div>
      <div style="font-size:8pt; color:#475569;">Задачи: ${goal.clinicalTasks.join("; ")}.</div>
      ${clinicalNotes ? `<div style="font-size:8pt; color:#0f172a; margin-top:4px; border-top:1px dashed #cbd5e1; padding-top:2px;"><strong>Особые указания:</strong> ${clinicalNotes}</div>` : ""}
    </div>
  </div>

  <div style="margin-bottom:10px;">
    <div style="font-weight:bold; font-size:8.5pt; text-transform:uppercase; color:#0f172a; margin-bottom:2px;">
      3. Локализация по зубной формуле (FDI):
    </div>
    <table class="teeth-grid">
      <tr>
        ${["18","17","16","15","14","13","12","11"].map((t) => `<td class="${selectedTeeth.includes(t) ? "target" : ""}">${t}</td>`).join("")}
        <td style="border:none; width:4px;"></td>
        ${["21","22","23","24","25","26","27","28"].map((t) => `<td class="${selectedTeeth.includes(t) ? "target" : ""}">${t}</td>`).join("")}
      </tr>
      <tr>
        ${["48","47","46","45","44","43","42","41"].map((t) => `<td class="${selectedTeeth.includes(t) ? "target" : ""}">${t}</td>`).join("")}
        <td style="border:none; width:4px;"></td>
        ${["31","32","33","34","35","36","37","38"].map((t) => `<td class="${selectedTeeth.includes(t) ? "target" : ""}">${t}</td>`).join("")}
      </tr>
    </table>
    <div style="font-size:8pt; color:#0f766e; font-weight:bold;">Отмеченные зубы/сегмент: ${targetTeethDisplay}</div>
  </div>

  <div class="safety-box">
    <strong>Радиационная безопасность (СанПиН 2.6.1.1192-03 / Приказ №560н):</strong><br>
    [${isPregnancyExcluded ? "X" : " "}] Беременность исключена | [${hasMetallicArtifacts ? "X" : " "}] Металлоконструкции / коронки | Принцип ALARA соблюдён.
    ${fov.isDualPhase ? ` | [${isTmjOpenClosedProtocol ? "X" : " "}] Исследование ВНЧС в 2 положениях (привычная окклюзия + открытый рот).` : ""}
  </div>

  <div class="signatures">
    <div>
      <div>Направивший врач: <strong>${docName}</strong></div>
      <div class="sig-line"></div>
      <div style="font-size:8pt; color:#64748b;">(подпись врача)</div>
    </div>
    <div class="seal-box">М.П.</div>
    <div style="text-align:right;">
      <div>Рентгенолаборант / Центр: _________________</div>
      <div class="sig-line" style="margin-left:auto;"></div>
      <div style="font-size:8pt; color:#64748b;">(отметка о выполнении)</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Triggers invisible iframe-based clean browser print for the referral document.
 */
export function printRadiologyReferralHtml(html: string, onPrinted?: () => void): void {
	if (typeof document === "undefined") return;

	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.right = "0";
	printFrame.style.bottom = "0";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
	if (frameDoc) {
		frameDoc.open();
		frameDoc.write(html);
		frameDoc.close();
		setTimeout(() => {
			printFrame.contentWindow?.focus();
			printFrame.contentWindow?.print();
			setTimeout(() => {
				if (printFrame.parentNode) {
					printFrame.parentNode.removeChild(printFrame);
				}
				if (onPrinted) {
					onPrinted();
				}
			}, 1000);
		}, 250);
	}
}

export interface RadiologyReferralPreviewDetailsProps {
	readonly patientFullName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly docName: string;
	readonly currentFov: CbctScanFovProtocol;
	readonly currentGoal: CbctDiagnosticGoal;
	readonly targetTeethDisplay: string;
	readonly diagnosisIcd10: string;
	readonly isPregnancyExcluded: boolean;
	readonly hasMetallicArtifacts: boolean;
}

export const RadiologyReferralPreviewDetails: React.FC<RadiologyReferralPreviewDetailsProps> = ({
	patientFullName,
	patientBirth,
	patientCard,
	docName,
	currentFov,
	currentGoal,
	targetTeethDisplay,
	diagnosisIcd10,
	isPregnancyExcluded,
	hasMetallicArtifacts,
}) => (
	<>
		{/* Patient Info */}
		<div className="border-b border-[var(--line)] pb-2 grid grid-cols-2 gap-1.5 text-xs">
			<div>
				<span className="text-[var(--muted)]">Пациент: </span>
				<strong className="text-[var(--ink)]">{patientFullName}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)]">Дата рожд.: </span>
				<strong className="text-[var(--ink)]">{patientBirth}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)]">Мед. карта: </span>
				<strong className="text-[var(--ink)]">{patientCard}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)]">Врач: </span>
				<strong className="text-[var(--ink)]">{docName}</strong>
			</div>
		</div>

		{/* Clinical Study Box */}
		<div className="p-3 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-1.5 text-xs">
			<div className="flex justify-between items-center">
				<span className="font-black text-[var(--ink)] text-xs md:text-sm">
					Зона: {currentFov.titleRu}
				</span>
				<span className="px-2 py-0.5 rounded bg-[var(--teal)] text-white font-bold text-[10px]">
					{currentFov.fovDimensions} · ~{currentFov.typicalDoseMicrosv} мкЗв
				</span>
			</div>
			<div>
				<span className="text-[var(--muted)]">Цель исследования: </span>
				<strong className="text-[var(--ink)]">{currentGoal.titleRu}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)]">Зубы (FDI): </span>
				<strong className="text-[var(--teal)] font-bold">{targetTeethDisplay}</strong>
			</div>
			<div>
				<span className="text-[var(--muted)]">Диагноз (МКБ-10): </span>
				<strong className="font-mono text-[var(--teal)]">{diagnosisIcd10}</strong>
			</div>
		</div>

		{/* Safety Notice */}
		<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] text-[var(--muted)] leading-snug">
			<strong>Безопасность (СанПиН 2.6.1.1192-03):</strong> Исследование обосновано.
			Беременность {isPregnancyExcluded ? "исключена" : "требует согласования"}. Металлоконструкции: {hasMetallicArtifacts ? "есть" : "нет"}.
		</div>

		{/* Signatures */}
		<div className="border-t border-[var(--line)] pt-2.5 flex justify-between items-end text-xs text-[var(--muted)]">
			<div>
				<div>Направил: <strong>{docName}</strong></div>
				<div className="text-[10px] text-[var(--muted)] mt-0.5">
					Дата: {new Date().toLocaleDateString("ru-RU")}
				</div>
			</div>
			<div className="w-12 h-12 rounded-full border border-dashed border-[var(--line-strong,var(--line))] flex items-center justify-center font-bold text-[9px] text-[var(--muted)]">
				М.П.
			</div>
		</div>
	</>
);
