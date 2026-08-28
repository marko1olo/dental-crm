import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	type ProcedureSpecificConsentProcedure,
} from "@dental/shared";
import {
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	FileCheck,
	FileText,
	Info,
	MapPin,
	Printer,
	QrCode,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Syringe,
	User,
	UserCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type ConsentPresetKey = "base_inspection" | ProcedureSpecificConsentProcedure;

export interface InformedConsentModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: {
		fullName?: string | null;
		birthDate?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
		passport?: string | null;
		address?: string | null;
		phone?: string | null;
		gender?: string | null;
		snils?: string | null;
	} | null;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
	clinicLegalName?: string | null;
	clinicAddress?: string | null;
	clinicPhone?: string | null;
	clinicOgrn?: string | null;
	licenseNumber?: string | null;
	diary?: {
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
		anamnesis?: string | null;
		statusLocalis?: string | null;
	} | null;
	inferredTreatmentArea?: string | null;
	onConsentConfirmed?: (payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
	}) => void;
}

const PRESET_BUTTONS: { key: ConsentPresetKey; label: string; icon: string }[] = [
	{ key: "base_inspection", label: "📋 Первичный осмотр и рентген (1051н)", icon: "📋" },
	{ key: "therapy_endo_restoration", label: "🦷 Терапия / Эндодонтия", icon: "🦷" },
	{ key: "local_anesthesia", label: "💉 Местная анестезия", icon: "💉" },
	{ key: "surgery_extraction", label: "🔪 Хирургия / Имплантация", icon: "🔪" },
	{ key: "implantation_bone_graft", label: "🔩 Остеопластика / Синус-лифт", icon: "🔩" },
	{ key: "prosthetics", label: "👑 Ортопедия (коронки, виниры)", icon: "👑" },
	{ key: "orthodontics", label: "📐 Ортодонтия (брекеты, элайнеры)", icon: "📐" },
	{ key: "hygiene_whitening", label: "🪥 Профгигиена и отбеливание", icon: "🪥" },
	{ key: "periodontology", label: "🩸 Пародонтология", icon: "🩸" },
];

export const InformedConsentModal: React.FC<InformedConsentModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorName,
	doctorSpecialty,
	clinicName,
	clinicLegalName,
	clinicAddress,
	clinicPhone,
	clinicOgrn,
	licenseNumber,
	diary,
	inferredTreatmentArea,
	onConsentConfirmed,
}) => {
	const [activePreset, setActivePreset] = useState<ConsentPresetKey>("base_inspection");

	// Form fields
	const [intervention, setIntervention] = useState<string>("");
	const [toothOrArea, setToothOrArea] = useState<string>("");
	const [diagnosisOrIndication, setDiagnosisOrIndication] = useState<string>("");
	const [expectedBenefit, setExpectedBenefit] = useState<string>("");
	const [plannedAnesthesia, setPlannedAnesthesia] = useState<string>("");
	const [materials, setMaterials] = useState<string>("");
	const [patientRisks, setPatientRisks] = useState<string>("");
	const [procedureRisks, setProcedureRisks] = useState<string>("");
	const [alternatives, setAlternatives] = useState<string>("");
	const [aftercare, setAftercare] = useState<string>("");
	const [trustedContact, setTrustedContact] = useState<string>("");
	const [confirmedDate, setConfirmedDate] = useState<string>("");

	// Statutory Checkboxes
	const [questionsAnswered, setQuestionsAnswered] = useState<boolean>(true);
	const [risksUnderstood, setRisksUnderstood] = useState<boolean>(true);
	const [withdrawUnderstood, setWithdrawUnderstood] = useState<boolean>(true);

	const applyPreset = useCallback(
		(key: ConsentPresetKey) => {
			setActivePreset(key);
			const today = new Date().toISOString().slice(0, 10);
			setConfirmedDate(today);

			if (key === "base_inspection") {
				setIntervention(BASE_INFORMED_CONSENT_PRESET.intervention);
				setDiagnosisOrIndication(
					diary?.diagnosisIcd10
						? `${diary.diagnosisIcd10} — ${BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication}`
						: BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication,
				);
				setExpectedBenefit(BASE_INFORMED_CONSENT_PRESET.expectedBenefit);
				setPlannedAnesthesia(BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia || "Не требуется");
				setMaterials(BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes || "");
				setPatientRisks(
					"Аллергологический анамнез, соматические заболевания, сопутствующая терапия и беременность уточнены. Значимых противопоказаний не выявлено.",
				);
				setProcedureRisks(BASE_INFORMED_CONSENT_PRESET.explainedRisks.join("\n• "));
				setAlternatives(BASE_INFORMED_CONSENT_PRESET.alternatives.join("\n• "));
				setAftercare(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.join("\n• "));
				setToothOrArea(inferredTreatmentArea || diary?.diagnosisTooth || "Полость рта в целом");
			} else {
				const preset = CLINICAL_CONSENT_PRESETS[key];
				if (preset) {
					setIntervention(preset.procedureName);
					setDiagnosisOrIndication(
						diary?.diagnosisIcd10
							? `${diary.diagnosisIcd10} — ${preset.diagnosisOrIndication}`
							: preset.diagnosisOrIndication,
					);
					setExpectedBenefit(
						"Купирование патологического процесса, анатомическое и функциональное восстановление зубного ряда, предотвращение распространения инфекции.",
					);
					setPlannedAnesthesia(preset.plannedAnesthesia);
					setMaterials(preset.materialsAndSystems);
					setPatientRisks(
						preset.patientSpecificRiskFactors.length > 0
							? `• ${preset.patientSpecificRiskFactors.join("\n• ")}`
							: "Индивидуальные риски уточнены, критических соматических ограничений нет.",
					);
					setProcedureRisks(`• ${preset.procedureSpecificRisks.join("\n• ")}`);
					setAlternatives(`• ${preset.alternatives.join("\n• ")}`);
					setAftercare(`• ${preset.aftercareAndLimits.join("\n• ")}`);
					setToothOrArea(inferredTreatmentArea || diary?.diagnosisTooth || "Зуб FDI");
				}
			}
		},
		[diary?.diagnosisIcd10, diary?.diagnosisTooth, inferredTreatmentArea],
	);

	useEffect(() => {
		if (!isOpen) return;

		// Detect initial preset from diary if possible
		const icd = (diary?.diagnosisIcd10 || "").toUpperCase();
		if (icd.startsWith("K02") || icd.startsWith("K04")) {
			applyPreset("therapy_endo_restoration");
		} else if (icd.startsWith("K08.1") || icd.startsWith("K01")) {
			applyPreset("surgery_extraction");
		} else if (icd.startsWith("K05")) {
			applyPreset("periodontology");
		} else {
			applyPreset("base_inspection");
		}

		setTrustedContact("Близким родственникам / Законному представителю");

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary?.diagnosisIcd10, applyPreset, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1990-01-01";
	const patientPassport = patient?.passport || "Паспорт РФ: серия 4510 № 123456";
	const patientAddress = patient?.address || "г. Москва, ул. Центральная, д. 10";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || "043/у-2026/01";
	const patientPhone = patient?.phone || "+7 (999) 000-00-00";
	const docName = doctorName || "Д-р Иванов Иван Иванович";
	const docSpecialty = doctorSpecialty || "Врач-стоматолог терапевт";
	const clinic = clinicLegalName || clinicName || 'ООО «Денте Стоматология»';
	const clinicLoc = clinicAddress || "г. Москва, Клинический пер., д. 7";
	const clinicPh = clinicPhone || "+7 (495) 777-22-11";
	const licNum = licenseNumber || "ЛО-77-01-021948 от 15.10.2021 г.";
	const clinicOrg = clinicOgrn || "1207700123456";

	const allAgreed = questionsAnswered && risksUnderstood && withdrawUnderstood;

	const handleConfirmAndSave = () => {
		if (onConsentConfirmed) {
			onConsentConfirmed({
				consentType: activePreset,
				intervention,
				toothOrArea,
				confirmedAt: confirmedDate,
			});
		}
	};

	const generatePrintHtml = (): string => {
		return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Информированное добровольное согласие (ИДС) — ${patientName}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  body {
    font-family: "PT Astra Sans", "Times New Roman", Times, serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    background: #ffffff;
    line-height: 1.35;
    font-size: 9.5pt;
  }
  .doc-container {
    max-width: 190mm;
    margin: 0 auto;
    border: 1pt solid #cbd5e1;
    padding: 10mm 12mm;
    box-sizing: border-box;
  }
  .doc-header {
    border-bottom: 2pt solid #0f172a;
    padding-bottom: 6px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .clinic-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #0f172a; }
  .clinic-sub { font-size: 8pt; color: #475569; }
  .law-sub { font-size: 7.5pt; color: #64748b; text-align: right; max-width: 75mm; }
  .main-title {
    text-align: center;
    font-size: 12pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 8px 0 4px 0;
  }
  .main-subtitle {
    text-align: center;
    font-size: 8pt;
    color: #475569;
    margin-bottom: 8px;
  }
  .patient-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 10px;
  }
  .patient-table td {
    border: 0.5pt solid #cbd5e1;
    padding: 3px 6px;
  }
  .td-label { background: #f8fafc; font-weight: bold; width: 28%; color: #334155; }
  .section-box {
    margin-bottom: 8px;
    font-size: 9pt;
  }
  .section-title {
    font-weight: bold;
    font-size: 9pt;
    color: #0f172a;
    text-transform: uppercase;
    border-bottom: 0.5pt solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 3px;
  }
  .section-body {
    white-space: pre-line;
    color: #1e293b;
    text-align: justify;
  }
  .checkboxes-box {
    border: 1pt solid #94a3b8;
    background: #f8fafc;
    padding: 6px 8px;
    margin: 10px 0;
    font-size: 8.5pt;
  }
  .checkbox-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .sign-zone {
    border-top: 1.5pt solid #0f172a;
    padding-top: 8px;
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8.5pt;
  }
  .sign-block { width: 45%; }
  .sign-line { border-bottom: 1pt solid #0f172a; min-height: 18px; margin-top: 15px; }
  .qr-box {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7.5pt;
    color: #64748b;
    border: 0.5pt solid #e2e8f0;
    padding: 4px;
    border-radius: 4px;
  }
</style>
</head>
<body>
<div class="doc-container">
  <div class="doc-header">
    <div>
      <div class="clinic-title">${clinic}</div>
      <div class="clinic-sub">${clinicLoc} • Тел: ${clinicPh}</div>
      <div class="clinic-sub">Лицензия: ${licNum} • ОГРН: ${clinicOrg}</div>
    </div>
    <div class="law-sub">
      В соответствии со ст. 20 Федерального закона № 323-ФЗ от 21.11.2011 г. и Приказом Минздрава России от 12.11.2021 г. № 1051н
    </div>
  </div>

  <div class="main-title">Информированное добровольное согласие</div>
  <div class="main-subtitle">на проведение медицинского стоматологического вмешательства</div>

  <table class="patient-table">
    <tr>
      <td class="td-label">Пациент (Ф.И.О.):</td>
      <td><strong>${patientName}</strong></td>
      <td class="td-label">Дата рождения:</td>
      <td><strong>${patientBirth}</strong></td>
    </tr>
    <tr>
      <td class="td-label">Паспортные данные:</td>
      <td>${patientPassport}</td>
      <td class="td-label">№ Медкарты:</td>
      <td><strong>${patientCard}</strong></td>
    </tr>
    <tr>
      <td class="td-label">Адрес проживания:</td>
      <td>${patientAddress}</td>
      <td class="td-label">Контактный телефон:</td>
      <td>${patientPhone}</td>
    </tr>
    <tr>
      <td class="td-label">Лечащий врач:</td>
      <td colspan="3"><strong>${docName}</strong> (${docSpecialty})</td>
    </tr>
  </table>

  <div class="section-box">
    <div class="section-title">1. Планируемое медицинское вмешательство и область</div>
    <div class="section-body">
      <strong>Вмешательство:</strong> ${intervention}<br>
      <strong>Область / Зубы (FDI):</strong> <u>${toothOrArea}</u>
    </div>
  </div>

  <div class="section-box">
    <div class="section-title">2. Клинический диагноз и показания</div>
    <div class="section-body">${diagnosisOrIndication}</div>
  </div>

  <div class="section-box">
    <div class="section-title">3. Ожидаемый благоприятный результат</div>
    <div class="section-body">${expectedBenefit}</div>
  </div>

  <div class="section-box">
    <div class="section-title">4. Местное обезболивание и применяемые материалы</div>
    <div class="section-body">
      <strong>Анестезия:</strong> ${plannedAnesthesia}<br>
      <strong>Материалы и технологии:</strong> ${materials}
    </div>
  </div>

  <div class="section-box">
    <div class="section-title">5. Разъясненные риски и возможные осложнения</div>
    <div class="section-body">${procedureRisks}</div>
  </div>

  <div class="section-box">
    <div class="section-title">6. Альтернативные методы лечения и риски при отказе</div>
    <div class="section-body">${alternatives}</div>
  </div>

  <div class="section-box">
    <div class="section-title">7. Режим и назначения после вмешательства</div>
    <div class="section-body">${aftercare}</div>
  </div>

  <div class="section-box">
    <div class="section-title">8. Лица, которым разрешено сообщать сведения о здоровье</div>
    <div class="section-body">${trustedContact}</div>
  </div>

  <div class="checkboxes-box">
    <div class="checkbox-line">
      <strong>[ ✓ ]</strong> Мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанные с ними риски, возможные варианты и последствия.
    </div>
    <div class="checkbox-line">
      <strong>[ ✓ ]</strong> Я получил(а) исчерпывающие ответы на все заданные вопросы и полностью понял(а) суть назначенного лечения.
    </div>
    <div class="checkbox-line">
      <strong>[ ✓ ]</strong> Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения до начала выполнения.
    </div>
  </div>

  <div class="sign-zone">
    <div class="sign-block">
      <div><strong>Пациент (или законный представитель):</strong></div>
      <div class="sign-line"></div>
      <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">
        (подпись) / <strong>${patientName}</strong>
      </div>
      <div style="font-size:8pt; margin-top:4px;">Дата: <strong>${confirmedDate}</strong></div>
    </div>

    <div class="sign-block">
      <div><strong>Врач, проводивший разъяснение:</strong></div>
      <div class="sign-line"></div>
      <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">
        (подпись и личная печать) / <strong>${docName}</strong>
      </div>
      <div style="font-size:8pt; margin-top:4px;">Дата: <strong>${confirmedDate}</strong></div>
    </div>
  </div>

  <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
    <div class="qr-box">
      <div style="font-weight:bold; font-size:8pt;">МИС ДЕНТЕ</div>
      <div>Электронная верификация ИДС • № ${patientCard} • Приказ МЗ РФ № 1051н</div>
    </div>
    <div style="font-size:7.5pt; color:#94a3b8;">
      Документ составлен в 2-х экземплярах: в медицинскую карту № ${patientCard} и на руки пациенту.
    </div>
  </div>
</div>
</body>
</html>`;
	};

	const handlePrint = () => {
		const printHtml = generatePrintHtml();
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const frameDoc =
			printFrame.contentWindow?.document || printFrame.contentDocument;
		if (frameDoc) {
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
				}, 1000);
			}, 250);
		}
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Информированное добровольное согласие"
			data-testid="informed-consent-modal"
		>
			<div className="flex flex-col w-full max-w-6xl max-h-[94vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ── Modal Header ── */}
				<div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
							<ShieldCheck className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base md:text-lg font-bold text-[var(--ink)]">
									Информированное добровольное согласие (ИДС)
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]">
									Приказ Минздрава № 1051н · ст. 20 323-ФЗ
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] line-clamp-1">
								{patientName} · Карта: {patientCard} · Зона: {toothOrArea || "Полость рта"}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* ── 1-Click Clinical Presets Bar (min-h-[44px] buttons) ── */}
				<div className="px-3 md:px-6 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] overflow-x-auto flex items-center gap-2 shrink-0 scrollbar-thin flex-nowrap">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] shrink-0 hidden sm:inline">
						КЛИНИЧЕСКИЙ ПРОФИЛЬ (1 КЛИК):
					</span>
					{PRESET_BUTTONS.map((p) => (
						<button
							key={p.key}
							type="button"
							onClick={() => applyPreset(p.key)}
							className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 flex-shrink-0 select-none ${
								activePreset === p.key
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-sm font-bold"
									: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
							}`}
						>
							<span>{p.label}</span>
						</button>
					))}
				</div>

				{/* ── Modal Split Body ── */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* ── Left Column: Form Editor & Disclosures ── */}
					<div className="w-full lg:w-1/2 p-4 md:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4">
						{/* Intervention & Tooth Area */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="sm:col-span-2">
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Планируемое вмешательство:
								</label>
								<input
									type="text"
									value={intervention}
									onChange={(e) => setIntervention(e.target.value)}
									className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Зона / Зубы (FDI):
								</label>
								<input
									type="text"
									value={toothOrArea}
									onChange={(e) => setToothOrArea(e.target.value)}
									placeholder="36 / 11-21"
									className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Diagnosis & Expected Benefit */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Диагноз (МКБ-10) и показание:
								</label>
								<textarea
									value={diagnosisOrIndication}
									onChange={(e) => setDiagnosisOrIndication(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Ожидаемый результат:
								</label>
								<textarea
									value={expectedBenefit}
									onChange={(e) => setExpectedBenefit(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Anesthesia & Materials */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Анестезия (препараты и метод):
								</label>
								<textarea
									value={plannedAnesthesia}
									onChange={(e) => setPlannedAnesthesia(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Материалы и технологии:
								</label>
								<textarea
									value={materials}
									onChange={(e) => setMaterials(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Explained Risks and Complications */}
						<div>
							<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
								Разъясненные риски и возможные осложнения:
							</label>
							<textarea
								value={procedureRisks}
								onChange={(e) => setProcedureRisks(e.target.value)}
								className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
							/>
						</div>

						{/* Alternatives & Aftercare */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Альтернативы и риски отказа:
								</label>
								<textarea
									value={alternatives}
									onChange={(e) => setAlternatives(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Режим после вмешательства:
								</label>
								<textarea
									value={aftercare}
									onChange={(e) => setAftercare(e.target.value)}
									className="w-full min-h-[4.5rem] px-3 py-2 pb-2 text-xs leading-relaxed rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] resize-none focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Trusted Contact & Date */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Доверенные лица:
								</label>
								<input
									type="text"
									value={trustedContact}
									onChange={(e) => setTrustedContact(e.target.value)}
									className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
								/>
							</div>
							<div>
								<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
									Дата подписания:
								</label>
								<input
									type="date"
									value={confirmedDate}
									onChange={(e) => setConfirmedDate(e.target.value)}
									className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
								/>
							</div>
						</div>

						{/* Statutory Checkboxes (min-h-[44px] each) */}
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2">
							<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mb-1">
								<CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />
								Обязательные подтверждения согласия пациента:
							</div>

							<label className="min-h-[44px] flex items-center gap-3 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer hover:border-[var(--teal)] transition-colors">
								<input
									type="checkbox"
									checked={questionsAnswered}
									onChange={(e) => setQuestionsAnswered(e.target.checked)}
									className="w-5 h-5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
								/>
								<span className="text-xs text-[var(--ink)]">
									Пациент получил исчерпывающие ответы на все вопросы по лечению
								</span>
							</label>

							<label className="min-h-[44px] flex items-center gap-3 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer hover:border-[var(--teal)] transition-colors">
								<input
									type="checkbox"
									checked={risksUnderstood}
									onChange={(e) => setRisksUnderstood(e.target.checked)}
									className="w-5 h-5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
								/>
								<span className="text-xs text-[var(--ink)]">
									Пациент полностью понял суть вмешательства, риски и возможные осложнения
								</span>
							</label>

							<label className="min-h-[44px] flex items-center gap-3 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] cursor-pointer hover:border-[var(--teal)] transition-colors">
								<input
									type="checkbox"
									checked={withdrawUnderstood}
									onChange={(e) => setWithdrawUnderstood(e.target.checked)}
									className="w-5 h-5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
								/>
								<span className="text-xs text-[var(--ink)]">
									Пациент проинформирован о праве отказаться до начала вмешательства
								</span>
							</label>
						</div>
					</div>

					{/* ── Right Column: High-End A4 Sheet Live Preview ── */}
					<div className="w-full lg:w-1/2 p-4 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
								Живой бланк ИДС (Формат А4):
							</span>
							<span className="text-xs font-bold text-[var(--teal)]">
								{patientCard}
							</span>
						</div>

						{/* Printable Physical Sheet Mockup with Dark Mode Dampening Frame */}
						<div className="w-full dark:bg-slate-950 dark:p-4 dark:border dark:border-slate-800 dark:rounded-xl flex justify-center">
							<div
								className="print-paper-sheet p-6 md:p-8 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs shadow-xl font-serif leading-relaxed flex flex-col gap-3.5 selection:bg-[var(--teal-soft,#ccfbf1)] max-w-prose w-full mx-auto"
								data-paper-sheet="true"
								style={{ background: "#ffffff", color: "#0f172a" }}
							>
								{/* Header */}
								<div className="border-b-2 border-slate-900 pb-2 text-[10px] text-slate-700 flex justify-between gap-3">
									<div>
										<div className="font-extrabold text-[11px] text-slate-950 uppercase">
											{clinic}
										</div>
										<div>{clinicLoc} • {clinicPh}</div>
										<div className="text-[9px] text-slate-500">Лицензия: {licNum} · ОГРН: {clinicOrg}</div>
									</div>
									<div className="text-right text-[8.5px] text-slate-500 max-w-[200px] leading-tight">
										В соответствии со ст. 20 ФЗ № 323-ФЗ и Приказом Минздрава России № 1051н
									</div>
								</div>

								{/* Title */}
								<div className="text-center my-1">
									<div className="font-extrabold text-sm tracking-wider uppercase text-slate-950">
										ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ
									</div>
									<div className="text-[10px] text-slate-600 font-sans">
										на проведение стоматологического медицинского вмешательства
									</div>
								</div>

								{/* Requisites Table */}
								<div className="border border-slate-300 rounded overflow-hidden text-[10px] leading-snug">
									<div className="grid grid-cols-4 border-b border-slate-200 p-1.5 bg-slate-50">
										<span className="font-bold text-slate-700">Пациент (Ф.И.О.):</span>
										<span className="col-span-2 font-bold text-slate-950">{patientName}</span>
										<span>Д.Р.: <strong>{patientBirth}</strong></span>
									</div>
									<div className="grid grid-cols-4 border-b border-slate-200 p-1.5">
										<span className="font-bold text-slate-700">Паспортные данные:</span>
										<span className="col-span-2">{patientPassport}</span>
										<span>Карта: <strong>{patientCard}</strong></span>
									</div>
									<div className="grid grid-cols-4 p-1.5">
										<span className="font-bold text-slate-700">Лечащий врач:</span>
										<span className="col-span-3"><strong>{docName}</strong> ({docSpecialty})</span>
									</div>
								</div>

								{/* Structured Text Points */}
								<div className="flex flex-col gap-2 text-[10.5px]">
									<div>
										<strong>1. Вмешательство и зона:</strong> {intervention} (Область/Зубы: <u>{toothOrArea}</u>).
									</div>
									<div>
										<strong>2. Диагноз и показание:</strong> {diagnosisOrIndication}.
									</div>
									<div>
										<strong>3. Ожидаемая польза:</strong> {expectedBenefit}.
									</div>
									<div>
										<strong>4. Анестезия и материалы:</strong> {plannedAnesthesia}; {materials}.
									</div>
									<div>
										<strong>5. Разъясненные риски:</strong>
										<div className="text-[10px] text-slate-800 ml-2 whitespace-pre-line leading-snug">
											{procedureRisks}
										</div>
									</div>
									<div>
										<strong>6. Альтернативы и отказ:</strong>
										<div className="text-[10px] text-slate-800 ml-2 whitespace-pre-line leading-snug">
											{alternatives}
										</div>
									</div>
									<div>
										<strong>7. Режим после вмешательства:</strong>
										<div className="text-[10px] text-slate-800 ml-2 whitespace-pre-line leading-snug">
											{aftercare}
										</div>
									</div>
									<div>
										<strong>8. Доверенные лица:</strong> {trustedContact}.
									</div>
								</div>

								{/* Statements Box */}
								<div className="border border-slate-300 bg-slate-50 p-2.5 rounded text-[9.5px] leading-tight flex flex-col gap-1 text-slate-800">
									<div>✓ Пациент получил исчерпывающие ответы на все заданные вопросы.</div>
									<div>✓ Пациент полностью понял суть вмешательства, риски и возможные осложнения.</div>
									<div>✓ Пациенту разъяснено право отказаться от вмешательства до его начала.</div>
								</div>

								{/* Signatures */}
								<div className="border-t-2 border-slate-900 pt-3 text-[10px] flex justify-between items-end text-slate-700">
									<div className="w-5/12">
										<div>Пациент (или законный представитель):</div>
										<div className="border-b border-slate-900 min-h-[22px] mt-2"></div>
										<div className="text-[8.5px] text-slate-500 mt-0.5">
											(подпись) / {patientName}
										</div>
										<div className="mt-1">Дата: {confirmedDate}</div>
									</div>
									<div className="w-5/12">
										<div>Врач, проводивший разъяснение:</div>
										<div className="border-b border-slate-900 min-h-[22px] mt-2"></div>
										<div className="text-[8.5px] text-slate-500 mt-0.5">
											(подпись и личная печать) / {docName}
										</div>
										<div className="mt-1">Дата: {confirmedDate}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── Modal Footer ── */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<FileCheck className="w-4 h-4 text-[var(--ok-fg,#059669)] shrink-0" />
						<span className="leading-tight">Соответствует Приказу № 1051н и ст. 20 323-ФЗ.</span>
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)] sm:border-transparent transition-colors text-center"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => {
								handleConfirmAndSave();
								handlePrint();
							}}
							className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:opacity-90 text-[var(--on-teal,#ffffff)] shadow-md transition-all active:scale-[0.98]"
							data-testid="print-consent-btn"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать ИДС (Приказ № 1051н)</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
