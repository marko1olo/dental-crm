/**
 * VisiographReportViewer.tsx
 *
 * Markdown renderer & accordion report viewer for Dental AI visiograph analysis.
 * Safely sanitizes HTML tags via escapeHtml before rendering Markdown.
 */

import {
	AlertTriangle,
	Bone,
	ChevronDown,
	FileText,
	MapPin,
	Pin,
	Sparkles,
	Wrench,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

export function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function renderMarkdown(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:12px 0 4px">$1</h4>')
		.replace(/^[-*]\s+(.+)$/gm, '<li style="margin:2px 0">$1</li>')
		.replace(/(<li.*<\/li>)/s, '<ul style="margin:8px 0;padding-left:20px">$1</ul>')
		.replace(/\n\n+/g, "<br/><br/>")
		.replace(/\n/g, "<br/>");
}

export const REPORT_SECTIONS: readonly {
	key: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}[] = [
	{ key: "топограф", label: "Топография", icon: MapPin },
	{ key: "существующ", label: "Лечение", icon: Wrench },
	{ key: "патолог", label: "Патологии", icon: AlertTriangle },
	{ key: "анатомическ", label: "Анатомия", icon: Bone },
	{ key: "заключени", label: "Заключение", icon: FileText },
];

export interface ReportSectionItem {
	title: string;
	content: string;
	icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

export function parseReportSections(report: string): ReportSectionItem[] {
	if (!report) return [];
	const sections: ReportSectionItem[] = [];
	const lines = report.split("\n");
	let currentSection: {
		title: string;
		content: string[];
		icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
	} | null = null;

	for (const line of lines) {
		const isBoldHeading = /^\*\*(.+?):\*\*/.exec(line);
		if (isBoldHeading) {
			if (currentSection) {
				sections.push({
					title: currentSection.title,
					content: currentSection.content.join("\n").trim(),
					icon: currentSection.icon,
				});
			}
			const headingText = (isBoldHeading[1] || "").toLowerCase();
			const found = REPORT_SECTIONS.find((s) => headingText.includes(s.key));
			currentSection = {
				title: isBoldHeading[1] || "",
				icon: found?.icon || Pin,
				content: [line.replace(/^\*\*(.+?):\*\*/, "").trim()],
			};
		} else if (currentSection) {
			currentSection.content.push(line);
		}
	}
	if (currentSection) {
		sections.push({
			title: currentSection.title,
			content: currentSection.content.join("\n").trim(),
			icon: currentSection.icon,
		});
	}

	if (!sections.length) {
		sections.push({ title: "Отчёт", icon: FileText, content: report });
	}

	return sections;
}

export interface VisiographReportViewerProps {
	report: string;
	capturedAt?: string | undefined;
}

export function VisiographReportViewer({ report, capturedAt }: VisiographReportViewerProps) {
	const [activeSection, setActiveSection] = useState<number | null>(null);
	const sections = parseReportSections(report);

	if (!sections.length) return null;

	return (
		<div
			style={{
				border: "1px solid var(--line)",
				borderRadius: "10px",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					padding: "10px 14px",
					background: "var(--paper-soft)",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					borderBottom: "1px solid var(--line)",
				}}
			>
				<Sparkles size={14} style={{ color: "var(--teal)" }} />
				<span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
					Полный отчёт рентген-анализа ИИ
				</span>
				{capturedAt && (
					<span
						style={{
							fontSize: "0.78rem",
							color: "var(--muted)",
							marginLeft: "auto",
						}}
					>
						{new Date(capturedAt).toLocaleDateString("ru-RU")}
					</span>
				)}
			</div>
			{sections.map((section, sIndex) => {
				const isExpanded = activeSection === sIndex;
				return (
					<div
						key={section.title || `section-${sIndex}`}
						style={{
							borderBottom: sIndex < sections.length - 1 ? "1px solid var(--line)" : "none",
						}}
					>
						<button
							type="button"
							onClick={() => setActiveSection(isExpanded ? null : sIndex)}
							style={{
								width: "100%",
								textAlign: "left",
								padding: "10px 14px",
								background: isExpanded ? "var(--paper-soft)" : "transparent",
								border: "none",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								transition: "background 0.15s",
							}}
						>
							<section.icon size={16} style={{ color: "var(--teal)", flexShrink: 0 }} aria-hidden="true" />
							<span style={{ fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>
								{section.title}
							</span>
							<ChevronDown
								size={14}
								style={{
									transform: isExpanded ? "rotate(180deg)" : "none",
									transition: "transform 0.2s",
									color: "var(--muted)",
								}}
							/>
						</button>
						{isExpanded && (
							<div
								style={{
									padding: "8px 14px 14px 34px",
									fontSize: "0.87rem",
									lineHeight: 1.65,
									color: "var(--ink)",
								}}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via escapeHtml
								dangerouslySetInnerHTML={{
									__html: renderMarkdown(section.content),
								}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
