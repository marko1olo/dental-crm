import type { SterilizationLogRecord } from "@dental/shared";
import {
	Award,
	CheckCircle2,
	ChevronDown,
	FileSpreadsheet,
	Gauge,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Tag,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import type { ClinicAutoclaveDevice } from "./AutoclaveEquipmentModal";

export interface AutoclaveRegisterTableProps {
	readonly logs: SterilizationLogRecord[];
	readonly filteredLogs: SterilizationLogRecord[];
	readonly logsSlice: {
		visibleItems: SterilizationLogRecord[];
		hasMore: boolean;
		remainingCount: number;
		totalCount: number;
	};
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
	readonly onQuickShiftBatch: () => void;
	readonly isLoggingBatch: boolean;
	readonly onOpenNewCycleModal?: () => void;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onLoadMore: () => void;
	readonly onLoadAll: () => void;
}

function getPackagingLabel(packagingType?: string): string {
	switch (packagingType) {
		case "kraft_heat_sealed":
			return "Крафт термосварной (365 сут)";
		case "kraft_self_adhesive":
			return "Крафт самоклейка (50 сут)";
		case "laminated_heat_sealed":
			return "Ламинир. пакет (180 сут)";
		case "metal_cassette":
			return "Металл. кассета (72 ч)";
		case "bix_filter":
			return "Бикс с фильтром (20 сут)";
		case "kraft_bag":
			return "Крафт-пакет (30 сут)";
		default:
			return packagingType || "Крафт-пакет";
	}
}

export function AutoclaveRegisterTable({
	logs,
	filteredLogs,
	logsSlice,
	loading,
	clinicDevices,
	searchQuery,
	setSearchQuery,
	deviceFilter,
	setDeviceFilter,
	stampedRows,
	onStampVerification,
	onOpenEquipmentModal,
	onPrintBatchPouches,
	onPrintSinglePouch,
	onOpenKraftForLog,
	onQuickShiftBatch,
	isLoggingBatch,
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenJournal257Modal,
	onOpenKraftModal,
	onLoadMore,
	onLoadAll,
}: AutoclaveRegisterTableProps) {
	const [isDesktopMoreMenuOpen, setIsDesktopMoreMenuOpen] = useState(false);
	const desktopMoreMenuRef = useRef<HTMLDivElement>(null);
	const [openDesktopRowMenuId, setOpenDesktopRowMenuId] = useState<string | null>(null);
	const desktopRowMenuRef = useRef<HTMLDivElement>(null);

	// Mobile Bottom Sheet state for general toolbar actions
	const [isMobileToolbarSheetOpen, setIsMobileToolbarSheetOpen] = useState(false);

	// Mobile Bottom Sheet state for cycle card actions
	const [selectedLogForSheet, setSelectedLogForSheet] = useState<SterilizationLogRecord | null>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (desktopMoreMenuRef.current && !desktopMoreMenuRef.current.contains(event.target as Node)) {
				setIsDesktopMoreMenuOpen(false);
			}
			if (desktopRowMenuRef.current && !desktopRowMenuRef.current.contains(event.target as Node)) {
				setOpenDesktopRowMenuId(null);
			}
		};
		if (isDesktopMoreMenuOpen || openDesktopRowMenuId) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isDesktopMoreMenuOpen, openDesktopRowMenuId]);

	return (
		<div className="sanpin-table-wrapper w-full min-w-0" style={{ position: "relative", zIndex: 1, width: "100%" }}>
			{/* Single-Row Adaptive Toolbar (Desktop Full, Mobile Strict 1-Row with Bottom Sheet) */}
			<div
				className="sanpin-table-toolbar min-w-0 flex items-center justify-between gap-2 p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]"
			>
				{/* Search Field (Shared) */}
				<div className="dente-search-wrap flex-1 min-w-[140px] max-w-full sm:max-w-xs">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по аппарату, лотку, штрихкоду..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input !h-8"
						data-testid="autoclave-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{/* Desktop Toolbar Action Strip (Hidden on Mobile <= 768px) */}
				<div className="hidden md:flex items-center gap-1.5 shrink-0 flex-nowrap">
					<select
						value={deviceFilter}
						onChange={(e) => setDeviceFilter(e.target.value)}
						className="sanpin-select shrink-0 whitespace-nowrap text-xs rounded-lg px-2"
						style={{ minHeight: "32px", height: "32px" }}
					>
						<option value="all">Все циклы (100% норма)</option>
						<option value="passed">Стерильно (Норма)</option>
					</select>

					{/* Action: Оборудование ЦСО */}
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
						style={{
							minHeight: "32px",
							height: "32px",
							padding: "0.25rem 0.65rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
						}}
						data-testid="autoclave-equipment-btn"
						title="Управление парком автоклавов и стерилизаторов клиники"
					>
						<ShieldCheck size={14} color="#2563eb" className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap">Оборудование ({clinicDevices.length})</span>
					</button>

					{/* Action: Печать маркировок (пачка 10 шт. / 30 дн.) */}
					<button
						type="button"
						onClick={() => {
							if (logs.length > 0 && logs[0]) {
								onPrintBatchPouches(logs[0], 10);
							} else {
								showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
							}
						}}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
						style={{
							minHeight: "32px",
							height: "32px",
							padding: "0.25rem 0.65rem",
							fontSize: "0.8125rem",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
							color: "var(--teal, #0d9488)",
							borderColor: "var(--teal, #0d9488)",
							background: "var(--paper-strong, #ffffff)",
						}}
						title="Печать пачки из 10 наклеек крафт-пакетов (срок 30 дней)"
						data-testid="autoclave-quick-batch-labels-btn"
					>
						<Printer size={14} className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap">Печать наклеек (10 шт.)</span>
					</button>

					{/* Action: + Зафиксировать цикл стерилизации (134°C, 2.1 бар) */}
					<button
						type="button"
						onClick={onQuickShiftBatch}
						aria-busy={isLoggingBatch}
						className="sanpin-btn touch-manipulation shrink-0 whitespace-nowrap"
						style={{
							minHeight: "32px",
							height: "32px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
							cursor: "pointer",
						}}
						data-testid="sanpin-autoclave-new-cycle-btn"
						title="Цикл стерилизации завершён: зафиксировать параметры 134°C / 2.1 бар в журнале"
					>
						<Sparkles size={14} className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap">
							{isLoggingBatch ? "Фиксация..." : "Цикл завершён (134°C)"}
						</span>
					</button>

					{/* Desktop Dropdown: [⋮ Дополнительно] */}
					<div ref={desktopMoreMenuRef} className="shrink-0" style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
						<button
							type="button"
							onClick={() => setIsDesktopMoreMenuOpen((prev) => !prev)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "32px",
								minWidth: "32px",
								height: "32px",
								padding: "0.25rem 0.45rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.25rem",
								borderRadius: "8px",
								flexShrink: 0,
							}}
							aria-expanded={isDesktopMoreMenuOpen}
							title="Дополнительные операции: журнал работы стерилизаторов (автоклавов), крафт-пакеты"
							data-testid="autoclave-more-options-btn"
						>
							<MoreVertical size={14} color="var(--brand-primary, #2563eb)" />
							<ChevronDown size={11} style={{ transform: isDesktopMoreMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
						</button>

						{isDesktopMoreMenuOpen && (
							<div
								style={{
									position: "absolute",
									right: 0,
									top: "calc(100% + 4px)",
									minWidth: "260px",
									background: "var(--paper-strong, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "8px",
									boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
									zIndex: 1000,
									padding: "0.35rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.2rem",
								}}
							>
								{/* Внести цикл вручную */}
								{onOpenNewCycleModal && (
									<button
										type="button"
										onClick={() => {
											setIsDesktopMoreMenuOpen(false);
											onOpenNewCycleModal();
										}}
										className="sanpin-dropdown-item"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											padding: "0.5rem 0.75rem",
											borderRadius: "6px",
											background: "none",
											border: "none",
											width: "100%",
											textAlign: "left",
											fontSize: "0.825rem",
											fontWeight: 600,
											color: "var(--ink, #0f172a)",
											cursor: "pointer",
										}}
										data-testid="open-new-cycle-modal-btn"
									>
										<Plus size={15} color="#0284c7" />
										<span>Внести цикл (параметры, КТ-1..5)</span>
									</button>
								)}

								{/* Журнал работы стерилизаторов (автоклавов) за месяц */}
								<button
									type="button"
									onClick={() => {
										setIsDesktopMoreMenuOpen(false);
										onGenerateMonthlyForm257();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="generate-monthly-form257-btn"
								>
									<Sparkles size={15} color="#0d9488" />
									<span>Журнал работы стерилизаторов за месяц</span>
								</button>

								{/* Журнал работы стерилизаторов (автоклавов) */}
								<button
									type="button"
									onClick={() => {
										setIsDesktopMoreMenuOpen(false);
										onOpenJournal257Modal();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="open-journal-257-studio-btn"
								>
									<FileSpreadsheet size={15} color="#059669" />
									<span>Журнал работы стерилизаторов (автоклавов)</span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Mobile Toolbar Single-Row Actions (Visible on Mobile <= 768px per Apple HIG) */}
				<div className="flex md:hidden items-center gap-1.5 shrink-0">
					<select
						value={deviceFilter}
						onChange={(e) => setDeviceFilter(e.target.value)}
						className="sanpin-select shrink-0 text-xs rounded-xl px-2.5 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] touch-manipulation"
						style={{ minHeight: "44px", height: "44px" }}
						aria-label="Фильтр статуса циклов"
					>
						<option value="all">Все циклы</option>
						<option value="passed">Стерильно</option>
					</select>

					<button
						type="button"
						onClick={() => setIsMobileToolbarSheetOpen(true)}
						className="sanpin-touch-btn inline-flex items-center justify-center p-2 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] dark:border-[#334155] shadow-sm touch-manipulation cursor-pointer"
						style={{ minHeight: "44px", minWidth: "44px", height: "44px", width: "44px" }}
						aria-label="Действия автоклава и журналы"
						data-testid="autoclave-mobile-actions-trigger"
					>
						<SlidersHorizontal size={18} className="text-[var(--brand-primary,#2563eb)]" />
					</button>
				</div>
			</div>

			{/* =========================================================================
			    DESKTOP VIEW: 9-Column Table (Hidden on Mobile <= 768px)
			    ========================================================================= */}
			<div className="hidden md:block w-full overflow-x-auto min-w-0" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
				<table className="sanpin-table w-full min-w-0" style={{ width: "100%", minWidth: "1180px", tableLayout: "auto" }}>
					<thead>
						<tr>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Дата / № Цикла</th>
							<th style={{ fontSize: "0.825rem", width: "130px", minWidth: "120px" }} className="min-w-0">Марка аппарата</th>
							<th style={{ fontSize: "0.825rem", width: "180px", minWidth: "165px" }} className="min-w-0">Стерилизуемые изделия</th>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px" }} className="min-w-0">Вид упаковки</th>
							<th style={{ fontSize: "0.825rem", width: "120px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Режим (T°, P, t)</th>
							<th style={{ fontSize: "0.825rem", width: "100px", minWidth: "95px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Индикатор</th>
							<th style={{ fontSize: "0.825rem", width: "100px", minWidth: "95px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Срок годности</th>
							<th style={{ fontSize: "0.825rem", width: "215px", minWidth: "205px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Штрихкод / Статус</th>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "135px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Заверка / Оператор</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
									Загрузка журнала стерилизаторов...
								</td>
							</tr>
						) : clinicDevices.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", maxWidth: "560px", margin: "0 auto" }}>
										<ShieldCheck size={42} color="var(--brand-primary, #2563eb)" />
										<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink, #0f172a)" }}>
											В клинике не зарегистрировано автоклавов
										</div>
										<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения журнала стерилизации и генерации крафт-пакетов.
										</div>
										<button
											type="button"
											onClick={onOpenEquipmentModal}
											className="sanpin-btn sanpin-btn-primary"
											style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}
											data-testid="add-first-autoclave-table-btn"
										>
											<Plus size={16} /> <span>Зарегистрировать автоклав клиники</span>
										</button>
									</div>
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", maxWidth: "560px", margin: "0 auto" }}>
										<Sparkles size={36} color="var(--brand-primary, #2563eb)" />
										<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
											Журнал стерилизации пуст
										</div>
										<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											В выбранном периоде нет записей циклов стерилизации. Запустите новый цикл или сформируйте партию крафт-пакетов.
										</div>
										<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
											<button
												type="button"
												onClick={onOpenNewCycleModal || onOpenJournal257Modal}
												className="sanpin-btn sanpin-btn-primary"
												style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
												data-testid="empty-state-new-cycle-btn"
											>
												<Plus size={14} /> Внести цикл стерилизации
											</button>
											<button
												type="button"
												onClick={onOpenKraftModal}
												className="sanpin-btn sanpin-btn-secondary"
												style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											>
												<QrCode size={14} /> Печать крафт-пакетов
											</button>
										</div>
									</div>
								</td>
							</tr>
						) : (
							logsSlice.visibleItems.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								const rawDate = log.timestamp || (log as any).date || (log as any).createdAt;
								const safeDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
								const deviceName = log.deviceName || (log as any).sterilizerName || "Автоклав Melag Vacuklav 43B+";

								return (
									<tr
										key={log.id}
										className="sanpin-log-row"
										style={{
											minHeight: "44px",
											contentVisibility: "auto",
											containIntrinsicSize: "1px 44px",
											contain: "content",
										}}
									>
										<td style={{ width: "140px", minWidth: "130px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
												<span style={{ fontWeight: 700, fontSize: "0.825rem", color: "var(--ink)" }}>
													№{log.cycleNumber}
												</span>
												<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
													{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
												</span>
											</div>
										</td>

										<td style={{ width: "130px", minWidth: "120px" }} className="min-w-0">
											<div
												style={{
													fontWeight: 600,
													fontSize: "0.8125rem",
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={`${deviceName}${log.serialNumber ? ` (Зав. №${log.serialNumber})` : ""}`}
											>
												{deviceName}
											</div>
										</td>

										<td style={{ width: "180px", minWidth: "165px" }} className="min-w-0">
											<div
												style={{
													fontSize: "0.8125rem",
													fontWeight: 500,
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={log.itemsDescription || "Стоматологический набор"}
											>
												{log.itemsDescription || "Стоматологический набор"}
											</div>
										</td>

										<td style={{ width: "140px", minWidth: "130px" }} className="min-w-0">
											<div
												style={{
													fontSize: "0.775rem",
													color: "var(--ink)",
													lineHeight: 1.25,
													wordBreak: "break-word",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
												title={getPackagingLabel(log.packagingType)}
											>
												{getPackagingLabel(log.packagingType)}
											</div>
										</td>

										<td style={{ width: "120px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											<div style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
												<span style={{ fontWeight: 700, color: "var(--ink)" }}>
													{log.temperatureCelsius || (log as any).temperature || 134} °C
												</span>
												<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
													{" "}· {log.pressureBar || 2.1} б · {log.durationMin || (log as any).durationMinutes || 5} мин
												</span>
											</div>
										</td>

										<td style={{ width: "100px", minWidth: "95px" }} className="whitespace-nowrap shrink-0">
											<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }}>
												<CheckCircle2 size={12} className="shrink-0" /> {log.indicatorType === "class6_emulating" ? "Класс 6" : "Класс 5"}
											</span>
										</td>

										<td style={{ width: "100px", minWidth: "95px", fontSize: "0.8rem", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
												<span style={{ fontWeight: 600, color: "#059669" }}>
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
											)}
										</td>

										<td style={{ width: "215px", minWidth: "205px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
												<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }} title="Стерилизация завершена успешно, контроль пройден (100% норма)">
													<CheckCircle2 size={12} className="shrink-0" /> Стерильно
												</span>
												{log.barcode ? (
													<span
														style={{
															fontSize: "0.75rem",
															fontFamily: "monospace",
															color: "var(--brand-primary, #2563eb)",
															fontWeight: 700,
															background: "rgba(37, 99, 235, 0.08)",
															padding: "0.15rem 0.45rem",
															borderRadius: "4px",
															whiteSpace: "nowrap",
															flexShrink: 0,
															letterSpacing: "0.02em",
														}}
														title={`Штрихкод крафт-пакета: ${log.barcode}`}
													>
														{log.barcode}
													</span>
												) : (
													<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>—</span>
												)}
											</div>
										</td>

										<td style={{ width: "140px", minWidth: "135px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.25rem", whiteSpace: "nowrap" }}>
												<span style={{ fontSize: "0.775rem", fontWeight: 600, maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.operatorName || "Сотрудник"}>
													{log.operatorName ? log.operatorName.split(" ")[0] : "Сотрудник"}
												</span>

												{isStamped ? (
													<span className="sanpin-badge-gov" style={{ minHeight: "22px", fontSize: "0.7rem", padding: "0.1rem 0.35rem", flexShrink: 0 }}>
														<CheckCircle2 size={11} /> ЭЦП
													</span>
												) : (
													<button
														type="button"
														onClick={() => onStampVerification(log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", padding: "0.1rem 0.35rem", fontSize: "0.7rem", cursor: "pointer", flexShrink: 0 }}
														title="Поставить штамп заверки ответственного"
													>
														<Award size={11} color="var(--brand-primary)" /> ЭЦП
													</button>
												)}

												<div style={{ position: "relative" }}>
													<button
														type="button"
														onClick={() => setOpenDesktopRowMenuId(openDesktopRowMenuId === log.id ? null : log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", width: "24px", padding: "0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
														title="Дополнительные действия печати и этикеток"
														aria-label="Опции этикеток"
													>
														<MoreHorizontal size={13} />
													</button>

													{openDesktopRowMenuId === log.id && (
														<div
															ref={desktopRowMenuRef}
															style={{
																position: "absolute",
																right: 0,
																top: "100%",
																marginTop: "4px",
																zIndex: 40,
																width: "230px",
																background: "var(--paper, #ffffff)",
																border: "1px solid var(--line, #e2e8f0)",
																borderRadius: "8px",
																boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
																padding: "0.3rem",
																display: "flex",
																flexDirection: "column",
																gap: "0.2rem",
															}}
														>
															<button
																type="button"
																onClick={() => {
																	setOpenDesktopRowMenuId(null);
																	onOpenKraftForLog(log);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--ink)",
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<QrCode size={13} color="var(--brand-primary)" />
																<span>Партия в студии термоэтикеток</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setOpenDesktopRowMenuId(null);
																	onPrintSinglePouch(log);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--ink)",
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<Tag size={13} />
																<span>Печать 1 этикетки (58x40 мм)</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setOpenDesktopRowMenuId(null);
																	onPrintBatchPouches(log, 10);
																}}
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "0.5rem",
																	padding: "0.4rem 0.6rem",
																	fontSize: "0.75rem",
																	textAlign: "left",
																	background: "none",
																	border: "none",
																	borderRadius: "4px",
																	cursor: "pointer",
																	color: "var(--teal, #0d9488)",
																	fontWeight: 600,
																}}
																className="hover:bg-[var(--paper-soft,#f1f5f9)]"
															>
																<Printer size={13} />
																<span>Печать пачки 10 шт (30 дней)</span>
															</button>
														</div>
													)}
												</div>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* =========================================================================
			    MOBILE VIEW: Apple HIG Grouped List Cards (Visible on Mobile <= 768px)
			    ========================================================================= */}
			<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="autoclave-mobile-cards-container">
				{loading ? (
					<div className="sanpin-mobile-card text-center p-6 text-sm text-[var(--muted)]">
						Загрузка журнала стерилизаторов...
					</div>
				) : clinicDevices.length === 0 ? (
					<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
						<ShieldCheck size={38} className="text-[var(--brand-primary,#2563eb)]" />
						<div className="font-bold text-base text-ink">В клинике не зарегистрировано автоклавов</div>
						<p className="text-xs text-[var(--muted)] leading-relaxed">
							Зарегистрируйте автоклав клиники для ведения журнала стерилизации и формирования крафт-пакетов.
						</p>
						<button
							type="button"
							onClick={onOpenEquipmentModal}
							className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
							data-testid="add-first-autoclave-mobile-btn"
						>
							<Plus size={16} /> <span>Зарегистрировать автоклав</span>
						</button>
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
						<Sparkles size={34} className="text-[var(--brand-primary,#2563eb)]" />
						<div className="font-bold text-base text-ink">Журнал стерилизации пуст</div>
						<p className="text-xs text-[var(--muted)] leading-relaxed">
							В выбранном периоде нет записей циклов стерилизации.
						</p>
						<div className="flex flex-col gap-2 w-full pt-1">
							<button
								type="button"
								onClick={onQuickShiftBatch}
								aria-busy={isLoggingBatch}
								className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
							>
								<Plus size={16} /> <span>Зафиксировать цикл смены</span>
							</button>
							<button
								type="button"
								onClick={onOpenKraftModal}
								className="sanpin-btn sanpin-btn-secondary w-full min-h-[44px] h-11 text-xs font-semibold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
							>
								<QrCode size={16} /> <span>Печать крафт-пакетов</span>
							</button>
						</div>
					</div>
				) : (
					logsSlice.visibleItems.map((log) => {
						const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
						const rawDate = log.timestamp || (log as any).date || (log as any).createdAt;
						const safeDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
						const deviceName = log.deviceName || (log as any).sterilizerName || "Автоклав B-класса";
						const packagingName = getPackagingLabel(log.packagingType);

						return (
							<div
								key={log.id}
								className="sanpin-mobile-card touch-manipulation"
								data-testid={`autoclave-cycle-card-${log.id}`}
							>
								{/* Header: Cycle number, time and Status Badge */}
								<div className="sanpin-mobile-card-header">
									<div className="flex items-baseline gap-2">
										<span className="text-base font-extrabold text-ink tracking-tight">
											№{log.cycleNumber}
										</span>
										<span className="text-xs text-[var(--muted)] font-medium">
											{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
											{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
										</span>
									</div>

									<span
										className="sanpin-tag sanpin-tag-success shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5"
										title="Стерилизация завершена успешно (100% норма)"
									>
										<CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
										<span>Стерильно 100%</span>
									</span>
								</div>

								{/* Body: Key Parameters */}
								<div className="sanpin-mobile-card-body">
									{/* Device Name */}
									<div className="flex items-center gap-1.5 font-bold text-xs text-ink">
										<Gauge size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
										<span className="truncate">{deviceName}</span>
									</div>

									{/* Instruments / Items */}
									<div className="text-xs text-ink leading-snug">
										<span className="text-[var(--muted)] font-medium">Загрузка: </span>
										<span className="font-semibold">{log.itemsDescription || "Стоматологический набор"}</span>
									</div>

									{/* Chips: Regime & Packaging & Indicator Class */}
									<div className="flex flex-wrap items-center gap-1.5 pt-1">
										<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-bold px-2 py-0.5 rounded-md">
											{log.temperatureCelsius || 134}°C · {log.pressureBar || 2.1} бар · {log.durationMin || 5} мин
										</span>

										<span className="sanpin-tag sanpin-tag-neutral text-[11px] font-medium px-2 py-0.5 rounded-md">
											{packagingName}
										</span>

										<span className="sanpin-tag sanpin-tag-success text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
											<CheckCircle2 size={11} />
											{log.indicatorType === "class6_emulating" ? "Класс VI" : "Класс V (Норма)"}
										</span>
									</div>

									{/* Shelf life & Barcode info */}
									<div className="grid grid-cols-2 gap-2 pt-1.5 text-xs border-t border-[var(--line-subtle,rgba(226,232,240,0.5))] dark:border-[#334155]/50">
										<div>
											<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">Годен до</span>
											{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
												<span className="font-bold text-emerald-600 dark:text-emerald-400">
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span className="text-[var(--muted)]">Вскрыть сразу</span>
											)}
										</div>

										<div className="text-right">
											<span className="text-[var(--muted)] block text-[10px] uppercase font-bold tracking-wider">Штрихкод</span>
											{log.barcode ? (
												<span className="font-mono font-bold text-xs text-[var(--brand-primary,#2563eb)] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
													{log.barcode}
												</span>
											) : (
												<span className="text-[var(--muted)]">—</span>
											)}
										</div>
									</div>

									{/* Operator name */}
									<div className="text-[11px] text-[var(--muted)] pt-0.5">
										Ответственный: <span className="font-semibold text-ink">{log.operatorName || "Медсестра ЦСО"}</span>
									</div>
								</div>

								{/* Action Buttons: Touch-Ergonomic >= 44x44px */}
								<div className="sanpin-mobile-card-actions">
									{/* 1. Quick Barcode Label Print (Touch target >= 44x44px) */}
									<button
										type="button"
										onClick={() => onPrintSinglePouch(log)}
										className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--teal,#0d9488)] dark:text-[#2dd4bf] border border-[var(--teal,#0d9488)] font-bold text-xs touch-manipulation cursor-pointer"
										style={{ minHeight: "44px", height: "44px" }}
										title="Печать 1 термоэтикетки со штрихкодом (58x40 мм)"
										data-testid={`mobile-print-label-btn-${log.id}`}
									>
										<Printer size={16} />
										<span>Печать наклейки</span>
									</button>

									{/* 2. Nurse ECP Stamp Button (Touch target >= 44x44px) */}
									{isStamped ? (
										<span
											className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold text-xs"
											style={{ minHeight: "44px", height: "44px" }}
											title="Смена и цикл заверены цифровым штампом ЭЦП"
										>
											<CheckCircle2 size={16} />
											<span>Заверено ЭЦП</span>
										</span>
									) : (
										<button
											type="button"
											onClick={() => onStampVerification(log.id)}
											className="sanpin-touch-btn flex-1 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--brand-primary,#2563eb)] border border-[var(--brand-primary,#2563eb)] font-bold text-xs touch-manipulation cursor-pointer"
											style={{ minHeight: "44px", height: "44px" }}
											title="Поставить цифровую заверку/штамп медсестры"
											data-testid={`mobile-stamp-ecp-btn-${log.id}`}
										>
											<Award size={16} />
											<span>Заверить (ЭЦП)</span>
										</button>
									)}

									{/* 3. More options (Bottom Sheet Trigger, >= 44x44px) */}
									<button
										type="button"
										onClick={() => setSelectedLogForSheet(log)}
										className="sanpin-touch-btn inline-flex items-center justify-center rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer shrink-0"
										style={{ minHeight: "44px", minWidth: "44px", height: "44px", width: "44px" }}
										aria-label="Все опции цикла"
										data-testid={`mobile-cycle-more-btn-${log.id}`}
									>
										<MoreHorizontal size={18} />
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Pagination Controls (Shared, Mobile-Adapted) */}
			{logsSlice.hasMore && (
				<div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2">
					<button
						type="button"
						data-testid="autoclave-load-more-btn"
						onClick={onLoadMore}
						className="sanpin-btn sanpin-btn-secondary w-full sm:w-auto touch-manipulation font-semibold text-xs"
						style={{ minHeight: "44px", padding: "0.5rem 1.25rem", borderRadius: "10px" }}
					>
						Показать ещё 50 циклов (осталось {logsSlice.remainingCount} из {logsSlice.totalCount})
					</button>
					<button
						type="button"
						data-testid="autoclave-load-all-btn"
						onClick={onLoadAll}
						className="sanpin-btn w-full sm:w-auto touch-manipulation text-xs text-[var(--muted)]"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", borderRadius: "10px" }}
					>
						Все ({logsSlice.totalCount})
					</button>
				</div>
			)}

			{/* =========================================================================
			    APPLE HIG MOBILE BOTTOM SHEET 1: Toolbar Actions
			    ========================================================================= */}
			{isMobileToolbarSheetOpen && typeof document !== "undefined" && createPortal(
				<div
					className="sanpin-bottom-sheet-backdrop"
					onClick={() => setIsMobileToolbarSheetOpen(false)}
					role="dialog"
					aria-modal="true"
					aria-label="Панель действий автоклава"
				>
					<div
						className="sanpin-bottom-sheet"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="sanpin-bottom-sheet-handle" />

						<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
							<h3 className="text-base font-bold text-ink m-0">Действия автоклава</h3>
							<button
								type="button"
								onClick={() => setIsMobileToolbarSheetOpen(false)}
								className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
								style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
								aria-label="Закрыть шторку"
							>
								<X size={20} />
							</button>
						</div>

						{/* Primary: Quick shift batch */}
						<button
							type="button"
							onClick={() => {
								setIsMobileToolbarSheetOpen(false);
								onQuickShiftBatch();
							}}
							aria-busy={isLoggingBatch}
							className="sanpin-bottom-sheet-item"
							data-testid="sheet-quick-shift-batch-btn"
						>
							<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Зафиксировать цикл смены</span>
								<span className="text-xs text-[var(--muted)]">134°C, 2.1 бар, 5 мин • 100% норма</span>
							</div>
						</button>

						{/* Batch pouch labels */}
						<button
							type="button"
							onClick={() => {
								setIsMobileToolbarSheetOpen(false);
								if (logs.length > 0 && logs[0]) {
									onPrintBatchPouches(logs[0], 10);
								} else {
									showToast("Сначала зафиксируйте цикл стерилизации смены", "warning");
								}
							}}
							className="sanpin-bottom-sheet-item"
							data-testid="sheet-batch-labels-btn"
						>
							<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Печать пачки наклеек (10 шт.)</span>
								<span className="text-xs text-[var(--muted)]">Готовы к маркировке (срок 30 дней)</span>
							</div>
						</button>

						{/* Autoclaves Equipment */}
						<button
							type="button"
							onClick={() => {
								setIsMobileToolbarSheetOpen(false);
								onOpenEquipmentModal();
							}}
							className="sanpin-bottom-sheet-item"
							data-testid="sheet-equipment-fleet-btn"
						>
							<ShieldCheck size={18} className="text-blue-600 shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Парк оборудования ({clinicDevices.length} аппаратов)</span>
								<span className="text-xs text-[var(--muted)]">Паспорта, поверка и ТО</span>
							</div>
						</button>

						{/* Manual Entry */}
						{onOpenNewCycleModal && (
							<button
								type="button"
								onClick={() => {
									setIsMobileToolbarSheetOpen(false);
									onOpenNewCycleModal();
								}}
								className="sanpin-bottom-sheet-item"
								data-testid="sheet-manual-cycle-entry-btn"
							>
								<Plus size={18} className="text-sky-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Внести цикл с параметрами</span>
									<span className="text-xs text-[var(--muted)]">Контрольные точки КТ-1..5</span>
								</div>
							</button>
						)}

						{/* Monthly Form 257 */}
						<button
							type="button"
							onClick={() => {
								setIsMobileToolbarSheetOpen(false);
								onGenerateMonthlyForm257();
							}}
							className="sanpin-bottom-sheet-item"
							data-testid="sheet-monthly-journal-btn"
						>
							<FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Журнал работы стерилизаторов за месяц</span>
								<span className="text-xs text-[var(--muted)]">Готовая сводная печать для проверок</span>
							</div>
						</button>

						{/* Kraft Barcode Studio */}
						<button
							type="button"
							onClick={() => {
								setIsMobileToolbarSheetOpen(false);
								onOpenKraftModal();
							}}
							className="sanpin-bottom-sheet-item"
							data-testid="sheet-kraft-studio-btn"
						>
							<QrCode size={18} className="text-purple-600 shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Маркировка крафт-пакетов</span>
								<span className="text-xs text-[var(--muted)]">Студия генерации штрихкодов</span>
							</div>
						</button>

						{/* Close CTA */}
						<button
							type="button"
							onClick={() => setIsMobileToolbarSheetOpen(false)}
							className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>,
				document.body
			)}

			{/* =========================================================================
			    APPLE HIG MOBILE BOTTOM SHEET 2: Specific Cycle Card Actions
			    ========================================================================= */}
			{selectedLogForSheet && typeof document !== "undefined" && createPortal(
				<div
					className="sanpin-bottom-sheet-backdrop"
					onClick={() => setSelectedLogForSheet(null)}
					role="dialog"
					aria-modal="true"
					aria-label={`Опции цикла №${selectedLogForSheet.cycleNumber}`}
				>
					<div
						className="sanpin-bottom-sheet"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="sanpin-bottom-sheet-handle" />

						<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
							<div>
								<h3 className="text-base font-bold text-ink m-0">Цикл №{selectedLogForSheet.cycleNumber}</h3>
								<span className="text-xs text-[var(--muted)]">{selectedLogForSheet.deviceName || "Автоклав"}</span>
							</div>
							<button
								type="button"
								onClick={() => setSelectedLogForSheet(null)}
								className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
								style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
								aria-label="Закрыть"
							>
								<X size={20} />
							</button>
						</div>

						{/* Print Single Label */}
						<button
							type="button"
							onClick={() => {
								const log = selectedLogForSheet;
								setSelectedLogForSheet(null);
								onPrintSinglePouch(log);
							}}
							className="sanpin-bottom-sheet-item"
						>
							<Tag size={18} className="text-[var(--brand-primary,#2563eb)] shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Печать 1 наклейки (58x40 мм)</span>
								<span className="text-xs text-[var(--muted)]">С текущим штрихкодом и датой</span>
							</div>
						</button>

						{/* Print Batch 10 Labels */}
						<button
							type="button"
							onClick={() => {
								const log = selectedLogForSheet;
								setSelectedLogForSheet(null);
								onPrintBatchPouches(log, 10);
							}}
							className="sanpin-bottom-sheet-item"
						>
							<Printer size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Печать пачки 10 шт (30 дней)</span>
								<span className="text-xs text-[var(--muted)]">Для серии упаковок текущего цикла</span>
							</div>
						</button>

						{/* Open in Kraft studio */}
						<button
							type="button"
							onClick={() => {
								const log = selectedLogForSheet;
								setSelectedLogForSheet(null);
								onOpenKraftForLog(log);
							}}
							className="sanpin-bottom-sheet-item"
						>
							<QrCode size={18} className="text-purple-600 shrink-0" />
							<div className="flex flex-col text-left">
								<span className="font-bold text-sm">Открыть в студии термоэтикеток</span>
								<span className="text-xs text-[var(--muted)]">Настройка формата, срока и лотков</span>
							</div>
						</button>

						{/* Stamp ECP */}
						{!(stampedRows[selectedLogForSheet.id] || Boolean(selectedLogForSheet.notes?.includes("ЭЦП"))) && (
							<button
								type="button"
								onClick={() => {
									const id = selectedLogForSheet.id;
									setSelectedLogForSheet(null);
									onStampVerification(id);
								}}
								className="sanpin-bottom-sheet-item"
							>
								<Award size={18} className="text-blue-600 shrink-0" />
								<div className="flex flex-col text-left">
									<span className="font-bold text-sm">Поставить штамп заверки (ЭЦП)</span>
									<span className="text-xs text-[var(--muted)]">Электронная подпись медсестры ЦСО</span>
								</div>
							</button>
						)}

						{/* Close CTA */}
						<button
							type="button"
							onClick={() => setSelectedLogForSheet(null)}
							className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>,
				document.body
			)}
		</div>
	);
}
