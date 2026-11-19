import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { ClinicalAiReport, DiagnocatReport } from "./types";

export function ClinicalAiImageAnalysisWidget({ patientId }: { patientId: string }) {
	const [reports, setReports] = useState<ClinicalAiReport[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/clinical-ai/reports/${patientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					// Fallback to legacy path if needed
					return fetch(`/api/integrations/diagnocat/reports/${patientId}`, {
						headers: denteAdminSecretRequestHeaders(),
					}).then(async (legacyRes) => {
						if (!legacyRes.ok) throw new Error(`HTTP ${legacyRes.status}`);
						return legacyRes.json();
					});
				}
				return res.json();
			})
			.then((data: { success?: boolean; reports?: unknown }) => {
				if (cancelled) return;
				if (!data.success || !Array.isArray(data.reports)) {
					throw new Error("Ответ сервера не содержит списка отчётов");
				}
				setReports(data.reports as ClinicalAiReport[]);
				setLoadError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				logger.error("Failed to load AI image analysis reports", err);
				setLoadError("Клинический ИИ-анализ снимков временно недоступен");
			});
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	if (loadError) {
		return (
			<div
				style={{
					color: "var(--danger, #ef4444)",
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					gap: 4,
				}}
				data-testid="ai-image-analysis-error"
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
				borderRadius: "8px",
				fontSize: "12px",
				color: "var(--teal-dark, #0f766e)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
			data-testid="clinical-ai-image-analysis-widget"
		>
			<Activity size={15} />
			<div>
				<strong>Клинический ИИ-анализ снимков:</strong> Найдено заключений ({reports.length})
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
						Заключение #{reportIdx + 1}
					</a>
				))}
			</div>
		</div>
	);
}

/** Алиас для обратной совместимости вызовов без коммерческого бренда */
export const DiagnocatReportWidget = ClinicalAiImageAnalysisWidget;
