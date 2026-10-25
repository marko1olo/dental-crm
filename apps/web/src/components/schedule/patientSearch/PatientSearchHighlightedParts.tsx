import React from "react";
import type { SearchMatchHighlightPart } from "../patientSearchEngine";

export function RenderHighlightedParts({ parts }: { parts: readonly SearchMatchHighlightPart[] }) {
	return (
		<span>
			{parts.map((part, index) =>
				part.isMatch ? (
					<mark
						key={`${index}-${part.text}`}
						className="bg-amber-200 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
					>
						{part.text}
					</mark>
				) : (
					<span key={`${index}-${part.text}`}>{part.text}</span>
				),
			)}
		</span>
	);
}
