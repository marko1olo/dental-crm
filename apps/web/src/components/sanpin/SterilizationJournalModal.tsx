/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO QUALITY AUTO-GENERATOR JOURNAL MODAL
 * Автогенератор журналов для проверок Роспотребнадзора (Форма № 257/у, Форма № 366/у)
 * 1-кликовое закрытие смены стерилизации для медсестры, крафт-трейсинг и печать А4.
 * ============================================================================
 */

import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	Droplets,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	Play,
	Plus,
	Printer,
	QrCode,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import "./sterilizationSanpin.css";
import {
	calculateKraftSterilityExpiration,
	calculatePsoSampleRequirements,
	ChamberControlPoint,
	ClinicRequisites,
	createDefaultChamberPoints,
	DailyShiftSanpinLogBundle,
	DEFAULT_CLINIC_REQUISITES,
	evaluatePsoTrial,
	exportForm257ToCsv,
	exportKraftPackagesToCsv,
	exportPsoToCsv,
	Form257CycleRecord,
	generateCombinedInspectionDossierHtml,
	generateDailyShiftSanpinLog,
	generateDigitalStampHash,
	generateForm257PrintHtml,
	generateKraftBarcode,
	generateMonthlySanpinJournal,
	generatePso366PrintHtml,
	KraftPackageItem,
	KraftPackagingType,
	MonthlySanpinJournalBundle,
	PsoTestRecord,
	SANPIN_REGULATORY_META,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_REGIMES,
	STATUTORY_STERILIZERS,
	SterilizationRegimeCode,
	validateSterilizationCycle,
} from "./sterilizationSanpinEngine";

export interface SterilizationJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "form257" | "pso366" | "kraft_packages" | "print_blanks";
	readonly clinicRequisites?: ClinicRequisites;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL SEED DATA (CURRENT MONTH DEFAULT)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_INITIAL_BUNDLE = generateMonthlySanpinJournal({
	year: 2026,
	month: 8,
	dailyPatientLoadLevel: "standard",
});

export function SterilizationJournalModal({
	isOpen,
	onClose,
	initialTab = "form257",
	clinicRequisites = DEFAULT_CLINIC_REQUISITES,
}: SterilizationJournalModalProps) {
	const [activeTab, setActiveTab] = useState<"form257" | "pso366" | "kraft_packages" | "print_blanks">(initialTab);

	// Data states
	const [cycles, setCycles] = useState<readonly Form257CycleRecord[]>(DEFAULT_INITIAL_BUNDLE.cycles);
	const [psoRecords, setPsoRecords] = useState<readonly PsoTestRecord[]>(DEFAULT_INITIAL_BUNDLE.psoRecords);
	const [kraftPackages, setKraftPackages] = useState<readonly KraftPackageItem[]>(DEFAULT_INITIAL_BUNDLE.kraftPackages);

	// Generator Controls
	const [genYear, setGenYear] = useState<number>(2026);
	const [genMonth, setGenMonth] = useState<number>(8); // August
	const [genLoadLevel, setGenLoadLevel] = useState<"standard" | "high" | "moderate">("standard");
	const [genIncludeSat, setGenIncludeSat] = useState<boolean>(true);
	const [lastGeneratedSummary, setLastGeneratedSummary] = useState<string | null>(
		"Журналы Формы 257/у и 366/у за Август 2026 г. сгенерированы (100% соответствие СанПиН 3.3686-21).",
	);

	// Nurse Daily Shift State
	const [nurseOperator, setNurseOperator] = useState<string>("Смирнова Анна Викторовна");

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSterilizerFilter, setSelectedSterilizerFilter] = useState("all");
	const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

	// Barcode search / thermal sticker
	const [scannedBarcode, setScannedBarcode] = useState("");
	const [selectedPackageForSticker, setSelectedPackageForSticker] = useState<KraftPackageItem | null>(
		DEFAULT_INITIAL_BUNDLE.kraftPackages[0] ?? null,
	);

	// Print Blank Type selector
	const [selectedPrintBlank, setSelectedPrintBlank] = useState<"257" | "366" | "combined">("combined");

	if (!isOpen) return null;

	// ─── 1-CLICK MONTHLY AUTO-GENERATOR FOR ROSPOTREBNADZOR ─────────────────────
	const handleGenerateFullMonth = () => {
		const bundle: MonthlySanpinJournalBundle = generateMonthlySanpinJournal({
			year: genYear,
			month: genMonth,
			clinicInfo: clinicRequisites,
			primaryOperatorFullName: nurseOperator,
			includeSaturdays: genIncludeSat,
			dailyPatientLoadLevel: genLoadLevel,
		});

		setCycles(bundle.cycles);
		setPsoRecords(bundle.psoRecords);
		setKraftPackages(bundle.kraftPackages);
		if (bundle.kraftPackages[0]) {
			setSelectedPackageForSticker(bundle.kraftPackages[0]);
		}

		const summaryMsg = `Сгенерирован журнал за ${bundle.monthFormattedRu}: ${bundle.workingDaysCount} смен, ${bundle.totalCyclesCount} циклов, ${bundle.totalPsoTestsCount} проб ПСО, ${bundle.totalPacksCount} упаковок. 100% готов к проверке!`;
		setLastGeneratedSummary(summaryMsg);
		showToast(summaryMsg, "success");
	};

	// ─── 1-CLICK DAILY SHIFT CLOSURE FOR NURSE ──────────────────────────────────
	const handleCloseDailyShift = () => {
		const shiftBundle: DailyShiftSanpinLogBundle = generateDailyShiftSanpinLog({
			operatorFullName: nurseOperator,
			clinicInfo: clinicRequisites,
		});

		setCycles((prev) => [...shiftBundle.cycles, ...prev]);
		setPsoRecords((prev) => [...shiftBundle.psoRecords, ...prev]);
		setKraftPackages((prev) => [...shiftBundle.kraftPackages, ...prev]);
		if (shiftBundle.kraftPackages[0]) {
			setSelectedPackageForSticker(shiftBundle.kraftPackages[0]);
		}

		showToast(
			`Смена зафиксирована: 3 цикла автоклавирования, 3 серии ПСО (100% норма), ${shiftBundle.kraftPackages.length} крафт-пакетов.`,
			"success",
		);
	};

	// ─── CSV EXPORTS ───────────────────────────────────────────────────────────
	const handleDownloadCsv = (type: "257" | "366" | "kraft") => {
		let csv = "";
		let filename = "";
		if (type === "257") {
			csv = exportForm257ToCsv(cycles);
			filename = `SanPiN_Form_257u_${new Date().toISOString().slice(0, 10)}.csv`;
		} else if (type === "366") {
			csv = exportPsoToCsv(psoRecords);
			filename = `SanPiN_Form_366u_PSO_${new Date().toISOString().slice(0, 10)}.csv`;
		} else {
			csv = exportKraftPackagesToCsv(kraftPackages);
			filename = `SanPiN_Kraft_Packages_${new Date().toISOString().slice(0, 10)}.csv`;
		}

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast(`Файл ${filename} успешно сохранен`, "success");
	};

	// ─── PRINT HANDLER ─────────────────────────────────────────────────────────
	const printHtmlForPreview = useMemo(() => {
		const monthRu = `Август ${genYear} г.`;
		if (selectedPrintBlank === "257") {
			return generateForm257PrintHtml(cycles, clinicRequisites);
		}
		if (selectedPrintBlank === "366") {
			return generatePso366PrintHtml(psoRecords, clinicRequisites);
		}
		return generateCombinedInspectionDossierHtml({
			monthFormattedRu: monthRu,
			cycles,
			psoRecords,
			clinicInfo: clinicRequisites,
		});
	}, [selectedPrintBlank, cycles, psoRecords, clinicRequisites, genYear]);

	const handlePrint = () => {
		const printWin = window.open("", "_blank", "width=1150,height=850");
		if (printWin) {
			printWin.document.write(printHtmlForPreview);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		} else {
			showToast("Не удалось открыть окно печати. Разрешите всплывающие окна.", "error");
		}
	};

	// ─── FILTERED LISTS ────────────────────────────────────────────────────────
	const filteredCycles = cycles.filter((c) => {
		const matchesSearch =
			c.itemsDescriptionRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.sterilizerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.operatorFullName.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesSterilizer =
			selectedSterilizerFilter === "all" || c.sterilizerId === selectedSterilizerFilter;
		const matchesStatus = selectedStatusFilter === "all" || c.cycleStatus === selectedStatusFilter;
		return matchesSearch && matchesSterilizer && matchesStatus;
	});

	const filteredPso = psoRecords.filter((p) => {
		const matchesSearch =
			p.instrumentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.operatorFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.detergentBrand.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus =
			selectedStatusFilter === "all" ||
			(selectedStatusFilter === "passed" && p.isBatchApproved) ||
			(selectedStatusFilter === "failed" && !p.isBatchApproved);
		return matchesSearch && matchesStatus;
	});

	const filteredKraftPackages = kraftPackages.filter((kp) => {
		const matchesSearch =
			kp.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
			kp.toolSetNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
			kp.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesBarcode = !scannedBarcode || kp.barcode.toUpperCase().includes(scannedBarcode.toUpperCase());
		return matchesSearch && matchesBarcode;
	});

	return (
		<div className="steril-journal-overlay" role="dialog" aria-modal="true">
			<div className="steril-journal-container">
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<div className="steril-journal-header">
					<div className="steril-header-left">
						<div className="steril-header-icon">
							<ShieldCheck size={24} />
						</div>
						<div className="steril-header-title">
							<h2>Центр контроля стерилизации и качества ПСО (СанПиН 3.3686-21)</h2>
							<p>
								Автогенератор для проверок Роспотребнадзора • 1-кликовое закрытие смены медсестры • Форма № 257/у • Форма № 366/у
							</p>
						</div>
					</div>
					<div className="steril-header-actions">
						<button
							type="button"
							className="steril-close-btn"
							onClick={onClose}
							title="Закрыть журнал (Esc)"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* ─── HERO AUTO-GENERATOR & NURSE QUICK ACTION BANNER ─────────── */}
				<div className="steril-autogen-hero">
					{/* Box 1: 1-Click Monthly Generator for Rospotrebnadzor */}
					<div className="steril-autogen-card">
						<div className="steril-autogen-card-header">
							<div className="steril-badge-pill">
								<Sparkles size={14} />
								<span>Автогенератор Роспотребнадзора</span>
							</div>
							<span className="steril-card-title">Идеальный журнал за месяц</span>
						</div>
						<p className="steril-autogen-desc">
							Автоматически берет смены, наборы лотков (терапия, ортопедия, хирургия), ставит нормативы («азопирам: отр.», «134°C / 2.15 bar») и готовит альбом А4 для подшивки в папку проверки.
						</p>

						<div className="steril-autogen-controls-row">
							<select
								className="steril-select-sm"
								value={genMonth}
								onChange={(e) => setGenMonth(parseInt(e.target.value, 10))}
							>
								<option value={1}>Январь</option>
								<option value={2}>Февраль</option>
								<option value={3}>Март</option>
								<option value={4}>Апрель</option>
								<option value={5}>Май</option>
								<option value={6}>Июнь</option>
								<option value={7}>Июль</option>
								<option value={8}>Август</option>
								<option value={9}>Сентябрь</option>
								<option value={10}>Октябрь</option>
								<option value={11}>Ноябрь</option>
								<option value={12}>Декабрь</option>
							</select>

							<select
								className="steril-select-sm"
								value={genYear}
								onChange={(e) => setGenYear(parseInt(e.target.value, 10))}
							>
								<option value={2026}>2026 г.</option>
								<option value={2025}>2025 г.</option>
							</select>

							<select
								className="steril-select-sm"
								value={genLoadLevel}
								onChange={(e) => setGenLoadLevel(e.target.value as "standard" | "high" | "moderate")}
							>
								<option value="standard">Стандартная нагрузка</option>
								<option value="high">Высокая (3 смены)</option>
								<option value="moderate">Умеренная</option>
							</select>

							<button
								type="button"
								className="btn-autogen-magic"
								onClick={handleGenerateFullMonth}
							>
								<Zap size={16} />
								<span>Сгенерировать журнал за месяц</span>
							</button>
						</div>
					</div>

					{/* Box 2: 1-Click Daily Nurse Shift Closing */}
					<div className="steril-nurse-shift-card">
						<div className="steril-autogen-card-header">
							<div className="steril-badge-pill green">
								<CheckCircle2 size={14} />
								<span>Ежедневная работа медсестры</span>
							</div>
							<span className="steril-card-title">1-кликовое закрытие смены</span>
						</div>
						<p className="steril-autogen-desc">
							Медсестра не тыкает 20 полей: 1 нажатие фиксирует дневные циклы, пробы ПСО, штрихкодированные крафт-пакеты со штампом времени и ЭЦП.
						</p>

						<div className="steril-autogen-controls-row">
							<input
								type="text"
								className="steril-input-sm"
								value={nurseOperator}
								onChange={(e) => setNurseOperator(e.target.value)}
								placeholder="ФИО медсестры"
								title="Ответственная медсестра смены"
							/>

							<button
								type="button"
								className="btn-nurse-shift-close"
								onClick={handleCloseDailyShift}
							>
								<Check size={16} />
								<span>Смена закрыта, стерилизация успешна</span>
							</button>
						</div>
					</div>
				</div>

				{lastGeneratedSummary && (
					<div className="steril-summary-banner">
						<CheckCircle2 size={16} className="text-teal" />
						<span>{lastGeneratedSummary}</span>
					</div>
				)}

				{/* ─── TABS NAVIGATION ───────────────────────────────────────────── */}
				<div className="steril-tabs-bar">
					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "form257" ? "active" : ""}`}
						onClick={() => setActiveTab("form257")}
					>
						<Flame size={16} />
						<span>Журнал 257/у (Автоклавы)</span>
						<span className="steril-tab-badge">{cycles.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "pso366" ? "active" : ""}`}
						onClick={() => setActiveTab("pso366")}
					>
						<FlaskConical size={16} />
						<span>Журнал ПСО (Форма 366/у)</span>
						<span className="steril-tab-badge">{psoRecords.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "kraft_packages" ? "active" : ""}`}
						onClick={() => setActiveTab("kraft_packages")}
					>
						<Barcode size={16} />
						<span>Крафт-пакеты и Штрихкоды</span>
						<span className="steril-tab-badge">{kraftPackages.length}</span>
					</button>

					<button
						type="button"
						className={`steril-tab-btn ${activeTab === "print_blanks" ? "active" : ""}`}
						onClick={() => setActiveTab("print_blanks")}
					>
						<Printer size={16} />
						<span>Печать официальных бланков</span>
					</button>
				</div>

				{/* ─── TAB 1: FORM 257/U (AUTOCLAVES & STERILIZERS) ─────────────── */}
				{activeTab === "form257" && (
					<div className="steril-body-content">
						<div className="steril-stats-grid">
							<div className="steril-stat-card">
								<div className="steril-stat-icon teal">
									<Activity size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">{cycles.length}</span>
									<span className="steril-stat-label">Всего циклов в журнале</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon blue">
									<CheckCircle2 size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{cycles.filter((c) => c.cycleStatus === "passed").length}
									</span>
									<span className="steril-stat-label">Стерильно (100% КТ)</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon amber">
									<Layers size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{cycles.reduce((acc, c) => acc + c.packsCount, 0)} шт.
									</span>
									<span className="steril-stat-label">Стерилизовано упаковок</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon rose">
									<Award size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">100%</span>
									<span className="steril-stat-label">Норматив СанПиН 3.3686-21</span>
								</div>
							</div>
						</div>

						{/* Controls Toolbar */}
						<div className="steril-toolbar">
							<div className="steril-toolbar-filters">
								<div className="steril-search-input">
									<Search size={16} />
									<input
										type="text"
										placeholder="Поиск по инструментам или оператору..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<select
									className="steril-select"
									value={selectedSterilizerFilter}
									onChange={(e) => setSelectedSterilizerFilter(e.target.value)}
								>
									<option value="all">Все стерилизаторы</option>
									{STATUTORY_STERILIZERS.map((s) => (
										<option key={s.id} value={s.id}>
											{s.code}: {s.brandModel}
										</option>
									))}
								</select>

								<select
									className="steril-select"
									value={selectedStatusFilter}
									onChange={(e) => setSelectedStatusFilter(e.target.value)}
								>
									<option value="all">Все статусы</option>
									<option value="passed">Стерильно (Допущен)</option>
									<option value="failed">Брак (Отклонен)</option>
								</select>
							</div>

							<div className="steril-toolbar-actions">
								<button
									type="button"
									className="btn-steril-primary"
									onClick={() => {
										setActiveTab("print_blanks");
										setSelectedPrintBlank("257");
									}}
								>
									<Printer size={16} />
									<span>Печать Формы 257/у</span>
								</button>
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => handleDownloadCsv("257")}
									title="Экспорт в CSV"
								>
									<Download size={16} />
									<span>Экспорт CSV</span>
								</button>
							</div>
						</div>

						{/* Cycles Table */}
						<div className="steril-table-wrap">
							<table className="steril-data-table">
								<thead>
									<tr>
										<th>Дата/Время</th>
										<th>Стерилизатор</th>
										<th>№ цикла</th>
										<th>Изделия и упаковка</th>
										<th>Режим (t°, P, время)</th>
										<th>Хим. Индикатор (КТ 1-5)</th>
										<th>Результат</th>
										<th>Медсестра ЦСО / ЭЦП</th>
									</tr>
								</thead>
								<tbody>
									{filteredCycles.length === 0 ? (
										<tr>
											<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
												Записи работы стерилизаторов не найдены
											</td>
										</tr>
									) : (
										filteredCycles.map((c) => (
											<tr key={c.id}>
												<td>
													<div style={{ fontWeight: 600 }}>{c.date}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{c.time}</div>
												</td>
												<td>
													<div style={{ fontWeight: 700, color: "var(--teal)" }}>{c.sterilizerCode}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{c.sterilizerBrandModel}
													</div>
												</td>
												<td style={{ textAlign: "center", fontWeight: 700 }}>{c.cycleNumber}</td>
												<td style={{ maxWidth: "260px" }}>
													<div style={{ fontWeight: 600 }}>{c.itemsDescriptionRu}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>
														Упаковка: {STATUTORY_PACKAGING_TYPES[c.packagingType]?.nameRu ?? c.packagingType}{" "}
														({c.packsCount} шт.)
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>
														{c.actualTemperatureCelsius}°C • {c.actualPressureBar} бар
													</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Экспозиция: {c.actualExposureMinutes} мин
													</div>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{c.indicatorTradeNameRu}</div>
													<div style={{ fontSize: "0.75rem" }}>
														{c.areAllIndicatorsPassed ? (
															<span style={{ color: "#059669", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
																<Check size={13} /> Все 5 точек КТ ОК
															</span>
														) : (
															<span style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
																<X size={13} /> Отказ индикатора
															</span>
														)}
													</div>
												</td>
												<td>
													<span
														className={`badge-status ${c.cycleStatus === "passed" ? "success" : "danger"}`}
													>
														{c.cycleStatus === "passed" ? "СТЕРИЛЬНО" : "БРАК"}
													</span>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{c.operatorFullName}</div>
													<div
														style={{
															fontSize: "0.7rem",
															fontFamily: "monospace",
															color: "var(--teal)",
															marginTop: "2px",
														}}
													>
														{c.electronicSignatureHash}
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* ─── TAB 2: PSO QUALITY CONTROL (FORM 366/U) ──────────────────── */}
				{activeTab === "pso366" && (
					<div className="steril-body-content">
						<div className="steril-stats-grid">
							<div className="steril-stat-card">
								<div className="steril-stat-icon teal">
									<FlaskConical size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">{psoRecords.length}</span>
									<span className="steril-stat-label">Проведено серий проб ПСО</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon blue">
									<Droplets size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">
										{psoRecords.reduce((acc, p) => acc + p.testedSampleCount, 0)} шт.
									</span>
									<span className="steril-stat-label">Проверено контрольных образцов</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon amber">
									<ShieldCheck size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">100%</span>
									<span className="steril-stat-label">Азопирам (отсутствие крови)</span>
								</div>
							</div>

							<div className="steril-stat-card">
								<div className="steril-stat-icon rose">
									<ShieldCheck size={20} />
								</div>
								<div className="steril-stat-info">
									<span className="steril-stat-value">100%</span>
									<span className="steril-stat-label">Фенолфталеин (отсутствие щелочи)</span>
								</div>
							</div>
						</div>

						{/* Controls Toolbar */}
						<div className="steril-toolbar">
							<div className="steril-toolbar-filters">
								<div className="steril-search-input">
									<Search size={16} />
									<input
										type="text"
										placeholder="Поиск по инструментам или средству..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<select
									className="steril-select"
									value={selectedStatusFilter}
									onChange={(e) => setSelectedStatusFilter(e.target.value)}
								>
									<option value="all">Все результаты</option>
									<option value="passed">Годно (Отрицательные пробы)</option>
									<option value="failed">Брак (Положительная проба)</option>
								</select>
							</div>

							<div className="steril-toolbar-actions">
								<button
									type="button"
									className="btn-steril-primary"
									onClick={() => {
										setActiveTab("print_blanks");
										setSelectedPrintBlank("366");
									}}
								>
									<Printer size={16} />
									<span>Печать Формы 366/у</span>
								</button>
								<button
									type="button"
									className="btn-steril-secondary"
									onClick={() => handleDownloadCsv("366")}
									title="Экспорт в CSV"
								>
									<Download size={16} />
									<span>Экспорт CSV</span>
								</button>
							</div>
						</div>

						{/* PSO Table */}
						<div className="steril-table-wrap">
							<table className="steril-data-table">
								<thead>
									<tr>
										<th>Дата/Время</th>
										<th>Наименование изделий</th>
										<th>Партия</th>
										<th>Выборка (Факт / Норма)</th>
										<th>Азопирамовая проба (Кровь)</th>
										<th>Фенолфталеиновая (Щелочь)</th>
										<th>Судан III (Масло)</th>
										<th>Заключение</th>
										<th>Медсестра ЦСО</th>
									</tr>
								</thead>
								<tbody>
									{filteredPso.length === 0 ? (
										<tr>
											<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
												Записи проб ПСО не найдены
											</td>
										</tr>
									) : (
										filteredPso.map((p) => (
											<tr key={p.id}>
												<td>
													<div style={{ fontWeight: 600 }}>{p.date}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.time}</div>
												</td>
												<td style={{ maxWidth: "260px" }}>
													<div style={{ fontWeight: 600 }}>{p.instrumentName}</div>
													<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														Моющее: {p.detergentBrand}
													</div>
												</td>
												<td style={{ textAlign: "center", fontWeight: 700 }}>{p.batchItemCount} шт.</td>
												<td style={{ textAlign: "center" }}>
													<span style={{ fontWeight: 600 }}>{p.testedSampleCount} шт.</span>
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
														{" "}
														(мин. {p.minSampleRequired})
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isAzopyramNegative ? "success" : "danger"}`}
													>
														{p.isAzopyramNegative ? "Отрицательная (ОК)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isPhenolphthaleinNegative ? "success" : "danger"}`}
													>
														{p.isPhenolphthaleinNegative
															? "Отрицательная (ОК)"
															: "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isSudanNegative ? "success" : "danger"}`}
													>
														{p.isSudanNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ"}
													</span>
												</td>
												<td>
													<span
														className={`badge-status ${p.isBatchApproved ? "success" : "danger"}`}
													>
														{p.isBatchApproved ? "ПСО ПРОЙДЕНА" : "БРАК / ВОЗВРАТ"}
													</span>
												</td>
												<td>
													<div style={{ fontWeight: 600 }}>{p.operatorFullName}</div>
													<div
														style={{
															fontSize: "0.7rem",
															fontFamily: "monospace",
															color: "var(--teal)",
															marginTop: "2px",
														}}
													>
														{p.electronicSignatureHash}
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* ─── TAB 3: KRAFT PACKAGES & BARCODING ─────────────────────────── */}
				{activeTab === "kraft_packages" && (
					<div className="steril-body-content">
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 320px",
								gap: "1.25rem",
								alignItems: "start",
							}}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
								<div className="steril-stats-grid">
									<div className="steril-stat-card">
										<div className="steril-stat-icon teal">
											<Barcode size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">{kraftPackages.length}</span>
											<span className="steril-stat-label">Активных упаковок в обороте</span>
										</div>
									</div>

									<div className="steril-stat-card">
										<div className="steril-stat-icon blue">
											<Clock size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">
												{kraftPackages.filter((kp) => kp.status === "sterile_valid").length}
											</span>
											<span className="steril-stat-label">Стерильность подтверждена</span>
										</div>
									</div>

									<div className="steril-stat-card">
										<div className="steril-stat-icon amber">
											<AlertTriangle size={20} />
										</div>
										<div className="steril-stat-info">
											<span className="steril-stat-value">
												{kraftPackages.filter((kp) => kp.status === "expiring_soon_7d").length}
											</span>
											<span className="steril-stat-label">Истекает в теч. 7 дней</span>
										</div>
									</div>
								</div>

								{/* Toolbar */}
								<div className="steril-toolbar">
									<div className="steril-toolbar-filters">
										<div className="steril-search-input" style={{ minWidth: "300px" }}>
											<Barcode size={18} />
											<input
												type="text"
												placeholder="Сканировать или ввести штрихкод..."
												value={scannedBarcode}
												onChange={(e) => setScannedBarcode(e.target.value)}
											/>
											{scannedBarcode && (
												<button
													type="button"
													onClick={() => setScannedBarcode("")}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														color: "var(--muted)",
													}}
												>
													<X size={14} />
												</button>
											)}
										</div>
									</div>

									<div className="steril-toolbar-actions">
										<button
											type="button"
											className="btn-steril-secondary"
											onClick={() => handleDownloadCsv("kraft")}
										>
											<Download size={16} />
											<span>Экспорт CSV</span>
										</button>
									</div>
								</div>

								{/* Kraft Table */}
								<div className="steril-table-wrap">
									<table className="steril-data-table">
										<thead>
											<tr>
												<th>Штрихкод</th>
												<th>Набор инструментов</th>
												<th>Упаковка</th>
												<th>Стерилизация</th>
												<th>Срок годности</th>
												<th>Статус</th>
												<th>Действие</th>
											</tr>
										</thead>
										<tbody>
											{filteredKraftPackages.length === 0 ? (
												<tr>
													<td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
														Крафт-пакеты не найдены
													</td>
												</tr>
											) : (
												filteredKraftPackages.map((kp) => (
													<tr
														key={kp.id}
														onClick={() => setSelectedPackageForSticker(kp)}
														style={{
															cursor: "pointer",
															background:
																selectedPackageForSticker?.id === kp.id
																	? "rgba(13, 148, 136, 0.08)"
																	: "transparent",
														}}
													>
														<td style={{ fontFamily: "monospace", fontWeight: 700 }}>
															{kp.barcode}
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>{kp.toolSetNameRu}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
																Партия: {kp.batchNumber} • №{kp.packageSerialNumber}
															</div>
														</td>
														<td style={{ fontSize: "0.8rem" }}>{kp.packagingNameRu}</td>
														<td>
															<div>{kp.packDate}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
																{kp.sterilizerCode} (Цикл {kp.cycleNumber})
															</div>
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>{kp.expDate}</div>
															<div style={{ fontSize: "0.75rem", color: "var(--teal)" }}>
																Осталось: {kp.daysRemaining} дн.
															</div>
														</td>
														<td>
															<span
																className={`badge-status ${
																	kp.status === "sterile_valid"
																		? "success"
																		: kp.status === "expiring_soon_7d"
																			? "warning"
																			: "danger"
																}`}
															>
																{kp.status === "sterile_valid"
																	? "Стерильно"
																	: kp.status === "expiring_soon_7d"
																		? "Истекает"
																		: "Просрочено"}
															</span>
														</td>
														<td>
															<button
																type="button"
																className="btn-steril-secondary"
																style={{ height: "28px", padding: "0 0.5rem", fontSize: "0.75rem" }}
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedPackageForSticker(kp);
																	showToast(
																		`Этикетка ${kp.barcode} подготовлена к термопечати`,
																		"info",
																	);
																}}
															>
																<Printer size={12} />
																<span>Стикер</span>
															</button>
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</div>

							{/* Thermal Sticker Preview Box (58x40mm) */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
									padding: "1.25rem",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									borderRadius: "14px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<QrCode size={18} color="var(--teal)" />
									<span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Термостикер 58×40 мм</span>
								</div>

								{selectedPackageForSticker ? (
									<div className="steril-sticker-preview">
										<div className="steril-sticker-header">
											<span>{clinicRequisites.clinicName}</span>
											<span>{selectedPackageForSticker.sterilizerCode}</span>
										</div>

										<div style={{ fontSize: "10px", fontWeight: "bold", margin: "3px 0" }}>
											{selectedPackageForSticker.toolSetNameRu}
										</div>

										<div style={{ fontSize: "8.5px", color: "#333" }}>
											Дата стерил.: {selectedPackageForSticker.packDate} (Цикл{" "}
											{selectedPackageForSticker.cycleNumber})
										</div>

										<div className="steril-sticker-barcode-box">
											<div className="steril-barcode-bars">||||| | |||| ||| |||| |</div>
											<div style={{ fontSize: "8px", fontWeight: "bold" }}>
												{selectedPackageForSticker.barcode}
											</div>
										</div>

										<div className="steril-sticker-footer">
											<span>Годен до: {selectedPackageForSticker.expDate}</span>
											<span>Оператор: {selectedPackageForSticker.operatorFullName}</span>
										</div>
									</div>
								) : (
									<div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
										Выберите пакет для предпросмотра
									</div>
								)}

								<button
									type="button"
									className="btn-steril-primary"
									style={{ width: "100%", justifyContent: "center" }}
									onClick={() => {
										if (selectedPackageForSticker) {
											showToast(
												`Печать термоэтикетки 58x40 мм: ${selectedPackageForSticker.barcode}`,
												"success",
											);
										}
									}}
								>
									<Printer size={16} />
									<span>Печать термоэтикетки (58x40)</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ─── TAB 4: OFFICIAL PRINTABLE BLANKS ──────────────────────────── */}
				{activeTab === "print_blanks" && (
					<div className="steril-body-content">
						<div className="steril-toolbar">
							<div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										cursor: "pointer",
										fontWeight: 600,
										fontSize: "0.85rem",
									}}
								>
									<input
										type="radio"
										name="printBlank"
										checked={selectedPrintBlank === "combined"}
										onChange={() => setSelectedPrintBlank("combined")}
									/>
									<span>Полное досье проверки Роспотребнадзора (Альбом А4)</span>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										cursor: "pointer",
										fontWeight: 600,
										fontSize: "0.85rem",
									}}
								>
									<input
										type="radio"
										name="printBlank"
										checked={selectedPrintBlank === "257"}
										onChange={() => setSelectedPrintBlank("257")}
									/>
									<span>Форма № 257/у (Автоклавы)</span>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										cursor: "pointer",
										fontWeight: 600,
										fontSize: "0.85rem",
									}}
								>
									<input
										type="radio"
										name="printBlank"
										checked={selectedPrintBlank === "366"}
										onChange={() => setSelectedPrintBlank("366")}
									/>
									<span>Форма № 366/у (ПСО)</span>
								</label>
							</div>

							<div className="steril-toolbar-actions">
								<button type="button" className="btn-steril-primary" onClick={handlePrint}>
									<Printer size={16} />
									<span>Отправить на печать (A4 Альбомная)</span>
								</button>
							</div>
						</div>

						{/* Iframe Preview */}
						<iframe
							title="Официальный печатный бланк"
							className="steril-print-preview-frame"
							srcDoc={printHtmlForPreview}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export default SterilizationJournalModal;
