/**
 * DENTE Dental CRM — Column Focus Spreadsheet Table View (Layer 2)
 * Mandate 8b (<= 120 lines)
 */

import { CheckSquare, Square } from "lucide-react";
import type React from "react";
import { ColumnFocusTableRow } from "./ColumnFocusTableRow";
import type { ColumnFocusTableViewProps } from "./types";

export const ColumnFocusTableView: React.FC<ColumnFocusTableViewProps> = ({
	displayLeads,
	visibleLeads,
	selectedLeadIds,
	onToggleSelectLead,
	onToggleSelectAll,
	onEditLead,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
	nextStageInfo,
	visibleLimit,
	onLoadMore,
}) => {
	return (
		<div className="expanded-focus-table-container">
			<table className="expanded-focus-table">
				<thead>
					<tr>
						<th style={{ width: 36, textAlign: "center" }}>
							<button
								type="button"
								onClick={onToggleSelectAll}
								className="expanded-focus-th-checkbox"
								aria-label="Выбрать все строки"
							>
								{selectedLeadIds.size >= displayLeads.length &&
								displayLeads.length > 0 ? (
									<CheckSquare size={14} className="text-[var(--teal)]" />
								) : (
									<Square
										size={14}
										className="text-[var(--muted)] opacity-60"
									/>
								)}
							</button>
						</th>
						<th style={{ minWidth: 180 }}>Пациент / Имя</th>
						<th style={{ width: 140 }}>Телефон</th>
						<th style={{ width: 130 }}>Канал</th>
						<th style={{ minWidth: 220 }}>Жалобы / Запрос</th>
						<th style={{ width: 130 }}>Запись звонка</th>
						<th style={{ width: 150 }}>SLA / Ожидание</th>
						<th style={{ width: 110, textAlign: "right" }}>Выручка</th>
						<th style={{ width: 180, textAlign: "right" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{visibleLeads.map((lead) => (
						<ColumnFocusTableRow
							key={lead.id}
							lead={lead}
							isSelected={selectedLeadIds.has(lead.id)}
							nextStageInfo={nextStageInfo}
							onToggleSelectLead={onToggleSelectLead}
							onEditLead={onEditLead}
							onStatusChange={onStatusChange}
							onScheduleLead={onScheduleLead}
							onCreatePatient={onCreatePatient}
							onClose={onClose}
						/>
					))}
				</tbody>
			</table>
			{visibleLimit < displayLeads.length && (
				<div className="flex justify-center p-3">
					<button
						type="button"
						onClick={onLoadMore}
						className="secondary-button h-8 min-h-[32px] px-4 rounded-lg text-[13px] font-medium cursor-pointer"
					>
						Показать ещё 60 (показано {visibleLeads.length} из{" "}
						{displayLeads.length})
					</button>
				</div>
			)}
		</div>
	);
};
