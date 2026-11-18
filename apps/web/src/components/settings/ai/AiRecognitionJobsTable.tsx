import React from "react";
import type { AiRecognitionJob } from "@dental/shared";
import { AiRecognitionJobRow } from "./AiRecognitionJobRow";

export interface AiRecognitionJobsTableProps {
	jobs: AiRecognitionJob[];
	expandedId: string | null;
	onToggleExpand: (id: string | null) => void;
	onOpenInWorkbench: (job: AiRecognitionJob) => void;
}

export const AiRecognitionJobsTable: React.FC<AiRecognitionJobsTableProps> = ({
	jobs,
	expandedId,
	onToggleExpand,
	onOpenInWorkbench,
}) => {
	return (
		<div
			className="ai-jobs-table-wrap"
			data-testid="ai-recognition-jobs-list"
			style={{ marginTop: "12px", overflowX: "auto" }}
		>
			<table
				className="data-table"
				style={{
					width: "100%",
					borderCollapse: "collapse",
					fontSize: "13px",
				}}
			>
				<thead>
					<tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
						<th style={{ padding: "8px 6px" }}>Когда</th>
						<th style={{ padding: "8px 6px" }}>Вид</th>
						<th style={{ padding: "8px 6px" }}>Цель</th>
						<th style={{ padding: "8px 6px" }}>Статус</th>
						<th style={{ padding: "8px 6px" }}>Увер.</th>
						<th style={{ padding: "8px 6px" }}>Источник</th>
						<th style={{ padding: "8px 6px" }}>Результат</th>
						<th style={{ padding: "8px 6px" }} />
					</tr>
				</thead>
				<tbody>
					{jobs.map((job) => (
						<AiRecognitionJobRow
							key={job.id}
							job={job}
							isOpen={expandedId === job.id}
							onToggle={() =>
								onToggleExpand(expandedId === job.id ? null : job.id)
							}
							onOpenInWorkbench={onOpenInWorkbench}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};
