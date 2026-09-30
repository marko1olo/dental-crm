import {
	Activity,
	Building2,
	Check,
	Copy,
	FileText,
	Info,
	Printer,
	QrCode,
	Scan,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import { ADULT_FDI_TEETH, formatRadiationDose } from "./radiologyMath.js";
import {
	applyRadiologyProtocolToForm043,
	CBCT_DIAGNOSTIC_GOALS,
	CBCT_REFERRAL_PARTNERS,
	CBCT_SCAN_FOV_PROTOCOLS,
	type CbctDiagnosticGoal,
	type CbctDiagnosticGoalId,
	type CbctReferralPartner,
	type CbctScanFovProtocol,
	formatCbctReferralSummary,
	generateReferralBarcodeSvg,
	generateReferralQrCodeSvg,
} from "./radiologyProtocols.js";

export interface RadiologyReferralModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient?: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		cardNumber?: string | null | undefined;
		medicalCardNumber?: string | null | undefined;
	} | null | undefined;
	diary?: {
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		[key: string]: any;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicLicense?: string | null | undefined;
	initialDiagnosisIcd10?: string | undefined;
	initialTeeth?: string[] | undefined;
	onSuccessReferralCreated?: ((referralData: any) => void) | undefined;
}

const EMPTY_TEETH_LIST: readonly string[] = [];

// 1-Click Zone Presets
const TOOTH_ZONE_PRESETS = [
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

export const RadiologyReferralModal: React.FC<RadiologyReferralModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
	clinicAddress,
	clinicPhone,
	clinicLicense,
	initialDiagnosisIcd10 = "K08.1",
	initialTeeth = EMPTY_TEETH_LIST as string[],
	onSuccessReferralCreated,
}) => {
	const modalId = useId();

	// Active State
	const [selectedFovId, setSelectedFovId] = useState<string>("cbct_full_jaws_16x10");
	const [selectedGoalId, setSelectedGoalId] = useState<CbctDiagnosticGoalId>("implantation");
	const [selectedPartnerId, setSelectedPartnerId] = useState<string>("own_cabinet");
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth);
	const [customTeethInput, setCustomTeethInput] = useState<string>(initialTeeth.join(", "));
	const [diagnosisIcd10, setDiagnosisIcd10] = useState<string>(
		diary?.diagnosisIcd10 || initialDiagnosisIcd10,
	);
	const [clinicalNotes, setClinicalNotes] = useState<string>(diary?.statusLocalis || "");
	const [referralNumber, setReferralNumber] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

	// Medical safety checklist (ALARA)
	const [isPregnancyExcluded, setIsPregnancyExcluded] = useState<boolean>(true);
	const [hasMetallicArtifacts, setHasMetallicArtifacts] = useState<boolean>(false);
	const [isTmjOpenClosedProtocol, setIsTmjOpenClosedProtocol] = useState<boolean>(true);

	const initialTeethKey = initialTeeth.join(",");

	// Current protocol objects
	const currentFov: CbctScanFovProtocol =
		CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.id === selectedFovId) ?? CBCT_SCAN_FOV_PROTOCOLS[0]!;
	const currentGoal: CbctDiagnosticGoal =
		CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === selectedGoalId) ?? CBCT_DIAGNOSTIC_GOALS[0]!;
	const currentPartner: CbctReferralPartner =
		CBCT_REFERRAL_PARTNERS.find((p) => p.id === selectedPartnerId) ?? CBCT_REFERRAL_PARTNERS[0]!;

	// Initialize on Open
	useEffect(() => {
		if (!isOpen) return;

		const currentYear = new Date().getFullYear();
		const dateSuffix = Date.now().toString(36).toUpperCase().slice(-4);
		setReferralNumber(`НАПР-КЛКТ-${currentYear}-${dateSuffix}`);

		if (initialTeeth.length > 0) {
			setSelectedTeeth(initialTeeth);
			setCustomTeethInput(initialTeeth.join(", "));
		} else if (diary?.diagnosisTooth) {
			const teethFromDiary = diary.diagnosisTooth.split(/[,;\s]+/).filter(Boolean);
			if (teethFromDiary.length > 0) {
				setSelectedTeeth(teethFromDiary);
				setCustomTeethInput(teethFromDiary.join(", "));
			}
		}

		if (diary?.diagnosisIcd10) {
			setDiagnosisIcd10(diary.diagnosisIcd10);
		}
		if (diary?.statusLocalis) {
			setClinicalNotes(diary.statusLocalis);
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, initialTeethKey, diary, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientFullName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1985-05-15";
	const patientPhoneStr = patient?.phone || "+7 (___) ___-__-__";
	const patientCard =
		patient?.medicalCardNumber || patient?.cardNumber || "МК-043/у";
	const docName = doctorName || "Лечащий врач";
	const docSpec = doctorSpecialty || "Врач-стоматолог";
	const clinic = clinicName || 'Стоматологическая клиника "Денте"';
	const address = clinicAddress || "г. Москва, ул. Клиническая, д. 12";
	const phone = clinicPhone || "+7 (495) 700-00-00";
	const license = clinicLicense || "ЛО-77-01-019842 от 12.04.2020";

	// 1-Click Express Preset Handler (0-5 Seconds Doctor Fast-Path, Mandates 8e, 8k, 8n)
	const handleApplyExpressPreset = (preset: {
		fovId: string;
		goalId: CbctDiagnosticGoalId;
		icd: string;
		teeth?: readonly string[];
		note: string;
	}) => {
		setSelectedFovId(preset.fovId);
		setSelectedGoalId(preset.goalId);
		setDiagnosisIcd10(preset.icd);
		if (preset.teeth && preset.teeth.length > 0) {
			setSelectedTeeth([...preset.teeth]);
			setCustomTeethInput(preset.teeth.join(", "));
		}
		if (preset.note) {
			setClinicalNotes(preset.note);
		}
		showToast(`Применен клинический протокол: ${preset.note}`, "info", 2000);
	};

	// 1-Click Zone Preset
	const handleApplyZonePreset = (teeth: readonly string[]) => {
		const sorted = [...teeth];
		setSelectedTeeth(sorted);
		setCustomTeethInput(sorted.join(", "));
	};

	// Toggle tooth
	const handleToggleTooth = (tooth: string) => {
		let updated: string[];
		if (selectedTeeth.includes(tooth)) {
			updated = selectedTeeth.filter((t) => t !== tooth);
		} else {
			updated = [...selectedTeeth, tooth].sort();
		}
		setSelectedTeeth(updated);
		setCustomTeethInput(updated.join(", "));
	};

	// Change FOV with auto-population of defaults
	const handleSelectFov = (fov: CbctScanFovProtocol) => {
		setSelectedFovId(fov.id);
		if (fov.defaultTeethFdi.length > 0 && selectedTeeth.length <= 1) {
			setSelectedTeeth([...fov.defaultTeethFdi]);
			setCustomTeethInput(fov.code === "full_jaws" ? "Все зубные ряды" : fov.defaultTeethFdi.join(", "));
		}
	};

	// Change Goal with auto-population of recommended FOV and ICD
	const handleSelectGoal = (goal: CbctDiagnosticGoal) => {
		setSelectedGoalId(goal.id);
		if (goal.recommendedFovId && (!selectedFovId || selectedFovId === "cbct_full_jaws_16x10")) {
			setSelectedFovId(goal.recommendedFovId);
		}
		if (goal.recommendedIcd10 && (!diagnosisIcd10 || diagnosisIcd10 === "K08.1" || diagnosisIcd10 === "K04.0")) {
			setDiagnosisIcd10(goal.recommendedIcd10);
		}
	};

	// Radiation Dose Formatting
	const estimatedDose = formatRadiationDose(currentFov.typicalDoseMicrosv);

	// Summary Statement
	const targetTeethDisplay = customTeethInput || (selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "По протоколу FOV");
	const referralSummary = formatCbctReferralSummary({
		referralNumber,
		fovProtocol: currentFov,
		goal: currentGoal,
		teeth: targetTeethDisplay,
		partner: currentPartner,
		doctorName: docName,
		icd10: diagnosisIcd10,
	});

	// Vector Barcode & QR Code SVGs (Zero-Mock, Pure SVG)
	const barcodeSvg = generateReferralBarcodeSvg(referralNumber, 240, 48);
	const qrPayloadData = `CT-REF:${referralNumber}|CLINIC:${clinic}|PATIENT:${patientFullName}|FOV:${currentFov.fovDimensions}|TEETH:${targetTeethDisplay}|GOAL:${currentGoal.titleRu}|DATE:${new Date().toISOString().slice(0, 10)}`;
	const qrCodeSvg = generateReferralQrCodeSvg(qrPayloadData, 96);

	// 1-Click Insert into Form 043/y Diary
	const handleInsertToDiary = () => {
		applyRadiologyProtocolToForm043({
			protocol: referralSummary,
			options: {
				modalityLabel: `КЛКТ (${currentFov.fovDimensions})`,
				teethFdi: selectedTeeth.length > 0 ? selectedTeeth : undefined,
			},
			showNotification: true,
			copyToClipboard: true,
		});
		if (onSuccessReferralCreated) {
			onSuccessReferralCreated({
				referralNumber,
				fov: currentFov,
				goal: currentGoal,
				teeth: targetTeethDisplay,
				partner: currentPartner,
				icd10: diagnosisIcd10,
			});
		}
	};

	// Copy formatted text
	const handleCopyText = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(referralSummary).then(() => {
				showToast("Текст направления скопирован в буфер", "success", 2500);
			}).catch(() => {});
		}
	};

	// Printable HTML Document
	const printDocHtml = `<!DOCTYPE html>
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
      <div class="doc-number">№ ${referralNumber} от ${new Date().toLocaleDateString("ru-RU")}</div>
      <div style="font-size:8pt; color:#0f766e; font-weight:bold; margin-top:2px;">Куда: ${currentPartner.nameRu}</div>
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
        <td colspan="3"><strong style="color:#0f766e;">${diagnosisIcd10}</strong> — Стоматологическое обследование / ${currentGoal.titleRu}</td>
      </tr>
    </tbody>
  </table>

  <div class="highlight-box">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <div>
        <strong style="font-size:10pt; color:#0f766e; text-transform:uppercase;">1. Клиническая зона сканирования (FOV):</strong>
        <span class="fov-badge">${currentFov.fovDimensions}</span>
        ${currentFov.isHighResolution ? '<span class="fov-badge" style="background:#0284c7;">Ultra-High Res 75µm</span>' : ""}
        ${currentFov.isDualPhase ? '<span class="fov-badge" style="background:#7c3aed;">Двухфазный (Закрыт/Открыт)</span>' : ""}
      </div>
      <div style="font-size:8.5pt; font-weight:bold; color:#0f766e;">Доза ~${currentFov.typicalDoseMicrosv} мкЗв (ALARA)</div>
    </div>
    <div style="font-size:9pt; margin-bottom:4px;"><strong>Зона:</strong> ${currentFov.titleRu}</div>
    <div style="font-size:8.5pt; color:#334155;"><strong>Описание:</strong> ${currentFov.description}</div>
  </div>

  <div style="margin-bottom:10px;">
    <div style="font-weight:bold; font-size:8.5pt; text-transform:uppercase; color:#0f172a; margin-bottom:4px;">
      2. Клиническая цель и задачи исследования:
    </div>
    <div style="font-size:9pt; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px;">
      <div style="font-weight:bold; color:#0f766e; margin-bottom:2px;">${currentGoal.titleRu} — ${currentGoal.description}</div>
      <div style="font-size:8pt; color:#475569;">Задачи: ${currentGoal.clinicalTasks.join("; ")}.</div>
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
    ${currentFov.isDualPhase ? ` | [${isTmjOpenClosedProtocol ? "X" : " "}] Исследование ВНЧС в 2 положениях (привычная окклюзия + открытый рот).` : ""}
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

	// Print action
	const handlePrint = () => {
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
			frameDoc.write(printDocHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
					if (onSuccessReferralCreated) {
						onSuccessReferralCreated({
							referralNumber,
							fov: currentFov,
							goal: currentGoal,
							teeth: targetTeethDisplay,
							partner: currentPartner,
						});
					}
				}, 1000);
			}, 250);
		}
	};

	const modalContent = (
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Направление на КЛКТ (3D томография)"
			data-testid="radiology-referral-generator-modal"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[94vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ═══════════════════════════════════════════════════════════════════
				    1. HEADER (Touch Target Close Button >= 44x44px)
				    ═══════════════════════════════════════════════════════════════════ */}
				<header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3.5">
						<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
							<Scan className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold text-[var(--ink)]">
									Направление на КЛКТ / 3D Лучевую диагностику
								</h2>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									1-клик протокол
								</span>
							</div>
							<p className="text-xs text-[var(--muted)]">
								Пациент: <strong className="text-[var(--ink)]">{patientFullName}</strong> · Карта: {patientCard} · Направил: {docName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Desktop / Mobile Tab Switcher */}
						<div className="flex items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveTab("form")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "form"
										? "bg-[var(--teal)] text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Параметры FOV
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "preview"
										? "bg-[var(--teal)] text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Бланк и QR
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
							title="Закрыть (Esc)"
							data-testid="referral-modal-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ═══════════════════════════════════════════════════════════════════
				    2. BODY (Parameters Column + Live Print Preview)
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left: Interactive Form & FOV Selection */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col gap-4 ${
							activeTab === "preview" ? "hidden md:flex" : "flex"
						}`}
					>
						{/* 0. Fast 1-Click Clinical Express Presets (5 Seconds Doctor Path) */}
						<div className="p-3 rounded-2xl bg-[var(--teal-surface)]/40 border border-[var(--teal-soft)]">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--teal)] mb-2">
								<Sparkles className="w-4 h-4" />
								<span>Быстрые пресеты у кресла (0–1 клик):</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								<button
									type="button"
									onClick={() =>
										handleApplyExpressPreset({
											fovId: "cbct_full_jaws_16x10",
											goalId: "implantation",
											icd: "K08.1",
											teeth: TOOTH_ZONE_PRESETS[0].teeth,
											note: "Планирование имплантации (обе челюсти, костный гребень)",
										})
									}
									className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
								>
									Имплантация (Все)
								</button>
								<button
									type="button"
									onClick={() =>
										handleApplyExpressPreset({
											fovId: "cbct_maxilla_sinuses_10x10",
											goalId: "implantation",
											icd: "K08.1",
											teeth: TOOTH_ZONE_PRESETS[1].teeth,
											note: "Синус-лифтинг ВЧ и субантральная аугментация",
										})
									}
									className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
								>
									Синус-лифтинг (ВЧ)
								</button>
								<button
									type="button"
									onClick={() =>
										handleApplyExpressPreset({
											fovId: "cbct_mandible_10x10",
											goalId: "surgery_extraction" as any || "implantation",
											icd: "K07.3",
											teeth: TOOTH_ZONE_PRESETS[2].teeth,
											note: "Нижнечелюстной канал и восьмерки #38, #48",
										})
									}
									className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
								>
									НЧ (Канал / 8-ки)
								</button>
								<button
									type="button"
									onClick={() =>
										handleApplyExpressPreset({
											fovId: "cbct_endo_micro_5x5",
											goalId: "endodontics",
											icd: "K04.0",
											note: "Endo Micro-CT: поиск MB2 канала и трещин корня",
										})
									}
									className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
								>
									Эндо Micro-CT (MB2)
								</button>
								<button
									type="button"
									onClick={() =>
										handleApplyExpressPreset({
											fovId: "cbct_tmj_both_joints",
											goalId: "tmj",
											icd: "K07.6",
											note: "ВНЧС 2 сустава (окклюзия + открытый рот)",
										})
									}
									className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
								>
									ВНЧС (2 сустава)
								</button>
							</div>
						</div>

						{/* 1. Clinical Scanning Zone / FOV Selection */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									1. Зона сканирования (FOV):
								</span>
								<div
									className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${estimatedDose.badgeClass}`}
								>
									<Activity className="w-3.5 h-3.5" />
									<span>Доза: ~{currentFov.typicalDoseMicrosv} мкЗв</span>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{CBCT_SCAN_FOV_PROTOCOLS.map((fov) => {
									const isSelected = selectedFovId === fov.id;
									return (
										<button
											key={fov.id}
											type="button"
											onClick={() => handleSelectFov(fov)}
											className={`flex flex-col p-3 rounded-2xl border text-left transition-all min-h-[44px] ${
												isSelected
													? "bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal-soft)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-fov-${fov.code}`}
										>
											<div className="flex items-center justify-between w-full mb-1">
												<span className="text-xs font-bold text-[var(--ink)]">
													{fov.badge}
												</span>
												<div
													className={`flex items-center justify-center w-5 h-5 rounded-md border ${
														isSelected
															? "bg-[var(--teal)] border-[var(--teal)] text-white"
															: "border-[var(--line)]"
													}`}
												>
													{isSelected && <Check className="w-3.5 h-3.5" />}
												</div>
											</div>
											<span className="text-xs font-semibold text-[var(--ink)] mb-0.5 line-clamp-1">
												{fov.titleRu}
											</span>
											<span className="text-[11px] text-[var(--muted)] leading-tight line-clamp-2">
												{fov.description}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 2. Clinical Goal Selection */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								2. Клиническая цель исследования:
							</span>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{CBCT_DIAGNOSTIC_GOALS.map((goal) => {
									const isSelected = selectedGoalId === goal.id;
									return (
										<button
											key={goal.id}
											type="button"
											onClick={() => handleSelectGoal(goal)}
											className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-goal-${goal.id}`}
										>
											<div className="text-xs font-bold line-clamp-1">{goal.titleRu}</div>
											<div className="text-[10px] text-[var(--muted)] line-clamp-1">
												{goal.shortBadge}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* 3. Destination Diagnostic Center / Partner */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								3. Рентген-центр назначения:
							</span>
							<div className="grid grid-cols-2 gap-2">
								{CBCT_REFERRAL_PARTNERS.map((partner) => {
									const isSelected = selectedPartnerId === partner.id;
									return (
										<button
											key={partner.id}
											type="button"
											onClick={() => setSelectedPartnerId(partner.id)}
											className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-bold shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-partner-${partner.id}`}
										>
											<Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-[var(--teal)]" : "text-[var(--muted)]"}`} />
											<div className="min-w-0">
												<div className="text-xs font-bold truncate">{partner.nameRu}</div>
												<div className="text-[10px] text-[var(--muted)] truncate">{partner.integrationNote}</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* 4. FDI Tooth Matrix & Zone Presets */}
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									4. Локализация по формуле FDI (Зубы):
								</span>
								{selectedTeeth.length > 0 && (
									<button
										type="button"
										onClick={() => {
											setSelectedTeeth([]);
											setCustomTeethInput("");
										}}
										className="text-xs text-rose-500 hover:underline font-semibold"
									>
										Сбросить выбор
									</button>
								)}
							</div>

							<div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-thin">
								{TOOTH_ZONE_PRESETS.map((preset) => {
									const isCurrent =
										preset.teeth.length === selectedTeeth.length &&
										preset.teeth.every((t) => selectedTeeth.includes(t));
									return (
										<button
											key={preset.label}
											type="button"
											onClick={() => handleApplyZonePreset(preset.teeth)}
											className={`px-2 py-0.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all ${
												isCurrent
													? "bg-[var(--teal)] border-[var(--teal)] text-white shadow-xs font-bold"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{preset.label}
										</button>
									);
								})}
							</div>

							<div className="p-2.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5">
								{/* Upper Jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
									{ADULT_FDI_TEETH.quadrant1.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
									<div className="w-px bg-[var(--line)] mx-1" />
									{ADULT_FDI_TEETH.quadrant2.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>

								{/* Lower Jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-[var(--line)] scrollbar-thin">
									{ADULT_FDI_TEETH.quadrant4.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
									<div className="w-px bg-[var(--line)] mx-1" />
									{ADULT_FDI_TEETH.quadrant3.map((tooth) => {
										const isSelected = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												onClick={() => handleToggleTooth(tooth)}
												className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
													isSelected
														? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>
							</div>

							<div className="mt-2">
								<input
									type="text"
									value={customTeethInput}
									onChange={(e) => setCustomTeethInput(e.target.value)}
									placeholder="Область зубов: 16, 26, 36-38, Все..."
									className="w-full px-3 min-h-[36px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* 5. ICD-10 & Medical Checklist */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label
									htmlFor="diagnosis-icd10-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Диагноз (МКБ-10):
								</label>
								<input
									id="diagnosis-icd10-input"
									type="text"
									value={diagnosisIcd10}
									onChange={(e) => setDiagnosisIcd10(e.target.value)}
									className="w-full px-3 min-h-[36px] text-xs font-mono font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div>
								<label
									htmlFor="referral-number-input"
									className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block"
								>
									Номер направления:
								</label>
								<input
									id="referral-number-input"
									type="text"
									value={referralNumber}
									onChange={(e) => setReferralNumber(e.target.value)}
									className="w-full px-3 min-h-[36px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Safety Checkboxes */}
						<div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink)]">
							<label className="flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={isPregnancyExcluded}
									onChange={(e) => setIsPregnancyExcluded(e.target.checked)}
									className="rounded text-[var(--teal)] focus:ring-0"
								/>
								<span>Беременность исключена</span>
							</label>

							<label className="flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={hasMetallicArtifacts}
									onChange={(e) => setHasMetallicArtifacts(e.target.checked)}
									className="rounded text-[var(--teal)] focus:ring-0"
								/>
								<span>Металлоконструкции в полости рта</span>
							</label>

							{currentFov.isDualPhase && (
								<label className="flex items-center gap-1.5 cursor-pointer font-bold text-[var(--teal)]">
									<input
										type="checkbox"
										checked={isTmjOpenClosedProtocol}
										onChange={(e) => setIsTmjOpenClosedProtocol(e.target.checked)}
										className="rounded text-[var(--teal)] focus:ring-0"
									/>
									<span>Протокол: Закрытый + Открытый рот</span>
								</label>
							)}
						</div>
					</div>

					{/* Right: Live Formatted Print & QR Preview */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4 ${
							activeTab === "form" ? "hidden md:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-4 h-4 text-[var(--teal)]" />
								<span>Официальный бланк (КЛКТ / ALARA):</span>
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleCopyText}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
									title="Копировать текст направления"
									data-testid="btn-copy-referral-text"
								>
									<Copy className="w-3.5 h-3.5" />
									<span>Текст</span>
								</button>
								<span className="text-xs font-mono font-bold text-[var(--teal)]">
									{referralNumber}
								</span>
							</div>
						</div>

						{/* Document Sheet Container */}
						<div className="p-5 md:p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-md font-sans leading-relaxed flex flex-col gap-3.5">
							{/* Clinic & Header Requisites */}
							<div className="border-b-2 border-[var(--line-strong,var(--line))] pb-2.5 flex justify-between items-start">
								<div>
									<div className="font-extrabold text-sm uppercase text-[var(--ink)]">
										{clinic}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										Лицензия: {license} · {phone}
									</div>
								</div>
								<div className="text-right">
									<div className="font-black text-sm text-[var(--teal)] uppercase tracking-tight">
										НАПРАВЛЕНИЕ НА КЛКТ
									</div>
									<div className="text-[10px] text-[var(--muted)] font-semibold">
										{currentPartner.nameRu}
									</div>
								</div>
							</div>

							{/* Barcode & QR Intake Header */}
							<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div
									className="overflow-hidden"
									dangerouslySetInnerHTML={{ __html: barcodeSvg }}
									data-testid="referral-barcode-preview"
								/>
								<div className="flex items-center gap-2 text-right">
									<div className="text-[9px] text-[var(--muted)] leading-tight">
										<strong>QR-код КЛКТ</strong><br />для рентген-центра
									</div>
									<div
										className="w-12 h-12 shrink-0 border border-[var(--line)] rounded-lg overflow-hidden p-0.5 bg-white"
										dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
										data-testid="referral-qrcode-preview"
									/>
								</div>
							</div>

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
									<strong className="text-[var(--teal)] font-bold">
										{targetTeethDisplay}
									</strong>
								</div>
								<div>
									<span className="text-[var(--muted)]">Диагноз (МКБ-10): </span>
									<strong className="font-mono text-[var(--teal)]">
										{diagnosisIcd10}
									</strong>
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
						</div>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    3. FOOTER (Touch Targets >= 44x44px, 0-Blockers)
				    ═══════════════════════════════════════════════════════════════════ */}
				<footer className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<ShieldCheck className="w-4 h-4 text-[var(--teal)]" />
						<span>0 тупиков: готово к моментальной печати и интеграции с ЭМК 043/у.</span>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 text-xs md:text-sm font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleInsertToDiary}
							className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl border border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-surface)] active:scale-95 transition-all"
							data-testid="btn-insert-referral-to-043"
							title="Внести текст направления в дневник формы 043/у"
						>
							<FileText className="w-4 h-4" />
							<span>Внести в 043/у</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-xs md:text-sm font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-95 active:scale-95 transition-all font-extrabold"
							data-testid="print-referral-btn"
						>
							<Printer className="w-4 h-4" />
							<span>Печать направления (КЛКТ)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
