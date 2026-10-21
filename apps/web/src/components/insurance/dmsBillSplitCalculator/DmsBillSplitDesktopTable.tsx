/**
 * DmsBillSplitDesktopTable.tsx — Десктопная таблица распределения позиций счета визита
 */

import React from "react";
import { formatCurrencyKopecks } from "../dmsSplitEngine.js";
import type { SplitOverrideMode } from "./useDmsBillSplitLogic.js";

export interface DmsBillSplitDesktopTableProps {
	readonly effectiveLines: readonly any[];
	readonly totalBillKopecks: number;
	readonly totalDmsCoveredKopecks: number;
	readonly totalPatientTotalKopecks: number;
	readonly onSetOverride: (itemId: string, mode: SplitOverrideMode) => void;
}

export function DmsBillSplitDesktopTable({
	effectiveLines,
	totalBillKopecks,
	totalDmsCoveredKopecks,
	totalPatientTotalKopecks,
	onSetOverride,
}: DmsBillSplitDesktopTableProps) {
	return (
		<div className="dms-desktop-table-container dms-table-container">
			<table className="dms-table">
				<thead>
					<tr>
						<th>Код услуги</th>
						<th>Наименование услуги</th>
						<th>Зуб FDI</th>
						<th>Стоимость</th>
						<th>ДМС покрывает</th>
						<th>Пациент оплачивает</th>
						<th>Режим / Основание</th>
					</tr>
				</thead>
				<tbody>
					{effectiveLines.map((line) => {
						const itemId = line.lineItemId || line.id || "";
						return (
							<tr key={line.id}>
								<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }}>
									{line.serviceCode804n}
								</td>
								<td style={{ fontWeight: 500 }}>{line.serviceName}</td>
								<td style={{ fontFamily: "monospace" }}>{line.toothNumber || "—"}</td>
								<td style={{ fontFamily: "monospace", fontWeight: 600 }}>{formatCurrencyKopecks(line.totalKopecks)}</td>
								<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)", fontWeight: 700 }}>
									{formatCurrencyKopecks(line.effectiveDmsKopecks)}
								</td>
								<td style={{ fontFamily: "monospace", color: line.effectivePatientKopecks > 0 ? "var(--warn-fg, #d97706)" : "inherit", fontWeight: 700 }}>
									{formatCurrencyKopecks(line.effectivePatientKopecks)}
								</td>
								<td>
									<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
										<div className="dms-split-switcher-group">
											<button type="button" className={`dms-switcher-btn ${line.overrideMode === "auto" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "auto")} title="Автоматический расчет">
												Авто
											</button>
											<button type="button" className={`dms-switcher-btn ${line.overrideMode === "dms" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "dms")} title="100% за счет ДМС">
												ДМС
											</button>
											<button type="button" className={`dms-switcher-btn ${line.overrideMode === "patient" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "patient")} title="100% за счет пациента">
												Пациент
											</button>
											<button type="button" className={`dms-switcher-btn ${line.overrideMode === "split_50" ? "active" : ""}`} onClick={() => onSetOverride(itemId, "split_50")} title="Разделить 50/50">
												50/50
											</button>
										</div>
										<span style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
											{line.splitReason || (line.effectivePatientKopecks === 0 ? "Одобрено 100%" : "Франшиза")}
										</span>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
				<tfoot>
					<tr className="dms-table-totals">
						<td colSpan={3}>ИТОГО К РАСПРЕДЕЛЕНИЮ:</td>
						<td style={{ fontFamily: "monospace" }}>{formatCurrencyKopecks(totalBillKopecks)}</td>
						<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)" }}>{formatCurrencyKopecks(totalDmsCoveredKopecks)}</td>
						<td style={{ fontFamily: "monospace", color: "var(--warn-fg, #d97706)" }}>{formatCurrencyKopecks(totalPatientTotalKopecks)}</td>
						<td><span style={{ fontSize: "0.75rem", color: "var(--ok-fg, #059669)", fontWeight: 600 }}>ДМС + Пациент = Итого</span></td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
