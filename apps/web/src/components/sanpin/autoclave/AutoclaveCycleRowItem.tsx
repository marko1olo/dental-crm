import type { SterilizationLogRecord } from "@dental/shared";
import { Award, CheckCircle2, MoreHorizontal, Printer, QrCode, Tag } from "lucide-react";
import React from "react";
import { AutoclaveIndicatorBadge } from "./AutoclaveIndicatorBadge";
import { getPackagingLabel } from "./types";

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
			<td style={{ width: "10%", whiteSpace: "nowrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
					<span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--ink)" }}>№{log.cycleNumber}</span>
					<span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
						{safeDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
						{safeDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
				</div>
			</td>

			<td style={{ width: "13%" }}>
				<div
					style={{ fontWeight: 600, fontSize: "0.76rem", lineHeight: 1.25, wordBreak: "break-word" }}
					title={`${deviceName}${log.serialNumber ? ` (Зав. №${log.serialNumber})` : ""}`}
				>
					{deviceName}
				</div>
			</td>

			<td style={{ width: "19%" }}>
				<div
					style={{ fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.25, wordBreak: "break-word" }}
					title={log.itemsDescription || "Стоматологический набор"}
				>
					{log.itemsDescription || "Стоматологический набор"}
				</div>
			</td>

			<td style={{ width: "11%" }}>
				<div
					style={{ fontSize: "0.74rem", color: "var(--ink)", lineHeight: 1.25, wordBreak: "break-word" }}
					title={getPackagingLabel(log.packagingType)}
				>
					{getPackagingLabel(log.packagingType)}
				</div>
			</td>

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

			<td style={{ width: "7%", whiteSpace: "nowrap" }}>
				<AutoclaveIndicatorBadge
					indicatorType={log.indicatorType}
					passed={log.passedIndicator !== false}
				/>
			</td>

			<td style={{ width: "7%", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
				{log.expiresAt && !isNaN(new Date(log.expiresAt).getTime()) ? (
					<span style={{ fontWeight: 600, color: "#059669" }}>
						{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
					</span>
				) : (
					<span style={{ color: "var(--muted)" }}>Сразу</span>
				)}
			</td>

			<td style={{ width: "10%", minWidth: "110px", whiteSpace: "nowrap", overflow: "hidden" }}>
				{log.barcode ? (
					<span
						style={{
							fontSize: "0.72rem",
							fontFamily: "monospace",
							color: "var(--brand-primary, #2563eb)",
							fontWeight: 700,
							background: "rgba(37, 99, 235, 0.08)",
							padding: "0.15rem 0.4rem",
							borderRadius: "4px",
							whiteSpace: "nowrap",
							maxWidth: "100%",
							overflow: "hidden",
							textOverflow: "ellipsis",
							display: "inline-block",
							verticalAlign: "middle",
						}}
						title={`Штрихкод крафт-пакета: ${log.barcode}`}
					>
						{log.barcode}
					</span>
				) : (
					<span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>
				)}
			</td>

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

					<div style={{ position: "relative" }}>
						<button
							type="button"
							onClick={onToggleMenu}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "24px", height: "24px", width: "24px", padding: "0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
							title="Дополнительные действия печати и этикеток"
							aria-label="Опции этикеток"
						>
							<MoreHorizontal size={13} />
						</button>

						{isMenuOpen && (
							<div
								ref={menuRef}
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
									onClick={() => onOpenKraftForLog(log)}
									style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", fontSize: "0.75rem", textAlign: "left", background: "none", border: "none", borderRadius: "4px", cursor: "pointer", color: "var(--ink)" }}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
								>
									<QrCode size={13} color="var(--brand-primary)" />
									<span>Партия в студии термоэтикеток</span>
								</button>
								<button
									type="button"
									onClick={() => onPrintSinglePouch(log)}
									style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", fontSize: "0.75rem", textAlign: "left", background: "none", border: "none", borderRadius: "4px", cursor: "pointer", color: "var(--ink)" }}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
								>
									<Tag size={13} />
									<span>Печать 1 этикетки (58x40 мм)</span>
								</button>
								<button
									type="button"
									onClick={() => onPrintBatchPouches(log, 10)}
									style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", fontSize: "0.75rem", textAlign: "left", background: "none", border: "none", borderRadius: "4px", cursor: "pointer", color: "var(--teal, #0d9488)", fontWeight: 600 }}
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
}

export default AutoclaveCycleRowItem;
