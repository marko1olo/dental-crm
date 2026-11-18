import React from "react";
import type { AiRecognitionJob } from "@dental/shared";

export interface AiRecognitionJobDetailProps {
	job: AiRecognitionJob;
}

export const AiRecognitionJobDetail: React.FC<AiRecognitionJobDetailProps> = ({
	job,
}) => {
	return (
		<tr
			data-testid={`ai-recognition-job-detail-${job.id}`}
			style={{
				borderBottom: "1px solid var(--line)",
				background: "var(--paper-soft, rgba(0,0,0,0.02))",
			}}
		>
			<td colSpan={8} style={{ padding: "12px 10px" }}>
				{job.suggestedNextStep && (
					<p style={{ margin: "0 0 8px", fontSize: "13px" }}>
						<strong>Следующий шаг: </strong>
						{job.suggestedNextStep}
					</p>
				)}
				{job.resultText ? (
					<pre
						style={{
							margin: 0,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							fontFamily: "inherit",
							fontSize: "13px",
							lineHeight: 1.45,
						}}
					>
						{job.resultText}
					</pre>
				) : (
					<p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
						Результат ещё пуст
						{job.status === "queued" || job.status === "running"
							? " — задача в работе."
							: "."}
					</p>
				)}
				{job.warnings.length > 0 && (
					<ul
						style={{
							margin: "10px 0 0",
							paddingLeft: "18px",
							color: "var(--warning, #b45309)",
							fontSize: "12px",
						}}
					>
						{job.warnings.map((w) => (
							<li key={w}>{w}</li>
						))}
					</ul>
				)}
			</td>
		</tr>
	);
};
