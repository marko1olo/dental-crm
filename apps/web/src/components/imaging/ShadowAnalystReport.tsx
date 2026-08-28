import {
	AlertTriangle,
	CheckCircle,
	FileText,
	Printer,
	Sparkles,
} from "lucide-react";

interface ToothUpdate {
	code: string;
	state: string;
	diagnosisOrFinding: string;
}

interface ShadowAnalystReportProps {
	summary: string;
	toothUpdates?: ToothUpdate[];
	onPrint?: () => void;
	studyTitle?: string;
}

export function ShadowAnalystReport({
	summary,
	toothUpdates,
	onPrint,
	studyTitle,
}: ShadowAnalystReportProps) {
	const criticalCount = (toothUpdates ?? []).filter(
		(u) =>
			(u?.state ?? "").toLowerCase().includes("caries") ||
			(u?.state ?? "").toLowerCase().includes("pulpitis") ||
			(u?.state ?? "").toLowerCase().includes("periodont"),
	).length;

	return (
		<div className="sa-panel">
			<div className="sa-panel-header">
				<div className="sa-panel-title">
					<Sparkles size={15} />
					<span>ShadowAnalyst · AI Expert</span>
					{criticalCount > 0 && (
						<span className="sa-badge-critical">{criticalCount} крит.</span>
					)}
				</div>
				<div className="sa-panel-actions">
					{studyTitle && <span className="sa-study-label">{studyTitle}</span>}
					{onPrint && (
						<button
							className="sa-icon-btn"
							onClick={onPrint}
							title="Распечатать отчёт"
							type="button"
						>
							<Printer size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="sa-panel-body">
				{/* Summary */}
				<div className="sa-section">
					<div className="sa-section-label">
						<FileText size={12} />
						Заключение
					</div>
					<p className="sa-summary-text">{summary}</p>
				</div>

				{/* Tooth table */}
				{(toothUpdates ?? []).length > 0 && (
					<div className="sa-section">
						<div className="sa-section-label">
							<AlertTriangle size={12} />
							Детализация по зубам · {(toothUpdates ?? []).length} поз.
						</div>
						<div className="sa-tooth-grid">
							{(toothUpdates ?? []).map((update) => {
								const updateState = (update?.state ?? "").toLowerCase();
								const isCritical =
									updateState.includes("caries") ||
									updateState.includes("pulpitis") ||
									updateState.includes("periodont");
								const isDone =
									update?.state === "done" ||
									update?.state === "implant" ||
									update?.state === "prosthetic";
								return (
									<div
										key={`tooth-${update.code}-${update.diagnosisOrFinding}`}
										className={`sa-tooth-row ${isCritical ? "sa-tooth-row--critical" : ""} ${isDone ? "sa-tooth-row--done" : ""}`}
									>
										<span className="sa-tooth-num">{update.code}</span>
										<span className="sa-tooth-text">
											{update.diagnosisOrFinding}
										</span>
										{isCritical && (
											<AlertTriangle size={12} className="sa-tooth-icon" />
										)}
										{isDone && (
											<CheckCircle
												size={12}
												className="sa-tooth-icon sa-tooth-icon--done"
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
