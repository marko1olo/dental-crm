import React from "react";
import { KRAFT_PACKAGE_MATERIALS } from "./kraftPackagePresets.js";

export function KraftMaterialsTable() {
	return (
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
	);
}
