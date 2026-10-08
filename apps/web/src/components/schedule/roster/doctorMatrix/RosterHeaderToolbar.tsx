/**
 * DENTE Dental CRM — Roster Header Toolbar (Layer 1)
 * Compliance: TK RF Article 350, Form T-13, Mandates 8e, 8d
 */

import React from "react";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import type { RosterHeaderToolbarProps } from "./types";

export const RosterHeaderToolbar: React.FC<RosterHeaderToolbarProps> = React.memo(
	function RosterHeaderToolbar({
		monthNormObj,
		selectedYear,
		onOpenT13Timesheet,
		onOpenInternalT13Modal,
		onExportT13,
		onClose,
	}) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div>
					<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
						Табель рабочего времени — {monthNormObj?.nameRu} {selectedYear}
					</h3>
					<span
						style={{
							fontSize: "0.8125rem",
							color: "var(--muted, #64748b)",
						}}
					>
						Норма: {monthNormObj?.normHours33 || 138.6} ч (врачи: 33 ч/нед,
						ассистенты: 39 ч/нед)
					</span>
				</div>
				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						className="roster-btn roster-btn-secondary"
						onClick={() => {
							if (onOpenT13Timesheet) {
								onClose();
								onOpenT13Timesheet();
							} else {
								onOpenInternalT13Modal();
							}
						}}
						style={{ minHeight: "44px" }}
						title="Интерактивный табель рабочего времени"
					>
						<CalendarIcon size={16} />
						<span>Интерактивный табель</span>
					</button>
					<button
						type="button"
						className="roster-btn roster-btn-secondary"
						onClick={onExportT13}
						style={{ minHeight: "44px" }}
					>
						<Download size={16} />
						<span>Скачать CSV (Excel / 1C)</span>
					</button>
				</div>
			</div>
		);
	},
);
