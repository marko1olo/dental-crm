/**
 * apps/web/src/pages/payoutDashboard/DoctorDrilldownPanel.tsx
 * Interactive drilldown panel with formula summary and registry subtabs.
 * Mandates 8b, 8e. File <= 120 lines.
 */

import React from "react";
import { DoctorFormulaSummary } from "./DoctorFormulaSummary";
import { DoctorVisitsSubtable } from "./DoctorVisitsSubtable";
import { DoctorLabSubtable } from "./DoctorLabSubtable";
import type { DoctorPayoutRow } from "./types";

export interface DoctorDrilldownPanelProps {
	readonly row: DoctorPayoutRow;
	readonly activeTab: "visits" | "lab";
	readonly onSubTabChange: (doctorId: string, tab: "visits" | "lab") => void;
	readonly searchQuery: string;
	readonly onSearchChange: (doctorId: string, query: string) => void;
	readonly currentPage: number;
	readonly onPageChange: (doctorId: string, page: number) => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
}

export function DoctorDrilldownPanel({
	row,
	activeTab,
	onSubTabChange,
	searchQuery,
	onSearchChange,
	currentPage,
	onPageChange,
	onOpenPayrollModal,
}: DoctorDrilldownPanelProps) {
	return (
		<tr className="ops-drilldown-row">
			<td colSpan={8} className="ops-drilldown-cell" data-label="Детализация">
				<div className="ops-drilldown-container">
					{/* 1. Карточка прозрачной формулы расчета */}
					<DoctorFormulaSummary row={row} onOpenPayrollModal={onOpenPayrollModal} />

					{/* 2. Переключатель вкладок реестров */}
					<div className="ops-drilldown-tabs" role="tablist">
						<button
							type="button"
							role="tab"
							className={`ops-drilldown-tab ${activeTab === "visits" ? "ops-drilldown-tab--active" : ""}`}
							onClick={() => onSubTabChange(row.doctorUserId, "visits")}
						>
							Реестр смен и приемов ({row.visits?.length ?? 0})
						</button>
						<button
							type="button"
							role="tab"
							className={`ops-drilldown-tab ${activeTab === "lab" ? "ops-drilldown-tab--active" : ""}`}
							onClick={() => onSubTabChange(row.doctorUserId, "lab")}
						>
							Заказ-наряды лаборатории ЗТЛ ({row.labOrders?.length ?? 0})
						</button>
					</div>

					{/* 3. Контент выбранной вкладки */}
					{activeTab === "visits" ? (
						<DoctorVisitsSubtable
							doctorUserId={row.doctorUserId}
							visits={row.visits ?? []}
							searchQuery={searchQuery}
							onSearchChange={onSearchChange}
							currentPage={currentPage}
							onPageChange={onPageChange}
						/>
					) : (
						<DoctorLabSubtable labOrders={row.labOrders} />
					)}
				</div>
			</td>
		</tr>
	);
}
