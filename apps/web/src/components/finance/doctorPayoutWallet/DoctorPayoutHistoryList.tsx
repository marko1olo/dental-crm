import React from "react";
import { countLabel, money } from "../../../AppHelpers";
import { Calendar, ChevronRight, X, Package } from "lucide-react";
import type { DoctorPayoutRow, DoctorPayoutVisit } from "../../../pages/payoutDashboard/types.js";
import { formatShiftDate } from "./types.js";
import type { ShiftSummaryItem } from "./types.js";

export interface DoctorPayoutHistoryListProps {
	readonly shifts: readonly ShiftSummaryItem[];
	readonly activeShift: ShiftSummaryItem | null;
	readonly onSelectShiftDate: (date: string | null) => void;
	readonly currentDoctor: DoctorPayoutRow;
}

export function computeDoctorShifts(
	currentDoctor: DoctorPayoutRow | null,
): readonly ShiftSummaryItem[] {
	if (!currentDoctor || !currentDoctor.visits || currentDoctor.visits.length === 0) {
		return [];
	}

	const map = new Map<string, DoctorPayoutVisit[]>();
	for (const v of currentDoctor.visits) {
		const d = v.visitDate || v.paidAt.slice(0, 10);
		const list = map.get(d) ?? [];
		list.push(v);
		map.set(d, list);
	}

	const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
	const commissionRate = (currentDoctor.commissionPct ?? 0) / 100;

	return sortedDates.map((dateStr) => {
		const vList = map.get(dateStr) ?? [];
		const rev = vList.reduce((acc, v) => acc + v.revenueRub, 0);
		const earned = Math.round(rev * commissionRate);
		const { formatted, dayOfWeek } = formatShiftDate(dateStr);
		// T-13 estimated hours based on patient visits
		const estimatedHours = Math.min(12, Math.max(4, Math.round(vList.length * 1.5)));

		return {
			date: dateStr,
			formattedDate: formatted,
			dayOfWeek,
			visits: vList,
			patientCount: vList.length,
			estimatedHours,
			shiftRevenueRub: rev,
			shiftEarnedRub: earned,
		};
	});
}

export function DoctorPayoutHistoryList({
	shifts,
	activeShift,
	onSelectShiftDate,
	currentDoctor,
}: DoctorPayoutHistoryListProps) {
	return (
		<>
			{/* ── Shift & Appointment History (Grouped Inset Cards) ── */}
			<section aria-labelledby="wallet-shifts-heading">
				<div className="doctor-wallet-section-header">
					<h4 id="wallet-shifts-heading" className="doctor-wallet-section-title">
						История смен и табель Т-13
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
										<span className="doctor-wallet-shift-date">
											{shift.formattedDate}
										</span>
										<span className="doctor-wallet-shift-meta">
											{shift.estimatedHours} ч смены • {countLabel(shift.patientCount, "пациент", "пациента", "пациентов")}
										</span>
									</div>
								</div>

								<div className="doctor-wallet-shift-right">
									<span className="doctor-wallet-shift-amount">
										+{money(shift.shiftEarnedRub)}
									</span>
									<ChevronRight size={18} className="doctor-wallet-shift-chevron" />
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* ── Native iOS Bottom Sheet Drawer for Shift Drill-Down ── */}
			{activeShift && (
				<div
					className="doctor-wallet-sheet-backdrop"
					onClick={() => onSelectShiftDate(null)}
					role="dialog"
					aria-modal="true"
					aria-label={`Детализация смены ${activeShift.formattedDate}`}
				>
					<div
						className="doctor-wallet-sheet-surface"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="doctor-wallet-sheet-handle-wrap">
							<div className="doctor-wallet-sheet-handle" />
						</div>

						<div className="doctor-wallet-sheet-header">
							<h3 className="doctor-wallet-sheet-title">
								Смена {activeShift.formattedDate}
							</h3>
							<button
								type="button"
								className="doctor-wallet-sheet-close"
								onClick={() => onSelectShiftDate(null)}
								aria-label="Закрыть детализацию смены"
							>
								<X size={20} />
							</button>
						</div>

						{/* Shift summary metrics */}
						<div className="doctor-wallet-sheet-summary-badge">
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">Пациенты</span>
								<span className="doctor-wallet-sheet-summary-val">{activeShift.patientCount}</span>
							</div>
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">Касса смены</span>
								<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftRevenueRub)}</span>
							</div>
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">К начислению</span>
								<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftEarnedRub)}</span>
							</div>
						</div>

						{/* Itemized visits scroll */}
						<div className="doctor-wallet-sheet-scroll">
							{activeShift.visits.map((v) => {
								const visitEarned = Math.round(
									v.revenueRub * ((currentDoctor.commissionPct ?? 0) / 100),
								);
								return (
									<div key={v.visitId} className="doctor-wallet-visit-item">
										<div className="doctor-wallet-visit-top">
											<div>
												<h5 className="doctor-wallet-visit-patient">{v.patientName}</h5>
												<span className="doctor-wallet-visit-cardno">
													Карта № {v.medicalCardNumber}
												</span>
											</div>
											<div>
												<div className="doctor-wallet-visit-revenue">
													{money(v.revenueRub)}
												</div>
												<div className="doctor-wallet-visit-earned">
													+{money(visitEarned)}
												</div>
											</div>
										</div>

										{/* Services in this visit */}
										{v.services.map((srv) => (
											<div key={srv.id} className="doctor-wallet-service-row">
												<div className="doctor-wallet-service-name">
													{srv.toothCode && (
														<span className="doctor-wallet-tooth-badge">
															{srv.toothCode}
														</span>
													)}
													{srv.order804nCode && (
														<span className="doctor-wallet-service-code">
															{srv.order804nCode}
														</span>
													)}
													<span>{srv.title}</span>
												</div>
												<span className="doctor-wallet-service-price">
													{money(srv.priceRub * srv.quantity)}
												</span>
											</div>
										))}

										{/* Deductible materials if any */}
										{v.materials && v.materials.length > 0 && (
											<div className="doctor-wallet-service-row">
												<div className="doctor-wallet-service-name">
													<Package size={12} />
													<span>Материалы ({v.materials.length})</span>
												</div>
												<span className="doctor-wallet-service-price">
													−{money(v.materials.reduce((acc, m) => acc + m.totalCostRub, 0))}
												</span>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Sheet footer CTA */}
						<div className="doctor-wallet-sheet-footer">
							<button
								type="button"
								className="doctor-wallet-primary-cta"
								onClick={() => onSelectShiftDate(null)}
							>
								<span>Закрыть детализацию</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
