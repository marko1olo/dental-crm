/**
 * useBeforeAfterSplitter.ts
 * Drag, wheel, keyboard navigation and fullscreen management for wiper slider.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { clamp } from "../photography/photoProtocolMath";
import type { BeforeAfterSplitterPhotoItem } from "./beforeAfterTypes.js";

export function useBeforeAfterSplitter(
	initialBeforeUrl?: string,
	initialAfterUrl?: string,
	photos: readonly BeforeAfterSplitterPhotoItem[] = [],
) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const isDraggingRef = useRef(false);

	const [activeBeforeUrl, setActiveBeforeUrl] = useState<string>(initialBeforeUrl || photos[0]?.url || "");
	const [activeAfterUrl, setActiveAfterUrl] = useState<string>(initialAfterUrl || photos[1]?.url || photos[0]?.url || "");
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isSelectingPhotos, setIsSelectingPhotos] = useState<boolean>(false);

	useEffect(() => {
		if (initialBeforeUrl) setActiveBeforeUrl(initialBeforeUrl);
	}, [initialBeforeUrl]);

	useEffect(() => {
		if (initialAfterUrl) setActiveAfterUrl(initialAfterUrl);
	}, [initialAfterUrl]);

	useEffect(() => {
		if (!activeBeforeUrl && photos.length > 0) {
			const b = photos.find((p) => p.stage === "before") || photos[0];
			if (b) setActiveBeforeUrl(b.url);
		}
		if (!activeAfterUrl && photos.length > 1) {
			const a = photos.find((p) => p.stage === "after") || photos[photos.length - 1];
			if (a) setActiveAfterUrl(a.url);
		}
	}, [photos, activeBeforeUrl, activeAfterUrl]);

	const updateSplitFromClientX = useCallback((clientX: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const relativeX = clientX - rect.left;
		const pct = clamp((relativeX / rect.width) * 100, 0, 100);
		setSplitPercent(Math.round(pct));
	}, []);

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = true;
		try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
		updateSplitFromClientX(e.clientX);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingRef.current) return;
		updateSplitFromClientX(e.clientX);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = false;
		try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 3 : -3;
		setSplitPercent((prev) => clamp(prev + delta, 0, 100));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
			e.preventDefault();
			const step = e.shiftKey ? 10 : 2;
			setSplitPercent((prev) => clamp(prev - step, 0, 100));
		} else if (["ArrowRight", "ArrowUp"].includes(e.key)) {
			e.preventDefault();
			const step = e.shiftKey ? 10 : 2;
			setSplitPercent((prev) => clamp(prev + step, 0, 100));
		} else if (e.key === "Home") {
			e.preventDefault();
			setSplitPercent(0);
		} else if (e.key === "End") {
			e.preventDefault();
			setSplitPercent(100);
		} else if (e.key === "Escape" && isFullscreen) {
			e.preventDefault();
			setIsFullscreen(false);
		}
	};

	const handleSwap = () => {
		const temp = activeBeforeUrl;
		setActiveBeforeUrl(activeAfterUrl);
		setActiveAfterUrl(temp);
	};

	return {
		containerRef, activeBeforeUrl, setActiveBeforeUrl, activeAfterUrl, setActiveAfterUrl,
		splitPercent, setSplitPercent, isFullscreen, setIsFullscreen, isSelectingPhotos,
		setIsSelectingPhotos, handlePointerDown, handlePointerMove, handlePointerUp,
		handleWheel, handleKeyDown, handleSwap,
	};
}
