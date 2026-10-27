/**
 * apps/web/src/pages/payoutDashboard/DoctorVisitRow.tsx
 * Presentation row for a single paid visit with services and materials.
 * Mandates 8b, 8e, 8x. File <= 120 lines.
 */

import React from "react";
import { money } from "../../AppHelpers";
import type { DoctorPayoutVisit } from "./types";

export function DoctorVisitRow({ visit }: { readonly visit: DoctorPayoutVisit }) {
	const paidDate = new Date(visit.paidAt);
	const dateStr = paidDate.toLocaleDateString("ru-RU");
	const timeStr = paidDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

	return (
		<tr>
			<td data-label="Дата и время" className="ops-num">
				{dateStr} {timeStr}
			</td>
			<td data-label="Пациент и карта">
				<strong>{visit.patientName}</strong>
				<br />
				<span className="ops-note">Карта: {visit.medicalCardNumber}</span>
			</td>
			<td data-label="Оказанные услуги">
				{visit.services.length === 0 ? (
					<span className="ops-note">услуги не детализированы</span>
				) : (
					<ul className="ops-item-list">
						{visit.services.map((srv) => (
							<li key={srv.id} className="ops-item-entry">
								{srv.order804nCode ? (
									<span className="ops-badge-804n" title="Код услуги прейскуранта">
										{srv.order804nCode}
									</span>
								) : null}{" "}
								{srv.toothCode ? <span className="ops-badge-tooth">Зуб {srv.toothCode}</span> : null}{" "}
								{srv.title} — <strong>{srv.quantity > 1 ? `${srv.quantity} × ` : ""}{money(srv.priceRub)}</strong>
							</li>
						))}
					</ul>
				)}
			</td>
			<td data-label="Списанные материалы">
				{visit.materials.length === 0 ? (
					<span className="ops-state ops-state--muted">нет списаний</span>
				) : (
					<ul className="ops-item-list">
						{visit.materials.map((mat) => (
							<li key={mat.id} className="ops-item-entry">
								{mat.name}: {mat.quantity} {mat.unit} ({money(mat.totalCostRub)})
							</li>
						))}
					</ul>
				)}
			</td>
			<td data-label="Сумма оплаты" className="ops-num ops-strong">{money(visit.revenueRub)}</td>
		</tr>
	);
}
