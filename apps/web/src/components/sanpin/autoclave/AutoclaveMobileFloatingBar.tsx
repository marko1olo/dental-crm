import { Plus } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

export interface AutoclaveMobileFloatingBarProps {
	readonly isLoggingBatch: boolean;
	readonly onQuickShiftBatch: () => void;
}

export function AutoclaveMobileFloatingBar({
	isLoggingBatch,
	onQuickShiftBatch,
}: AutoclaveMobileFloatingBarProps) {
	const content = (
		<div className="sanpin-mobile-floating-bar" data-testid="sanpin-mobile-floating-bottom-bar">
			<button
				type="button"
				onClick={onQuickShiftBatch}
				aria-busy={isLoggingBatch}
				className="sanpin-mobile-floating-cta touch-manipulation"
				data-testid="sanpin-mobile-start-autoclave-cycle-btn"
			>
				<Plus size={18} className="shrink-0" />
				<span>{isLoggingBatch ? "Фиксация цикла..." : "Запустить цикл автоклава"}</span>
			</button>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}

	return content;
}
