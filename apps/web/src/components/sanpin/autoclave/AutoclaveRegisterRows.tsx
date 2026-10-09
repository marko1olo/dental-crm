import type { SterilizationLogRecord } from "@dental/shared";
import {
	Award,
	CheckCircle2,
	MoreHorizontal,
	Plus,
	Printer,
	QrCode,
	ShieldCheck,
	Sparkles,
	Tag,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";
import type { AutoclaveLogsSlice } from "./types";
import { getPackagingLabel } from "./types";

export interface AutoclaveRegisterRowsProps {
	readonly logsSlice: AutoclaveLogsSlice;
	readonly filteredLogs: SterilizationLogRecord[];
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
	readonly onOpenNewCycleModal?: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenKraftModal: () => void;
}

export function AutoclaveRegisterRows({
	logsSlice,
	filteredLogs,
	loading,
	clinicDevices,
	stampedRows,
	onStampVerification,
	onOpenEquipmentModal,
	onPrintBatchPouches,
	onPrintSinglePouch,
	onOpenKraftForLog,
	onOpenNewCycleModal,
	onOpenJournal257Modal,
	onOpenKraftModal,
}: AutoclaveRegisterRowsProps) {
	const [openDesktopRowMenuId, setOpenDesktopRowMenuId] = useState<string | null>(null);
	const desktopRowMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				desktopRowMenuRef.current &&
				!desktopRowMenuRef.current.contains(event.target as Node)
			) {
				setOpenDesktopRowMenuId(null);
			}
		};
		if (openDesktopRowMenuId) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [openDesktopRowMenuId]);

	return (
		<div
			className="hidden md:block w-full overflow-x-auto min-w-0"
			style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}
		>
			<table
				className="sanpin-table w-full min-w-0"
				style={{ width: "100%", minWidth: "1180px", tableLayout: "auto" }}
			>
				<thead>
					<tr>
						<th
							style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Дата / № Цикла
						</th>
						<th style={{ fontSize: "0.825rem", width: "130px", minWidth: "120px" }} className="min-w-0">
							Марка аппарата
						</th>
						<th style={{ fontSize: "0.825rem", width: "180px", minWidth: "165px" }} className="min-w-0">
							Стерилизуемые изделия
						</th>
						<th style={{ fontSize: "0.825rem", width: "140px", minWidth: "130px" }} className="min-w-0">
							Вид упаковки
						</th>
						<th
							style={{ fontSize: "0.825rem", width: "120px", minWidth: "115px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Режим (T°, P, t)
						</th>
						<th
							style={{ fontSize: "0.825rem", width: "100px", minWidth: "95px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Индикатор
						</th>
						<th
							style={{ fontSize: "0.825rem", width: "100px", minWidth: "95px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Срок годности
						</th>
						<th
							style={{ fontSize: "0.825rem", width: "215px", minWidth: "205px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Штрихкод / Статус
						</th>
						<th
							style={{ fontSize: "0.825rem", width: "140px", minWidth: "135px", whiteSpace: "nowrap" }}
							className="whitespace-nowrap shrink-0"
						>
							Заверка / Оператор
						</th>
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
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "0.75rem",
										maxWidth: "560px",
										margin: "0 auto",
									}}
								>
									<ShieldCheck size={42} color="var(--brand-primary, #2563eb)" />
									<div
										style={{
											fontWeight: 700,
											fontSize: "1.1rem",
											color: "var(--ink, #0f172a)",
										}}
									>
										В клинике не зарегистрировано автоклавов
									</div>
									<div
										style={{
											fontSize: "0.875rem",
											color: "var(--muted, #64748b)",
											lineHeight: 1.45,
										}}
									>
										Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения журнала
										стерилизации и генерации крафт-пакетов.
									</div>
									<button
										type="button"
										onClick={onOpenEquipmentModal}
										className="sanpin-btn sanpin-btn-primary"
										style={{
											minHeight: "44px",
											padding: "0.5rem 1.5rem",
											fontSize: "0.875rem",
											fontWeight: 700,
											display: "inline-flex",
											alignItems: "center",
											gap: "0.4rem",
											marginTop: "0.25rem",
										}}
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
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: "0.75rem",
										maxWidth: "560px",
										margin: "0 auto",
									}}
								>
									<Sparkles size={36} color="var(--brand-primary, #2563eb)" />
									<div
										style={{
											fontWeight: 700,
											fontSize: "1rem",
											color: "var(--ink, #0f172a)",
										}}
									>
										Журнал стерилизации пуст
									</div>
									<div
										style={{
											fontSize: "0.825rem",
											color: "var(--muted, #64748b)",
											lineHeight: 1.45,
										}}
									>
										В выбранном периоде нет записей циклов стерилизации. Запустите новый цикл
										или сформируйте партию крафт-пакетов.
									</div>
									<div
										style={{
											display: "flex",
											gap: "0.5rem",
											flexWrap: "wrap",
											justifyContent: "center",
										}}
									>
										<button
											type="button"
											onClick={onOpenNewCycleModal || onOpenJournal257Modal}
											className="sanpin-btn sanpin-btn-primary"
											style={{
												minHeight: "38px",
												padding: "0.4rem 1rem",
												fontSize: "0.825rem",
												fontWeight: 700,
												display: "inline-flex",
												alignItems: "center",
												gap: "0.35rem",
											}}
											data-testid="empty-state-new-cycle-btn"
										>
											<Plus size={14} /> Внести цикл стерилизации
										</button>
										<button
											type="button"
											onClick={onOpenKraftModal}
											className="sanpin-btn sanpin-btn-secondary"
											style={{
												minHeight: "38px",
												padding: "0.4rem 1rem",
												fontSize: "0.825rem",
												fontWeight: 600,
												display: "inline-flex",
												alignItems: "center",
												gap: "0.35rem",
											}}
										>
											<QrCode size={14} /> Печать крафт-пакетов
										</button>
									</div>
								</div>
							</td>
						</tr>
					) : (
						logsSlice.visibleItems.map((log) => {
							const isStamped =
								stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
							const rawDate =
								log.timestamp || (log as any).date || (log as any).createdAt;
							const safeDate =
								rawDate && !isNaN(new Date(rawDate).getTime())
									? new Date(rawDate)
									: new Date();
							const deviceName =
								log.deviceName ||
								(log as any).sterilizerName ||
								"Автоклав Melag Vacuklav 43B+";

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
									<td
										style={{ width: "140px", minWidth: "130px" }}
										className="whitespace-nowrap shrink-0"
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.35rem",
												whiteSpace: "nowrap",
											}}
										>
											<span
												style={{
													fontWeight: 700,
													fontSize: "0.825rem",
													color: "var(--ink)",
												}}
											>
												№{log.cycleNumber}
											</span>
											<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
												{safeDate.toLocaleDateString("ru-RU", {
													day: "2-digit",
													month: "2-digit",
												})}{" "}
												{safeDate.toLocaleTimeString("ru-RU", {
													hour: "2-digit",
													minute: "2-digit",
												})}
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

									<td
										style={{ width: "120px", minWidth: "115px", whiteSpace: "nowrap" }}
										className="whitespace-nowrap shrink-0"
									>
										<div style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
											<span style={{ fontWeight: 700, color: "var(--ink)" }}>
												{log.temperatureCelsius || (log as any).temperature || 134} °C
											</span>
											<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
												{" "}
												· {log.pressureBar || 2.1} б ·{" "}
												{log.durationMin || (log as any).durationMinutes || 5} мин
											</span>
										</div>
									</td>

									<td
										style={{ width: "100px", minWidth: "95px" }}
										className="whitespace-nowrap shrink-0"
									>
										<span
											className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap"
											style={{
												fontSize: "0.75rem",
												padding: "0.15rem 0.45rem",
												whiteSpace: "nowrap",
												flexShrink: 0,
											}}
										>
											<CheckCircle2 size={12} className="shrink-0" />{" "}
											{log.indicatorType === "class6_emulating" ? "Класс 6" : "Класс 5"}
										</span>
									</td>

									<td
										style={{
											width: "100px",
											minWidth: "95px",
											fontSize: "0.8rem",
											whiteSpace: "nowrap",
										}}
										className="whitespace-nowrap shrink-0"
									>
										{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
											<span style={{ fontWeight: 600, color: "#059669" }}>
												{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
											</span>
										) : (
											<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
										)}
									</td>

									<td
										style={{ width: "215px", minWidth: "205px" }}
										className="whitespace-nowrap shrink-0"
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.4rem",
												whiteSpace: "nowrap",
											}}
										>
											<span
												className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap"
												style={{
													fontSize: "0.75rem",
													padding: "0.15rem 0.45rem",
													whiteSpace: "nowrap",
													flexShrink: 0,
												}}
												title="Стерилизация завершена успешно, контроль пройден (100% норма)"
											>
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
												<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													—
												</span>
											)}
										</div>
									</td>

									<td
										style={{ width: "140px", minWidth: "135px" }}
										className="whitespace-nowrap shrink-0"
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.25rem",
												whiteSpace: "nowrap",
											}}
										>
											<span
												style={{
													fontSize: "0.775rem",
													fontWeight: 600,
													maxWidth: "70px",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
												title={log.operatorName || "Сотрудник"}
											>
												{log.operatorName ? log.operatorName.split(" ")[0] : "Сотрудник"}
											</span>

											{isStamped ? (
												<span
													className="sanpin-badge-gov"
													style={{
														minHeight: "22px",
														fontSize: "0.7rem",
														padding: "0.1rem 0.35rem",
														flexShrink: 0,
													}}
												>
													<CheckCircle2 size={11} /> ЭЦП
												</span>
											) : (
												<button
													type="button"
													onClick={() => onStampVerification(log.id)}
													className="sanpin-btn sanpin-btn-secondary"
													style={{
														minHeight: "24px",
														height: "24px",
														padding: "0.1rem 0.35rem",
														fontSize: "0.7rem",
														cursor: "pointer",
														flexShrink: 0,
													}}
													title="Поставить штамп заверки ответственного"
												>
													<Award size={11} color="var(--brand-primary)" /> ЭЦП
												</button>
											)}

											<div style={{ position: "relative" }}>
												<button
													type="button"
													onClick={() =>
														setOpenDesktopRowMenuId(
															openDesktopRowMenuId === log.id ? null : log.id
														)
													}
													className="sanpin-btn sanpin-btn-secondary"
													style={{
														minHeight: "24px",
														height: "24px",
														width: "24px",
														padding: "0",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														flexShrink: 0,
													}}
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
	);
}
