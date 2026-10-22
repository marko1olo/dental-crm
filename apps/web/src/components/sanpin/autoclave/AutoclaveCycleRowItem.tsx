import type { SterilizationLogRecord } from "@dental/shared";
import { Award, CheckCircle2 } from "lucide-react";
import React from "react";
import { AutoclaveCycleInfoCells } from "./AutoclaveCycleInfoCells";
import { AutoclaveCycleResultCells } from "./AutoclaveCycleResultCells";
import { AutoclaveRowActionMenu } from "./AutoclaveRowActionMenu";

export interface AutoclaveCycleRowItemProps {
	readonly log: SterilizationLogRecord;
	readonly isStamped: boolean;
	readonly onStampVerification: (logId: string) => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
	readonly isMenuOpen: boolean;
	readonly onToggleMenu: () => void;
	readonly menuRef?: React.RefObject<HTMLDivElement | null> | undefined;
}

export function AutoclaveCycleRowItem({
	log,
	isStamped,
	onStampVerification,
	onPrintBatchPouches,
	onPrintSinglePouch,
	onOpenKraftForLog,
	isMenuOpen,
	onToggleMenu,
	menuRef,
}: AutoclaveCycleRowItemProps) {
	const rawDate = log.timestamp || (log as any).date || (log as any).createdAt;
	const safeDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : new Date();
	const deviceName = log.deviceName || (log as any).sterilizerName || "Автоклав Melag Vacuklav 43B+";

	return (
		<tr
			className="sanpin-log-row"
			style={{ minHeight: "44px", contentVisibility: "auto", containIntrinsicSize: "1px 44px", contain: "content" }}
		>
			<AutoclaveCycleInfoCells log={log} safeDate={safeDate} deviceName={deviceName} />

			<td style={{ width: "10%", whiteSpace: "nowrap" }}>
				<div style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
					<span style={{ fontWeight: 700, color: "var(--ink)" }}>
						{log.temperatureCelsius || (log as any).temperature || 134} °C
					</span>
					<span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
						{" "}· {log.pressureBar || 2.1} б · {log.durationMin || (log as any).durationMinutes || 5} м
					</span>
				</div>
			</td>

			<AutoclaveCycleResultCells log={log} />

			<td style={{ width: "13%", minWidth: "120px", whiteSpace: "nowrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
					<span style={{ fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }} title={log.operatorName || "Сотрудник"}>
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

					<AutoclaveRowActionMenu
						log={log}
						isMenuOpen={isMenuOpen}
						onToggleMenu={onToggleMenu}
						menuRef={menuRef}
						onOpenKraftForLog={onOpenKraftForLog}
						onPrintSinglePouch={onPrintSinglePouch}
						onPrintBatchPouches={onPrintBatchPouches}
					/>
				</div>
			</td>
		</tr>
	);
}

export default AutoclaveCycleRowItem;
