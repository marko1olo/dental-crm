/**
 * DmsRegistryTableSection.tsx — Таблица и мобильный слой реестра оказанных услуг
 */

import React from "react";
import { formatRubKopecks, type DmsRegistryServiceRecord, type DmsRegistrySummary } from "../insuranceMath.js";

export interface DmsRegistryTableSectionProps {
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly summary: DmsRegistrySummary;
	readonly isLoading: boolean;
}

export function DmsRegistryTableSection({ records, summary, isLoading }: DmsRegistryTableSectionProps) {
	return (
		<div className="dms-table-container">
			<table className="dms-table">
				<thead>
					<tr>
						<th>№</th>
						<th>Дата</th>
						<th>Пациент</th>
						<th>Полис / ГП</th>
						<th>Страховая компания</th>
						<th>Код услуги</th>
						<th>Услуга / Зуб</th>
						<th style={{ textAlign: "right" }}>Сумма всего</th>
						<th style={{ textAlign: "right" }}>Покрыто ДМС</th>
						<th style={{ textAlign: "right" }}>Доплата (Copay)</th>
						<th>Статус</th>
					</tr>
				</thead>
				<tbody>
					{records.length === 0 ? (
						<tr>
							<td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #64748b)" }}>
								{isLoading ? "Загрузка реестра медицинских услуг ДМС..." : "Нет оказанных услуг по ДМС за выбранный период"}
							</td>
						</tr>
					) : (
						records.map((r, i) => (
							<tr key={r.id}>
								<td>{i + 1}</td>
								<td style={{ whiteSpace: "nowrap" }}>{r.visitDate}</td>
								<td style={{ fontWeight: 600, maxWidth: "160px" }} className="truncate min-w-0" title={r.patientFullName}>{r.patientFullName}</td>
								<td style={{ maxWidth: "140px" }} className="min-w-0">
									<div style={{ fontSize: "0.8125rem" }} className="truncate font-mono" title={r.policyNumber}>{r.policyNumber}</div>
									{r.letterNumber && (
										<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }} className="truncate" title={r.letterNumber}>{r.letterNumber}</div>
									)}
								</td>
								<td style={{ fontSize: "0.8125rem", maxWidth: "130px" }} className="truncate min-w-0" title={r.insurerName}>{r.insurerName}</td>
								<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)", whiteSpace: "nowrap" }}>
									{r.serviceCode804n}
								</td>
								<td style={{ maxWidth: "200px" }} className="min-w-0">
									<div className="truncate" title={r.serviceName}>{r.serviceName}</div>
									{r.toothNumber && (
										<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Зуб {r.toothNumber}</span>
									)}
								</td>
								<td style={{ textAlign: "right", fontWeight: 600 }} className="font-mono">{formatRubKopecks(r.totalPriceRub)}</td>
								<td style={{ textAlign: "right", fontWeight: 700, color: "var(--ok-fg, #10b981)" }} className="font-mono">{formatRubKopecks(r.dmsCoveredRub)}</td>
								<td style={{ textAlign: "right", fontWeight: 600, color: r.patientPaidRub > 0 ? "var(--warn-fg, #f59e0b)" : "var(--muted, #64748b)" }} className="font-mono">{formatRubKopecks(r.patientPaidRub)}</td>
								<td>
									{r.isExcluded ? (
										<span className="dms-badge dms-badge-expired" title={r.exclusionReason}>Исключение</span>
									) : (
										<span className="dms-badge dms-badge-active">Покрыто</span>
									)}
								</td>
							</tr>
						))
					)}
				</tbody>
				<tfoot>
					<tr className="dms-table-totals">
						<td colSpan={7} style={{ textAlign: "right", fontWeight: 700 }}>ИТОГО К ВЗАИМОРАСЧЕТАМ:</td>
						<td style={{ textAlign: "right", fontWeight: 800 }} className="font-mono">{formatRubKopecks(summary.totalAmountRub)}</td>
						<td style={{ textAlign: "right", fontWeight: 800, color: "var(--ok-fg, #10b981)", fontSize: "0.9375rem" }} className="font-mono">{formatRubKopecks(summary.totalDmsCoveredRub)}</td>
						<td style={{ textAlign: "right", fontWeight: 800, color: "var(--warn-fg, #f59e0b)" }} className="font-mono">{formatRubKopecks(summary.totalPatientPaidRub)}</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
