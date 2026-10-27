/**
 * apps/web/src/pages/payoutDashboard/PayoutDoctorRow.tsx
 * Presentation row for a single doctor in the payout table.
 * Mandates 8b, 8e. File <= 120 lines.
 */

import React, { Fragment } from "react";
import { countLabel, money } from "../../AppHelpers";
import { percentLabel } from "./payoutHelpers";
import { DoctorRateEditForm } from "./DoctorRateEditForm";
import { DoctorCostCells } from "./DoctorCostCells";
import { DoctorDrilldownPanel } from "./DoctorDrilldownPanel";
import type { PayoutDoctorRowProps } from "./types";

export function PayoutDoctorRow({
	row,
	isExpanded,
	canEditRates,
	isEditingRate,
	rateDraft,
	rateSave,
	onStartEditRate,
	onCancelEditRate,
	onRateDraftChange,
	onSaveRate,
	onToggleExpandDoctor,
	activeTab,
	onSubTabChange,
	searchQuery,
	onSearchChange,
	currentPage,
	onPageChange,
	onOpenPayrollModal,
}: PayoutDoctorRowProps) {
	return (
		<Fragment>
			<tr>
				<td className="ops-strong" data-label="Врач">
					{row.doctorName}
					{!row.isActive && <span className="ops-state ops-state--muted"> уволен</span>}
				</td>
				<td className="ops-num" data-label="Касса">
					{money(row.revenueRub)}
					<br />
					<span className="ops-note">{countLabel(row.paymentCount, "оплата", "оплаты", "оплат")}</span>
				</td>
				<td className="ops-num" data-label="Ставка">
					{isEditingRate ? (
						<DoctorRateEditForm
							doctorUserId={row.doctorUserId}
							doctorName={row.doctorName}
							rateDraft={rateDraft}
							rateSave={rateSave}
							onRateDraftChange={onRateDraftChange}
							onSaveRate={onSaveRate}
							onCancelEditRate={onCancelEditRate}
						/>
					) : (
						<>
							{row.commissionPct === null ? (
								<span className="ops-state ops-state--warn">не задана</span>
							) : (
								percentLabel(row.commissionPct)
							)}
							{canEditRates && (
								<>
									<br />
									<button
										className="secondary-button"
										type="button"
										onClick={() => onStartEditRate(row.doctorUserId, row.commissionPct)}
									>
										{row.commissionPct === null ? "Задать ставку" : "Изменить"}
									</button>
								</>
							)}
						</>
					)}
				</td>
				<td className="ops-num" data-label="Начислено">{row.accruedRub === null ? "—" : money(row.accruedRub)}</td>
				<DoctorCostCells row={row} />
				<td className="ops-num ops-strong" data-label="К выплате">
					{row.payoutRub === null ? "—" : row.payoutRub < 0 ? (
						<span className="ops-state ops-state--bad">{money(row.payoutRub)}</span>
					) : money(row.payoutRub)}
				</td>
				<td className="ops-num" data-label="Детали">
					<button
						type="button"
						className="secondary-button ops-expand-btn"
						onClick={() => onToggleExpandDoctor(row.doctorUserId)}
						aria-expanded={isExpanded}
						aria-label={`Детализация по врачу ${row.doctorName}`}
					>
						{isExpanded ? "Свернуть ▲" : "Детализация ▼"}
					</button>
				</td>
			</tr>
			{isExpanded && (
				<DoctorDrilldownPanel
					row={row}
					activeTab={activeTab}
					onSubTabChange={onSubTabChange}
					searchQuery={searchQuery}
					onSearchChange={onSearchChange}
					currentPage={currentPage}
					onPageChange={onPageChange}
					onOpenPayrollModal={onOpenPayrollModal}
				/>
			)}
		</Fragment>
	);
}
export type { PayoutDoctorRowProps };
