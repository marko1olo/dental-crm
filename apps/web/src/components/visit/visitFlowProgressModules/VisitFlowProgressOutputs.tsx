import React from "react";
import type { VisitFlowResult } from "@dental/shared";

export interface VisitFlowProgressOutputsProps {
	readonly result: VisitFlowResult;
}

export function VisitFlowProgressOutputs({ result }: VisitFlowProgressOutputsProps) {
	const planData = result.plan?.data ?? null;
	const recommendationsData = result.recommendations?.data ?? null;
	const documentsData = result.documents?.data ?? null;

	const temporaryRestrictions = Array.isArray(recommendationsData?.temporaryRestrictions)
		? recommendationsData.temporaryRestrictions
		: [];
	const documentSuggestions = Array.isArray(documentsData?.suggestions)
		? documentsData.suggestions
		: [];

	if (!planData?.diagnosisSummary && !recommendationsData?.procedureName && documentSuggestions.length === 0) {
		return null;
	}

	return (
		<div className="vfp-outputs">
			{planData?.diagnosisSummary && (
				<div className="vfp-output-card">
					<strong>Диагноз (пациенту):</strong>
					<p>{planData.diagnosisSummary}</p>
				</div>
			)}
			{recommendationsData?.procedureName && (
				<div className="vfp-output-card">
					<strong>Рекомендации после: {recommendationsData.procedureName}</strong>
					{temporaryRestrictions.length > 0 && (
						<ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
							{temporaryRestrictions.map((r) => (
								<li key={r}>{r}</li>
							))}
						</ul>
					)}
				</div>
			)}
			{documentSuggestions.length > 0 && (
				<div className="vfp-output-card">
					<strong>Предложенные документы:</strong>
					<div className="vfp-tags">
						{documentSuggestions.map((s: string) => (
							<span key={s} className="vfp-tag">
								{s}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
