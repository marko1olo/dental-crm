import React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	MessageSquare,
} from "lucide-react";
import type { CmoAuditEvaluatedVisit } from "@dental/shared";
import { DiagnocatReportWidget } from "./DiagnocatReportWidget";
import { EmkPatientSummaryHeader } from "./EmkPatientSummaryHeader";

export interface EmkVisitCardProps {
	readonly visit: CmoAuditEvaluatedVisit;
	readonly isExpanded: boolean;
	readonly submittingId: string | null;
	readonly onToggleExpand: () => void;
	readonly onApprove: (id: string) => void;
	readonly onReject: (visit: CmoAuditEvaluatedVisit) => void;
}

export function EmkVisitCard({
	visit,
	isExpanded,
	submittingId,
	onToggleExpand,
	onApprove,
	onReject,
}: EmkVisitCardProps) {
	const score = visit.completeness.totalScore;

	return (
		<div
			style={{
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "12px",
				padding: "16px 20px",
				boxShadow: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.05))",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			{/* Top Row: Patient Header & Actions */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<EmkPatientSummaryHeader
					patientFullName={visit.patientFullName}
					patientCardCode={visit.patientCardCode}
					doctorFullName={visit.doctorFullName}
					doctorSpecialty={visit.doctorSpecialty ?? ""}
					visitDateIso={visit.visitDateIso}
					chairName={visit.chairName ?? ""}
					diagnosisTooth={visit.diagnosisTooth ?? null}
					completenessScore={score}
				/>

				{/* Action Buttons */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					{visit.qualityControlStatus !== "approved" && (
						<button
							type="button"
							onClick={() => onApprove(visit.id)}
							disabled={submittingId === visit.id}
							style={{
								background: "var(--teal, #0d9488)",
								color: "var(--paper-strong, #ffffff)",
								border: "none",
								padding: "8px 14px",
								borderRadius: "6px",
								fontSize: "13px",
								fontWeight: 600,
								cursor: submittingId === visit.id ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "44px",
							}}
						>
							<CheckCircle2 size={16} />
							{submittingId === visit.id ? "Сохранение..." : "Утвердить"}
						</button>
					)}

					{visit.qualityControlStatus !== "needs_correction" && (
						<button
							type="button"
							onClick={() => onReject(visit)}
							disabled={submittingId === visit.id}
							style={{
								background: "transparent",
								color: "var(--bad, #ef4444)",
								border: "1px solid var(--bad-line, #fecaca)",
								padding: "8px 12px",
								borderRadius: "6px",
								fontSize: "13px",
								fontWeight: 600,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "44px",
							}}
						>
							<AlertTriangle size={15} />
							На доработку
						</button>
					)}

					<button
						type="button"
						onClick={onToggleExpand}
						style={{
							background: "var(--paper-strong, #f1f5f9)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							padding: "8px 10px",
							cursor: "pointer",
							color: "var(--ink, #0f172a)",
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
						}}
					>
						{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
					</button>
				</div>
			</div>

			{/* Clinical Highlights Strip */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					flexWrap: "wrap",
					fontSize: "13px",
				}}
			>
				{visit.diagnosis && (
					<span
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							background: "rgba(13, 148, 136, 0.08)",
							color: "var(--teal-dark, #0f766e)",
							fontWeight: 500,
						}}
					>
						Диагноз: {visit.diagnosis}
					</span>
				)}
				{visit.chiefComplaint && (
					<span style={{ color: "var(--ink-2, #64748b)" }}>
						Жалобы: {visit.chiefComplaint}
					</span>
				)}
			</div>

			{/* Diagnocat AI Widget Link */}
			{visit.patientId && <DiagnocatReportWidget patientId={visit.patientId} />}

			{/* Remarks Banner if present */}
			{visit.cmoRemarks && (
				<div
					style={{
						padding: "10px 12px",
						borderRadius: "8px",
						background:
							visit.qualityControlStatus === "needs_correction"
								? "rgba(239, 68, 68, 0.08)"
								: "rgba(16, 185, 129, 0.08)",
						border:
							visit.qualityControlStatus === "needs_correction"
								? "1px solid rgba(239, 68, 68, 0.25)"
								: "1px solid rgba(16, 185, 129, 0.25)",
						color:
							visit.qualityControlStatus === "needs_correction"
								? "var(--bad, #ef4444)"
								: "var(--good, #10b981)",
						fontSize: "12px",
						display: "flex",
						alignItems: "flex-start",
						gap: "8px",
					}}
				>
					<MessageSquare size={15} style={{ flexShrink: 0, marginTop: 2 }} />
					<div>
						<strong>Замечание Главврача:</strong> {visit.cmoRemarks}
					</div>
				</div>
			)}

			{/* Expanded Section Protocol Structure Accordion */}
			{isExpanded && (
				<div
					style={{
						borderTop: "1px solid var(--line, #e2e8f0)",
						paddingTop: "12px",
						marginTop: "6px",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<div
						style={{
							fontSize: "13px",
							fontWeight: 700,
							color: "var(--ink, #0f172a)",
						}}
					>
						Структура разделов медицинской карты (стандарты Минздрава):
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "8px",
						}}
					>
						{visit.completeness.sections.map((sec) => (
							<div
								key={sec.sectionId}
								style={{
									padding: "8px 10px",
									borderRadius: "6px",
									border: sec.isComplete
										? "1px solid rgba(16, 185, 129, 0.3)"
										: "1px solid rgba(239, 68, 68, 0.3)",
									background: sec.isComplete
										? "rgba(16, 185, 129, 0.04)"
										: "rgba(239, 68, 68, 0.04)",
									fontSize: "12px",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										marginBottom: "2px",
									}}
								>
									<span
										style={{
											fontWeight: 600,
											color: sec.isComplete
												? "var(--good, #10b981)"
												: "var(--bad, #ef4444)",
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
										}}
									>
										{sec.isComplete ? (
											<CheckCircle2 size={13} style={{ flexShrink: 0 }} />
										) : (
											<AlertTriangle size={13} style={{ flexShrink: 0 }} />
										)}{" "}
										{sec.nameRu}
									</span>
									<span
										style={{
											fontSize: "11px",
											color: "var(--ink-2, #64748b)",
										}}
									>
										{sec.earnedScore} / {sec.weightPercent}%
									</span>
								</div>
								{sec.missingDetailsRu.length > 0 && (
									<div
										style={{
											color: "var(--bad, #ef4444)",
											fontSize: "11px",
											marginTop: "2px",
										}}
									>
										{sec.missingDetailsRu.join("; ")}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
