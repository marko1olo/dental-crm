import type { SterilizationLogRecord } from "@dental/shared";
import { Plus, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import type { AutoclaveLogsSlice } from "./types";
import { AutoclaveCycleRowItem } from "./AutoclaveCycleRowItem";

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
			className="hidden md:block w-full overflow-x-auto min-w-0 max-w-full"
			style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}
		>
			<table
				className="sanpin-table w-full min-w-0"
				style={{ width: "100%", tableLayout: "fixed" }}
			>
				<thead>
					<tr>
						<th style={{ fontSize: "0.74rem", width: "10%", whiteSpace: "nowrap" }}>
							Дата / № Цикла
						</th>
						<th style={{ fontSize: "0.74rem", width: "13%" }}>
							Марка аппарата
						</th>
						<th style={{ fontSize: "0.74rem", width: "19%" }}>
							Стерилизуемые изделия
						</th>
						<th style={{ fontSize: "0.74rem", width: "11%" }}>
							Вид упаковки
						</th>
						<th style={{ fontSize: "0.74rem", width: "10%", whiteSpace: "nowrap" }}>
							Режим (T°, P, t)
						</th>
						<th style={{ fontSize: "0.74rem", width: "7%", whiteSpace: "nowrap" }}>
							Индикатор
						</th>
						<th style={{ fontSize: "0.74rem", width: "7%", whiteSpace: "nowrap" }}>
							Годен до
						</th>
						<th style={{ fontSize: "0.74rem", width: "10%", minWidth: "110px", whiteSpace: "nowrap" }}>
							Штрихкод
						</th>
						<th
							style={{ fontSize: "0.74rem", width: "13%", minWidth: "120px", whiteSpace: "nowrap", paddingRight: "0.5rem" }}
							title="Заверка / Оператор"
						>
							Оператор / ЭЦП
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
					) : filteredLogs.length === 0 && clinicDevices.length === 0 ? (
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
									<ShieldCheck size={42} color="var(--teal, #0d9488)" />
									<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink, #0f172a)" }}>
										В клинике не зарегистрировано автоклавов
									</div>
									<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
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
									<Sparkles size={36} color="var(--teal, #0d9488)" />
									<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
										Журнал стерилизации пуст
									</div>
									<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
										В выбранном периоде нет записей циклов стерилизации. Запустите новый цикл
										или сформируйте партию крафт-пакетов.
									</div>
									<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
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
						logsSlice.visibleItems.map((log) => (
							<AutoclaveCycleRowItem
								key={log.id}
								log={log}
								isStamped={stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"))}
								onStampVerification={onStampVerification}
								onPrintBatchPouches={onPrintBatchPouches}
								onPrintSinglePouch={onPrintSinglePouch}
								onOpenKraftForLog={onOpenKraftForLog}
								isMenuOpen={openDesktopRowMenuId === log.id}
								onToggleMenu={() =>
									setOpenDesktopRowMenuId(
										openDesktopRowMenuId === log.id ? null : log.id,
									)
								}
								menuRef={openDesktopRowMenuId === log.id ? desktopRowMenuRef : undefined}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

export default AutoclaveRegisterRows;
