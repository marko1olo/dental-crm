/**
 * VisiographReportViewer.tsx — Просмотрщик аккордеона отчета ИИ визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
import {
	escapeHtml, renderMarkdown, parseReportSections,
	type ReportSectionItem, REPORT_SECTIONS,
} from "./reportViewer/reportMarkdownParser.js";

export { escapeHtml, renderMarkdown, parseReportSections, REPORT_SECTIONS };
export type { ReportSectionItem };

export interface VisiographReportViewerProps {
	report: string;
	capturedAt?: string | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export function VisiographReportViewer({ report, capturedAt, onInsertToProtocol }: VisiographReportViewerProps) {
	const [activeSection, setActiveSection] = useState<number | null>(null);
	const sections = parseReportSections(report);

	if (!sections.length) return null;

	return (
		<div style={{ border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
			<div
				style={{
					padding: "8px 14px", background: "var(--paper-soft)", display: "flex",
					alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", flexWrap: "wrap",
				}}
			>
				<Sparkles size={14} style={{ color: "var(--teal)" }} />
				<span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Полный отчёт рентген-анализа ИИ</span>
				{capturedAt && (
					<span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
						· {new Date(capturedAt).toLocaleDateString("ru-RU")}
					</span>
				)}
				{onInsertToProtocol && (
					<button
						type="button"
						onClick={() => onInsertToProtocol(report)}
						className="diag-btn-teal secondary-button shrink-0"
						style={{ height: "28px", minHeight: "28px", padding: "0 10px", fontSize: "12px", marginLeft: "auto" }}
						title="Перенести отчёт лучевой диагностики в дневник приёма"
						data-testid="btn-transfer-report-to-protocol"
					>
						<FileText size={13} />
						<span>В дневник приёма</span>
					</button>
				)}
			</div>
			{sections.map((section, sIndex) => {
				const isExpanded = activeSection === sIndex;
				return (
					<div
						key={section.title || `section-${sIndex}`}
						style={{ borderBottom: sIndex < sections.length - 1 ? "1px solid var(--line)" : "none" }}
					>
						<button
							type="button"
							onClick={() => setActiveSection(isExpanded ? null : sIndex)}
							style={{
								width: "100%", textAlign: "left", padding: "10px 14px",
								background: isExpanded ? "var(--paper-soft)" : "transparent",
								border: "none", cursor: "pointer", display: "flex", alignItems: "center",
								gap: "8px", transition: "background 0.15s",
							}}
						>
							<section.icon size={16} style={{ color: "var(--teal)", flexShrink: 0 }} aria-hidden="true" />
							<span style={{ fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>{section.title}</span>
							<ChevronDown
								size={14}
								style={{
									transform: isExpanded ? "rotate(180deg)" : "none",
									transition: "transform 0.2s", color: "var(--muted)",
								}}
							/>
						</button>
						{isExpanded && (
							<div
								style={{ padding: "8px 14px 14px 34px", fontSize: "0.87rem", lineHeight: 1.65, color: "var(--ink)" }}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via escapeHtml
								dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
