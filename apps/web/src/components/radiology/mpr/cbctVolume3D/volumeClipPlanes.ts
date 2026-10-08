/**
 * DENTE CRM — CBCT 3D Volume Clipping Planes & Sub-Volume Slicing (Layer 1)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import { useCallback, useState } from "react";
import type { Volume3DClippingBox } from "../cbctVolume3DMath";

export function checkHasActiveClipping(clipping: Volume3DClippingBox): boolean {
	return (
		clipping.clipMin[0] > 0.001 ||
		clipping.clipMin[1] > 0.001 ||
		clipping.clipMin[2] > 0.001 ||
		clipping.clipMax[0] < 0.999 ||
		clipping.clipMax[1] < 0.999 ||
		clipping.clipMax[2] < 0.999
	);
}

export function updateClippingAxis(
	prev: Volume3DClippingBox,
	axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax",
	val: number,
): Volume3DClippingBox {
	const nextMin: [number, number, number] = [...prev.clipMin];
	const nextMax: [number, number, number] = [...prev.clipMax];
	if (axis === "xMin") nextMin[0] = Math.max(0, Math.min(nextMax[0] - 0.05, val));
	if (axis === "xMax") nextMax[0] = Math.min(1, Math.max(nextMin[0] + 0.05, val));
	if (axis === "yMin") nextMin[1] = Math.max(0, Math.min(nextMax[1] - 0.05, val));
	if (axis === "yMax") nextMax[1] = Math.min(1, Math.max(nextMin[1] + 0.05, val));
	if (axis === "zMin") nextMin[2] = Math.max(0, Math.min(nextMax[2] - 0.05, val));
	if (axis === "zMax") nextMax[2] = Math.min(1, Math.max(nextMin[2] + 0.05, val));
	return { clipMin: nextMin, clipMax: nextMax };
}

export function createResetClippingBox(): Volume3DClippingBox {
	return {
		clipMin: [0.0, 0.0, 0.0],
		clipMax: [1.0, 1.0, 1.0],
	};
}

export function createQuickClipSpineBox(prev: Volume3DClippingBox): Volume3DClippingBox {
	return {
		clipMin: [prev.clipMin[0], prev.clipMin[1], 0.28],
		clipMax: [...prev.clipMax],
	};
}

export function createQuickClipOcciputBox(prev: Volume3DClippingBox): Volume3DClippingBox {
	return {
		clipMin: [...prev.clipMin],
		clipMax: [prev.clipMax[0], 0.72, prev.clipMax[2]],
	};
}

export interface UseVolumeClipPlanesOptions {
	initialClipping?: Partial<Volume3DClippingBox> | undefined;
	onClippingChange?: ((clipping: Volume3DClippingBox) => void) | undefined;
}

export function useVolumeClipPlanes({
	initialClipping,
	onClippingChange,
}: UseVolumeClipPlanesOptions = {}) {
	const [clipping, setClipping] = useState<Volume3DClippingBox>({
		clipMin: initialClipping?.clipMin
			? [...initialClipping.clipMin]
			: [0.0, 0.0, 0.0],
		clipMax: initialClipping?.clipMax
			? [...initialClipping.clipMax]
			: [1.0, 1.0, 1.0],
	});
	const [isClippingOpen, setIsClippingOpen] = useState<boolean>(false);

	const hasActiveClipping = checkHasActiveClipping(clipping);

	const handleClipChange = useCallback(
		(
			axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax",
			val: number,
		) => {
			setClipping((prev) => {
				const next = updateClippingAxis(prev, axis, val);
				onClippingChange?.(next);
				return next;
			});
		},
		[onClippingChange],
	);

	const handleResetClipping = useCallback(() => {
		const next = createResetClippingBox();
		setClipping(next);
		onClippingChange?.(next);
	}, [onClippingChange]);

	const handleQuickClipSpine = useCallback(() => {
		setClipping((prev) => {
			const next = createQuickClipSpineBox(prev);
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	const handleQuickClipOcciput = useCallback(() => {
		setClipping((prev) => {
			const next = createQuickClipOcciputBox(prev);
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	return {
		clipping,
		setClipping,
		isClippingOpen,
		setIsClippingOpen,
		hasActiveClipping,
		handleClipChange,
		handleResetClipping,
		handleQuickClipSpine,
		handleQuickClipOcciput,
	};
}
