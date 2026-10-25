/**
 * apps/web/src/components/sanpin/pso/PsoMobileFloatingBar.tsx
 * Floating Bottom Bar для контроля предстерилизационной очистки (Apple iOS HIG).
 * Мандат 8e (автономия), Мандат 8n (пакетная норма смены), Мандат 8b (<= 120 строк).
 */

import { CheckCircle2, Loader2 } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

export interface PsoMobileFloatingBarProps {
	readonly isSubmitting: boolean;
	readonly onQuickMarkNorm: () => void;
}

export function PsoMobileFloatingBar({
	isSubmitting,
	onQuickMarkNorm,
}: PsoMobileFloatingBarProps) {
	const content = (
		<div
			className="sanpin-mobile-floating-bar"
			data-testid="pso-mobile-floating-bottom-bar"
		>
			<button
				type="button"
				onClick={onQuickMarkNorm}
				disabled={isSubmitting}
				aria-busy={isSubmitting}
				className="sanpin-mobile-floating-cta touch-manipulation"
				data-testid="pso-mobile-floating-norm-btn"
				title="Зафиксировать результаты предстерилизационной очистки смены (пробы отрицательные)"
			>
				{isSubmitting ? (
					<>
						<Loader2 size={18} className="animate-spin shrink-0 text-white" />
						<span>Фиксация очистки...</span>
					</>
				) : (
					<>
						<CheckCircle2 size={18} className="shrink-0 text-white" />
						<span>Контроль предстерилизационной очистки — норма</span>
					</>
				)}
			</button>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(content, document.body);
	}

	return content;
}

export default PsoMobileFloatingBar;
