import React from "react";
import type { VisitDiaryEntry043, Statutory043ComplianceReport } from "./emrProtocolEngine";
import { EmrProtocolSoapCards } from "./soapPanels/EmrProtocolSoapCards";
import { EmrProtocolComplianceAudit } from "./soapPanels/EmrProtocolComplianceAudit";

export interface EmrProtocolSoapPanelsProps {
	readonly activeTab: "preview" | "soap_cards" | "compliance";
	readonly formattedSoapText: string;
	readonly synthesizedDiary: VisitDiaryEntry043;
	readonly complianceReport: Statutory043ComplianceReport;
}

export const EmrProtocolSoapPanels: React.FC<EmrProtocolSoapPanelsProps> = React.memo(
	function EmrProtocolSoapPanels({
		activeTab,
		formattedSoapText,
		synthesizedDiary,
		complianceReport,
	}) {
		return (
			<div className="flex-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 overflow-y-auto text-xs space-y-4">
				{activeTab === "preview" && (
					<pre className="font-mono text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap leading-relaxed select-text bg-[var(--paper,#ffffff)] p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)]">
						{formattedSoapText}
					</pre>
				)}

				{activeTab === "soap_cards" && (
					<EmrProtocolSoapCards synthesizedDiary={synthesizedDiary} />
				)}

				{activeTab === "compliance" && (
					<EmrProtocolComplianceAudit
						synthesizedDiary={synthesizedDiary}
						complianceReport={complianceReport}
					/>
				)}
			</div>
		);
	},
);
