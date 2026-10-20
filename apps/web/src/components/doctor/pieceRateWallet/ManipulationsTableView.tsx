/**
 * ManipulationsTableView.tsx — Детальная таблица выполненных манипуляций (десктоп >= 768px).
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { DoctorEarningsAppointmentItem } from "./types.js";

export interface ManipulationsTableViewProps {
	readonly appointments: readonly DoctorEarningsAppointmentItem[];
}

export const ManipulationsTableView: React.FC<ManipulationsTableViewProps> = ({
	appointments,
}) => {
	return (
		<div className="dpr-table-container">
			<table className="dpr-table" data-testid="dpr-manipulations-table">
				<thead>
					<tr>
						<th>Время и пациент</th>
						<th>Выполненная процедура</th>
						<th>Прайс</th>
						<th>Вычет ЗТЛ</th>
						<th>Ставка</th>
						<th>Начислено</th>
						<th>Статус оплаты</th>
					</tr>
				</thead>
				<tbody>
					{appointments.flatMap((apt) =>
						apt.services.map((srv, srvIdx) => {
							const matchedLab =
								apt.labOrders.length > 0 ? apt.labOrders[0] : null;
							return (
								<tr key={`${apt.appointmentId}-${srv.id}-${srvIdx}`}>
									<td>
										<div className="font-bold text-[var(--ink)]">
											{apt.patientFullName}
										</div>
										<div className="text-[11px] text-[var(--muted)]">
											{apt.cardNumber} •{" "}
											{apt.startsAtIso.split("T")[1]?.slice(0, 5) || "09:00"}
										</div>
									</td>
									<td>
										<div className="font-semibold text-[var(--ink)]">
											{srv.nameRu}
										</div>
										<div className="text-[11px] text-[var(--muted)]">
											{srv.categoryRu}
										</div>
									</td>
									<td className="font-semibold whitespace-nowrap">
										{srv.priceRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="whitespace-nowrap">
										{srv.labCostRub > 0 ? (
											<span
												className="dpr-badge-ztl"
												title={
													matchedLab
														? `ЗТЛ заказ: ${matchedLab.material || "Коронка"} (${matchedLab.statusRu})`
														: "Лабораторное удержание"
												}
											>
												−{srv.labCostRub.toLocaleString("ru-RU")} ₽
											</span>
										) : (
											<span className="text-[var(--muted)] text-xs">—</span>
										)}
									</td>
									<td className="whitespace-nowrap">
										<span className="text-xs dpr-text-teal">
											{srv.commissionPercent}%
										</span>
									</td>
									<td className="whitespace-nowrap">
										<span className="dpr-text-teal">
											+{srv.earnedRub.toLocaleString("ru-RU")} ₽
										</span>
									</td>
									<td className="whitespace-nowrap">
										{apt.paymentStatus === "paid" ? (
											<span className="dpr-badge-paid">
												<CheckCircle2 size={12} />
												<span>Оплачено</span>
											</span>
										) : apt.paymentStatus === "partial" ? (
											<span className="dpr-badge-partial">
												<span>Частично</span>
											</span>
										) : (
											<span className="dpr-badge-unpaid">
												<span>Ожидает кассу</span>
											</span>
										)}
									</td>
								</tr>
							);
						}),
					)}
				</tbody>
			</table>
		</div>
	);
};
