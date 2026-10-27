/**
 * apps/web/src/pages/payoutDashboard/DoctorFormulaSummary.tsx
 * Transparent doctor earnings formula card.
 * Mandates 8b, 8e, 8x (Clean domain language, no Soviet bureaucracy).
 * File <= 120 lines.
 */

import React from "react";
import { countLabel, money } from "../../AppHelpers";
import { percentLabel } from "./payoutHelpers";
import type { DoctorPayoutRow } from "./types";

export interface DoctorFormulaSummaryProps {
	readonly row: DoctorPayoutRow;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
}

export function DoctorFormulaSummary({ row, onOpenPayrollModal }: DoctorFormulaSummaryProps) {
	return (
		<div className="ops-formula-card">
			<div className="ops-formula-card__header">
				<h4>Прозрачный расчет зарплаты: {row.doctorName}</h4>
				<button
					type="button"
					className="secondary-button"
					onClick={() => onOpenPayrollModal(row)}
					title="Детальный расчет выплат врачу"
				>
					Расчет выплат врачам
				</button>
			</div>
			<div className="ops-formula-summary">
				<div className="ops-formula-equation">
					<strong>Формула:</strong> К выплате = (Выручка × % ставки) − Материалы − ЗТЛ + Премии
				</div>
				<div className="ops-formula-grid">
					<div className="ops-formula-item">
						<span className="ops-formula-item__label">1. Касса (Выручка)</span>
						<span className="ops-formula-item__val">{money(row.revenueRub)}</span>
						<span className="ops-formula-item__sub">
							{countLabel(row.paymentCount, "оплата", "оплаты", "оплат")}
						</span>
					</div>
					<div className="ops-formula-item">
						<span className="ops-formula-item__label">2. Ставка врача</span>
						<span className="ops-formula-item__val">{percentLabel(row.commissionPct)}</span>
						<span className="ops-formula-item__sub">
							начислено {money(row.accruedRub ?? 0)}
						</span>
					</div>
					<div className="ops-formula-item">
						<span className="ops-formula-item__label">3. Списано материалов</span>
						<span className="ops-formula-item__val ops-formula-item__val--minus">
							− {money(row.withheldMaterialRub ?? 0)}
						</span>
						<span className="ops-formula-item__sub">
							себест. {money(row.materialCostRub)} ({row.materialDeductionPct ?? 100}%)
						</span>
					</div>
					<div className="ops-formula-item">
						<span className="ops-formula-item__label">4. Удержано за ЗТЛ</span>
						<span className="ops-formula-item__val ops-formula-item__val--minus">
							− {money(row.withheldLabRub ?? 0)}
						</span>
						<span className="ops-formula-item__sub">
							{countLabel(row.labOrdersCount ?? 0, "наряд", "наряда", "нарядов")} на {money(row.labCostRub ?? 0)}
						</span>
					</div>
					<div className="ops-formula-item ops-formula-item--total">
						<span className="ops-formula-item__label">ИТОГО К ВЫПЛАТЕ</span>
						<span className="ops-formula-item__val ops-formula-item__val--total">
							{money(row.payoutRub ?? 0)}
						</span>
						<span className="ops-formula-item__sub">
							{row.payoutRub && row.payoutRub < 0 ? "долг врача клинике" : "начислено к выплате"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
