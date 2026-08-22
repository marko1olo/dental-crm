import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Download,
	FileSpreadsheet,
	FileText,
	Info,
	Layers,
	Maximize2,
	Plus,
	Printer,
	RotateCcw,
	Scan,
	Search,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Target,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { RadiologyStudy } from "../types";
import {
	calculatePatientCumulativeDose,
	createDoseRecord,
	type DoseRecord,
	estimateDoseFromExposureParams,
	evaluateDoseCompliance,
	exportDoseJournalToCsv,
	filterDoseRecords,
	generateDoseSheetHtml,
	normalizeDoseRecord,
} from "./radiationDoseEngine";
import {
	DENTAL_XRAY_APPARATUS_REGISTRY,
	getStatutoryDosePreset,
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
	SANPIN_PROTECTIVE_EQUIPMENT_CATALOG,
	SANPIN_RADIATION_REGULATORY_AUTHORITIES,
	STATUTORY_RADIATION_DOSE_PRESETS,
	type StatutoryRadiologyModality,
} from "./radiationDosePresets";

export interface RadiationDoseSheetModalProps {
	isOpen: boolean;
	onClose: () => void;
	studies?: (RadiologyStudy | DoseRecord)[] | null | undefined;
	patientName?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	clinicName?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	onSaveStudies?: ((updatedStudies: RadiologyStudy[]) => void) | undefined;
}

type ActiveTab = "summary" | "journal" | "calculator" | "sanpin";

export const RadiationDoseSheetModal: React.FC<RadiationDoseSheetModalProps> = ({
	isOpen,
	onClose,
	studies,
	patientName = "Иванов Иван Иванович",
	patientBirthDate = "1990-05-14",
	medicalCardNumber = "043/у-0012",
	clinicName = 'ООО "Денте Клиник"',
	doctorName = "Др. Смирнов А.В.",
	doctorSpecialty = "Врач-рентгенолог / Стоматолог",
	onSaveStudies,
}) => {
	const modalId = useId();
	const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(currentYear);

	// Internal records state
	const [records, setRecords] = useState<DoseRecord[]>(() => {
		if (Array.isArray(studies) && studies.length > 0) {
			return studies.map((s, idx) => normalizeDoseRecord(s, idx));
		}
		// Default rich initial sample set if none provided
		return [
			createDoseRecord({
				id: "sample-cbct-01",
				studyDate: `${currentYear}-02-10`,
				modalityId: "cbct_full_jaws",
				modalityLabel: "3D КЛКТ обеих челюстей 8х8 см",
				anatomicalArea: "Верхняя и нижняя челюсти",
				teethFdi: ["16", "26", "36", "46"],
				apparatusModel: "KaVo 3D eXam Vision",
				tubeVoltageKv: 90,
				tubeCurrentMa: 7,
				exposureTimeSec: 14.0,
				effectiveDoseMicrosv: 65.0,
				effectiveDoseMsv: 0.065,
				doctorName: doctorName || "Др. Смирнов А.В.",
				protectionEquipmentUsed: ["Защитный жилет 0.5 мм Pb", "Воротник для щитовидной железы"],
				notes: "Первичное томографическое обследование перед имплантацией",
			}),
			createDoseRecord({
				id: "sample-rvg-02",
				studyDate: `${currentYear}-04-18`,
				modalityId: "visiography_intraoral",
				modalityLabel: "Прицельный снимок на визиографе (RVG)",
				anatomicalArea: "Зуб 36",
				teethFdi: ["36"],
				apparatusModel: "Carestream CS 2200",
				tubeVoltageKv: 65,
				tubeCurrentMa: 7,
				exposureTimeSec: 0.08,
				effectiveDoseMicrosv: 2.0,
				effectiveDoseMsv: 0.002,
				doctorName: doctorName || "Др. Смирнов А.В.",
				protectionEquipmentUsed: ["Воротник 0.35 мм Pb", "Фартук 0.35 мм Pb"],
				notes: "Контроль обтурации корневых каналов 36",
			}),
		];
	});

	// Synchronize when outer studies prop updates
	useEffect(() => {
		if (Array.isArray(studies) && studies.length > 0) {
			setRecords(studies.map((s, idx) => normalizeDoseRecord(s, idx)));
		}
	}, [studies]);

	// Keyboard listener for Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Summary calculations
	const doseSummary = useMemo(() => {
		return calculatePatientCumulativeDose(records, selectedYear);
	}, [records, selectedYear]);

	// Journal Filters State
	const [journalSearch, setJournalSearch] = useState("");
	const [journalModalityFilter, setJournalModalityFilter] = useState("all");

	const filteredRecords = useMemo(() => {
		return filterDoseRecords(records, {
			...(selectedYear !== 0 ? { year: selectedYear } : {}),
			modalityId: journalModalityFilter,
			search: journalSearch,
		});
	}, [records, selectedYear, journalModalityFilter, journalSearch]);

	// Calculator State
	const [calcModalityId, setCalcModalityId] = useState<StatutoryRadiologyModality>("cbct_segmental");
	const [calcApparatusId, setCalcApparatusId] = useState<string>("kavo_3d_exam");
	const [calcKv, setCalcKv] = useState<number>(85);
	const [calcMa, setCalcMa] = useState<number>(6);
	const [calcExpSec, setCalcExpSec] = useState<number>(9.0);
	const [calcArea, setCalcArea] = useState<string>("Зубы 16, 15");
	const [calcTeethInput, setCalcTeethInput] = useState<string>("16, 15");

	// Update default params when calculator preset changes
	const handleCalculatorModalityChange = (modId: StatutoryRadiologyModality) => {
		setCalcModalityId(modId);
		const preset = getStatutoryDosePreset(modId);
		setCalcKv(preset.defaultKv);
		setCalcMa(preset.defaultMa);
		setCalcExpSec(preset.defaultExposureSec);
	};

	// Calculator real-time estimation
	const calcEstimate = useMemo(() => {
		return estimateDoseFromExposureParams({
			modalityId: calcModalityId,
			kv: calcKv,
			ma: calcMa,
			exposureSec: calcExpSec,
			isDigital: true,
		});
	}, [calcModalityId, calcKv, calcMa, calcExpSec]);

	// Calculator compliance projection
	const calcCompliance = useMemo(() => {
		return evaluateDoseCompliance(doseSummary.annualMsv, calcEstimate.estimatedDoseMsv);
	}, [doseSummary.annualMsv, calcEstimate.estimatedDoseMsv]);

	// Quick Add Study handler
	const handleQuickAdd = (modId: StatutoryRadiologyModality) => {
		const preset = getStatutoryDosePreset(modId);
		const newRecord = createDoseRecord({
			studyDate: new Date().toISOString().slice(0, 10),
			modalityId: preset.id,
			modalityLabel: preset.shortNameRu,
			anatomicalArea: preset.fovDescriptionRu,
			teethFdi: [],
			apparatusModel: "KaVo / Carestream Dental X-Ray",
			tubeVoltageKv: preset.defaultKv,
			tubeCurrentMa: preset.defaultMa,
			exposureTimeSec: preset.defaultExposureSec,
			effectiveDoseMicrosv: preset.typicalDoseMicrosv,
			effectiveDoseMsv: preset.typicalDoseMsv,
			doctorName: doctorName || "Др. Смирнов А.В.",
			clinicName: clinicName || 'ООО "Денте Клиник"',
			protectionEquipmentUsed: [preset.protectionEquipmentRu],
			notes: "Добавлено через 1-Click пресет рентген-кабинета",
		});

		const updated = [newRecord, ...records];
		setRecords(updated);
		if (onSaveStudies) {
			onSaveStudies(updated as unknown as RadiologyStudy[]);
		}
	};

	// Add from Calculator
	const handleAddFromCalculator = () => {
		const preset = getStatutoryDosePreset(calcModalityId);
		const teethList = calcTeethInput
			.split(",")
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		const newRecord = createDoseRecord({
			studyDate: new Date().toISOString().slice(0, 10),
			modalityId: calcModalityId,
			modalityLabel: preset.shortNameRu,
			anatomicalArea: calcArea || preset.fovDescriptionRu,
			teethFdi: teethList,
			apparatusModel:
				DENTAL_XRAY_APPARATUS_REGISTRY.find((a) => a.id === calcApparatusId)?.model ||
				"Дентальный томограф",
			tubeVoltageKv: calcKv,
			tubeCurrentMa: calcMa,
			exposureTimeSec: calcExpSec,
			effectiveDoseMicrosv: calcEstimate.estimatedDoseMicrosv,
			effectiveDoseMsv: calcEstimate.estimatedDoseMsv,
			doctorName: doctorName || "Др. Смирнов А.В.",
			clinicName: clinicName || 'ООО "Денте Клиник"',
			protectionEquipmentUsed: [preset.protectionEquipmentRu],
			isEmergencyJustified: calcCompliance.isExceeded,
			...(calcCompliance.isExceeded
				? { emergencyJustificationReason: "Исследование назначено по неотложным клиническим показаниям" }
				: {}),
			notes: `Расчет по МУ 2.6.1.2944-11 (${calcKv} кВ, ${calcMa} мА, ${calcExpSec} с)`,
		});

		const updated = [newRecord, ...records];
		setRecords(updated);
		if (onSaveStudies) {
			onSaveStudies(updated as unknown as RadiologyStudy[]);
		}
		setActiveTab("journal");
	};

	// Delete Record handler
	const handleDeleteRecord = (id: string) => {
		const updated = records.filter((r) => r.id !== id);
		setRecords(updated);
		if (onSaveStudies) {
			onSaveStudies(updated as unknown as RadiologyStudy[]);
		}
	};

	// Print Form 043/u Insert Handler
	const handlePrintDoseSheet = () => {
		const html = generateDoseSheetHtml(records, {
			clinicName: clinicName || 'ООО "Денте Клиник"',
			patientFullName: patientName || "Иванов Иван Иванович",
			patientBirthDate: patientBirthDate || "1990-05-14",
			medicalCardNumber: medicalCardNumber || "043/у-0012",
			reportingYear: selectedYear === 0 ? currentYear : selectedYear,
			responsibleDoctorName: doctorName || "Др. Смирнов А.В.",
			responsibleOfficerTitle: `${doctorSpecialty || "Врач-рентгенолог"} / Ответственный за РБ`,
			includeSignatureLine: true,
			paperFormat: "A4",
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			setTimeout(() => {
				printWindow.focus();
				printWindow.print();
			}, 300);
		} else {
			window.print();
		}
	};

	// Export CSV Handler
	const handleExportCsv = () => {
		const csvContent = exportDoseJournalToCsv(records, {
			clinicName: clinicName || 'ООО "Денте Клиник"',
			patientFullName: patientName || "Иванов Иван Иванович",
			medicalCardNumber: medicalCardNumber || "043/у-0012",
			delimiter: ";",
		});

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Лист_дозовых_нагрузок_${medicalCardNumber?.replace(/[^a-zA-Z0-9а-яА-Я]/g, "_") || "043u"}_${selectedYear}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	if (!isOpen || typeof document === "undefined") return null;

	// Progress Ring Math
	const progressPercent = Math.min(doseSummary.percentOfAnnualLimit, 100);
	const radius = 54;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

	const ringColor =
		doseSummary.safetyZone === "red"
			? "#ef4444"
			: doseSummary.safetyZone === "yellow"
				? "#f59e0b"
				: "#10b981";

	return createPortal(
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Лист учета дозовых нагрузок пациента при рентгенологических исследованиях"
			data-testid="radiation-dose-sheet-modal"
		>
			<div className="flex flex-col w-full max-w-5xl h-full max-h-[94vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ═══ Header ═══ */}
				<header className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 shrink-0">
							<Activity className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base md:text-lg font-extrabold text-[var(--ink)] leading-tight">
									Лист учета дозовых нагрузок пациента
								</h2>
								<span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									СанПиН 2.6.1.1192-03
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] truncate max-w-xl">
								Форма № 043/у · {patientName} · Д/Р: {patientBirthDate} · Карта: {medicalCardNumber}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrintDoseSheet}
							className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] hover:border-teal-500/40 active:scale-95 transition-all shadow-sm"
							title="Печать официального вкладыша в карту 043/у (A4)"
						>
							<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
							<span className="hidden sm:inline">Печать (043/у)</span>
						</button>

						<button
							type="button"
							onClick={handleExportCsv}
							className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] active:scale-95 transition-all shadow-sm"
							title="Экспорт журнала в CSV по RFC 4180"
						>
							<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span className="hidden sm:inline">Экспорт CSV</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
							title="Закрыть окно (Esc)"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ═══ Navigation Tabs ═══ */}
				<div className="flex items-center justify-between px-5 md:px-6 border-b border-[var(--line)] bg-[var(--paper)] shrink-0 overflow-x-auto">
					<div className="flex items-center gap-1 sm:gap-2 py-2">
						<button
							type="button"
							onClick={() => setActiveTab("summary")}
							className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
								activeTab === "summary"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<ShieldCheck className="w-4 h-4" />
							<span>Лист дозовых нагрузок</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("journal")}
							className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
								activeTab === "journal"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<FileText className="w-4 h-4" />
							<span>Журнал рентген-кабинета</span>
							<span className="px-2 py-0.5 text-[11px] rounded-full bg-[var(--line)] font-extrabold text-[var(--ink)]">
								{records.length}
							</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("calculator")}
							className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
								activeTab === "calculator"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Zap className="w-4 h-4" />
							<span>Калькулятор доз</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("sanpin")}
							className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
								activeTab === "sanpin"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Info className="w-4 h-4" />
							<span>Нормативы СанПиН</span>
						</button>
					</div>

					{/* Year Selector */}
					<div className="flex items-center gap-2 pl-3 shrink-0">
						<span className="text-xs font-bold text-[var(--muted)] uppercase hidden sm:inline">
							Год:
						</span>
						<select
							value={selectedYear}
							onChange={(e) => setSelectedYear(Number(e.target.value))}
							className="min-h-[44px] px-3 py-1 text-xs md:text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
							aria-label="Выбор отчетного года"
						>
							<option value={currentYear}>{currentYear} год (текущий)</option>
							<option value={currentYear - 1}>{currentYear - 1} год</option>
							<option value={currentYear - 2}>{currentYear - 2} год</option>
							<option value={0}>За всё время</option>
						</select>
					</div>
				</div>

				{/* ═══ Modal Body Content ═══ */}
				<div className="p-4 md:p-6 overflow-y-auto flex flex-col gap-6 flex-1">
					{/* ─── TAB 1: SUMMARY DASHBOARD ─── */}
					{activeTab === "summary" && (
						<div className="flex flex-col gap-6 animate-in fade-in duration-150">
							{/* Top Metrics Banner */}
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
								{/* Circular Ring Gauge Gauge Card (col-span-5) */}
								<div className="lg:col-span-5 p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-center gap-5">
									<div className="relative flex items-center justify-center shrink-0 w-32 h-32">
										<svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 128 128">
											{/* Background Track */}
											<circle
												cx="64"
												cy="64"
												r={radius}
												stroke="currentColor"
												strokeWidth="10"
												className="text-[var(--line)] opacity-40"
												fill="none"
											/>
											{/* Progress Fill */}
											<circle
												cx="64"
												cy="64"
												r={radius}
												stroke={ringColor}
												strokeWidth="10"
												strokeDasharray={circumference}
												strokeDashoffset={strokeDashoffset}
												strokeLinecap="round"
												fill="none"
												className="transition-all duration-700 ease-out"
											/>
										</svg>
										<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
											<span className="text-xl font-extrabold text-[var(--ink)] leading-none">
												{doseSummary.percentOfAnnualLimit}%
											</span>
											<span className="text-[10px] font-bold text-[var(--muted)] mt-0.5">
												от 1.0 мЗв
											</span>
										</div>
									</div>

									<div className="flex flex-col gap-1.5 text-center sm:text-left">
										<span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
											Накопленная доза ({selectedYear === 0 ? "Все годы" : `${selectedYear} г.`}):
										</span>
										<div className="text-xl md:text-2xl font-black text-[var(--ink)]">
											{doseSummary.annualMsv} мЗв
										</div>
										<div className="text-xs font-bold text-teal-600 dark:text-teal-400">
											{doseSummary.annualMicrosv} мкЗв · {doseSummary.annualStudiesCount} снимков
										</div>
										<span className="text-[11px] text-[var(--muted)]">
											Лимит СанПиН: 1.0 мЗв/год (профилактический)
										</span>
									</div>
								</div>

								{/* Safety Status Card (col-span-4) */}
								<div className="lg:col-span-4 p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between gap-3">
									<div className="flex flex-col gap-1.5">
										<span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
											Уровень безопасности:
										</span>
										<div className="flex items-center gap-2.5 mt-0.5">
											{doseSummary.safetyZone === "green" ? (
												<ShieldCheck className="w-7 h-7 text-emerald-500 shrink-0" />
											) : doseSummary.safetyZone === "yellow" ? (
												<AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" />
											) : (
												<ShieldAlert className="w-7 h-7 text-rose-500 shrink-0" />
											)}
											<div>
												<div
													className={`text-sm md:text-base font-extrabold ${
														doseSummary.safetyZone === "green"
															? "text-emerald-600 dark:text-emerald-400"
															: doseSummary.safetyZone === "yellow"
																? "text-amber-600 dark:text-amber-400"
																: "text-rose-600 dark:text-rose-400"
													}`}
												>
													{doseSummary.safetyZoneLabel}
												</div>
												<div className="text-[11px] text-[var(--muted)]">
													{doseSummary.safetyZone === "green"
														? "Оптимальный диапазон"
														: doseSummary.safetyZone === "yellow"
															? "Рекомендована оптимизация"
															: "Особый клинический протокол"}
												</div>
											</div>
										</div>
									</div>

									<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed">
										{doseSummary.recommendation}
									</div>
								</div>

								{/* Lifetime Total Card (col-span-3) */}
								<div className="lg:col-span-3 p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between gap-3">
									<div className="flex flex-col gap-1.5">
										<span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
											За всё время лечения:
										</span>
										<div className="text-xl md:text-2xl font-black text-teal-600 dark:text-teal-400">
											{doseSummary.lifetimeMsv} мЗв
										</div>
										<span className="text-xs font-bold text-[var(--muted)]">
											{doseSummary.lifetimeMicrosv} мкЗв · {doseSummary.lifetimeStudiesCount} процедур
										</span>
									</div>

									<div className="flex items-center justify-between text-xs text-[var(--muted)] pt-2 border-t border-[var(--line)]">
										<span>В амбулаторной карте:</span>
										<strong className="text-[var(--ink)]">{medicalCardNumber}</strong>
									</div>
								</div>
							</div>

							{/* 1-Click Fast Presets Toolbar */}
							<div className="flex flex-col gap-2.5 p-4 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div className="flex items-center justify-between">
									<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
										<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
										1-Click Быстрое добавление снимка по СанПиН:
									</span>
									<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
										Автоматический учет параметров аппарата и дозы
									</span>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
									<button
										type="button"
										onClick={() => handleQuickAdd("visiography_intraoral")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											Визиограф (RVG)
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.002 мЗв
										</span>
									</button>

									<button
										type="button"
										onClick={() => handleQuickAdd("optg_panoramic")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											ОПТГ (Панорама)
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.018 мЗв
										</span>
									</button>

									<button
										type="button"
										onClick={() => handleQuickAdd("cbct_segmental")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											3D КЛКТ 5х5
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.035 мЗв
										</span>
									</button>

									<button
										type="button"
										onClick={() => handleQuickAdd("cbct_full_jaws")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											3D КЛКТ челюстей
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.065 мЗв
										</span>
									</button>

									<button
										type="button"
										onClick={() => handleQuickAdd("cbct_maxillofacial")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											3D КЛКТ 15х15
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.095 мЗв
										</span>
									</button>

									<button
										type="button"
										onClick={() => handleQuickAdd("teleradiography_trg")}
										className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500 hover:bg-teal-500/10 active:scale-95 transition-all min-h-[44px] text-center group"
									>
										<span className="text-xs font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400">
											ТРГ (Цефало)
										</span>
										<span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400">
											+0.006 мЗв
										</span>
									</button>
								</div>
							</div>

							{/* Recent Studies Preview Table */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
										Последние проведенные рентгенологические исследования:
									</span>
									<button
										type="button"
										onClick={() => setActiveTab("journal")}
										className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 min-h-[44px]"
									>
										<span>Открыть полный журнал ({records.length})</span>
										<ChevronRight className="w-4 h-4" />
									</button>
								</div>

								<div className="border border-[var(--line)] rounded-3xl overflow-hidden bg-[var(--paper)] shadow-sm">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs">
											<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-bold text-[var(--muted)] uppercase text-[11px]">
												<tr>
													<th className="px-4 py-3">№</th>
													<th className="px-4 py-3">Дата</th>
													<th className="px-4 py-3">Вид исследования</th>
													<th className="px-4 py-3">Область (FDI)</th>
													<th className="px-4 py-3 text-right">Доза (мкЗв)</th>
													<th className="px-4 py-3 text-right">Доза (мЗв)</th>
													<th className="px-4 py-3">Врач</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line)]">
												{records.length === 0 ? (
													<tr>
														<td
															colSpan={7}
															className="px-4 py-8 text-center text-[var(--muted)] italic"
														>
															Нет записей о проведенных исследованиях.
														</td>
													</tr>
												) : (
													records.slice(0, 5).map((st, idx) => (
														<tr
															key={st.id}
															className="hover:bg-[var(--paper-soft)] transition-colors"
														>
															<td className="px-4 py-3 font-mono font-bold text-[var(--muted)]">
																{idx + 1}
															</td>
															<td className="px-4 py-3 font-bold text-[var(--ink)] whitespace-nowrap">
																{st.studyDate}
															</td>
															<td className="px-4 py-3 font-semibold text-[var(--ink)]">
																{st.modalityLabel}
															</td>
															<td className="px-4 py-3 font-bold text-teal-600 dark:text-teal-400">
																{st.anatomicalArea}
																{st.teethFdi && st.teethFdi.length > 0
																	? ` (${st.teethFdi.join(", ")})`
																	: ""}
															</td>
															<td className="px-4 py-3 text-right font-bold text-[var(--ink)]">
																{st.effectiveDoseMicrosv.toFixed(1)}
															</td>
															<td className="px-4 py-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
																{st.effectiveDoseMsv.toFixed(4)}
															</td>
															<td className="px-4 py-3 text-[var(--muted)] truncate max-w-[140px]">
																{st.doctorName}
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>

							{/* ALARA Principle & Statutory Declaration */}
							<div className="p-4 rounded-3xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-3.5">
								<Info className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
								<div className="text-xs text-[var(--ink)] leading-relaxed flex flex-col gap-1">
									<strong className="text-teal-800 dark:text-teal-200 font-bold">
										Радиационная безопасность и защита пациента (СанПиН 2.6.1.1192-03):
									</strong>
									<p>{doseSummary.alaraComplianceNotes}</p>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 2: FULL X-RAY JOURNAL & REGISTER ─── */}
					{activeTab === "journal" && (
						<div className="flex flex-col gap-4 animate-in fade-in duration-150">
							{/* Filter Bar */}
							<div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div className="flex items-center gap-2 flex-1 min-w-[240px]">
									<Search className="w-4 h-4 text-[var(--muted)] shrink-0 ml-2" />
									<input
										type="text"
										value={journalSearch}
										onChange={(e) => setJournalSearch(e.target.value)}
										placeholder="Поиск по области, зубам FDI, врачу или заметкам..."
										className="w-full bg-transparent text-xs md:text-sm font-semibold text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none min-h-[40px]"
									/>
									{journalSearch && (
										<button
											type="button"
											onClick={() => setJournalSearch("")}
											className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</div>

								<div className="flex items-center gap-2">
									<select
										value={journalModalityFilter}
										onChange={(e) => setJournalModalityFilter(e.target.value)}
										className="min-h-[40px] px-3 py-1 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none"
										aria-label="Фильтр по модальности"
									>
										<option value="all">Все модальности</option>
										{STATUTORY_RADIATION_DOSE_PRESETS.map((p) => (
											<option key={p.id} value={p.id}>
												{p.shortNameRu}
											</option>
										))}
									</select>

									<button
										type="button"
										onClick={() => setActiveTab("calculator")}
										className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
									>
										<Plus className="w-3.5 h-3.5" />
										<span>Новое исследование</span>
									</button>
								</div>
							</div>

							{/* Data Table */}
							<div className="border border-[var(--line)] rounded-3xl overflow-hidden bg-[var(--paper)] shadow-sm">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-bold text-[var(--muted)] uppercase text-[11px]">
											<tr>
												<th className="px-4 py-3">№</th>
												<th className="px-4 py-3">Дата</th>
												<th className="px-4 py-3">Исследование / Аппарат</th>
												<th className="px-4 py-3">Область / FDI</th>
												<th className="px-4 py-3 text-center">Режим (кВ/мА/с)</th>
												<th className="px-4 py-3 text-right">Доза (мкЗв)</th>
												<th className="px-4 py-3 text-right">Доза (мЗв)</th>
												<th className="px-4 py-3">СИЗ</th>
												<th className="px-4 py-3">Врач</th>
												<th className="px-4 py-3 text-center">Действия</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line)]">
											{filteredRecords.length === 0 ? (
												<tr>
													<td
														colSpan={10}
														className="px-4 py-12 text-center text-[var(--muted)] italic"
													>
														Не найдено записей, соответствующих критериям поиска.
													</td>
												</tr>
											) : (
												filteredRecords.map((st, idx) => (
													<tr
														key={st.id}
														className="hover:bg-[var(--paper-soft)] transition-colors"
													>
														<td className="px-4 py-3 font-mono font-bold text-[var(--muted)]">
															{idx + 1}
														</td>
														<td className="px-4 py-3 font-bold text-[var(--ink)] whitespace-nowrap">
															{st.studyDate}
														</td>
														<td className="px-4 py-3">
															<strong className="text-[var(--ink)] block">
																{st.modalityLabel}
															</strong>
															<span className="text-[11px] text-[var(--muted)]">
																{st.apparatusModel}
															</span>
														</td>
														<td className="px-4 py-3 font-bold text-teal-600 dark:text-teal-400">
															{st.anatomicalArea}
															{st.teethFdi && st.teethFdi.length > 0 ? (
																<span className="block text-[11px] font-mono text-[var(--muted)]">
																	FDI: {st.teethFdi.join(", ")}
																</span>
															) : null}
														</td>
														<td className="px-4 py-3 text-center font-mono text-[11px] text-[var(--muted)]">
															{st.tubeVoltageKv} кВ / {st.tubeCurrentMa} мА / {st.exposureTimeSec} с
														</td>
														<td className="px-4 py-3 text-right font-bold text-[var(--ink)]">
															{st.effectiveDoseMicrosv.toFixed(1)}
														</td>
														<td className="px-4 py-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
															{st.effectiveDoseMsv.toFixed(4)}
														</td>
														<td className="px-4 py-3 text-[11px] text-[var(--muted)] max-w-[120px] truncate">
															{st.protectionEquipmentUsed?.join(", ") || "Воротник 0.35 мм Pb"}
														</td>
														<td className="px-4 py-3 text-[var(--ink)] whitespace-nowrap">
															{st.doctorName}
														</td>
														<td className="px-4 py-3 text-center">
															<button
																type="button"
																onClick={() => handleDeleteRecord(st.id)}
																className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
																title="Удалить запись"
																aria-label="Удалить"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* ─── TAB 3: DOSE CALCULATOR & PLANNER ─── */}
					{activeTab === "calculator" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
							{/* Form Column (col-span-7) */}
							<div className="lg:col-span-7 flex flex-col gap-4 p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
									<Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
									Параметры планируемого исследования:
								</h3>

								{/* Modality Selection */}
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-[var(--muted)] uppercase">
										Вид рентгенологического исследования (СанПиН):
									</label>
									<select
										value={calcModalityId}
										onChange={(e) =>
											handleCalculatorModalityChange(
												e.target.value as StatutoryRadiologyModality,
											)
										}
										className="min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-bold rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
									>
										{STATUTORY_RADIATION_DOSE_PRESETS.map((p) => (
											<option key={p.id} value={p.id}>
												{p.nameRu} (~{p.typicalDoseMsv} мЗв)
											</option>
										))}
									</select>
								</div>

								{/* Apparatus Selection */}
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-[var(--muted)] uppercase">
										Рентгеновский аппарат / Томограф:
									</label>
									<select
										value={calcApparatusId}
										onChange={(e) => setCalcApparatusId(e.target.value)}
										className="min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-bold rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none"
									>
										{DENTAL_XRAY_APPARATUS_REGISTRY.map((a) => (
											<option key={a.id} value={a.id}>
												{a.brand} {a.model} ({a.sensorTech})
											</option>
										))}
									</select>
								</div>

								{/* Physical Exposure Sliders */}
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
										<div className="flex justify-between items-center text-xs font-bold text-[var(--muted)]">
											<span>Напряжение (кВ):</span>
											<span className="text-[var(--ink)] font-mono">{calcKv} кВ</span>
										</div>
										<input
											type="range"
											min={50}
											max={110}
											step={1}
											value={calcKv}
											onChange={(e) => setCalcKv(Number(e.target.value))}
											className="accent-teal-500"
										/>
									</div>

									<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
										<div className="flex justify-between items-center text-xs font-bold text-[var(--muted)]">
											<span>Ток трубки (мА):</span>
											<span className="text-[var(--ink)] font-mono">{calcMa} мА</span>
										</div>
										<input
											type="range"
											min={2}
											max={15}
											step={0.5}
											value={calcMa}
											onChange={(e) => setCalcMa(Number(e.target.value))}
											className="accent-teal-500"
										/>
									</div>

									<div className="p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
										<div className="flex justify-between items-center text-xs font-bold text-[var(--muted)]">
											<span>Экспозиция (с):</span>
											<span className="text-[var(--ink)] font-mono">{calcExpSec} с</span>
										</div>
										<input
											type="range"
											min={0.02}
											max={20.0}
											step={0.05}
											value={calcExpSec}
											onChange={(e) => setCalcExpSec(Number(e.target.value))}
											className="accent-teal-500"
										/>
									</div>
								</div>

								{/* Anatomical Area and FDI Input */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-[var(--muted)] uppercase">
											Анатомическая область:
										</label>
										<input
											type="text"
											value={calcArea}
											onChange={(e) => setCalcArea(e.target.value)}
											placeholder="Например, Зубы 16-17 или ВНЧС"
											className="min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-semibold rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none"
										/>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold text-[var(--muted)] uppercase">
											Номера зубов по FDI (через запятую):
										</label>
										<input
											type="text"
											value={calcTeethInput}
											onChange={(e) => setCalcTeethInput(e.target.value)}
											placeholder="16, 15, 26"
											className="min-h-[44px] px-3.5 py-2 text-xs md:text-sm font-semibold rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none"
										/>
									</div>
								</div>
							</div>

							{/* Real-Time Impact Projection Column (col-span-5) */}
							<div className="lg:col-span-5 flex flex-col justify-between gap-4 p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div className="flex flex-col gap-4">
									<h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
										<Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
										Прогноз лучевой нагрузки (МУ 2.6.1.2944-11):
									</h3>

									<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
										<span className="text-xs font-bold text-[var(--muted)] uppercase">
											Ориентировочная доза за процедуру:
										</span>
										<div className="text-2xl md:text-3xl font-black text-teal-600 dark:text-teal-400">
											{calcEstimate.estimatedDoseMsv} мЗв
										</div>
										<span className="text-xs text-[var(--muted)]">
											{calcEstimate.estimatedDoseMicrosv} мкЗв · {calcEstimate.calculationMethod}
										</span>
									</div>

									{/* Impact on Annual Limit */}
									<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
										<div className="flex items-center justify-between text-xs font-bold">
											<span className="text-[var(--muted)] uppercase">
												Итоговая доза за {currentYear} г.:
											</span>
											<span
												className={`text-sm font-black ${
													calcCompliance.zone === "green"
														? "text-emerald-600 dark:text-emerald-400"
														: calcCompliance.zone === "yellow"
															? "text-amber-600 dark:text-amber-400"
															: "text-rose-600 dark:text-rose-400"
												}`}
											>
												{calcCompliance.totalAnnualMsv} мЗв ({calcCompliance.percentOfLimit}%)
											</span>
										</div>

										{/* Progress Bar */}
										<div className="w-full h-3 rounded-full bg-[var(--line)] overflow-hidden">
											<div
												className={`h-full rounded-full transition-all duration-300 ${
													calcCompliance.zone === "green"
														? "bg-emerald-500"
														: calcCompliance.zone === "yellow"
															? "bg-amber-500"
															: "bg-rose-500"
												}`}
												style={{ width: `${Math.min(calcCompliance.percentOfLimit, 100)}%` }}
											/>
										</div>

										<p className="text-xs text-[var(--muted)] leading-tight mt-1">
											{calcCompliance.warningMessage}
										</p>
									</div>

									{/* Action Required */}
									<div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-[var(--ink)] leading-relaxed">
										<strong className="text-teal-800 dark:text-teal-200 block mb-0.5">
											Клинический протокол:
										</strong>
										{calcCompliance.protocolActionRequired}
									</div>
								</div>

								{/* Add to Journal Button */}
								<button
									type="button"
									onClick={handleAddFromCalculator}
									className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 text-sm font-extrabold rounded-2xl bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all shadow-md mt-2"
								>
									<Check className="w-5 h-5" />
									<span>Добавить исследование в журнал</span>
								</button>
							</div>
						</div>
					)}

					{/* ─── TAB 4: SANPIN STATUTORY REFERENCE ─── */}
					{activeTab === "sanpin" && (
						<div className="flex flex-col gap-6 animate-in fade-in duration-150">
							{/* Legal Norms Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
									<div className="flex items-center gap-2.5">
										<ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
										<div>
											<h4 className="text-sm font-extrabold text-[var(--ink)]">
												{SANPIN_RADIATION_REGULATORY_AUTHORITIES.sanpin1192_03.code}
											</h4>
											<span className="text-xs text-[var(--muted)]">
												{SANPIN_RADIATION_REGULATORY_AUTHORITIES.sanpin1192_03.issuedBy}
											</span>
										</div>
									</div>
									<p className="text-xs text-[var(--ink)] font-semibold">
										{SANPIN_RADIATION_REGULATORY_AUTHORITIES.sanpin1192_03.title}
									</p>
									<ul className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
										{SANPIN_RADIATION_REGULATORY_AUTHORITIES.sanpin1192_03.relevantClauses.map(
											(c, i) => (
												<li key={i} className="flex items-start gap-1.5">
													<span className="text-teal-600 font-bold">•</span>
													<span>{c}</span>
												</li>
											),
										)}
									</ul>
								</div>

								<div className="p-5 rounded-3xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
									<div className="flex items-center gap-2.5">
										<Shield className="w-6 h-6 text-teal-600 dark:text-teal-400" />
										<div>
											<h4 className="text-sm font-extrabold text-[var(--ink)]">
												{SANPIN_RADIATION_REGULATORY_AUTHORITIES.nrb99_2009.code}
											</h4>
											<span className="text-xs text-[var(--muted)]">
												{SANPIN_RADIATION_REGULATORY_AUTHORITIES.nrb99_2009.issuedBy}
											</span>
										</div>
									</div>
									<p className="text-xs text-[var(--ink)] font-semibold">
										{SANPIN_RADIATION_REGULATORY_AUTHORITIES.nrb99_2009.title}
									</p>
									<ul className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
										{SANPIN_RADIATION_REGULATORY_AUTHORITIES.nrb99_2009.relevantClauses.map(
											(c, i) => (
												<li key={i} className="flex items-start gap-1.5">
													<span className="text-teal-600 font-bold">•</span>
													<span>{c}</span>
												</li>
											),
										)}
									</ul>
								</div>
							</div>

							{/* Typical Dose Table Reference */}
							<div className="flex flex-col gap-2">
								<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
									Справочная таблица ориентировочных эффективных доз по СанПиН:
								</span>

								<div className="border border-[var(--line)] rounded-3xl overflow-hidden bg-[var(--paper)]">
									<table className="w-full text-left text-xs">
										<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-bold text-[var(--muted)] uppercase text-[11px]">
											<tr>
												<th className="px-4 py-3">Вид исследования</th>
												<th className="px-4 py-3">Тип детектора</th>
												<th className="px-4 py-3 text-right">Эфф. доза (мЗв)</th>
												<th className="px-4 py-3 text-right">Эфф. доза (мкЗв)</th>
												<th className="px-4 py-3">Обязательные СИЗ</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line)]">
											{STATUTORY_RADIATION_DOSE_PRESETS.map((p) => (
												<tr key={p.id} className="hover:bg-[var(--paper-soft)] transition-colors">
													<td className="px-4 py-3 font-bold text-[var(--ink)]">{p.nameRu}</td>
													<td className="px-4 py-3 text-[var(--muted)]">{p.sensorTypeRu}</td>
													<td className="px-4 py-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
														{p.typicalDoseMsv}
													</td>
													<td className="px-4 py-3 text-right font-mono font-semibold text-[var(--ink)]">
														{p.typicalDoseMicrosv}
													</td>
													<td className="px-4 py-3 text-[11px] text-[var(--muted)]">
														{p.protectionEquipmentRu}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Personal Protective Equipment Catalog */}
							<div className="flex flex-col gap-2">
								<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
									Каталог СИЗ для защиты пациентов и персонала (СанПиН Таблица 3):
								</span>

								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
									{SANPIN_PROTECTIVE_EQUIPMENT_CATALOG.map((eq) => (
										<div
											key={eq.id}
											className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5"
										>
											<div className="flex items-center justify-between">
												<strong className="text-xs font-bold text-[var(--ink)]">
													{eq.nameRu}
												</strong>
												<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
													{eq.leadEquivalentMmPb} мм Pb
												</span>
											</div>
											<p className="text-xs text-[var(--muted)]">{eq.descriptionRu}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* ═══ Modal Footer ═══ */}
				<footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<span className="font-semibold">Ответственный за РБ:</span>
						<strong className="text-[var(--ink)]">{doctorName}</strong>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 py-2.5 text-xs md:text-sm font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrintDoseSheet}
							className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-xs md:text-sm font-extrabold rounded-xl bg-teal-600 text-white shadow-md hover:bg-teal-700 active:scale-95 transition-all"
						>
							<Printer className="w-4 h-4" />
							<span>Печать Листа дозовых нагрузок (043/у)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>,
		document.body,
	);
};
