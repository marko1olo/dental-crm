/**
 * reportMarkdownParser.ts — Санитизация и парсинг разделов отчета ИИ визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import type React from "react";
import { AlertTriangle, Bone, FileText, MapPin, Pin, Wrench } from "lucide-react";

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
