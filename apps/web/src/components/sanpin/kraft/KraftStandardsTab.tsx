/**
 * DENTE CRM — Kraft Package Statutory Standards & Indicators Subcomponent
 * SanPiN 3.3686-21 & GOST ISO 11140-1 Reference Tables
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React from "react";
import {
	KRAFT_PACKAGE_MATERIALS,
	SANPIN_CHEMICAL_INDICATORS,
} from "./kraftPackagePresets";

export const KraftStandardsTab: React.FC = () => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<span>Нормативные сроки сохранения стерильности</span>
				</div>
				<div className="kraft-table-container">
					<table className="kraft-table">
						<thead>
							<tr>
								<th>Материал упаковки</th>
								<th>Способ запечатывания</th>
								<th>Срок стерильности</th>
								<th>Нормативный пункт</th>
							</tr>
						</thead>
						<tbody>
							{KRAFT_PACKAGE_MATERIALS.map((mat) => (
								<tr key={mat.id}>
									<td style={{ fontWeight: 700 }}>{mat.nameRu}</td>
									<td>{mat.sealingMethodRu}</td>
									<td>
										<strong
											style={{
												color:
													mat.statutoryShelfLifeDays >= 60
														? "#059669"
														: "#d97706",
											}}
										>
											{mat.statutoryShelfLifeDays} суток
										</strong>
									</td>
									<td style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										{mat.sanpinClauseRu}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

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
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
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
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
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
		</div>
	);
};

export default KraftStandardsTab;
