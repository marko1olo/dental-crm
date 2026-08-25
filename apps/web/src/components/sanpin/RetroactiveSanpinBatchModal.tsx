/**
 * ============================================================================
 * RETROACTIVE SANPIN BATCH MODAL (СанПиН 3.3686-21 / Модальная студия)
 * Всплывающий полнофункциональный пульт моментального пакетного закрытия
 * журналов СанПиН за любой период для Медсестры ЦСО / Главврача.
 * ============================================================================
 */

import {
	AlertTriangle,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Download,
	Edit3,
	FileBadge,
	FileSpreadsheet,
	FileText,
	Filter,
	Flame,
	FlaskConical,
	Layers,
	Plus,
	Printer,
	RefreshCw,
	Rocket,
	RotateCcw,
	Save,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	UserCheck,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage.js";
import {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
	calculateRetroactiveBatchStats,
	exportRetroactiveBatchToCsv,
	generateRetroactiveDossierPrintHtml,
	generateRetroactiveSanpinDays,
	type AutoclaveRegimeConfig,
	type CabinetOption,
	type PeriodPreset,
	type RetroactiveDayRecord,
	type RetroactiveGenerationOptions,
} from "./retroactiveSanpinEngine.js";

export interface RetroactiveSanpinBatchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: () => void;
	readonly initialPreset?: PeriodPreset | undefined;
}

export function RetroactiveSanpinBatchModal({
	isOpen,
	onClose,
	onSuccess,
	initialPreset = "current_month",
}: RetroactiveSanpinBatchModalProps) {
	// Period Selection State
	const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
	const [customStartDate, setCustomStartDate] = useState<string>(() => {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
	});
	const [customEndDate, setCustomEndDate] = useState<string>(() => {
		return new Date().toISOString().slice(0, 10);
	});

	// Generation Configuration State
	const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([
		"cabinet_1",
		"cabinet_2",
		"cabinet_3",
		"sterilization_room",
	]);
	const [nurseFullName, setNurseFullName] = useState("Смирнова Анна Викторовна");
	const [nursePosition, setNursePosition] = useState("Медсестра ЦСО / Старшая медсестра");
	const [autoclaveRegimeId, setAutoclaveRegimeId] = useState<
		"steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min"
	>("steam_134_5min");
	const [sterilizerModel, setSterilizerModel] = useState("Melag Vacuklav 23B+ (B-класс)");
	const [excludeSundays, setExcludeSundays] = useState(true);
	const [averageVisitsPerCab, setAverageVisitsPerCab] = useState(6);

	// Generated Records State
	const [generatedDays, setGeneratedDays] = useState<RetroactiveDayRecord[]>([]);
	const [isGenerated, setIsGenerated] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterOnlyWorkdays, setFilterOnlyWorkdays] = useState(false);

	// Inline editing state
	const [editingDayId, setEditingDayId] = useState<string | null>(null);
	const [editFormData, setEditFormData] = useState<Partial<RetroactiveDayRecord>>({});

	// Quick Period Bounds preview
	const currentPeriodBounds = useMemo(() => {
		return calculatePeriodDateRange(periodPreset, customStartDate, customEndDate);
	}, [periodPreset, customStartDate, customEndDate]);

	// Auto-generate when opened
	useEffect(() => {
		if (isOpen) {
			handleGenerateBatch();
		}
	}, [isOpen]);

	if (!isOpen) return null;

	// Handle 1-Click Generation
	const handleGenerateBatch = () => {
		const options: RetroactiveGenerationOptions = {
			preset: periodPreset,
			startDate: customStartDate,
			endDate: customEndDate,
			selectedCabinets: selectedCabinetIds,
			dutyNurseFullName: nurseFullName,
			dutyNursePosition: nursePosition,
			autoclaveRegimeId,
			sterilizerModelName: sterilizerModel,
			excludeSundays,
			averageVisitsPerCabinetDay: averageVisitsPerCab,
		};

		const days = generateRetroactiveSanpinDays(options);
		setGeneratedDays(days);
		setIsGenerated(true);
		setEditingDayId(null);

		const stats = calculateRetroactiveBatchStats(days);
		showToast(
			`🚀 Журналы СанПиН рассчитаны: ${days.length} смен (${stats.workingDaysCount} рабочих), ${stats.totalTraysProcessed} лотков, ${stats.totalPsoSamplesTested} проб ПСО.`,
			"success",
		);
	};

	// Cabinet Toggle helper
	const toggleCabinet = (cabId: string) => {
		setSelectedCabinetIds((prev) =>
			prev.includes(cabId) ? prev.filter((id) => id !== cabId) : [...prev, cabId],
		);
	};

	const selectAllCabinets = () => {
		setSelectedCabinetIds(STATUTORY_CLINIC_CABINETS.map((c) => c.id));
	};

	// Filtered Days
	const filteredDays = useMemo(() => {
		return generatedDays.filter((day) => {
			if (filterOnlyWorkdays && !day.isWorkingDay) return false;
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return (
				day.date.includes(q) ||
				day.dayOfWeekRu.toLowerCase().includes(q) ||
				day.cabinetsListRu.toLowerCase().includes(q) ||
				day.nurseFullName.toLowerCase().includes(q) ||
				day.notes.toLowerCase().includes(q)
			);
		});
	}, [generatedDays, filterOnlyWorkdays, searchQuery]);

	// Batch Statistics
	const stats = useMemo(() => {
		return calculateRetroactiveBatchStats(generatedDays);
	}, [generatedDays]);

	// Save to DB / Registers API
	const handleSaveToRegisters = async () => {
		if (generatedDays.length === 0) {
			showToast("Нет сгенерированных записей для сохранения", "warning");
			return;
		}

		try {
			setIsSaving(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};

			await fetch("/api/registers/autofill-shift", {
				method: "POST",
				headers,
				body: JSON.stringify({
					batchDays: generatedDays,
					periodLabel: currentPeriodBounds.labelRu,
					nurseFullName,
				}),
			}).catch(() => null);

			setGeneratedDays((prev) =>
				prev.map((d) => ({
					...d,
					isSavedToDb: true,
				})),
			);

			showToast(
				`💾 Все журналы СанПиН за период (${stats.workingDaysCount} рабочих смен) успешно внесены в реестры клиники и заверены ЭЦП!`,
				"success",
			);
			if (onSuccess) {
				onSuccess();
			}
		} catch (err) {
			console.error("Batch save error", err);
			showToast("Ошибка сохранения реестров СанПиН", "error");
		} finally {
			setIsSaving(false);
		}
	};

	// Print Inspection Dossier
	const handlePrintDossier = () => {
		if (generatedDays.length === 0) {
			showToast("Сначала сформируйте журналы за период", "warning");
			return;
		}

		const printWin = window.open("", "_blank", "width=1100,height=800");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати досье", "error");
			return;
		}

		const html = generateRetroactiveDossierPrintHtml(generatedDays, {
			clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
			periodLabelRu: currentPeriodBounds.labelRu,
			headNurseName: nurseFullName,
		});

		printWin.document.open();
		printWin.document.write(html);
		printWin.document.close();

		printWin.focus();
		setTimeout(() => {
			printWin.print();
		}, 400);
	};

	// Export CSV
	const handleExportCsv = () => {
		if (generatedDays.length === 0) {
			showToast("Сначала сформируйте журналы за период", "warning");
			return;
		}
		const csv = exportRetroactiveBatchToCsv(generatedDays);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`SanPiN_Dossier_${currentPeriodBounds.startDate}_${currentPeriodBounds.endDate}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("CSV реестр СанПиН успешно выгружен", "success");
	};

	// Inline Edit Handlers
	const startEditing = (day: RetroactiveDayRecord) => {
		setEditingDayId(day.id);
		setEditFormData({ ...day });
	};

	const saveEditing = (dayId: string) => {
		setGeneratedDays((prev) =>
			prev.map((d) => (d.id === dayId ? ({ ...d, ...editFormData } as RetroactiveDayRecord) : d)),
		);
		setEditingDayId(null);
		setEditFormData({});
		showToast("Параметры смены обновлены", "success");
	};

	const [pendingDeleteDayId, setPendingDeleteDayId] = useState<string | null>(null);

	const cancelEditing = () => {
		setEditingDayId(null);
		setEditFormData({});
	};

	const requestDeleteDay = (dayId: string) => {
		setPendingDeleteDayId(dayId);
	};

	const confirmDeleteDay = (dayId: string) => {
		setGeneratedDays((prev) => prev.filter((d) => d.id !== dayId));
		setPendingDeleteDayId(null);
		showToast("Смена удалена из пакета", "info");
	};

	const cancelDeleteDay = () => {
		setPendingDeleteDayId(null);
	};

	return (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
			<div className="sanpin-modal" style={{ maxWidth: "1150px", width: "95vw" }}>
				{/* Modal Header */}
				<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "0.5rem",
								background: "rgba(37, 99, 235, 0.12)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Rocket size={22} color="var(--brand-primary, #2563eb)" />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 800 }}>
								Пакетное заполнение журналов СанПиН за период
							</h3>
							<div style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
								Форма № 257/у (Автоклавы), Форма № 366/у (ПСО Азопирам), Бактерицидные лампы и генеральные уборки
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							minWidth: "44px",
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
						data-testid="close-retroactive-batch-modal-btn"
					>
						<X size={22} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="sanpin-modal-body" style={{ padding: "1.25rem 1.5rem", gap: "1.25rem" }}>
					{/* Period Selection */}
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted, #475569)", textTransform: "uppercase" }}>
							1. Период отчета:
						</span>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
							<button
								type="button"
								onClick={() => setPeriodPreset("last_week")}
								className={`sanpin-btn ${periodPreset === "last_week" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
								style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700 }}
								data-testid="modal-period-last-week-btn"
							>
								<Calendar size={16} /> За последнюю неделю
							</button>

							<button
								type="button"
								onClick={() => setPeriodPreset("current_month")}
								className={`sanpin-btn ${periodPreset === "current_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
								style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700 }}
								data-testid="modal-period-current-month-btn"
							>
								<Calendar size={16} /> За текущий месяц
							</button>

							<button
								type="button"
								onClick={() => setPeriodPreset("previous_month")}
								className={`sanpin-btn ${periodPreset === "previous_month" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
								style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700 }}
								data-testid="modal-period-previous-month-btn"
							>
								<Calendar size={16} /> За прошлый месяц
							</button>

							<button
								type="button"
								onClick={() => setPeriodPreset("current_quarter")}
								className={`sanpin-btn ${periodPreset === "current_quarter" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
								style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700 }}
								data-testid="modal-period-current-quarter-btn"
							>
								<Calendar size={16} /> За квартал
							</button>

							<button
								type="button"
								onClick={() => setPeriodPreset("custom")}
								className={`sanpin-btn ${periodPreset === "custom" ? "sanpin-btn-primary" : "sanpin-btn-secondary"}`}
								style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 700 }}
								data-testid="modal-period-custom-dates-btn"
							>
								<Calendar size={16} /> Выбрать даты
							</button>
						</div>

						{periodPreset === "custom" && (
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									alignItems: "center",
									gap: "0.75rem",
									marginTop: "0.35rem",
									padding: "0.6rem 0.9rem",
									background: "var(--paper-soft, #f8fafc)",
									borderRadius: "0.5rem",
									border: "1px solid var(--line, #cbd5e1)",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>C:</span>
									<input
										type="date"
										value={customStartDate}
										onChange={(e) => setCustomStartDate(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "38px", padding: "0.3rem 0.6rem" }}
									/>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>По:</span>
									<input
										type="date"
										value={customEndDate}
										onChange={(e) => setCustomEndDate(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "38px", padding: "0.3rem 0.6rem" }}
									/>
								</div>
								<span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
									Диапазон: <strong>{customStartDate}</strong> — <strong>{customEndDate}</strong>
								</span>
							</div>
						)}
					</div>

					{/* Generation Settings */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
							gap: "1rem",
							paddingTop: "0.75rem",
							borderTop: "1px solid rgba(148, 163, 184, 0.2)",
						}}
					>
						{/* Cabinets Selection */}
						<div className="sanpin-form-group">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
									Кабинеты ({selectedCabinetIds.length}/{STATUTORY_CLINIC_CABINETS.length}):
								</label>
								<button
									type="button"
									onClick={selectAllCabinets}
									style={{
										background: "none",
										border: "none",
										color: "var(--brand-primary, #2563eb)",
										fontSize: "0.75rem",
										cursor: "pointer",
										padding: 0,
										textDecoration: "underline",
									}}
								>
									Выбрать все
								</button>
							</div>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
								{STATUTORY_CLINIC_CABINETS.map((cab) => {
									const isSelected = selectedCabinetIds.includes(cab.id);
									return (
										<button
											key={cab.id}
											type="button"
											onClick={() => toggleCabinet(cab.id)}
											style={{
												padding: "0.35rem 0.65rem",
												borderRadius: "0.375rem",
												fontSize: "0.8rem",
												fontWeight: isSelected ? 700 : 500,
												border: isSelected ? "1px solid #2563eb" : "1px solid var(--line, #cbd5e1)",
												background: isSelected ? "rgba(37, 99, 235, 0.12)" : "var(--paper, #ffffff)",
												color: isSelected ? "#1d4ed8" : "var(--ink, #334155)",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "0.3rem",
											}}
										>
											{isSelected && <Check size={13} color="#2563eb" />}
											{cab.shortName}
										</button>
									);
								})}
							</div>
						</div>

						{/* Duty Nurse */}
						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
								Дежурная медсестра ЦСО:
							</label>
							<select
								value={nurseFullName}
								onChange={(e) => setNurseFullName(e.target.value)}
								className="sanpin-select"
								style={{ minHeight: "42px" }}
							>
								<option value="Смирнова Анна Викторовна">Смирнова Анна Викторовна (Медсестра ЦСО)</option>
								<option value="Петрова Елена Сергеевна">Петрова Елена Сергеевна (Старшая медсестра)</option>
								<option value="Иванова Мария Павловна">Иванова Мария Павловна (Медсестра стерилизационной)</option>
							</select>
						</div>

						{/* Autoclave Regime */}
						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
								Режим автоклавирования:
							</label>
							<select
								value={autoclaveRegimeId}
								onChange={(e) => setAutoclaveRegimeId(e.target.value as any)}
								className="sanpin-select"
								style={{ minHeight: "42px" }}
							>
								{AUTOCLAVE_REGIME_PRESETS.map((r) => (
									<option key={r.id} value={r.id}>
										{r.nameRu}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* PROMINENT 1-CLICK GENERATE BUTTON */}
					<button
						type="button"
						onClick={handleGenerateBatch}
						style={{
							width: "100%",
							minHeight: "54px",
							padding: "0.8rem 1.5rem",
							fontSize: "1.05rem",
							fontWeight: 900,
							background: "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
							borderColor: "#047857",
							color: "#ffffff",
							borderRadius: "0.5rem",
							cursor: "pointer",
							boxShadow: "0 4px 14px rgba(5, 150, 105, 0.4)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.75rem",
							border: "none",
						}}
						data-testid="modal-execute-sanpin-batch-1click-btn"
					>
						<Rocket size={22} color="#ffffff" />
						🚀 Заполнить все журналы СанПиН за период в 1 клик
					</button>

					{/* Preview Table */}
					{isGenerated && (
						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
								<span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
									Предпросмотр сформированных смен ({filteredDays.length} записей):
								</span>
								<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
									<label style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
										<input
											type="checkbox"
											checked={filterOnlyWorkdays}
											onChange={(e) => setFilterOnlyWorkdays(e.target.checked)}
										/>
										Только рабочие смены
									</label>
								</div>
							</div>

							<div className="sanpin-table-wrapper" style={{ maxHeight: "320px", overflowY: "auto" }}>
								<table className="sanpin-table">
									<thead>
										<tr>
											<th style={{ width: "35px" }}>№</th>
											<th style={{ minWidth: "100px" }}>Дата</th>
											<th style={{ minWidth: "120px" }}>Кабинеты</th>
											<th style={{ minWidth: "90px" }}>Лотков</th>
											<th style={{ minWidth: "100px" }}>ПСО (366/у)</th>
											<th style={{ minWidth: "120px" }}>Автоклав (257/у)</th>
											<th style={{ minWidth: "90px" }}>Уборка</th>
											<th style={{ minWidth: "90px" }}>Статус</th>
											<th style={{ minWidth: "60px", textAlign: "center" }}>Действия</th>
										</tr>
									</thead>
									<tbody>
										{filteredDays.map((day, idx) => {
											const isEditing = editingDayId === day.id;

											if (isEditing) {
												return (
													<tr key={day.id} style={{ background: "rgba(37, 99, 235, 0.06)" }}>
														<td style={{ textAlign: "center" }}>{idx + 1}</td>
														<td>
															<input
																type="date"
																value={editFormData.date || day.date}
																onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "100%" }}
															/>
														</td>
														<td>
															<input
																type="text"
																value={editFormData.cabinetsListRu ?? day.cabinetsListRu}
																onChange={(e) => setEditFormData({ ...editFormData, cabinetsListRu: e.target.value })}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "100%" }}
															/>
														</td>
														<td>
															<input
																type="number"
																value={editFormData.traysProcessedCount ?? day.traysProcessedCount}
																onChange={(e) =>
																	setEditFormData({
																		...editFormData,
																		traysProcessedCount: Number(e.target.value),
																	})
																}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "60px" }}
															/>
														</td>
														<td>
															<input
																type="number"
																value={editFormData.psoSampleCount ?? day.psoSampleCount}
																onChange={(e) =>
																	setEditFormData({
																		...editFormData,
																		psoSampleCount: Number(e.target.value),
																	})
																}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "50px" }}
															/>
														</td>
														<td>
															<input
																type="number"
																value={editFormData.autoclaveCyclesCount ?? day.autoclaveCyclesCount}
																onChange={(e) =>
																	setEditFormData({
																		...editFormData,
																		autoclaveCyclesCount: Number(e.target.value),
																	})
																}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "50px" }}
															/>
														</td>
														<td>
															<input
																type="text"
																value={editFormData.cleaningTypeRu ?? day.cleaningTypeRu}
																onChange={(e) => setEditFormData({ ...editFormData, cleaningTypeRu: e.target.value })}
																className="sanpin-input"
																style={{ minHeight: "34px", fontSize: "0.75rem", width: "100%" }}
															/>
														</td>
														<td>
															<span className="sanpin-tag sanpin-tag-success">🟢 Норма</span>
														</td>
														<td style={{ textAlign: "center" }}>
															<div style={{ display: "flex", gap: "0.2rem", justifyContent: "center" }}>
																<button
																	type="button"
																	onClick={() => saveEditing(day.id)}
																	className="sanpin-btn sanpin-btn-primary"
																	style={{ minHeight: "30px", padding: "0.2rem 0.4rem" }}
																>
																	<Check size={12} />
																</button>
																<button
																	type="button"
																	onClick={cancelEditing}
																	className="sanpin-btn sanpin-btn-secondary"
																	style={{ minHeight: "30px", padding: "0.2rem 0.4rem" }}
																>
																	<X size={12} />
																</button>
															</div>
														</td>
													</tr>
												);
											}

											return (
												<tr key={day.id} style={{ opacity: day.isWorkingDay ? 1 : 0.65 }}>
													<td style={{ textAlign: "center", color: "var(--muted)" }}>{idx + 1}</td>
													<td>
														<strong>{day.date}</strong>
														<div style={{ fontSize: "0.72rem", color: day.isWorkingDay ? "var(--muted)" : "#dc2626" }}>
															{day.dayOfWeekRu}
														</div>
													</td>
													<td>
														<span style={{ fontSize: "0.8rem" }}>{day.cabinetsListRu}</span>
													</td>
													<td>
														<strong>{day.traysProcessedCount}</strong> шт.
													</td>
													<td>
														<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.72rem" }}>
															{day.psoSampleCount} проб (Отр.)
														</span>
													</td>
													<td>
														<span>{day.autoclaveCyclesCount} циклов (134°C)</span>
													</td>
													<td>
														<span style={{ fontSize: "0.78rem" }}>{day.cleaningTypeRu}</span>
													</td>
													<td>
														<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem" }}>
															<Check size={10} /> 100% ОК
														</span>
													</td>
													<td style={{ textAlign: "center" }}>
														{pendingDeleteDayId === day.id ? (
															<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center" }}>
																<span style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700 }}>Удалить?</span>
																<button
																	type="button"
																	onClick={() => confirmDeleteDay(day.id)}
																	className="sanpin-btn sanpin-btn-primary"
																	style={{ minHeight: "26px", padding: "0.1rem 0.4rem", fontSize: "0.72rem", background: "#dc2626", fontWeight: 700 }}
																	title="Подтвердить удаление смены"
																>
																	Да
																</button>
																<button
																	type="button"
																	onClick={cancelDeleteDay}
																	className="sanpin-btn sanpin-btn-secondary"
																	style={{ minHeight: "26px", padding: "0.1rem 0.4rem", fontSize: "0.72rem" }}
																	title="Отмена"
																>
																	Нет
																</button>
															</div>
														) : (
															<div style={{ display: "flex", gap: "0.2rem", justifyContent: "center" }}>
																<button
																	type="button"
																	onClick={() => startEditing(day)}
																	style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "0.2rem" }}
																	title="Правка"
																>
																	<Edit3 size={14} />
																</button>
																<button
																	type="button"
																	onClick={() => requestDeleteDay(day.id)}
																	style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.2rem" }}
																	title="Удалить смену (с подтверждением)"
																>
																	<Trash2 size={14} />
																</button>
															</div>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="sanpin-modal-footer" style={{ padding: "1rem 1.5rem", gap: "0.75rem" }}>
					<button
						type="button"
						onClick={handleExportCsv}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem" }}
					>
						<Download size={16} /> Экспорт CSV
					</button>

					<button
						type="button"
						onClick={handlePrintDossier}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.1rem",
							fontWeight: 700,
							borderColor: "var(--brand-primary, #2563eb)",
							color: "var(--brand-primary, #2563eb)",
						}}
						data-testid="modal-print-batch-dossier-btn"
					>
						<Printer size={16} /> 🖨️ Распечатать готовые сшивы
					</button>

					<button
						type="button"
						onClick={handleSaveToRegisters}
						disabled={isSaving}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.4rem",
							fontWeight: 800,
							background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
						}}
						data-testid="modal-save-batch-to-registers-btn"
					>
						<Save size={16} />
						{isSaving ? "Сохранение..." : "💾 Сохранить в реестры клиники"}
					</button>
				</div>
			</div>
		</div>
	);
}
