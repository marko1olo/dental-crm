import React, { Fragment } from "react";
import type { AiRecognitionJob } from "@dental/shared";
import { ClipboardList } from "lucide-react";
import { aiJobKindLabels } from "../../../AppConstants";
import { recognitionTargetLabels } from "../../../workspaceUiLabels";
import {
	STATUS_LABELS,
	STATUS_PILL,
	formatWhen,
	previewText,
} from "./aiRecognitionJobsConstants";
import { AiRecognitionJobDetail } from "./AiRecognitionJobDetail";

export interface AiRecognitionJobRowProps {
	job: AiRecognitionJob;
	isOpen: boolean;
	onToggle: () => void;
	onOpenInWorkbench: (job: AiRecognitionJob) => void;
}

export const AiRecognitionJobRow: React.FC<AiRecognitionJobRowProps> = ({
	job,
	isOpen,
	onToggle,
	onOpenInWorkbench,
}) => {
	return (
		<Fragment>
			<tr
				data-testid={`ai-recognition-job-row-${job.id}`}
				style={{
					borderBottom: isOpen ? "none" : "1px solid var(--line)",
					cursor: "pointer",
					verticalAlign: "top",
				}}
				onClick={onToggle}
			>
				<td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
					{formatWhen(job.createdAt)}
				</td>
				<td style={{ padding: "8px 6px" }}>
					{aiJobKindLabels[job.kind] ?? job.kind}
				</td>
				<td style={{ padding: "8px 6px" }}>
					{recognitionTargetLabels[job.target] ?? job.target}
				</td>
				<td style={{ padding: "8px 6px" }}>
					<span
						className={`status-pill ${STATUS_PILL[job.status] ?? ""}`}
						data-testid={`ai-recognition-job-status-${job.id}`}
					>
						{STATUS_LABELS[job.status] ?? job.status}
					</span>
				</td>
				<td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
					{Math.round(job.confidence * 100)}%
				</td>
				<td
					style={{
						padding: "8px 6px",
						maxWidth: 160,
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
					title={job.sourceLabel}
				>
					{job.sourceLabel || "—"}
				</td>
				<td
					style={{
						padding: "8px 6px",
						maxWidth: 220,
						color: "var(--muted)",
					}}
				>
					{previewText(job.resultText || job.inputText)}
				</td>
				<td
					style={{ padding: "8px 6px" }}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						className="secondary-button btn--sm"
						data-testid={`ai-recognition-job-open-${job.id}`}
						onClick={() => onOpenInWorkbench(job)}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							minHeight: 44,
							minWidth: 44,
						}}
					>
						<ClipboardList size={14} aria-hidden="true" />В лабораторию
					</button>
				</td>
			</tr>
			{isOpen && <AiRecognitionJobDetail job={job} />}
		</Fragment>
	);
};
