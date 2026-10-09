import type { Appointment } from "@dental/shared";
import React from "react";
import { VisitHistoryCardItem } from "./VisitHistoryCardItem";
import type { DomSliceResult } from "./types";

export interface PatientWorkspaceVisitsTabProps {
	patientAppointments: Appointment[];
	visitsSlice: DomSliceResult<Appointment>;
	staffMap: Map<string, string>;
	pageSize: number;
	onShowMore: () => void;
	handleOpenVisitCallback: (visitId: string) => void;
}

export const PatientWorkspaceVisitsTab: React.FC<PatientWorkspaceVisitsTabProps> = React.memo(
	({
		patientAppointments,
		visitsSlice,
		staffMap,
		pageSize,
		onShowMore,
		handleOpenVisitCallback,
	}) => {
		return (
			<div className="flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
						История визитов и записей ({patientAppointments.length})
					</h4>
				</div>
				{patientAppointments.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
						История приёмов пациента пуста.
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
							{(visitsSlice?.visibleItems ?? []).map((appt: any) => (
								<VisitHistoryCardItem
									key={appt.id}
									appointment={appt}
									doctorFullName={
										appt?.doctorUserId
											? (staffMap.get(appt.doctorUserId) ?? null)
											: null
									}
									onOpenVisit={handleOpenVisitCallback}
								/>
							))}
						</div>
						{visitsSlice.hasMore && (
							<div className="flex justify-center pt-1">
								<button
									type="button"
									onClick={onShowMore}
									className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
									data-testid="btn-patient-visits-show-more"
								>
									{`Показать ещё ${Math.min(pageSize, visitsSlice.remainingCount)} визитов (показано ${visitsSlice.displayedCount} из ${visitsSlice.totalCount})`}
								</button>
							</div>
						)}
					</>
				)}
			</div>
		);
	},
);
PatientWorkspaceVisitsTab.displayName = "PatientWorkspaceVisitsTab";
