import React from "react";

export interface HighlightTextProps {
	parts: readonly { text: string; isMatch?: boolean }[];
}

export const HighlightText: React.FC<HighlightTextProps> = ({ parts }) => {
	return (
		<>
			{parts.map((part, idx) =>
				part.isMatch ? (
					<mark key={idx} className="bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] font-black rounded-xs px-0.5">
						{part.text}
					</mark>
				) : (
					<span key={idx}>{part.text}</span>
				),
			)}
		</>
	);
};
