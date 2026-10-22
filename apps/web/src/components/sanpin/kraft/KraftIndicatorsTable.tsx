import React from "react";
import { SANPIN_CHEMICAL_INDICATORS } from "./kraftPackagePresets.js";

export function KraftIndicatorsTable() {
	return (
		<div className="kraft-panel-card">
			<div className="kraft-panel-title">
				<span>Химические индикаторы классов 4 и 5 (ГОСТ ISO 11140-1)</span>
			</div>
			<div className="kraft-table-container">
				<table className="kraft-table">
					<thead>
						<tr>
							<th>Торговое наименование</th>
							<th>Класс индикатора</th>
							<th>Исходный цвет</th>
							<th>Эталонный цвет (Стерильно)</th>
							<th>Критические параметры срабатывания</th>
						</tr>
					</thead>
					<tbody>
						{SANPIN_CHEMICAL_INDICATORS.map((ind) => (
							<tr key={ind.id}>
								<td style={{ fontWeight: 700 }}>{ind.brandNameRu}</td>
								<td>
									{ind.indicatorClass === "class_5_integrator"
										? "Класс 5 (Интегратор)"
										: "Класс 4"}
								</td>
								<td>
									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										<span
											className="kraft-swatch-circle"
											style={{
												background: ind.originalColorHex,
												width: "16px",
												height: "16px",
											}}
										/>
										<span>{ind.originalColorNameRu}</span>
									</div>
								</td>
								<td>
									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										<span
											className="kraft-swatch-circle"
											style={{
												background: ind.finalColorHex,
												width: "16px",
												height: "16px",
											}}
										/>
										<span style={{ fontWeight: 700 }}>
											{ind.finalColorNameRu}
										</span>
									</div>
								</td>
								<td style={{ fontSize: "0.75rem" }}>
									{ind.standardTargetParamRu}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
