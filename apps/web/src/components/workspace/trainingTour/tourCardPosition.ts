import type React from "react";

export function computeCardPosition(targetRect: DOMRect | null): React.CSSProperties {
	if (!targetRect) {
		return {
			position: "fixed",
			bottom: 24,
			right: 24,
			zIndex: 1050,
		};
	}

	const margin = 14;
	const cardW = 390;
	const cardH = 280;
	const vw = typeof window !== "undefined" ? window.innerWidth : 1366;
	const vh = typeof window !== "undefined" ? window.innerHeight : 768;

	const top =
		targetRect.bottom + cardH + margin <= vh
			? targetRect.bottom + margin
			: targetRect.top - cardH - margin >= 0
				? targetRect.top - cardH - margin
				: Math.max(16, vh - cardH - 16);

	const left =
		targetRect.left + cardW <= vw - 16
			? Math.max(16, targetRect.left)
			: Math.max(16, vw - cardW - 16);

	return {
		position: "fixed",
		top: Math.round(top),
		left: Math.round(left),
		maxWidth: "min(390px, calc(100vw - 32px))",
		zIndex: 1050,
	};
}
