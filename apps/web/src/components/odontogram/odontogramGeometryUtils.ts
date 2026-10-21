import type React from "react";

export function getSafeBoundingRect(
	arg1: number | React.MouseEvent,
	arg2?: DOMRect | null | number,
): { num: number; safeRect: DOMRect } {
	let num: number;
	let safeRect: DOMRect;

	if (typeof arg1 === "number") {
		num = arg1;
		const rect = arg2 as DOMRect | null | undefined;
		safeRect =
			rect && typeof rect.left === "number" && typeof rect.top === "number"
				? rect
				: typeof DOMRect !== "undefined"
					? new DOMRect(0, 0, 0, 0)
					: ({
							x: 0,
							y: 0,
							width: 0,
							height: 0,
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							toJSON: () => ({}),
						} as DOMRect);
	} else {
		const e = arg1 as React.MouseEvent;
		num = typeof arg2 === "number" ? arg2 : 0;
		const el = (e?.currentTarget as HTMLElement) ?? (e?.target as HTMLElement);
		safeRect =
			el && typeof el.getBoundingClientRect === "function"
				? el.getBoundingClientRect()
				: typeof DOMRect !== "undefined"
					? new DOMRect(0, 0, 0, 0)
					: ({
							x: 0,
							y: 0,
							width: 0,
							height: 0,
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							toJSON: () => ({}),
						} as DOMRect);
	}

	return { num, safeRect };
}

export interface ToothMenuCoordinates {
	x: number;
	y: number;
	position: "top" | "bottom";
	caretOffset: number;
}

export function calculateToothMenuCoordinates(
	rect: DOMRect,
	toothNumber: number,
): ToothMenuCoordinates {
	const isUpperJaw =
		toothNumber < 30 || (toothNumber >= 51 && toothNumber <= 65);
	const menuW = 270;
	const menuH = 400;
	const gap = 12;
	const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
	const vh = typeof window !== "undefined" ? window.innerHeight : 900;
	let x = rect.left + rect.width / 2 - menuW / 2;
	const yCalc = isUpperJaw
		? rect.bottom + gap + 10
		: rect.top - menuH - gap - 10;
	const clampedX = Math.max(8, Math.min(x, vw - menuW - 8));
	const caretOffset =
		clampedX !== x
			? ((rect.left + rect.width / 2 - clampedX) / menuW) * 100
			: 50;
	x = clampedX;
	const y = Math.max(10, Math.min(vh - 400, yCalc));

	return {
		x,
		y,
		position: isUpperJaw ? "bottom" : "top",
		caretOffset,
	};
}
