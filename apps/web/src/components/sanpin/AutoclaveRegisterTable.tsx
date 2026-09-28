import type { SterilizationLogRecord } from "@dental/shared";
import {
	Award,
	CheckCircle2,
	ChevronDown,
	FileSpreadsheet,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onLoadMore: () => void;
	readonly onLoadAll: () => void;
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
	onGenerateMonthlyForm257,
	onOpenJournal257Modal,
	onOpenKraftModal,
	onLoadMore,
	onLoadAll,
}: AutoclaveRegisterTableProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);
	const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
	const rowMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setIsMoreMenuOpen(false);
			}
			if (rowMenuRef.current && !rowMenuRef.current.contains(event.target as Node)) {
				setOpenRowMenuId(null);
			}
		};
		if (isMoreMenuOpen || openRowMenuId) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMoreMenuOpen, openRowMenuId]);

	return (
		<div className="sanpin-table-wrapper w-full overflow-x-auto min-w-0" style={{ position: "relative", zIndex: 1, width: "100%", overflowX: "auto" }}>
			<div
				className="sanpin-table-toolbar min-w-0 flex-nowrap"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.5rem",
					padding: "0.35rem 0.65rem",
					background: "var(--paper-soft, #f8fafc)",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					overflowX: "auto",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 180px", minWidth: "140px", maxWidth: "320px", position: "relative" }} className="min-w-0 shrink">
					<Search size={15} style={{ position: "absolute", left: "0.75rem", color: "var(--muted, #94a3b8)" }} />
					<input
						type="text"
						placeholder="Поиск по аппарату, лотку, штрихкоду, оператору..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="sanpin-input min-w-0"
						style={{ paddingLeft: "2.2rem", minHeight: "32px", height: "32px", fontSize: "0.8125rem", width: "100%", borderRadius: "8px" }}
					/>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }} className="shrink-0 flex-nowrap">
					<select
						value={deviceFilter}
						onChange={(e) => setDeviceFilter(e.target.value)}
						className="sanpin-select shrink-0 whitespace-nowrap"
						style={{ minHeight: "32px", height: "32px", fontSize: "0.8125rem", padding: "0.25rem 0.75rem", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}
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
							cursor: "pointer",
							whiteSpace: "nowrap",
							flexShrink: 0,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
						}}
						data-testid="autoclave-equipment-btn"
						title="Управление парком автоклавов и стерилизаторов клиники"
					>
						<ShieldCheck size={14} color="#2563eb" className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Оборудование ({clinicDevices.length})</span>
					</button>

					{/* Action: 1-Клик печать наклеек (10 шт. / 30 дн.) без модалок */}
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
							cursor: "pointer",
							whiteSpace: "nowrap",
							flexShrink: 0,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
							color: "var(--teal, #0d9488)",
							borderColor: "var(--teal, #0d9488)",
							background: "var(--paper-strong, #ffffff)",
						}}
						title="1-Клик печать пачки из 10 наклеек крафт-пакетов (срок 30 дней для запечатанных пакетов) без блокирующих окон"
						data-testid="autoclave-quick-batch-labels-btn"
					>
						<Printer size={14} className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Печать наклеек (10 шт.)</span>
					</button>

					{/* Action: + Зафиксировать цикл */}
					<button
						type="button"
						onClick={onQuickShiftBatch}
						aria-busy={isLoggingBatch}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
						style={{
							minHeight: "32px",
							height: "32px",
							padding: "0.25rem 0.65rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							cursor: "pointer",
							whiteSpace: "nowrap",
							flexShrink: 0,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "8px",
						}}
						data-testid="sanpin-autoclave-new-cycle-btn"
						title="1-клик фоновая фиксация нормативного цикла стерилизации смены (Форма 257/у)"
					>
						<Plus size={14} className="shrink-0" />
						<span className="shrink-0 whitespace-nowrap">
							{isLoggingBatch ? "Фиксация..." : "Зафиксировать цикл"}
						</span>
					</button>

					{/* Dropdown: [⋮ Дополнительно] */}
					<div ref={moreMenuRef} className="shrink-0" style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
						<button
							type="button"
							onClick={() => setIsMoreMenuOpen((prev) => !prev)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "32px",
								minWidth: "32px",
								height: "32px",
								padding: "0.25rem 0.45rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.25rem",
								borderRadius: "8px",
								flexShrink: 0,
							}}
							aria-expanded={isMoreMenuOpen}
							title="Дополнительные операции: Форма 257/у, вскрытие крафт-пакетов"
							data-testid="autoclave-more-options-btn"
						>
							<MoreVertical size={14} color="var(--brand-primary, #2563eb)" />
							<ChevronDown size={11} style={{ transform: isMoreMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
						</button>

						{isMoreMenuOpen && (
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
								{/* Сгенерировать Форму 257/у за месяц */}
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
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
									<span>Печать Формы 257/у за месяц</span>
								</button>

								{/* Форма 257/у Студия */}
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
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
									<span>Студия журнала 257/у</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="w-full overflow-x-auto min-w-0" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
				<table className="sanpin-table w-full min-w-0" style={{ width: "100%", minWidth: "1080px", tableLayout: "auto" }}>
					<thead>
						<tr>
							<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Дата / № Цикла</th>
							<th style={{ fontSize: "0.825rem", width: "130px", minWidth: "120px" }} className="min-w-0">Марка аппарата</th>
							<th style={{ fontSize: "0.825rem", width: "160px", minWidth: "150px" }} className="min-w-0">Стерилизуемые изделия</th>
							<th style={{ fontSize: "0.825rem", width: "110px", minWidth: "100px" }} className="min-w-0">Вид упаковки</th>
							<th style={{ fontSize: "0.825rem", width: "120px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Режим (T°, P, t)</th>
							<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Индикатор</th>
							<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Срок годности</th>
							<th style={{ fontSize: "0.825rem", width: "175px", minWidth: "165px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Штрихкод / Статус</th>
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
											Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения официального журнала контроля работы стерилизаторов (Форма № 257/у) и генерации крафт-пакетов.
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
												onClick={onOpenJournal257Modal}
												className="sanpin-btn sanpin-btn-primary"
												style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											>
												<Plus size={14} /> Запустить цикл стерилизации
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

										<td style={{ width: "160px", minWidth: "150px" }} className="min-w-0">
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

										<td style={{ width: "110px", minWidth: "100px" }} className="min-w-0">
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
												title={
													log.packagingType === "kraft_heat_sealed"
														? "Крафт термосварной (365 дн)"
														: log.packagingType === "kraft_self_adhesive"
															? "Крафт самоклеящийся (50 сут)"
															: log.packagingType === "laminated_heat_sealed"
																? "Ламинированный пакет (180 дн)"
																: log.packagingType === "metal_cassette"
																	? "Металл. кассета (72 ч)"
																	: log.packagingType === "bix_filter"
																		? "Бикс с фильтром (20 сут)"
																		: "Без упаковки (вскрыть сразу)"
												}
											>
												{log.packagingType === "kraft_heat_sealed"
													? "Крафт термосварной"
													: log.packagingType === "kraft_self_adhesive"
														? "Крафт самоклейка"
														: log.packagingType === "laminated_heat_sealed"
															? "Ламинир. пакет"
															: log.packagingType === "metal_cassette"
																? "Металл. кассета"
																: log.packagingType === "bix_filter"
																	? "Бикс с фильтром"
																	: "Без упаковки"}
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

										<td style={{ width: "95px", minWidth: "90px" }} className="whitespace-nowrap shrink-0">
											<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap", flexShrink: 0 }}>
												<CheckCircle2 size={12} className="shrink-0" /> {log.indicatorType === "class6_emulating" ? "Класс 6" : "Класс 5 (Норма)"}
											</span>
										</td>

										<td style={{ width: "95px", minWidth: "90px", fontSize: "0.8rem", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
												<span style={{ fontWeight: 600, color: "#059669" }}>
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
											)}
										</td>

										<td style={{ width: "175px", minWidth: "165px" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
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
															padding: "0.15rem 0.4rem",
															borderRadius: "4px",
															whiteSpace: "nowrap",
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
														onClick={() => setOpenRowMenuId(openRowMenuId === log.id ? null : log.id)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "24px", height: "24px", width: "24px", padding: "0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
														title="Дополнительные действия печати и этикеток"
														aria-label="Опции этикеток"
													>
														<MoreHorizontal size={13} />
													</button>

													{openRowMenuId === log.id && (
														<div
															ref={rowMenuRef}
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
																	setOpenRowMenuId(null);
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
																	setOpenRowMenuId(null);
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
																	setOpenRowMenuId(null);
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

			{logsSlice.hasMore && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						padding: "12px 0",
					}}
				>
					<button
						type="button"
						data-testid="autoclave-load-more-btn"
						onClick={onLoadMore}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "36px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}
					>
						Показать ещё 50 циклов (осталось {logsSlice.remainingCount} из {logsSlice.totalCount})
					</button>
					<button
						type="button"
						data-testid="autoclave-load-all-btn"
						onClick={onLoadAll}
						className="sanpin-btn"
						style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}
					>
						Все ({logsSlice.totalCount})
					</button>
				</div>
			)}
		</div>
	);
}
