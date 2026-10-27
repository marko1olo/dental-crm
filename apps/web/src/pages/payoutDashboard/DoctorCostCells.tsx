/**
 * apps/web/src/pages/payoutDashboard/DoctorCostCells.tsx
 * Table cells for materials and dental laboratory (ЗТЛ) deductions.
 * Mandates 8b, 8e. File <= 120 lines.
 */

import React from "react";
import { countLabel, money } from "../../AppHelpers";
import type { DoctorPayoutRow } from "./types";

export function DoctorCostCells({ row }: { readonly row: DoctorPayoutRow }) {
	return (
		<>
			<td className="ops-num" data-label="Материалы">
				{row.materialsState === "no_movements" ? (
					<span className="ops-state ops-state--muted">не списывались</span>
				) : (
					<>
						{money(row.materialCostRub)}
						{row.materialsState === "cost_missing" && (
							<>
								<br />
								<span className="ops-state ops-state--warn">без цены: {row.materialMovementsUnpriced}</span>
							</>
						)}
					</>
				)}
				{row.withheldMaterialRub !== null && row.withheldMaterialRub > 0 && (
					<>
						<br />
						<span className="ops-note">удержано {money(row.withheldMaterialRub)}</span>
					</>
				)}
			</td>
			<td className="ops-num" data-label="Удержано за ЗТЛ">
				{row.withheldLabRub != null && row.withheldLabRub > 0 ? (
					<>
						{money(row.withheldLabRub)}
						<br />
						<span className="ops-note">
							{countLabel(row.labOrdersCount ?? 0, "наряд", "наряда", "нарядов")} на {money(row.labCostRub ?? 0)}
						</span>
					</>
				) : (row.labOrdersCount ?? 0) === 0 ? (
					<span className="ops-state ops-state--muted">нет нарядов</span>
				) : (
					<>
						0,00 ₽
						<br />
						<span className="ops-note">без удержания</span>
					</>
				)}
			</td>
		</>
	);
}
