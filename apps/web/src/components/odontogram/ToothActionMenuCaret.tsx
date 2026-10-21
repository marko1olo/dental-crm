import type React from "react";

export interface ToothActionMenuCaretProps {
	readonly position: "top" | "bottom";
	readonly safeCaretOffset: number;
}

export const ToothActionMenuCaret: React.FC<ToothActionMenuCaretProps> = ({
	position,
	safeCaretOffset,
}) => {
	const isBottom = position === "bottom";
	return (
		<svg
			aria-hidden="true"
			className={`absolute text-[var(--odontogram-border,#cbd5e1)] dark:text-zinc-800/50 drop-shadow-md ${isBottom ? "-top-3" : "-bottom-3"}`}
			style={{ left: `${safeCaretOffset}%`, transform: "translateX(-50%)" }}
			width="24"
			height="12"
			viewBox="0 0 24 12"
			fill="none"
		>
			<path
				d={isBottom ? "M12 0L24 12H0L12 0Z" : "M12 12L24 0H0L12 12Z"}
				fill="currentColor"
				fillOpacity="0.8"
			/>
		</svg>
	);
};
