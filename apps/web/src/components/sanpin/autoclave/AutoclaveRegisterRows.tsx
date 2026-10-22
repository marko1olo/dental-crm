import type { SterilizationLogRecord } from "@dental/shared";
import React, { useEffect, useRef, useState } from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import type { AutoclaveLogsSlice } from "./types";
import { AutoclaveCycleRowItem } from "./AutoclaveCycleRowItem";
import { AutoclaveRegisterEmptyState } from "./AutoclaveRegisterEmptyState";
import { AutoclaveRegisterTableHeader } from "./AutoclaveRegisterTableHeader";

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
				<AutoclaveRegisterTableHeader />
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
								Загрузка журнала стерилизаторов...
							</td>
						</tr>
					) : filteredLogs.length === 0 ? (
						<AutoclaveRegisterEmptyState
							hasDevices={clinicDevices.length > 0}
							onOpenEquipmentModal={onOpenEquipmentModal}
							onOpenNewCycleModal={onOpenNewCycleModal}
							onOpenJournal257Modal={onOpenJournal257Modal}
							onOpenKraftModal={onOpenKraftModal}
						/>
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
