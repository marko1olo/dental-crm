import React from "react";
import type { DocumentKind } from "@dental/shared";

interface PrimaryIntakeDocumentBadgesProps {
	kind: DocumentKind;
	isIssued: boolean;
}

export function PrimaryIntakeDocumentBadges({ kind, isIssued }: PrimaryIntakeDocumentBadgesProps) {
	if (isIssued) {
		return (
			<>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 700,
						padding: "2px 8px",
						borderRadius: "6px",
						background: "rgba(13, 148, 136, 0.12)",
						color: "var(--teal, #0d9488)",
						border: "1px solid rgba(13, 148, 136, 0.25)",
					}}
					data-testid={`intake-badge-pep-${kind}`}
				>
					Подписано ПЭП
				</span>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 700,
						padding: "2px 8px",
						borderRadius: "6px",
						background: "rgba(99, 102, 241, 0.12)",
						color: "#6366f1",
						border: "1px solid rgba(99, 102, 241, 0.25)",
					}}
					data-testid={`intake-badge-archive-${kind}`}
				>
					Архив
				</span>
			</>
		);
	}

	return (
		<span
			style={{
				fontSize: "11px",
				fontWeight: 700,
				padding: "2px 8px",
				borderRadius: "6px",
				background: "rgba(245, 158, 11, 0.12)",
				color: "#d97706",
				border: "1px solid rgba(245, 158, 11, 0.25)",
			}}
			data-testid={`intake-badge-requires-sign-${kind}`}
		>
			Требуется подпись
		</span>
	);
}
