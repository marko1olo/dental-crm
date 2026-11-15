import React from "react";
import { Download, Printer } from "lucide-react";
import type { DmsRegistryServiceRecord } from "@dental/shared";

export interface DmsRegistryExportTabProps {
	readonly registryRecords: readonly DmsRegistryServiceRecord[];
	readonly onExportCsv: () => void;
	readonly onPrintAct: () => void;
	readonly formatDisplayRub: (rub: number) => string;
}

export const DmsRegistryExportTab: React.FC<DmsRegistryExportTabProps> = ({
	registryRecords,
	onExportCsv,
	onPrintAct,
	formatDisplayRub,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "10px",
				}}
			>
				<div
					style={{
						fontSize: "14px",
						fontWeight: 700,
						color: "var(--ink, #0f172a)",
					}}
				>
					Оказанные услуги по ДМС за текущий период
				</div>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						onClick={onExportCsv}
						className="dms-btn-secondary dente-btn-secondary"
					>
						<Download size={15} /> Экспорт реестра в CSV
					</button>
					<button
						type="button"
						onClick={onPrintAct}
						className="dms-btn-secondary dente-btn-secondary"
					>
						<Printer size={15} /> Печать акта для страховой
					</button>
				</div>
			</div>

			<div className="dms-table-container">
				<table className="dms-table">
					<thead>
						<tr>
							<th>Дата</th>
							<th>Пациент</th>
							<th>Услуга</th>
							<th style={{ textAlign: "right" }}>Всего</th>
							<th style={{ textAlign: "right", color: "var(--dms-teal)" }}>
								ДМС
							</th>
							<th
								style={{
									textAlign: "right",
									color: "var(--dms-amber-ink)",
								}}
							>
								Пациент
							</th>
						</tr>
					</thead>
					<tbody>
						{registryRecords.map((r) => (
							<tr key={r.id}>
								<td>{r.visitDate}</td>
								<td style={{ fontWeight: 600 }}>{r.patientFullName}</td>
								<td>{r.serviceName}</td>
								<td style={{ textAlign: "right" }}>
									{formatDisplayRub(r.totalPriceRub || 0)}
								</td>
								<td className="dms-col-dms">
									{formatDisplayRub(r.dmsCoveredRub || 0)}
								</td>
								<td className="dms-col-patient">
									{formatDisplayRub(r.patientPaidRub || 0)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

DmsRegistryExportTab.displayName = "DmsRegistryExportTab";
