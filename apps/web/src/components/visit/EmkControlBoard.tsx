import { Activity, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatShortDate } from "../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { EmptyState } from "../EmptyState";

function DiagnocatReportWidget({ patientId }: { patientId: string }) {
	const [reports, setReports] = useState<any[]>([]);
	useEffect(() => {
		if (!patientId) return;
		fetch(`/api/integrations/diagnocat/reports/${patientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success && data.reports) {
					setReports(data.reports);
				}
			})
			.catch((err) => console.error("Failed to load AI reports", err));
	}, [patientId]);

	if (reports.length === 0) return null;

	return (
		<div
			style={{
				marginTop: "12px",
				padding: "10px",
				background: "var(--teal-soft)",
				border: "1px solid var(--teal-light)",
				borderRadius: "6px",
				fontSize: "13px",
				color: "var(--teal-dark)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
		>
			<Activity size={16} />
			<div>
				<strong>Diagnocat AI:</strong> Найдено отчетов ({reports.length})
			</div>
			<div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
				{reports.map((r, reportIdx) => (
					<a
						key={
							r.id || r.reportUrl || `report-item-${r.createdAt || reportIdx}`
						}
						href={r.reportUrl}
						target="_blank"
						rel="noreferrer"
						style={{
							color: "var(--teal-dark)",
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

export function EmkControlBoard({ dashboard }: any) {
	const [visits, setVisits] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [submittingId, setSubmittingId] = useState<string | null>(null);

	const loadVisits = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/visits/quality-control", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить приемы для проверки");
			}
			const data = await res.json();
			setVisits(data.visits || []);
		} catch (err: any) {
			setError(err.message || "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadVisits();
	}, [loadVisits]);

	async function updateStatus(visitId: string, status: string) {
		if (submittingId) return;
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				throw new Error("Не удалось обновить статус");
			}
			await loadVisits();
		} catch (err: any) {
			setError(err.message || "Ошибка обновления");
		} finally {
			setSubmittingId(null);
		}
	}

	if (loading) {
		return <div className="p-4">Загрузка приемов на проверку...</div>;
	}

	if (error) {
		return <div className="p-4 text-red-600">{error}</div>;
	}

	if (visits.length === 0) {
		return (
			<EmptyState
				icon={<CheckCircle2 size={32} />}
				title="Все ЭМК проверены"
				description="Нет приемов, ожидающих контроля качества."
				glass={false}
			/>
		);
	}

	return (
		<div
			className="emk-control-board p-4"
			style={{ display: "flex", flexDirection: "column", gap: "16px" }}
		>
			<h2
				style={{
					fontSize: "18px",
					fontWeight: "600",
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
			>
				<Activity size={20} />
				Проверка историй болезни главврачом
			</h2>
			<div className="grid gap-4">
				{visits.map((visit) => (
					<div
						key={visit.id}
						style={{
							border: "1px solid var(--line)",
							padding: "16px",
							borderRadius: "8px",
							background: "var(--paper)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: "12px",
							}}
						>
							<div style={{ flex: 1 }}>
								<h3 style={{ margin: "0 0 4px", fontSize: "15px" }}>
									<FileText
										size={16}
										style={{
											display: "inline",
											marginRight: "6px",
											verticalAlign: "middle",
										}}
									/>
									Прием от {formatShortDate(visit.createdAt)}
								</h3>
								<p
									style={{ margin: 0, fontSize: "13px", color: "var(--ink-2)" }}
								>
									Жалобы: {visit.complaint || "Нет данных"}
								</p>
								<p
									style={{ margin: 0, fontSize: "13px", color: "var(--ink-2)" }}
								>
									Диагноз: {visit.diagnosis || "Нет данных"}
								</p>
								{visit.patientId && (
									<DiagnocatReportWidget patientId={visit.patientId} />
								)}
							</div>
							<div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
								<button
									type="button"
									className="secondary-button focus:outline-none focus:ring-2 focus:ring-red-600"
									style={{
										borderColor: "var(--red-soft)",
										color: "var(--red-dark)",
									}}
									onClick={() => updateStatus(visit.id, "needs_correction")}
									disabled={submittingId === visit.id}
									aria-busy={submittingId === visit.id}
								>
									<AlertTriangle size={16} /> На доработку
								</button>
								<button
									type="button"
									className="primary-button focus:outline-none focus:ring-2 focus:ring-teal-600"
									onClick={() => updateStatus(visit.id, "approved")}
									disabled={submittingId === visit.id}
									aria-busy={submittingId === visit.id}
								>
									<CheckCircle2 size={16} /> Одобрить
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
