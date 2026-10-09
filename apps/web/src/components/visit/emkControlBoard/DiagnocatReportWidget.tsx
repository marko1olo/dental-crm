import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { DiagnocatReport } from "./types";

export function DiagnocatReportWidget({ patientId }: { patientId: string }) {
	const [reports, setReports] = useState<DiagnocatReport[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/integrations/diagnocat/reports/${patientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: { success?: boolean; reports?: unknown }) => {
				if (cancelled) return;
				if (!data.success || !Array.isArray(data.reports)) {
					throw new Error("Ответ сервера не содержит списка отчётов");
				}
				setReports(data.reports as DiagnocatReport[]);
				setLoadError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				logger.error("Failed to load AI reports", err);
				setLoadError("Отчёты Diagnocat недоступны");
			});
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	if (loadError) {
		return (
			<div
				style={{
					color: "var(--bad, #ef4444)",
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					gap: 4,
				}}
			>
				<AlertTriangle size={13} /> {loadError}
			</div>
		);
	}

	if (reports.length === 0) return null;

	return (
		<div
			style={{
				marginTop: "8px",
				padding: "8px 12px",
				background: "rgba(13, 148, 136, 0.08)",
				border: "1px solid rgba(13, 148, 136, 0.2)",
				borderRadius: "6px",
				fontSize: "12px",
				color: "var(--teal-dark, #0f766e)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
		>
			<Activity size={15} />
			<div>
				<strong>Diagnocat AI:</strong> Найдено отчетов ({reports.length})
			</div>
			<div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
				{reports.map((r, reportIdx) => (
					<a
						key={r.id || r.reportUrl || `report-item-${r.createdAt || reportIdx}`}
						href={r.reportUrl}
						target="_blank"
						rel="noreferrer"
						style={{
							color: "var(--teal-dark, #0f766e)",
							textDecoration: "underline",
							fontWeight: 500,
						}}
					>
						Смотреть #{reportIdx + 1}
					</a>
				))}
			</div>
		</div>
	);
}
