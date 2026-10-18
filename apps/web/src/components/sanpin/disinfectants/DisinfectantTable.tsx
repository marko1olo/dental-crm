import React from "react";
import { Check } from "lucide-react";
import type { DisinfectantSolutionRecord } from "./disinfectantTypes";

export interface DisinfectantTableProps {
	readonly records: readonly DisinfectantSolutionRecord[];
}

export const DisinfectantTable: React.FC<DisinfectantTableProps> = ({ records }) => {
	return (
		<div className="sanpin-table-wrapper w-full overflow-x-auto min-w-0">
			<table className="sanpin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
				<thead>
					<tr style={{ background: "var(--paper-soft, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Дезсредство</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Зона применения</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Концентрация / Объём</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Дата приготовления</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Годен до</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Тест-полоска</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Ответственный</th>
					</tr>
				</thead>
				<tbody>
					{records.length === 0 ? (
						<tr>
							<td colSpan={7} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--muted)" }}>
								Нет приготовленных дезрастворов. Нажмите «Приготовить раствор» для внесения партии.
							</td>
						</tr>
					) : (
						records.map((r) => (
							<tr key={r.id} className="sanpin-log-row" style={{ borderBottom: "1px solid var(--line-subtle, #f1f5f9)", minHeight: "40px" }}>
								<td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--ink)" }}>{r.tradeNameRu}</td>
								<td style={{ padding: "8px 12px", fontSize: "0.8125rem", color: "var(--ink)" }}>{r.purposeRu}</td>
								<td style={{ padding: "8px 12px" }}>
									<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: 4, background: "rgba(13, 148, 136, 0.1)", color: "var(--teal)" }}>
										{r.concentrationPercent}% ({r.volumeLiters} л)
									</span>
								</td>
								<td style={{ padding: "8px 12px", fontSize: "0.8125rem", color: "var(--muted)" }}>{r.preparationDate}</td>
								<td style={{ padding: "8px 12px", fontSize: "0.8125rem", fontWeight: 600 }}>{r.expiryDate}</td>
								<td style={{ padding: "8px 12px" }}>
									<span style={{ fontSize: "0.75rem", color: "var(--ok-fg, #059669)", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
										<Check size={13} /> {r.testStripResultRu}
									</span>
								</td>
								<td style={{ padding: "8px 12px", fontSize: "0.8125rem", fontWeight: 500 }}>{r.responsibleNurseRu}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default DisinfectantTable;
