/**
 * apps/web/src/pages/payoutDashboard/DoctorLabSubtable.tsx
 * Dental laboratory (ЗТЛ) orders subtable for a doctor.
 * Mandates 8b, 8e. File <= 120 lines.
 */

import React from "react";
import { money } from "../../AppHelpers";
import type { DoctorPayoutLabOrder } from "./types";

export interface DoctorLabSubtableProps {
	readonly labOrders?: readonly DoctorPayoutLabOrder[] | undefined;
}

export function DoctorLabSubtable({ labOrders }: DoctorLabSubtableProps) {
	if (!labOrders || labOrders.length === 0) {
		return (
			<p className="ops-empty">
				За выбранный месяц у врача нет завершенных заказ-нарядов в зуботехническую лабораторию.
			</p>
		);
	}

	return (
		<div className="ops-subtable-wrap">
			<table className="ops-subtable">
				<thead>
					<tr>
						<th scope="col">№ Наряда</th>
						<th scope="col">Зуб (FDI)</th>
						<th scope="col">Вид конструкции / Материал</th>
						<th scope="col">Пациент</th>
						<th scope="col">Статус / Дата</th>
						<th scope="col">Стоимость ЗТЛ</th>
						<th scope="col">Удержано с врача</th>
					</tr>
				</thead>
				<tbody>
					{labOrders.map((order) => (
						<tr key={order.id}>
							<td data-label="№ Наряда" className="ops-num">
								<strong>№ {order.orderNumber}</strong>
							</td>
							<td data-label="Зуб (FDI)">
								<span className="ops-badge-tooth">{order.toothFdi || "—"}</span>
							</td>
							<td data-label="Конструкция">
								<strong>{order.restorationType}</strong>
								{order.material ? (
									<>
										<br />
										<span className="ops-note">{order.material}</span>
									</>
								) : null}
							</td>
							<td data-label="Пациент">{order.patientName}</td>
							<td data-label="Статус">
								<span className="ops-state ops-state--ok">
									{order.status === "completed"
										? "Сдан"
										: order.status === "received"
											? "Получен"
											: order.status}
								</span>
								{order.completedAt ? (
									<>
										<br />
										<span className="ops-note">
											{new Date(order.completedAt).toLocaleDateString("ru-RU")}
										</span>
									</>
								) : null}
							</td>
							<td data-label="Стоимость ЗТЛ" className="ops-num">
								{money(order.priceRub)}
							</td>
							<td data-label="Удержано" className="ops-num ops-strong">
								{money(order.withheldRub)}
								<br />
								<span className="ops-note">({order.deductionPct}%)</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
