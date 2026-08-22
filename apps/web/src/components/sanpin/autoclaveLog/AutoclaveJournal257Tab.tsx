/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — REGISTRY & JOURNAL TAB
 * Официальный реестр формы № 257/у, фильтрация, печать А4 альбомная и экспорт CSV.
 * ============================================================================
 */

import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileSpreadsheet,
	Filter,
	Printer,
	Search,
	ShieldCheck,
	Trash2,
	UserCheck,
	XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	exportForm257ToCsv,
	filterForm257Records,
	generateForm257PrintHtml,
	type ClinicLegalInfo,
	type Form257FilterCriteria,
	type Form257Record,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type SterilizationRegimeId,
} from "./autoclaveLogPresets.js";

export interface AutoclaveJournal257TabProps {
	readonly records: readonly Form257Record[];
	readonly onDeleteRecord?: (id: string) => void;
	readonly onVerifyRecord?: (id: string, headNurseName: string) => void;
	readonly clinicInfo?: ClinicLegalInfo;
}

export function AutoclaveJournal257Tab({
	records,
	onDeleteRecord,
	onVerifyRecord,
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveJournal257TabProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedSterilizerId, setSelectedSterilizerId] = useState<string>("all");
	const [selectedRegimeId, setSelectedRegimeId] = useState<string>("all");
	const [selectedStatus, setSelectedStatus] = useState<"all" | "sterile_passed" | "rejected_defect">("all");
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

	// Печать официальной Формы 257/у
	const handlePrintJournal = () => {
		const printHtml = generateForm257PrintHtml(
			filteredRecords,
			clinicInfo,
			startDate || endDate ? `с ${startDate || "начала"} по ${endDate || "сегодня"}` : "за текущую смену",
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

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{/* Top Action Bar & Filter Controls */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "space-between",
					alignItems: "center",
					gap: "0.75rem",
					background: "var(--paper-strong, #f8fafc)",
					padding: "0.875rem",
					borderRadius: "10px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", flex: 1 }}>
					{/* Search input */}
					<div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
						<input
							type="text"
							placeholder="Поиск по изделиям, ID, медсестре..."
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
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
						Печать Формы 257/у (А4)
					</button>
				</div>
			</div>

			{/* Form 257/u Records Table */}
			<div className="journal257-table-wrapper">
				{filteredRecords.length === 0 ? (
					<div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
						<ShieldCheck size={40} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
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
								<th>Медсестра ЦСО</th>
								<th>Контроль</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							{filteredRecords.map((rec) => {
								const ptPassedCount = rec.chamberPoints.filter((p) => p.status === "passed").length;
								return (
									<tr key={rec.id}>
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
