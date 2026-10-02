/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — REGISTRY & JOURNAL TAB
 * Официальный реестр формы № 257/у, фильтрация, печать А4 альбомная и экспорт CSV.
 * ============================================================================
 */

import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Download,
	FileBadge,
	FileSpreadsheet,
	Filter,
	Plus,
	Printer,
	Search,
	Trash2,
	UserCheck,
	XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Autoclave, DentalForm043 } from "../../icons/DentalIcons";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	createDefault5ChamberPoints,
	createForm257Record,
	detectMissingSterilizationDays,
	exportForm257ToCsv,
	filterForm257Records,
	generateBatchForm257Records,
	generateForm257PrintHtml,
	generateRegulatorySanpinInspectionHtml,
	type ClinicLegalInfo,
	type Form257FilterCriteria,
	type Form257Record,
	type MissingSterilizationDaysAuditResult,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type SterilizationRegimeId,
} from "./autoclaveLogPresets.js";

export interface AutoclaveJournal257TabProps {
	readonly records: readonly Form257Record[];
	readonly activeClinicalDates?: readonly string[];
	readonly onDeleteRecord?: (id: string) => void;
	readonly onVerifyRecord?: (id: string, headNurseName: string) => void;
	readonly onBatchAddRecords?: (records: Form257Record[]) => void;
	readonly onOpenNewCycle?: () => void;
	readonly clinicInfo?: ClinicLegalInfo;
}

export function AutoclaveJournal257Tab({
	records,
	activeClinicalDates,
	onDeleteRecord,
	onVerifyRecord,
	onBatchAddRecords,
	onOpenNewCycle,
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveJournal257TabProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedSterilizerId, setSelectedSterilizerId] = useState<string>("all");
	const [selectedRegimeId, setSelectedRegimeId] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<"all" | "sterile_passed" | "rejected_defect">("all");
	const [periodPreset, setPeriodPreset] = useState<string>("all");
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");

	const filterCriteria: Form257FilterCriteria = useMemo(
		() => ({
			searchQuery: searchQuery || undefined,
			sterilizerId: selectedSterilizerId !== "all" ? selectedSterilizerId : undefined,
			regimeId: selectedRegimeId !== "all" ? (selectedRegimeId as SterilizationRegimeId) : undefined,
			status: selectedStatus !== "all" ? selectedStatus : undefined,
			startDate: startDate || undefined,
			endDate: endDate || undefined,
		}),
		[searchQuery, selectedSterilizerId, selectedRegimeId, selectedStatus, startDate, endDate],
	);

	const filteredRecords = useMemo(
		() => filterForm257Records(records, filterCriteria),
		[records, filterCriteria],
	);

	// Экспорт в CSV
	const handleExportCsv = () => {
		const csvContent = exportForm257ToCsv(filteredRecords);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Journal_Form_257u_${new Date().toISOString().split("T")[0]}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const getDynamicDateBounds = () => {
		const now = new Date();
		const currentY = now.getFullYear();
		const currentM = now.getMonth();
		const pad = (n: number) => String(n).padStart(2, "0");
		const daysInCurMonth = new Date(currentY, currentM + 1, 0).getDate();
		return {
			now,
			currentY,
			currentM,
			pad,
			today: `${currentY}-${pad(currentM + 1)}-${pad(now.getDate())}`,
			currentMonthStart: `${currentY}-${pad(currentM + 1)}-01`,
			currentMonthEnd: `${currentY}-${pad(currentM + 1)}-${pad(daysInCurMonth)}`,
			currentMonthNameRu: now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
		};
	};

	const handlePresetChange = (preset: string) => {
		setPeriodPreset(preset);
		const { now, currentY, currentM, pad, today, currentMonthStart, currentMonthEnd } =
			getDynamicDateBounds();

		if (preset === "all") {
			setStartDate("");
			setEndDate("");
		} else if (preset === "today") {
			setStartDate(today);
			setEndDate(today);
		} else if (preset === "week") {
			const dayOfWeek = now.getDay();
			const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(now);
			monday.setDate(now.getDate() + diffToMonday);
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			setStartDate(
				`${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
			);
			setEndDate(
				`${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`,
			);
		} else if (preset === "current_month" || preset === "sep_2026") {
			setStartDate(currentMonthStart);
			setEndDate(currentMonthEnd);
		} else if (preset === "prev_month" || preset === "aug_2026") {
			const prevMonthDate = new Date(currentY, currentM - 1, 1);
			const prevY = prevMonthDate.getFullYear();
			const prevM = prevMonthDate.getMonth();
			const daysInPrevMonth = new Date(prevY, prevM + 1, 0).getDate();
			setStartDate(`${prevY}-${pad(prevM + 1)}-01`);
			setEndDate(`${prevY}-${pad(prevM + 1)}-${pad(daysInPrevMonth)}`);
		} else if (preset === "current_quarter" || preset === "q3_2026") {
			const quarterStartMonth = Math.floor(currentM / 3) * 3;
			const quarterEndMonth = quarterStartMonth + 2;
			const daysInQEnd = new Date(currentY, quarterEndMonth + 1, 0).getDate();
			setStartDate(`${currentY}-${pad(quarterStartMonth + 1)}-01`);
			setEndDate(`${currentY}-${pad(quarterEndMonth + 1)}-${pad(daysInQEnd)}`);
		}
	};

	const periodLabel = useMemo(() => {
		if (startDate && endDate) {
			if (startDate === endDate) return `за ${startDate}`;
			return `с ${startDate} по ${endDate}`;
		}
		if (startDate) return `с ${startDate}`;
		if (endDate) return `по ${endDate}`;
		return "за всё время";
	}, [startDate, endDate]);

	// Пакетная генерация циклов Формы 257/у за выбранный период или точечно по пропущенным датам
	const handleGenerateBatchForPeriod = () => {
		const targetDates =
			missingDaysAudit?.missingDates && missingDaysAudit.missingDates.length > 0
				? missingDaysAudit.missingDates
				: undefined;

		const { currentMonthStart, currentMonthEnd } = getDynamicDateBounds();
		const start = startDate || currentMonthStart;
		const end = endDate || currentMonthEnd;
		const generated = generateBatchForm257Records({
			startDate: targetDates ? undefined : start,
			endDate: targetDates ? undefined : end,
			targetDates,
			excludeSundays: targetDates ? false : true,
			cyclesPerDay: 2,
			packsPerCycle: 14,
			sterilizerId:
				selectedSterilizerId !== "all"
					? selectedSterilizerId
					: "autoclave-melag-vacuklav-23b",
			operatorStaffFullName: clinicInfo.headNurse || "Сотрудник ЦСО / Врач",
			headNurseSignatureFullName: clinicInfo.chiefDoctor || "Ответственный по СанПиН",
			isHeadNurseVerified: true,
		});

		if (onBatchAddRecords) {
			onBatchAddRecords(generated);
		}
		if (!startDate || !endDate) {
			setStartDate(start);
			setEndDate(end);
			setPeriodPreset("current_month");
		}
	};

	// 1-Клик: Генерация и печать Формы 257/у за текущий месяц
	const handleGenerateMonthlyForm257 = () => {
		const { currentMonthStart, currentMonthEnd, currentMonthNameRu } = getDynamicDateBounds();

		const generatedRecords = generateBatchForm257Records({
			startDate: currentMonthStart,
			endDate: currentMonthEnd,
			excludeSundays: true,
			cyclesPerDay: 2,
			packsPerCycle: 14,
			sterilizerId:
				selectedSterilizerId !== "all"
					? selectedSterilizerId
					: "autoclave-melag-vacuklav-23b",
			operatorStaffFullName: clinicInfo.headNurse || "Сотрудник ЦСО / Врач",
			headNurseSignatureFullName: clinicInfo.chiefDoctor || "Ответственный по СанПиН",
			isHeadNurseVerified: true,
		});

		if (onBatchAddRecords) {
			onBatchAddRecords(generatedRecords);
		}
		setStartDate(currentMonthStart);
		setEndDate(currentMonthEnd);
		setPeriodPreset("current_month");

		const printHtml = generateForm257PrintHtml(
			generatedRecords,
			clinicInfo,
			`за ${currentMonthNameRu}`,
		);

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Печать официальной Формы 257/у
	const handlePrintJournal = () => {
		const printHtml = generateForm257PrintHtml(
			filteredRecords.length > 0 ? filteredRecords : records,
			clinicInfo,
			periodLabel,
		);
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// 1-Клик: Нормативная выгрузка СанПиН 3.3686-21 (Формы 257/у и 366/у) для проверок Роспотребнадзора
	const handleGenerateRegulatorySanpinInspection = () => {
		const printHtml = generateRegulatorySanpinInspectionHtml({
			form257Records: filteredRecords.length > 0 ? filteredRecords : records,
			clinicInfo,
			periodLabelRu: periodLabel,
		});
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Аудит непрерывности журнала стерилизации по СанПиН 3.3686-21
	const missingDaysAudit: MissingSterilizationDaysAuditResult | null = useMemo(() => {
		if (activeClinicalDates && activeClinicalDates.length > 0) {
			return detectMissingSterilizationDays(records, activeClinicalDates);
		}
		if (startDate && endDate && startDate !== endDate) {
			const dates: string[] = [];
			const [sY, sM, sD] = startDate.split("-").map(Number);
			const [eY, eM, eD] = endDate.split("-").map(Number);
			if (sY && sM && sD && eY && eM && eD) {
				const startUtc = Date.UTC(sY, sM - 1, sD);
				const endUtc = Date.UTC(eY, eM - 1, eD);
				for (let t = startUtc; t <= endUtc; t += 86400000) {
					const d = new Date(t);
					if (d.getUTCDay() !== 0) {
						dates.push(d.toISOString().slice(0, 10));
					}
				}
			}
			if (dates.length > 0) {
				return detectMissingSterilizationDays(records, dates);
			}
		}
		return null;
	}, [records, activeClinicalDates, startDate, endDate]);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{/* Senior Nurse Warning Banner: Missing Sterilization Days */}
			{missingDaysAudit?.isMissingAutoclaveLog && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "rgba(239, 68, 68, 0.08)",
						border: "1px solid rgba(239, 68, 68, 0.3)",
						borderRadius: "8px",
						padding: "0.75rem 1rem",
						gap: "1rem",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
						<div>
							<div style={{ fontWeight: 600, color: "#991b1b", fontSize: "0.875rem" }}>
								Внимание: за смену были приемы пациентов, но цикл автоклавирования не зарегистрирован
							</div>
							<div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "2px" }}>
								{missingDaysAudit.recommendationRu}
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={handleGenerateBatchForPeriod}
						className="autoclave-btn-primary"
						style={{ minHeight: "36px", whiteSpace: "nowrap", flexShrink: 0, padding: "0 0.875rem" }}
					>
						<Autoclave size={16} />
						<span>Заполнить автоклав в 1 клик</span>
					</button>
				</div>
			)}

			{/* Top Action Bar & Filter Controls */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
					background: "var(--paper-strong, #f8fafc)",
					padding: "0.875rem",
					borderRadius: "10px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				{/* Row 1: Search and Primary Filters */}
				<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
					<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", flex: 1 }}>
						{/* Search input */}
						<div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
							<input
								type="text"
								placeholder="Поиск по изделиям, ID, сотруднику..."
								className="autoclave-input"
								style={{ paddingLeft: "2.25rem", width: "100%", minHeight: "40px" }}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search
								size={16}
								color="var(--muted, #64748b)"
								style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
							/>
						</div>

						{/* Sterilizer Filter */}
						<select
							className="autoclave-select"
							style={{ minHeight: "40px" }}
							value={selectedSterilizerId}
							onChange={(e) => setSelectedSterilizerId(e.target.value)}
						>
							<option value="all">Все аппараты ЦСО</option>
							{STATUTORY_STERILIZERS_CATALOG.map((st) => (
								<option key={st.id} value={st.id}>
									{st.code} — {st.brand}
								</option>
							))}
						</select>

						{/* Regime Filter */}
						<select
							className="autoclave-select"
							style={{ minHeight: "40px" }}
							value={selectedRegimeId}
							onChange={(e) => setSelectedRegimeId(e.target.value)}
						>
							<option value="all">Все режимы</option>
							{STATUTORY_STERILIZATION_REGIMES.map((reg) => (
								<option key={reg.id} value={reg.id}>
									{reg.shortLabelRu}
								</option>
							))}
						</select>

						{/* Status Filter */}
						<select
							className="autoclave-select"
							style={{ minHeight: "40px" }}
							value={selectedStatus}
							onChange={(e) => setSelectedStatus(e.target.value as any)}
						>
							<option value="all">Все статусы</option>
							<option value="sterile_passed">Стерильно</option>
							<option value="rejected_defect">Брак</option>
						</select>
					</div>

					{/* Export and Print Buttons */}
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={handleGenerateRegulatorySanpinInspection}
							className="autoclave-btn"
							style={{
								minHeight: "40px",
								padding: "0.5rem 1rem",
								fontWeight: 800,
								background: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
								color: "#fff",
								border: "none",
								boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
							}}
							title="1-клик формирование журналов стерилизации и проверок качества для проверок"
							data-testid="journal-tab-regulatory-export-btn"
						>
							<FileBadge size={16} />
							<span>Выгрузка журналов для проверки</span>
						</button>

						<button
							type="button"
							onClick={handleGenerateMonthlyForm257}
							className="autoclave-btn autoclave-btn-secondary"
							style={{
								minHeight: "40px",
								padding: "0.5rem 0.875rem",
								fontWeight: 600,
							}}
							title="Автоматическое формирование и печать журнала стерилизаторов за текущий месяц"
							data-testid="journal-tab-generate-monthly-form257-btn"
						>
							<DentalForm043 size={16} color="var(--teal, #0d9488)" />
							<span>Журнал за месяц</span>
						</button>

						<button
							type="button"
							onClick={handleExportCsv}
							className="autoclave-btn autoclave-btn-secondary"
							style={{ minHeight: "40px", padding: "0.5rem 0.875rem" }}
							title="Экспорт в CSV с UTF-8 BOM"
						>
							<FileSpreadsheet size={16} color="var(--teal, #0d9488)" />
							Экспорт CSV
						</button>

						<button
							type="button"
							onClick={handlePrintJournal}
							className="autoclave-btn autoclave-btn-primary"
							style={{ minHeight: "40px", padding: "0.5rem 1rem" }}
						>
							<Printer size={16} />
							Печать журнала автоклава (А4)
						</button>
					</div>
				</div>

				{/* Row 2: Period Selection & Batch Generation Toolbar */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "space-between",
						alignItems: "center",
						gap: "0.5rem",
						paddingTop: "0.5rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
							<Calendar size={16} color="var(--teal, #0d9488)" />
							<span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Период:
							</span>
							<select
								className="autoclave-select"
								style={{ minHeight: "36px", fontSize: "0.8125rem" }}
								value={periodPreset}
								onChange={(e) => handlePresetChange(e.target.value)}
								data-testid="journal-tab-period-preset-select"
							>
								<option value="all">За всё время</option>
								<option value="current_month">Текущий месяц</option>
								<option value="today">Сегодня</option>
								<option value="week">Текущая неделя</option>
								<option value="prev_month">Прошлый месяц</option>
								<option value="current_quarter">Текущий квартал</option>
								<option value="custom">Произвольные даты</option>
							</select>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
							<input
								type="date"
								className="autoclave-input"
								style={{ minHeight: "36px", fontSize: "0.8125rem", width: "135px" }}
								value={startDate}
								onChange={(e) => {
									setStartDate(e.target.value);
									setPeriodPreset("custom");
								}}
								data-testid="journal-tab-start-date-input"
								title="Дата начала периода"
							/>
							<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>—</span>
							<input
								type="date"
								className="autoclave-input"
								style={{ minHeight: "36px", fontSize: "0.8125rem", width: "135px" }}
								value={endDate}
								onChange={(e) => {
									setEndDate(e.target.value);
									setPeriodPreset("custom");
								}}
								data-testid="journal-tab-end-date-input"
								title="Дата окончания периода"
							/>
						</div>

						<button
							type="button"
							onClick={handleGenerateBatchForPeriod}
							className="autoclave-btn autoclave-btn-secondary"
							style={{
								minHeight: "36px",
								padding: "0.45rem 0.875rem",
								fontWeight: 600,
								fontSize: "0.8125rem",
							}}
							title="Пакетно сформировать циклы стерилизации (134°C 2.1 бар 5 мин / 20 мин, 5 точек КТ) за выбранный период"
							data-testid="journal-tab-generate-batch-btn"
						>
							<Autoclave size={15} color="var(--teal, #0d9488)" />
							<span>Сформировать за период</span>
						</button>
					</div>

					<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
						Найдено записей: <strong>{filteredRecords.length}</strong> (всего {records.length})
					</div>
				</div>
			</div>

			{/* Form 257/u Records Table */}
			<div className="journal257-table-wrapper">
				{records.length === 0 ? (
					<div
						className="autoclave-empty-state"
						data-testid="autoclave-journal-empty-state"
						style={{
							padding: "3.5rem 1.5rem",
							textAlign: "center",
							color: "var(--muted, #64748b)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Autoclave size={48} style={{ opacity: 0.4, marginBottom: "0.75rem", color: "var(--teal, #0d9488)" }} />
						<div style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--ink, #0f172a)" }}>
							Журнал стерилизации пуст
						</div>
						<div style={{ fontSize: "0.875rem", marginTop: "0.375rem", maxWidth: "420px", lineHeight: 1.4 }}>
							В клинике пока не зарегистрировано ни одного цикла работы стерилизаторов.
						</div>
						{onOpenNewCycle && (
							<button
								type="button"
								onClick={onOpenNewCycle}
								className="autoclave-btn autoclave-btn-primary"
								style={{ marginTop: "1.25rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
								data-testid="btn-register-first-cycle"
							>
								<Plus size={16} />
								<span>Зарегистрировать первый цикл</span>
							</button>
						)}
					</div>
				) : filteredRecords.length === 0 ? (
					<div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
						<Autoclave size={40} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
						<div style={{ fontWeight: 600, fontSize: "1rem" }}>Записи не найдены</div>
						<div style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
							Попробуйте изменить параметры фильтрации или зарегистрируйте новый цикл.
						</div>
					</div>
				) : (
					<table className="journal257-table">
						<thead>
							<tr>
								<th>Дата / Цикл</th>
								<th>Аппарат</th>
								<th>Стерилизуемые изделия</th>
								<th>Упаковка / Кол-во</th>
								<th>Режим (T°, P, время)</th>
								<th>Хим. тест (5 точек)</th>
								<th>Результат</th>
								<th>Сотрудник ЦСО</th>
								<th>Контроль</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							{filteredRecords.map((rec) => {
								const ptPassedCount = rec.chamberPoints.filter((p) => p.status === "passed").length;
								return (
									<tr
										key={rec.id}
										className="sanpin-log-row"
										style={{
											minHeight: "44px",
											contentVisibility: "auto",
											containIntrinsicSize: "1px 44px",
											contain: "content",
										}}
									>
										<td>
											<div style={{ fontWeight: 700 }}>{rec.date}</div>
											<div style={{ fontSize: "0.75rem", color: "var(--teal, #0d9488)", fontWeight: 600 }}>
												Цикл #{rec.cycleNumber}
											</div>
											<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{rec.id}</div>
										</td>

										<td>
											<div style={{ fontWeight: 600 }}>{rec.sterilizerCode}</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
												{rec.sterilizerBrandModel}
											</div>
										</td>

										<td style={{ maxWidth: "260px" }}>
											<div style={{ fontWeight: 500, lineHeight: 1.3 }}>{rec.itemsDescriptionRu}</div>
										</td>

										<td>
											<div style={{ fontWeight: 600 }}>{rec.packsCount} упак.</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{rec.packagingNameRu}</div>
											{rec.bixNumber && (
												<div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--teal, #0d9488)" }}>
													{rec.bixNumber}
												</div>
											)}
										</td>

										<td>
											<div style={{ fontWeight: 600 }}>
												{rec.actualTemperatureCelsius}°C • {rec.actualPressureBar} бар
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
												Выдержка: {rec.actualExposureMinutes} мин
											</div>
										</td>

										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "2px" }}>
												{rec.chamberPoints.map((pt) => (
													<span
														key={pt.pointIndex}
														title={`${pt.code}: ${pt.status === "passed" ? "ОК" : "БРАК"}`}
														style={{
															width: "12px",
															height: "12px",
															borderRadius: "50%",
															background: pt.status === "passed" ? "#10b981" : "#ef4444",
															display: "inline-block",
														}}
													/>
												))}
											</div>
											<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
												{ptPassedCount}/5 точек ОК ({rec.chemicalIndicatorNameRu})
											</div>
										</td>

										<td>
											{rec.isCyclePassed ? (
												<span className="status-badge passed">
													<CheckCircle2 size={13} />
													СТЕРИЛЬНО
												</span>
											) : (
												<span className="status-badge failed">
													<XCircle size={13} />
													БРАК
												</span>
											)}
										</td>

										<td>
											<div style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{rec.operatorStaffFullName}</div>
											<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
												{rec.operatorStaffPosition}
											</div>
										</td>

										<td>
											{rec.isHeadNurseVerified ? (
												<span
													style={{
														fontSize: "0.75rem",
														color: "#059669",
														fontWeight: 600,
														display: "flex",
														alignItems: "center",
														gap: "0.25rem",
													}}
												>
													<UserCheck size={14} />
													Заверено
												</span>
											) : (
												<button
													type="button"
													onClick={() => onVerifyRecord?.(rec.id, clinicInfo.headNurse)}
													className="autoclave-btn autoclave-btn-secondary"
													style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", minHeight: "44px" }}
												>
													Заверить
												</button>
											)}
										</td>

										<td>
											{onDeleteRecord && (
												<button
													type="button"
													onClick={() => onDeleteRecord(rec.id)}
													className="autoclave-log-close-btn"
													title="Удалить запись"
													aria-label="Удалить запись"
													style={{ minWidth: "44px", minHeight: "44px", padding: "8px" }}
												>
													<Trash2 size={16} color="#ef4444" />
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
