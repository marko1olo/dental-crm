/**
 * DoctorPayoutHistoryList.tsx — Список смен и приемов врача в мобильном кошельке.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { countLabel, money } from "../../../AppHelpers";
import { Calendar, ChevronRight } from "lucide-react";
import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";
import type { ShiftSummaryItem } from "./types.js";
import { DoctorShiftDetailSheet } from "./DoctorShiftDetailSheet.js";

export { computeDoctorShifts } from "./doctorShiftsComputer.js";

export interface DoctorPayoutHistoryListProps {
	readonly shifts: readonly ShiftSummaryItem[];
	readonly activeShift: ShiftSummaryItem | null;
	readonly onSelectShiftDate: (date: string | null) => void;
	readonly currentDoctor: DoctorPayoutRow;
}

export function DoctorPayoutHistoryList({
	shifts,
	activeShift,
	onSelectShiftDate,
	currentDoctor,
}: DoctorPayoutHistoryListProps) {
	return (
		<>
			<section aria-labelledby="wallet-shifts-heading">
				<div className="doctor-wallet-section-header">
					<h4 id="wallet-shifts-heading" className="doctor-wallet-section-title">
						История смен и приёмов
					</h4>
					<span className="doctor-wallet-section-count">
						{countLabel(shifts.length, "смена", "смены", "смен")}
					</span>
				</div>

				{shifts.length === 0 ? (
					<div className="doctor-wallet-empty">
						<Calendar size={20} className="doctor-wallet-empty-icon" />
						<p className="doctor-wallet-empty-sub">
							В этом месяце нет зафиксированных приёмов врача.
						</p>
					</div>
				) : (
					<div className="doctor-wallet-shifts-group">
						{shifts.map((shift) => (
							<div
								key={shift.date}
								className="doctor-wallet-shift-row"
								onClick={() => onSelectShiftDate(shift.date)}
								role="button"
								tabIndex={0}
								aria-label={`Смена ${shift.formattedDate}`}
							>
								<div className="doctor-wallet-shift-left">
									<div className="doctor-wallet-shift-cal-icon">
										<Calendar size={18} />
									</div>
									<div className="doctor-wallet-shift-details">
										<span className="doctor-wallet-shift-date">{shift.formattedDate}</span>
										<span className="doctor-wallet-shift-meta">
											{shift.estimatedHours} ч смены • {countLabel(shift.patientCount, "пациент", "пациента", "пациентов")}
										</span>
									</div>
								</div>

								<div className="doctor-wallet-shift-right">
									<span className="doctor-wallet-shift-amount">+{money(shift.shiftEarnedRub)}</span>
									<ChevronRight size={18} className="doctor-wallet-shift-chevron" />
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{activeShift && (
				<DoctorShiftDetailSheet
					activeShift={activeShift}
					currentDoctor={currentDoctor}
					onClose={() => onSelectShiftDate(null)}
				/>
			)}
		</>
	);
}
