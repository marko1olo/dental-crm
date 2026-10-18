import React from "react";
import { CreditCard, FileText, Phone } from "lucide-react";
import { patientInsightRiskLabels } from "../AppConstants";
import { formatShortDate, money } from "../AppHelpers";
import { countLabel } from "../lib/russianPlural";

export interface PatientInsightData {
	riskLevel: "high" | "watch" | "low";
	nextBestAction: string;
	balanceDueRub?: number;
	openTasks?: number;
	missingDocumentKinds?: readonly string[];
	recallDueAt?: string;
}

export interface PatientCockpitInsightPanelProps {
	// biome-ignore lint/suspicious/noExplicitAny: insight
	readonly activePatientInsight: any;
}

export const PatientCockpitInsightPanel: React.FC<PatientCockpitInsightPanelProps> = ({ activePatientInsight }) => {
	if (!activePatientInsight) return null;

	const isHigh = activePatientInsight.riskLevel === "high";
	const isWatch = activePatientInsight.riskLevel === "watch";

	return (
		<div
			className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}
			style={{
				padding: "12px 14px",
				borderRadius: "11px",
				background: isHigh ? "var(--bad-bg)" : isWatch ? "var(--warn-bg)" : "var(--paper-soft)",
				border: "1px solid " + (isHigh ? "var(--bad-fg)" : isWatch ? "var(--warn-fg)" : "var(--line)"),
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
				<span
					style={{
						fontSize: "10.5px",
						fontWeight: 800,
						textTransform: "uppercase",
						letterSpacing: "0.06em",
						color: isHigh ? "var(--bad-fg)" : isWatch ? "var(--warn-fg)" : "var(--muted)",
						flexShrink: 0,
					}}
				>
					{patientInsightRiskLabels[activePatientInsight.riskLevel]}
				</span>
				<strong style={{ fontSize: "12.5px", color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.3 }}>
					{activePatientInsight.nextBestAction}
				</strong>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "11.5px", fontWeight: 600 }}>
				{activePatientInsight.balanceDueRub ? (
					<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
						<CreditCard size={13} className="inline mr-1 text-amber-500" /> Долг {money(activePatientInsight.balanceDueRub)}
					</span>
				) : null}
				{activePatientInsight.openTasks > 0 ? (
					<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
						<Phone size={13} className="inline mr-1 text-[var(--teal)]" />{" "}
						{countLabel(activePatientInsight.openTasks, "задача", "задачи", "задач")} на связь
					</span>
				) : null}
				{(activePatientInsight.missingDocumentKinds?.length ?? 0) > 0 ? (
					<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
						<FileText size={13} className="inline mr-1 text-rose-500" /> не хватает{" "}
						{countLabel(activePatientInsight.missingDocumentKinds?.length ?? 0, "документа", "документов", "документов")}
					</span>
				) : null}
				{activePatientInsight.recallDueAt ? (
					<span className="bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)] text-[var(--ink)]">
						повторный визит {formatShortDate(activePatientInsight.recallDueAt)}
					</span>
				) : null}
			</div>
		</div>
	);
};
