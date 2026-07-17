import React from "react";
import type { VisitFlowResult } from "@dental/shared";
import "./VisitFlowProgress.css";

export const VisitFlowProgress: React.FC<{ result: VisitFlowResult }> = ({ result }) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "success": return "var(--color-green-500, #10b981)";
			case "running": return "var(--color-blue-500, #3b82f6)";
			case "error": return "var(--color-red-500, #ef4444)";
			case "skipped": return "var(--color-amber-500, #f59e0b)";
			default: return "var(--color-slate-400, #94a3b8)";
		}
	};

	const steps = [
		{ label: "Распознавание", key: "draft", status: result.draft.status, msg: result.draft.message },
		{ label: "План лечения", key: "plan", status: result.plan.status },
		{ label: "Рекомендации", key: "recommendations", status: result.recommendations.status },
		{ label: "Документы", key: "documents", status: result.documents.status },
	];

	return (
		<div className="visit-flow-progress">
			<div className="vfp-header">
				<h4 className="vfp-title">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Ассистент обработки приема
				</h4>
				<span className={`vfp-badge status-${result.overallStatus}`}>
					{result.overallStatus === "success" ? "Готово" : result.overallStatus === "partial" ? "Частично" : "Ошибка"}
				</span>
			</div>
			
			<div className="vfp-steps">
				{steps.map((step, idx) => (
					<div key={step.key} className="vfp-step">
						<span className={`vfp-dot pulse-${step.status}`} style={{ background: getStatusColor(step.status) }} />
						<span className="vfp-step-label">
							{idx + 1}. {step.label}
						</span>
						{step.status === "running" && <span className="vfp-step-status">⏳</span>}
						{step.status === "success" && <span className="vfp-step-status">✓</span>}
						{step.msg && <span className="vfp-step-msg">({step.msg})</span>}
					</div>
				))}
			</div>

			<div className="vfp-outputs">
				{result.plan.data?.diagnosisSummary && (
					<div className="vfp-output-card">
						<strong>Диагноз (пациенту):</strong>
						<p>{result.plan.data.diagnosisSummary}</p>
					</div>
				)}
				{result.recommendations.data?.procedureName && (
					<div className="vfp-output-card">
						<strong>Рекомендации после: {result.recommendations.data.procedureName}</strong>
						{result.recommendations.data.temporaryRestrictions && result.recommendations.data.temporaryRestrictions.length > 0 && (
							<ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
								{result.recommendations.data.temporaryRestrictions.map((r, i) => <li key={i}>{r}</li>)}
							</ul>
						)}
					</div>
				)}
				{result.documents.data?.suggestions && Array.isArray(result.documents.data.suggestions) && result.documents.data.suggestions.length > 0 && (
					<div className="vfp-output-card">
						<strong>Предложенные документы:</strong>
						<div className="vfp-tags">
							{result.documents.data.suggestions.map((s: string, i: number) => (
								<span key={i} className="vfp-tag">{s}</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
