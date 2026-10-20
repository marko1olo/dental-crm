/**
 * MobileGroupedCardList.tsx — Мобильный сгруппированный список приёмов (Apple HIG < 768px).
 */

import React from "react";
import type { DoctorEarningsAppointmentItem } from "./types.js";

export interface MobileGroupedCardListProps {
	readonly appointments: readonly DoctorEarningsAppointmentItem[];
}

export const MobileGroupedCardList: React.FC<MobileGroupedCardListProps> = ({
	appointments,
}) => {
	return (
		<div className="dpr-mobile-list" data-testid="dpr-mobile-card-list">
			{appointments.map((apt) => (
				<div key={apt.appointmentId} className="dpr-mobile-card">
					<div className="dpr-mobile-card-header">
						<div>
							<div className="dpr-mobile-card-patient">
								{apt.patientFullName}
							</div>
							<div className="dpr-mobile-card-cardnum">
								{apt.cardNumber} •{" "}
								{apt.startsAtIso.split("T")[1]?.slice(0, 5) || "09:00"}
							</div>
						</div>
						{apt.paymentStatus === "paid" ? (
							<span className="dpr-badge-paid">Оплачено</span>
						) : (
							<span className="dpr-badge-unpaid">Ожидает кассу</span>
						)}
					</div>

					{/* Services List inside card */}
					<div className="flex flex-col gap-1">
						{apt.services.map((srv, idx) => (
							<div key={idx} className="dpr-mobile-service-row">
								<div className="text-[var(--ink)] font-medium">
									{srv.nameRu}{" "}
									<span className="dpr-text-teal">
										({srv.commissionPercent}%)
									</span>
								</div>
								<div className="text-right shrink-0 ml-2">
									<div>{srv.priceRub.toLocaleString("ru-RU")} ₽</div>
									{srv.labCostRub > 0 && (
										<div className="dpr-text-muted-deduction text-[10px]">
											ЗТЛ: −{srv.labCostRub.toLocaleString("ru-RU")} ₽
										</div>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Card Footer with Doctor Accrual */}
					<div className="dpr-mobile-card-footer">
						<span className="text-[var(--muted)]">
							Выручка: {apt.grossRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="dpr-text-teal text-sm">
							Врачу: +{apt.doctorEarnedRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			))}
		</div>
	);
};
