import React from "react";
import { RosterHeaderToolbar } from "./RosterHeaderToolbar";
import { RosterT13Row } from "./RosterT13Row";
import type { MonthNormInfo, T13RowData } from "./types";

interface RosterT13TabViewProps {
	monthNormObj?: MonthNormInfo | undefined;
	selectedYear: number;
	t13Matrix: T13RowData[];
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenInternalT13Modal: () => void;
	onExportT13: () => void;
	onClose: () => void;
}

export const RosterT13TabView: React.FC<RosterT13TabViewProps> = ({
	monthNormObj,
	selectedYear,
	t13Matrix,
	onOpenT13Timesheet,
	onOpenInternalT13Modal,
	onExportT13,
	onClose,
}) => {
	const secondHalfCols = t13Matrix[0]?.days.length ? t13Matrix[0].days.length - 15 : 16;
	const secondHalfEnd = t13Matrix[0]?.days.length || 31;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<RosterHeaderToolbar
				monthNormObj={monthNormObj}
				selectedYear={selectedYear}
				onOpenT13Timesheet={onOpenT13Timesheet}
				onOpenInternalT13Modal={onOpenInternalT13Modal}
				onExportT13={onExportT13}
				onClose={onClose}
			/>

			<div className="t13-table-wrapper">
				<table className="t13-table">
					<thead>
						<tr>
							<th rowSpan={2} style={{ width: "3rem" }}>Таб №</th>
							<th rowSpan={2} style={{ width: "12rem", textAlign: "left" }}>ФИО сотрудника</th>
							<th rowSpan={2} style={{ width: "10rem", textAlign: "left" }}>Должность</th>
							<th colSpan={15}>1-я половина месяца (1–15)</th>
							<th colSpan={secondHalfCols}>2-я половина (16–{secondHalfEnd})</th>
							<th colSpan={4}>Итого за месяц</th>
						</tr>
						<tr>
							{t13Matrix[0]?.days.map((d) => (
								<th key={d.dayOfMonth} style={{ minWidth: "1.75rem" }}>{d.dayOfMonth}</th>
							))}
							<th>Дней</th>
							<th>Часов</th>
							<th>Ночных</th>
							<th>Сверхуроч.</th>
						</tr>
					</thead>
					<tbody>
						{t13Matrix.length === 0 ? (
							<tr>
								<td colSpan={36} style={{ textAlign: "center", padding: "3rem 1rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
										<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem" }}>
											Нет данных для формирования табеля учёта времени (сотрудники не добавлены).
										</div>
										<a
											href="/settings?tab=staff"
											className="roster-btn roster-btn-secondary"
											style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "36px" }}
										>
											+ Добавить врачей и ассистентов
										</a>
									</div>
								</td>
							</tr>
						) : (
							t13Matrix.map((row) => <RosterT13Row key={row.tabNumber} row={row} />)
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
