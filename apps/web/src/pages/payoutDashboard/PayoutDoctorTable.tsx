/**
 * apps/web/src/pages/payoutDashboard/PayoutDoctorTable.tsx
 * Presentation Table for Doctor Payout Dashboard (Mandates 8b, 8e, 8n, 8x).
 * Decomposed into modular components: PayoutDoctorRow, DoctorDrilldownPanel,
 * DoctorFormulaSummary, DoctorVisitsSubtable, DoctorLabSubtable.
 * Strictly <= 120 lines per file (Mandate 8b).
 */

import React from "react";
import { PayoutDoctorRow } from "./PayoutDoctorRow";
import type { PayoutDoctorTableProps } from "./types";

export function PayoutDoctorTable({
	report,
	isOwnScope,
	monthLabel,
	canEditRates,
	editingRateFor,
	rateDraft,
	rateSave,
	onStartEditRate,
	onCancelEditRate,
	onRateDraftChange,
	onSaveRate,
	expandedDoctorId,
	onToggleExpandDoctor,
	activeSubTabs,
	onSubTabChange,
	searchFilters,
	onSearchChange,
	visitPages,
	onPageChange,
	onOpenPayrollModal,
}: PayoutDoctorTableProps) {
	if (report.isEmpty || (report?.rows ?? []).length === 0) {
		return (
			<p className="ops-empty">
				{isOwnScope
					? `За ${monthLabel} по вашим приёмам расчёта нет: ни оплат, ни списаний материалов.`
					: `За ${monthLabel} считать не по кому: в клинике нет ни одного врача, на которого пришлась бы оплата или списание материалов. Это отсутствие записей, а не нулевая зарплата.`}
			</p>
		);
	}

	return (
		<>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<caption className="sr-only">
						Выплаты врачам за {monthLabel}: касса, ставка, удержание за материалы, лабораторию и сумма к выплате
					</caption>
					<thead>
						<tr>
							<th scope="col">Врач</th>
							<th scope="col">Касса</th>
							<th scope="col">Ставка</th>
							<th scope="col">Начислено</th>
							<th scope="col">Материалы</th>
							<th scope="col">Удержано за ЗТЛ</th>
							<th scope="col">К выплате</th>
							<th scope="col">Детали</th>
						</tr>
					</thead>
					<tbody>
						{(report?.rows ?? []).map((row) => (
							<PayoutDoctorRow
								key={row.doctorUserId}
								row={row}
								isExpanded={expandedDoctorId === row.doctorUserId}
								canEditRates={canEditRates}
								isEditingRate={editingRateFor === row.doctorUserId}
								rateDraft={rateDraft}
								rateSave={rateSave}
								onStartEditRate={onStartEditRate}
								onCancelEditRate={onCancelEditRate}
								onRateDraftChange={onRateDraftChange}
								onSaveRate={onSaveRate}
								onToggleExpandDoctor={onToggleExpandDoctor}
								activeTab={activeSubTabs[row.doctorUserId] ?? "visits"}
								onSubTabChange={onSubTabChange}
								searchQuery={searchFilters[row.doctorUserId] ?? ""}
								onSearchChange={onSearchChange}
								currentPage={visitPages[row.doctorUserId] ?? 1}
								onPageChange={onPageChange}
								onOpenPayrollModal={onOpenPayrollModal}
							/>
						))}
					</tbody>
				</table>
			</div>
			{rateSave.kind === "failed" && (
				<p className="ops-notice ops-notice--error" role="alert">{rateSave.message}</p>
			)}
			<ul className="ops-bars">
				{report.rows.map((row) => (
					<li className="ops-hint" key={`note-${row.doctorUserId}`}>
						<strong>{row.doctorName}.</strong> {row.note}
					</li>
				))}
			</ul>
		</>
	);
}
